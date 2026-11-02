#!/usr/bin/env bash
# Export the archive box's io_records tables to DO Spaces as raw gzipped CSV,
# one file per UTC month, and prove every file by reading it back from the
# bucket and counting its rows against Postgres.
#
# Runs ON the Hostinger box (srv626585) as root, inside tmux. Streams
# Postgres -> gzip -> Spaces, so it needs no local disk for the data.
# It never deletes or modifies anything in Postgres or on the box's disk.
#
#   ./export-archive-to-spaces.sh preflight
#   ./export-archive-to-spaces.sh histogram <table>                  # exact rows per UTC month
#   ./export-archive-to-spaces.sh export    <table> <from YYYY-MM> <to YYYY-MM>
#   ./export-archive-to-spaces.sh verify    <table>                  # re-read every file from the bucket
#   ./export-archive-to-spaces.sh schema                             # schema.sql
#   ./export-archive-to-spaces.sh report                             # totals, manifest.csv, README.txt
#   ./export-archive-to-spaces.sh files     <path>...                # other box data -> box-files/, byte-checked
#
# <table> is io_records_prod or io_records. Months in [from, to] get one file
# each; every row outside that range (junk RTC years, NULL, infinity) goes to
# <prefix>/junk-timestamps.csv.gz, so the files always add up to the table.
#
# Bucket layout (sgt-hydroedge-archive, sgp1):
#   io_records_prod/YYYY-MM.csv.gz      archive_io_records/YYYY-MM.csv.gz
#   io_records_prod/junk-timestamps.csv.gz   archive_io_records/junk-timestamps.csv.gz
#   schema.sql   manifest.csv   README.txt
#
# Credentials: /root/.spaces-export.env, chmod 600, two lines:
#   SPACES_KEY=...
#   SPACES_SECRET=...
set -euo pipefail

DB=sgt_hydroedge_archive
BUCKET=sgt-hydroedge-archive
ENDPOINT=https://sgp1.digitaloceanspaces.com
ENV_FILE=/root/.spaces-export.env
STATE=/var/tmp/spaces-export
# Fixed column order for both tables, so every CSV has the identical header.
COLS="id,gps_record_id,device_id,timestamp,io_id,io_name,io_value,io_value_text,unit,io_type"
# Row counts already proven elsewhere (ARCHIVE_DB.md §5): the offload verify.
KNOWN_TOTAL_io_records_prod=455964178

mkdir -p "$STATE"
cd /tmp   # postgres can't cd into /root

log() { printf '[%s] %s\n' "$(date -u +%H:%M:%S)" "$*" | tee -a "$STATE/log.txt" >&2; }
die() { log "ERROR: $*"; exit 1; }

psql_() { sudo -u postgres env PGTZ=UTC PGCLIENTENCODING=UTF8 psql -X -q -v ON_ERROR_STOP=1 -d "$DB" "$@"; }
q()     { psql_ -At -F $'\t' -c "$1"; }
gz()    { if command -v pigz >/dev/null; then pigz -6 -p 4; else gzip -6; fi; }   # box has 8 vCPU
quoted_cols() { echo "$COLS" | sed 's/[^,]*/"&"/g'; }

prefix_for() {
  case $1 in
    io_records_prod) echo io_records_prod ;;
    io_records)      echo archive_io_records ;;
    *) die "table must be io_records_prod or io_records, got '$1'" ;;
  esac
}

load_env() {
  [[ -f $ENV_FILE ]] || die "create $ENV_FILE (chmod 600) with SPACES_KEY= and SPACES_SECRET="
  [[ $(stat -c %a "$ENV_FILE") == 600 ]] || die "run: chmod 600 $ENV_FILE"
  set -a; . "$ENV_FILE"; set +a
  [[ -n ${SPACES_KEY:-} && -n ${SPACES_SECRET:-} ]] || die "$ENV_FILE must set SPACES_KEY and SPACES_SECRET"
  export RCLONE_CONFIG_SPACES_TYPE=s3 \
         RCLONE_CONFIG_SPACES_PROVIDER=DigitalOcean \
         RCLONE_CONFIG_SPACES_ENDPOINT=$ENDPOINT \
         RCLONE_CONFIG_SPACES_ACCESS_KEY_ID=$SPACES_KEY \
         RCLONE_CONFIG_SPACES_SECRET_ACCESS_KEY=$SPACES_SECRET \
         RCLONE_CONFIG_SPACES_ACL=private \
         RCLONE_CONFIG_SPACES_NO_CHECK_BUCKET=true
  unset SPACES_KEY SPACES_SECRET
}
remote() { echo "spaces:$BUCKET/$1"; }
upload() { rclone rcat --s3-chunk-size 64M --s3-upload-concurrency 4 "$(remote "$1")"; }

