#!/usr/bin/env bash
# ============================================================================
# split-history.sh — re-split the Spaces export into per-device/IO/month files
# ----------------------------------------------------------------------------
# The Logs & Messages tab reads history older than prod's io_records from
# Spaces (src/lib/history-store.ts). The export made on 2026-10-15 is one file
# per month covering every device (hundreds of MB each), far too coarse to read
# on a click. This script reads each month ONCE from both export folders and
# writes it back as:
#
#   history/<device_id>/<io_id>/<YYYY-MM>.csv.gz     rows: timestamp,io_value  (no header)
#   history/_months.txt                              one completed YYYY-MM per line
#   history/_manifest.csv                            counts per month
#
# The app treats a month missing from _months.txt as "not available yet" and
# errors, so a half-run never shows up as a silent gap.
#
# Sources (same 10 columns, see export-archive-to-spaces.sh):
#   io_records_prod/YYYY-MM.csv.gz      all of old prod, Aug 2024 → Oct 2026
#   archive_io_records/YYYY-MM.csv.gz   GreenVision-era archive, Aug 2024 → Mar 2026
# Both are merged; exact duplicates (device, io, timestamp, value) are dropped.
# Only rows before CUTOFF are kept — from CUTOFF on, prod io_records has them.
#
# Runs on the prod droplet, inside tmux, as root:
#   ./split-history.sh preflight            # tools, key, bucket read+write
#   ./split-history.sh run [FROM] [TO]      # e.g. run 2024-08 2026-09; skips done months
#   ./split-history.sh status
#
# Needs: rclone, duckdb, /root/.spaces-export.env with SPACES_KEY / SPACES_SECRET
# (a key that can write to this bucket). Re-running is safe: finished months
# are skipped, an interrupted month is redone from scratch.
# ============================================================================
set -euo pipefail

BUCKET=sgt-hydroedge-archive
ENDPOINT=https://sgp1.digitaloceanspaces.com
ENV_FILE=/root/.spaces-export.env
CUTOFF='2026-09-07 00:00:00+00'      # prod io_records starts here (offload swap, ARCHIVE_DB.md)
WORK=/var/tmp/history-split
TEMP_MAX=18GB                        # DuckDB spill cap; April 2026 peaked near 18 GB as strings
SOURCES=(io_records_prod archive_io_records)

log() { printf '[%s] %s\n' "$(date -u +%H:%M:%S)" "$*" | tee -a "$WORK/log.txt" >&2; }
die() { log "ERROR: $*"; exit 1; }
mkdir -p "$WORK"

