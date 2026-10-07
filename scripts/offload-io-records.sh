#!/usr/bin/env bash
# ============================================================================
# OFFLOAD io_records TO THE ARCHIVE BOX, KEEP ONLY RECENT ROWS ON PROD
# ----------------------------------------------------------------------------
# Prod's 77 GB disk filled because io_records holds ~449 M rows / 63 GB.
# This copies the WHOLE prod table into a staging table, io_records_prod, inside
# the existing sgt_hydroedge_archive database (see ARCHIVE_DB.md), proves the
# copy is complete, then replaces prod's table with an empty one and loads back
# only rows with timestamp >= CUTOFF.
#
# io_records_prod is deliberately NOT the archive's io_records: it loads with no
# indexes (fast), never collides with the archive's own ids, and is the place to
# filter. Rows worth keeping get merged into the archive's io_records later, on
# the archive box, with no prod involvement.
#
# Run as root on the prod droplet, in order:
#   check             connection, column match, size estimates. Read-only.
#   copy              full copy -> archive:io_records_prod. Hours, no
#                     downtime. Run inside tmux.
#   verify            exact row counts on both sides for the copied id range.
#                     Slow (full scan), no downtime. Records the result.
#   swap CUTOFF       NO DOWNTIME, ingest keeps running. Swaps in an empty
#                     io_records, copies the frozen old table's tail to the
#                     archive, re-checks, asks for typed DROP, drops the old
#                     table (frees the disk), reloads rows >= CUTOFF.
#   restore CUTOFF    only the reload step, if swap died after the DROP.
#
# Nothing on prod is deleted until the typed DROP in 'swap', and swap refuses
# to run unless 'verify' passed.
#
# Archive login is the one the app uses (ARCHIVE_DB.md §2); the password comes
# from /root/.pgpass. Override with ARCH_HOST / ARCH_USER / ARCH_DB if needed.
# ============================================================================
set -euo pipefail

PROD_DB=sgt_hydroedge
ARCH_HOST=${ARCH_HOST:-145.223.19.24}
ARCH_USER=${ARCH_USER:-sgt_admin}
ARCH_DB=${ARCH_DB:-sgt_hydroedge_archive}
STAGE=io_records_prod
STATE=/var/tmp/io_offload.state
FKFILE=/var/tmp/io_offload.fks.sql

die() { echo "ERROR: $*" >&2; exit 1; }

# prod: local peer auth as postgres. arch: TLS, password from root's ~/.pgpass.
prod()  { sudo -u postgres psql -X -q -v ON_ERROR_STOP=1 -d "$PROD_DB" "$@"; }
arch()  { psql -X -q -v ON_ERROR_STOP=1 -w "host=$ARCH_HOST port=5432 dbname=$ARCH_DB user=$ARCH_USER sslmode=require" "$@"; }
prodv() { prod -At -c "$1"; }
archv() { arch -At -c "$1"; }

coldefs() {  # column name:type list for a table, one line
  echo "SELECT string_agg(column_name || ':' || data_type, ',' ORDER BY ordinal_position)
        FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$1'"
}