writes_of() { q "SELECT n_tup_ins + n_tup_upd + n_tup_del FROM pg_stat_user_tables WHERE relname = '$1'"; }

check_columns() {
  local got want
  got=$(q "SELECT string_agg(column_name, ',' ORDER BY column_name COLLATE \"C\") FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = '$1'")
  want=$(echo "$COLS" | tr , '\n' | LC_ALL=C sort | paste -sd,)
  [[ $got == "$want" ]] || die "$1 columns differ from the expected 10: got '$got'"
}

# Reads a gzipped CSV on stdin. Prints: data_rows bad_rows header_ok sha256 gz_bytes
COUNTER='
import csv, gzip, hashlib, io, sys
cols = sys.argv[1].split(",")
h = hashlib.sha256(); n = [0]
class Tap:
    def __init__(s, f): s.f = f
    def read(s, k=-1):
        d = s.f.read(k); h.update(d); n[0] += len(d); return d
tap = Tap(sys.stdin.buffer)
csv.field_size_limit(2**31 - 1)
r = csv.reader(io.TextIOWrapper(gzip.GzipFile(fileobj=tap), encoding="utf-8", newline=""))
header = next(r, None)
rows = bad = 0
for row in r:
    rows += 1
    if len(row) != len(cols): bad += 1
while tap.read(1 << 20): pass
print(rows, bad, int(header == cols), h.hexdigest(), n[0])
'

# ---------------------------------------------------------------- preflight
cmd_preflight() {
  for t in rclone python3 gzip sudo; do command -v $t >/dev/null || die "missing $t (apt install rclone python3)"; done
  command -v pigz >/dev/null || log "pigz not installed; gzip is fine but slower (apt install pigz)"
  [[ -n ${TMUX:-} ]] || log "WARNING: not inside tmux. Long steps will die with your SSH session."
  rclone version | head -1
  load_env

  log "Spaces: write / read / delete a test object"
  echo "preflight $(hostname) $(date -u +%FT%TZ)" | rclone rcat "$(remote _preflight/test.txt)"
  rclone cat "$(remote _preflight/test.txt)" | grep -q preflight || die "could not read the test object back"
  rclone deletefile "$(remote _preflight/test.txt)"
  log "bucket contents now:"; rclone lsl "$(remote '')" | head -50 || true

  for t in io_records_prod io_records; do
    check_columns "$t"
    writes_of "$t" > "$STATE/writes.$t"
    log "$t: columns OK, est rows $(q "SELECT reltuples::bigint FROM pg_class WHERE relname = '$t'"), \
size $(q "SELECT pg_size_pretty(pg_total_relation_size('$t'))"), write counter $(cat "$STATE/writes.$t")"
  done
  q "SELECT data_type FROM information_schema.columns WHERE table_name = 'io_records_prod' AND column_name = 'timestamp'" \
    | sed 's/^/timestamp column type: /'
  log "other sessions on $DB (should be none writing):"
  psql_ -c "SELECT pid, usename, client_addr, state, left(query, 80) AS query FROM pg_stat_activity
            WHERE datname = '$DB' AND pid <> pg_backend_pid()"
  log "preflight OK"
}

# ---------------------------------------------------------------- histogram
cmd_histogram() {
  local t=$1; prefix_for "$t" >/dev/null
  log "histogram $t (full scan, can take a while)"
  q "SELECT COALESCE(to_char(date_trunc('month', \"timestamp\"), 'YYYY-MM'), 'NULL'), count(*)
     FROM $t GROUP BY 1 ORDER BY 1" > "$STATE/$t.months.tsv.tmp"
  mv "$STATE/$t.months.tsv.tmp" "$STATE/$t.months.tsv"
  local total; total=$(awk -F'\t' '{s += $2} END {print s}' "$STATE/$t.months.tsv")
  column -t -s $'\t' "$STATE/$t.months.tsv"
  log "$t total from histogram: $total"
  local known_var=KNOWN_TOTAL_$t
  if [[ -n ${!known_var:-} ]]; then
    [[ $total == "${!known_var}" ]] || die "$t histogram total $total != known ${!known_var}"
    log "$t matches the known total ${!known_var}"
  fi
}