load_key() {
  [[ -f $ENV_FILE ]] || die "$ENV_FILE missing"
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

done_months() { rclone cat "$(remote history/_months.txt)" 2>/dev/null || true; }

cmd_preflight() {
  command -v rclone >/dev/null || die "rclone not installed (apt install -y rclone)"
  command -v duckdb >/dev/null || die "duckdb not installed"
  load_key
  rclone lsf "$(remote io_records_prod/)" | head -3 >/dev/null || die "cannot list io_records_prod/"
  local probe="history/_preflight-$(date +%s).txt"
  echo ok | rclone rcat "$(remote "$probe")" || die "key cannot write to the bucket"
  [[ $(rclone cat "$(remote "$probe")") == ok ]] || die "read-back of $probe failed"
  rclone deletefile "$(remote "$probe")"
  log "preflight OK: tools present, bucket readable and writable, $(df -h /var/tmp | awk 'NR==2{print $4}') free in /var/tmp"
}

all_months() {
  for s in "${SOURCES[@]}"; do rclone lsf "$(remote "$s/")"; done \
    | grep -E '^[0-9]{4}-[0-9]{2}\.csv\.gz$' | sed 's/\.csv\.gz$//' | sort -u \
    | awk -v cut="${CUTOFF:0:7}" '$0 <= cut'
}

split_month() {
  local m=$1 dir="$WORK/$m" files=() s
  rm -rf "$dir"; mkdir -p "$dir/src" "$dir/out" "$dir/stage" "$dir/duck"
  for s in "${SOURCES[@]}"; do
    if rclone lsf "$(remote "$s/$m.csv.gz")" | grep -q .; then
      rclone copyto "$(remote "$s/$m.csv.gz")" "$dir/src/$s.csv.gz"
      files+=("'$dir/src/$s.csv.gz'")
    fi
  done
  (( ${#files[@]} )) || { log "$m: no source files"; return 0; }
  local list; list=$(IFS=,; echo "${files[*]}")

  # Load, dedupe, write partitions. Counts land in $dir/counts.csv.
  # Rows are held typed (UUID 16 B, TIMESTAMPTZ 8 B) rather than as strings,
  # which roughly halves the spill. max_temp_directory_size makes DuckDB fail
  # the month instead of filling the disk prod Postgres lives on; the month is
  # then simply redone by the next `run`.
  duckdb -csv -noheader <<SQL > "$dir/counts.csv"
SET memory_limit='1200MB'; SET threads=2; SET temp_directory='$dir/duck';
SET max_temp_directory_size='$TEMP_MAX';
SET TimeZone='UTC'; SET preserve_insertion_order=false;
CREATE VIEW src AS
  SELECT device_id, io_id, TRY_CAST("timestamp" AS TIMESTAMPTZ) AS ts, io_value
  FROM read_csv([$list], header=true, auto_detect=false, columns={
    'id':'VARCHAR','gps_record_id':'VARCHAR','device_id':'UUID','timestamp':'VARCHAR',
    'io_id':'INTEGER','io_name':'VARCHAR','io_value':'VARCHAR','io_value_text':'VARCHAR',
    'unit':'VARCHAR','io_type':'VARCHAR'});
CREATE TABLE keep AS
  SELECT DISTINCT device_id, io_id, ts, io_value FROM src
  WHERE ts >= '2024-01-01' AND ts < '$CUTOFF' AND strftime(ts, '%Y-%m') = '$m';
COPY (SELECT device_id, io_id, ts, io_value FROM keep)
  TO '$dir/out' (FORMAT CSV, HEADER false, PARTITION_BY (device_id, io_id), COMPRESSION gzip);
SELECT (SELECT count(*) FROM src), (SELECT count(*) FROM keep), (SELECT count(DISTINCT device_id) FROM keep);
SQL
  rm -rf "$dir/src"
  local read kept devices
  IFS=, read -r read kept devices < <(tail -1 "$dir/counts.csv")

  # device_id=<uuid>/io_id=<n>/data_*.csv.gz  →  <uuid>/<n>/<m>.csv.gz
  # Several data_* files in one partition are concatenated: gzip members join
  # cleanly, and there is no header to repeat.
  local p dev io
  for p in "$dir"/out/device_id=*/io_id=*; do
    dev=${p#*device_id=}; dev=${dev%%/*}; io=${p##*io_id=}
    mkdir -p "$dir/stage/$dev/$io"
    cat "$p"/*.csv.gz > "$dir/stage/$dev/$io/$m.csv.gz"
  done
  rm -rf "$dir/out"

  # Prove the staged files hold exactly the kept rows before anything is uploaded.
  local staged
  staged=$(duckdb -csv -noheader -c "SELECT count(*) FROM read_csv('$dir/stage/*/*/$m.csv.gz', header=false, columns={'ts':'VARCHAR','v':'VARCHAR'})")
  [[ $staged == "$kept" ]] || die "$m: staged rows $staged != kept rows $kept"

  rclone copy "$dir/stage/" "$(remote history/)" --transfers 16 --checkers 16
  rclone check "$dir/stage/" "$(remote history/)" --one-way --checkers 16 \
    || die "$m: upload check failed"

  local done_list; done_list=$( { done_months; echo "$m"; } | sort -u )
  printf '%s\n' "$done_list" | rclone rcat "$(remote history/_months.txt)"
  { rclone cat "$(remote history/_manifest.csv)" 2>/dev/null || echo "month,rows_read,rows_kept,devices,split_at_utc"; \
    echo "$m,$read,$kept,$devices,$(date -u +%FT%TZ)"; } | rclone rcat "$(remote history/_manifest.csv)"
  rm -rf "$dir"
  log "$m: read $read, kept $kept (deduped, before cutoff), $devices devices — uploaded"
}

cmd_run() {
  command -v duckdb >/dev/null || die "duckdb not installed"
  load_key
  local from=${1:-0000-00} to=${2:-9999-99} done m
  done=$(done_months)
  for m in $(all_months); do
    [[ $m < $from || $m > $to ]] && continue
    if grep -qx "$m" <<<"$done"; then log "$m: already done, skipping"; continue; fi
    split_month "$m"
  done
  log "run finished"
}

cmd_status() {
  load_key
  echo "done months:"; done_months | sed 's/^/  /'
  echo "manifest:"; rclone cat "$(remote history/_manifest.csv)" 2>/dev/null | column -s, -t | sed 's/^/  /' || true
}

case ${1:-} in
  preflight) cmd_preflight ;;
  run)       shift; cmd_run "$@" ;;
  status)    cmd_status ;;
  *) sed -n '2,34p' "$0"; exit 1 ;;
esac