# Every column, read from prod and required to match the archive exactly, so a
# copy can never silently drop one.
check_cols() {
  local p a
  p=$(prodv "$(coldefs io_records)")
  a=$(archv "$(coldefs io_records)")
  [ -n "$p" ] && [ "$p" = "$a" ] || die "column mismatch
  prod   : $p
  archive: $a"
  COLS=$(prodv "SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
                FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'io_records'")
}

check_pk() {
  local pk
  pk=$(prodv "SELECT string_agg(a.attname, ',') FROM pg_index i
              JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
              WHERE i.indrelid = 'io_records'::regclass AND i.indisprimary")
  [ "$pk" = "id" ] || die "expected io_records primary key on (id), found ($pk) — script needs adjusting"
}

check_cutoff() {
  [ -n "${1:-}" ] || die "usage: $0 $2 '2026-09-07 00:00+00'"
  prodv "SELECT '$1'::timestamptz" >/dev/null || die "CUTOFF '$1' is not a valid timestamp"
}

load_state() {
  [ -f "$STATE" ] || die "no $STATE — run 'verify' first"
  # shellcheck disable=SC1090
  . "$STATE"
  [ -n "${SNAP_MAX:-}" ] && [ -n "${SNAP_COUNT:-}" ] || die "$STATE is incomplete — re-run 'verify'"
}

do_check() {
  local rows d
  check_pk
  archv "SELECT 1" >/dev/null || die "cannot reach $ARCH_DB on $ARCH_HOST (check /root/.pgpass)"
  echo "Archive reachable: $ARCH_USER@$ARCH_HOST/$ARCH_DB"

  check_cols
  echo "Columns match, all will be copied: $COLS"

  if [ "$(archv "SELECT to_regclass('public.$STAGE') IS NOT NULL")" = "t" ]; then
    echo "NOTE: $STAGE already exists on the archive ($(archv "SELECT count(*) FROM $STAGE") rows)."
  fi

  echo
  echo "Planner estimates of rows to keep on prod (≈150 bytes/row on disk incl. indexes):"
  for d in 7 30 60 90 180; do
    rows=$(prod -At -c "EXPLAIN (FORMAT JSON) SELECT 1 FROM io_records WHERE timestamp >= now() - interval '$d days'" \
           | grep -o '"Plan Rows": [0-9]*' | head -1 | grep -o '[0-9]*$')
    printf "  last %3d days: ~%'d rows, ~%d MB\n" "$d" "$rows" $(( rows * 150 / 1024 / 1024 ))
  done
  echo
  df -h /
}

do_copy() {
  check_pk
  check_cols
  [ "$(archv "SELECT to_regclass('public.$STAGE') IS NULL")" = "t" ] \
    || die "$STAGE already exists on the archive. If this is a retry after a failed copy, DROP TABLE $STAGE there first."

  # LIKE copies columns and NOT NULLs only: no sequence, no indexes, so the load is fast.
  arch -c "CREATE TABLE $STAGE (LIKE io_records)"
  echo "$(date -Is) copying prod io_records -> $ARCH_HOST/$ARCH_DB.$STAGE"
  prod -c "\copy (SELECT $COLS FROM io_records) TO STDOUT" \
    | arch -c "\copy $STAGE ($COLS) FROM STDIN"
  echo "$(date -Is) data loaded, building indexes on the archive"
  arch -c "ALTER TABLE $STAGE ADD PRIMARY KEY (id)"
  arch -c "CREATE INDEX ${STAGE}_timestamp ON $STAGE (timestamp)"
  arch -c "ANALYZE $STAGE"
  echo "$(date -Is) copy done. Next: $0 verify"
}

do_verify() {
  local snap_max a p
  check_pk
  snap_max=$(archv "SELECT max(id) FROM $STAGE")
  [ -n "$snap_max" ] || die "archive $STAGE is empty"
  echo "$(date -Is) counting archive rows"
  a=$(archv "SELECT count(*) FROM $STAGE")
  echo "$(date -Is) counting prod rows with id <= $snap_max (full scan, be patient)"
  p=$(prodv "SELECT count(*) FROM io_records WHERE id <= $snap_max")
  echo "  archive: $a"
  echo "  prod   : $p"
  [ "$a" = "$p" ] || die "counts differ by $(( p - a )) — do NOT swap. Send this output over."
  printf 'SNAP_MAX=%s\nSNAP_COUNT=%s\n' "$snap_max" "$a" > "$STATE"
  echo "$(date -Is) verified. Next: $0 swap '<cutoff>' (ingest can keep running)"
}

# Loads rows >= CUTOFF with id <= TOP_MAX (the highest id in the old table).
# Ingest keeps running: its rows in the new table get ids above TOP_MAX from
# the shared sequence, so the two never overlap.
do_restore() {
  local cutoff=$1 cur want got
  load_state
  [ -n "${TOP_MAX:-}" ] || die "no TOP_MAX in $STATE — swap never reached the rename, nothing to restore"
  [ "$(prodv "SELECT to_regclass('public.io_records_old') IS NULL")" = "t" ] \
    || die "io_records_old still exists — finish 'swap' first"
  check_cols
  cur=$(prodv "SELECT count(*) FROM io_records WHERE id <= $TOP_MAX")
  [ "$cur" = "0" ] || die "prod already has $cur rows with id <= $TOP_MAX — restore already ran (it is all-or-nothing)"
  want=$(archv "SELECT count(*) FROM $STAGE WHERE id <= $TOP_MAX AND timestamp >= '$cutoff'")
  echo "$(date -Is) loading $want rows (timestamp >= $cutoff) back into prod, alongside live ingest"
  arch -c "\copy (SELECT $COLS FROM $STAGE WHERE id <= $TOP_MAX AND timestamp >= '$cutoff' ORDER BY id) TO STDOUT" \
    | prod -c "\copy io_records ($COLS) FROM STDIN"
  got=$(prodv "SELECT count(*) FROM io_records WHERE id <= $TOP_MAX")
  [ "$got" = "$want" ] || die "loaded $got rows, expected $want — send this output over"

  if [ -s "$FKFILE" ]; then
    # NOT VALID: enforced for every new row, existing rows not re-scanned.
    echo "$(date -Is) re-adding foreign keys"
    prod < "$FKFILE"
    rm -f "$FKFILE"
  fi
  prod -c "ANALYZE io_records"
  echo "$(date -Is) DONE: reloaded $got rows."
  df -h /
}

# Refuse anything the rename swap would silently get wrong.
swap_preflight() {
  local v
  v=$(prodv "SELECT string_agg(DISTINCT c.relname, ', ') FROM pg_depend d
             JOIN pg_rewrite r ON r.oid = d.objid JOIN pg_class c ON c.oid = r.ev_class
             WHERE d.refobjid = 'io_records'::regclass AND c.oid <> 'io_records'::regclass")
  [ -z "$v" ] || die "views depend on io_records ($v) — they would stay bound to the old table"
  v=$(prodv "SELECT string_agg(tgname, ', ') FROM pg_trigger WHERE tgrelid = 'io_records'::regclass AND NOT tgisinternal")
  [ -z "$v" ] || die "io_records has triggers ($v), which CREATE TABLE LIKE does not copy"
  v=$(prodv "SELECT string_agg(conname || ' on ' || conrelid::regclass::text, ', ') FROM pg_constraint
             WHERE confrelid = 'io_records'::regclass AND contype = 'f'")
  [ -z "$v" ] || die "other tables have foreign keys to io_records ($v)"
  v=$(prodv "SELECT attidentity FROM pg_attribute WHERE attrelid = 'io_records'::regclass AND attname = 'id'")
  [ -z "$v" ] || die "io_records.id is an identity column; LIKE would start a fresh sequence and reuse ids"
  [ -n "$(prodv "SELECT pg_get_serial_sequence('io_records', 'id')")" ] \
    || die "io_records.id has no owned sequence — check its default"
}

# No downtime: ingest keeps writing throughout.
#   1. One short transaction renames io_records -> io_records_old and puts an
#      empty clone (same columns, defaults, sequence, indexes, owner, grants)
#      in its place. Ingest's next INSERT lands in the clone.
#   2. io_records_old is now frozen, so its tail (id > SNAP_MAX) is copied to the
#      archive and checked exactly.
#   3. Typed confirmation, then io_records_old is dropped (frees the disk) and
#      rows >= CUTOFF are loaded back into the live table.
# Re-runnable: if io_records_old already exists, step 1 is skipped.
do_swap() {
  local cutoff=$1 seq owner grants p_new a_new p_max a_max keep ans i
  check_pk
  check_cols
  load_state

  if [ "$(prodv "SELECT to_regclass('public.io_records_old') IS NULL")" = "t" ]; then
    swap_preflight
    owner=$(prodv "SELECT quote_ident(pg_get_userbyid(relowner)) FROM pg_class WHERE oid = 'io_records'::regclass")
    grants=$(prodv "SELECT string_agg(format('GRANT %s ON io_records_new TO %s;', a.privilege_type,
                      CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END), ' ')
                    FROM pg_class c, aclexplode(c.relacl) a
                    WHERE c.oid = 'io_records'::regclass AND a.grantee <> c.relowner")
    echo "$(date -Is) swapping in an empty io_records (ingest keeps running)"
    for i in 1 2 3 4 5; do
      if prod -c "BEGIN; SET LOCAL lock_timeout = '5s';
                  CREATE TABLE io_records_new (LIKE io_records INCLUDING ALL);
                  ALTER TABLE io_records_new OWNER TO $owner; $grants
                  ALTER TABLE io_records RENAME TO io_records_old;
                  ALTER TABLE io_records_new RENAME TO io_records;
                  COMMIT;"; then
        break
      fi
      [ "$i" = 5 ] && die "could not get the lock on io_records after 5 tries — nothing changed, try again"
      echo "  lock busy, retrying ($i/5)"; sleep 3
    done
    sleep 2
    echo "  new rows since swap: $(prodv "SELECT count(*) FROM io_records")"
  else
    echo "io_records_old already exists — resuming after the rename"
  fi

  p_max=$(prodv "SELECT coalesce(max(id), 0) FROM io_records_old")
  { grep -v '^TOP_MAX=' "$STATE" || true; printf 'TOP_MAX=%s\n' "$p_max"; } > "$STATE.tmp" && mv "$STATE.tmp" "$STATE"

  echo "$(date -Is) copying rows written since the copy (id > $SNAP_MAX) to the archive"
  arch -c "DELETE FROM $STAGE WHERE id > $SNAP_MAX"   # makes a re-run safe
  prod -c "\copy (SELECT $COLS FROM io_records_old WHERE id > $SNAP_MAX ORDER BY id) TO STDOUT" \
    | arch -c "\copy $STAGE ($COLS) FROM STDIN"

  p_new=$(prodv "SELECT count(*) FROM io_records_old WHERE id > $SNAP_MAX")
  a_new=$(archv "SELECT count(*) FROM $STAGE WHERE id > $SNAP_MAX")
  a_max=$(archv "SELECT coalesce(max(id), 0) FROM $STAGE")
  [ "$p_new" = "$a_new" ] && [ "$p_max" = "$a_max" ] \
    || die "top-up mismatch (prod $p_new rows / max id $p_max, archive $a_new / $a_max). Nothing dropped; io_records_old kept."
  keep=$(archv "SELECT count(*) FROM $STAGE WHERE timestamp >= '$cutoff'")

  echo
  echo "  archive $STAGE holds : $(( SNAP_COUNT + a_new )) rows (complete copy of the old table)"
  echo "  will reload on prod  : $keep rows (timestamp >= $cutoff)"
  echo "  will drop on prod    : $(( SNAP_COUNT + a_new - keep )) rows"
  echo
  read -r -p "Type DROP to delete io_records_old on prod and reload the kept rows: " ans
  [ "$ans" = "DROP" ] || die "aborted. Ingest is writing to the new io_records; io_records_old is kept. Re-run swap to finish."

  prodv "SELECT string_agg(format('ALTER TABLE io_records ADD CONSTRAINT %I %s NOT VALID;', conname, pg_get_constraintdef(oid)), E'\n')
         FROM pg_constraint WHERE conrelid = 'io_records_old'::regclass AND contype = 'f'" > "$FKFILE"
  seq=$(prodv "SELECT pg_get_serial_sequence('io_records_old', 'id')")
  # The sequence belongs to the old table's id column; move it or DROP takes it too.
  prod -c "BEGIN;
           ALTER SEQUENCE $seq OWNED BY io_records.id;
           DROP TABLE io_records_old;
           ALTER INDEX IF EXISTS io_records_new_pkey RENAME TO io_records_pkey;
           COMMIT;"
  echo "$(date -Is) io_records_old dropped."
  df -h /
  do_restore "$cutoff"
}

case "${1:-}" in
  check)   do_check ;;
  copy)    do_copy ;;
  verify)  do_verify ;;
  swap)    check_cutoff "${2:-}" swap;    do_swap "$2" ;;
  restore) check_cutoff "${2:-}" restore; do_restore "$2" ;;
  *) die "usage: $0 check | copy | verify | swap CUTOFF | restore CUTOFF" ;;
esac