# ------------------------------------------------------------------ export
verify_one() {   # key expected
  local key=$1 expected=$2 out rows bad hdr sha bytes
  out=$(rclone cat "$(remote "$key")" | python3 -I -c "$COUNTER" "$COLS") || die "$key: could not read back"
  read -r rows bad hdr sha bytes <<< "$out"
  if [[ $rows == "$expected" && $bad == 0 && $hdr == 1 ]]; then
    log "VERIFIED $key rows=$rows gz=$bytes sha256=${sha:0:16}…"
    echo "$rows	$bytes	$sha"
  else
    die "MISMATCH $key: bucket rows=$rows expected=$expected bad_rows=$bad header_ok=$hdr"
  fi
}

export_one() {   # table key where expected
  local t=$1 key=$2 where=$3 expected=$4 res
  if grep -q "^$key	" "$STATE/verified.tsv" 2>/dev/null; then log "skip $key (already verified)"; return; fi
  log "export $key ($expected rows)"
  psql_ -c "COPY (SELECT $(quoted_cols) FROM $t WHERE $where) TO STDOUT WITH (FORMAT csv, HEADER true)" \
    | gz | upload "$key" \
    || die "$key: export pipeline failed. A partial object may exist; it is not in the manifest and is overwritten on re-run."
  res=$(verify_one "$key" "$expected")
  printf '%s\t%s\t%s\t%s\t%s\n' "$key" "$t" "$expected" "$res" "$(date -u +%FT%TZ)" >> "$STATE/verified.tsv"
}

cmd_export() {
  local t=$1 from=$2 to=$3 prefix hist
  prefix=$(prefix_for "$t"); hist="$STATE/$t.months.tsv"
  [[ $from =~ ^[0-9]{4}-[0-9]{2}$ && $to =~ ^[0-9]{4}-[0-9]{2}$ && ! $to < $from ]] || die "from/to must be YYYY-MM, from <= to"
  [[ -s $hist ]] || die "run: $0 histogram $t"
  load_env
  [[ -f $STATE/writes.$t ]] && [[ $(writes_of "$t") == "$(cat "$STATE/writes.$t")" ]] \
    || die "$t write counter changed since preflight (or preflight not run). Something is writing to it."

  local m n next
  while IFS=$'\t' read -r -u 3 m n; do
    [[ $m =~ ^[0-9]{4}-[0-9]{2}$ && ! $m < $from && ! $m > $to ]] || continue
    next=$(date -u -d "$m-01 +1 month" +%Y-%m)
    export_one "$t" "$prefix/$m.csv.gz" "\"timestamp\" >= '$m-01' AND \"timestamp\" < '$next-01'" "$n"
  done 3< "$hist"

  local junk; next=$(date -u -d "$to-01 +1 month" +%Y-%m)
  junk=$(awk -F'\t' -v f="$from" -v t="$to" '$1 !~ /^[0-9][0-9][0-9][0-9]-[0-9][0-9]$/ || $1 < f || $1 > t {s += $2} END {print s + 0}' "$hist")
  if (( junk > 0 )); then
    export_one "$t" "$prefix/junk-timestamps.csv.gz" \
      "\"timestamp\" IS NULL OR \"timestamp\" < '$from-01' OR \"timestamp\" >= '$next-01'" "$junk"
  else
    log "no rows outside $from..$to, no junk file"
  fi
  echo "$from	$to" > "$STATE/$t.range"
  log "export $t done. Next: $0 verify $t, then $0 report"
}

# ------------------------------------------------------------------ verify
cmd_verify() {   # independent second read of everything already exported for a table
  local t=$1 key tbl expected rows bytes sha res fails=0
  load_env
  while IFS=$'\t' read -r -u 3 key tbl expected rows bytes sha _; do
    [[ $tbl == "$t" ]] || continue
    res=$(verify_one "$key" "$expected") || { fails=$((fails + 1)); continue; }
    [[ $(cut -f3 <<< "$res") == "$sha" ]] || { log "CHECKSUM CHANGED $key"; fails=$((fails + 1)); }
  done 3< "$STATE/verified.tsv"
  (( fails == 0 )) || die "$fails file(s) failed re-verification"
  log "re-verify $t: all files OK"
}

# ------------------------------------------------------------------ schema
cmd_schema() {
  load_env
  sudo -u postgres pg_dump -s -d "$DB" -t public.io_records -t public.io_records_prod > "$STATE/schema.sql"
  upload schema.sql < "$STATE/schema.sql"
  [[ $(rclone cat "$(remote schema.sql)" | sha256sum | cut -d' ' -f1) == $(sha256sum < "$STATE/schema.sql" | cut -d' ' -f1) ]] \
    || die "schema.sql in bucket differs from local copy"
  log "VERIFIED schema.sql ($(wc -l < "$STATE/schema.sql") lines)"
}

# ------------------------------------------------------------------- files
cmd_files() {   # copy other box data (backups, configs) to box-files/<name>/, then byte-compare
  load_env
  local p name dest
  for p in "$@"; do
    [[ -e $p ]] || die "$p does not exist"
    name=$(basename "$p"); dest=$(remote "box-files/$name")
    log "copy $p -> box-files/$name ($(du -sh "$p" | cut -f1))"
    if [[ -d $p ]]; then
      rclone copy --s3-chunk-size 32M --s3-upload-concurrency 2 "$p" "$dest"
      rclone check --download "$p" "$dest" || die "box-files/$name differs from $p"
    else
      rclone copyto --s3-chunk-size 32M --s3-upload-concurrency 2 "$p" "$dest"
      [[ $(rclone cat "$dest" | sha256sum | cut -d' ' -f1) == $(sha256sum < "$p" | cut -d' ' -f1) ]] \
        || die "box-files/$name differs from $p"
    fi
    printf '%s\t%s\t%s\n' "$p" "box-files/$name" "$(date -u +%FT%TZ)" >> "$STATE/files-verified.tsv"
    log "VERIFIED box-files/$name"
  done
}

# ------------------------------------------------------------------ report
cmd_report() {
  load_env
  local t ok=1 hist_total file_total missing
  for t in io_records_prod io_records; do
    [[ -s $STATE/$t.months.tsv ]] || { log "$t: no histogram yet"; ok=0; continue; }
    hist_total=$(awk -F'\t' '{s += $2} END {print s + 0}' "$STATE/$t.months.tsv")
    file_total=$(awk -F'\t' -v t="$t" '$2 == t {s += $4} END {print s + 0}' "$STATE/verified.tsv" 2>/dev/null || echo 0)
    if [[ $(writes_of "$t") != "$(cat "$STATE/writes.$t" 2>/dev/null)" ]]; then log "$t: WRITE COUNTER CHANGED"; ok=0; fi
    if [[ $hist_total == "$file_total" ]]; then
      log "$t: COMPLETE  Postgres $hist_total = bucket $file_total rows in $(awk -F'\t' -v t="$t" '$2 == t' "$STATE/verified.tsv" | wc -l) files"
    else
      log "$t: INCOMPLETE  Postgres $hist_total, verified in bucket $file_total"; ok=0
    fi
  done
  rclone lsf "$(remote schema.sql)" | grep -q schema.sql || { log "schema.sql not uploaded"; ok=0; }

  { echo "key,table,pg_rows,bucket_rows,gz_bytes,sha256,verified_at_utc"; tr '\t' , < "$STATE/verified.tsv"; } > "$STATE/manifest.csv"
  upload manifest.csv < "$STATE/manifest.csv"
  cat > "$STATE/README.txt" <<EOF
Raw export of the Hostinger archive Postgres ($DB on srv626585), made $(date -u +%F).
io_records_prod/      = sgt_hydroedge_archive.io_records_prod (all prod io_records before 2026-09-07, offloaded 2026-10-07)
archive_io_records/   = sgt_hydroedge_archive.io_records (the older archive, ~Feb-Mar 2026)
One gzipped CSV per UTC calendar month of the "timestamp" column (device RTC time, not server time).
junk-timestamps.csv.gz holds every row outside the month range: NULL, infinity and junk RTC years.
CSV: header row, columns $COLS. NULL is an unquoted empty field; an empty string is "".
Rows are unmodified, duplicate packets included (same device_id+timestamp under different gps_record_id).
schema.sql is pg_dump -s of both tables. manifest.csv has each file's row count (checked against
Postgres by re-reading the file from this bucket) and sha256 of the .gz object.
EOF
  upload README.txt < "$STATE/README.txt"
  rclone lsl "$(remote '')" --max-depth 2 | sort -k4
  if (( ok )); then
    date -u +%FT%TZ > "$STATE/EXPORT_VERIFIED"
    log "ALL VERIFIED. Marker written: $STATE/EXPORT_VERIFIED"
  else
    die "not complete; see above"
  fi
}

case ${1:-} in
  preflight) cmd_preflight ;;
  histogram) [[ $# == 2 ]] || die "usage: $0 histogram <table>"; cmd_histogram "$2" ;;
  export)    [[ $# == 4 ]] || die "usage: $0 export <table> <from YYYY-MM> <to YYYY-MM>"; cmd_export "$2" "$3" "$4" ;;
  verify)    [[ $# == 2 ]] || die "usage: $0 verify <table>"; cmd_verify "$2" ;;
  schema)    cmd_schema ;;
  report)    cmd_report ;;
  files)     shift; [[ $# -ge 1 ]] || die "usage: $0 files <path>..."; cmd_files "$@" ;;
  *) sed -n '2,30p' "$0"; exit 1 ;;
esac
