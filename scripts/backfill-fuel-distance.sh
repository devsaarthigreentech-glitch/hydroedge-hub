#!/usr/bin/env bash
# ============================================================================
# backfill-fuel-distance.sh — chunked distance+fuel backfill for one device
# ----------------------------------------------------------------------------
# Runs scripts/backfill-fuel-distance.sql once per chunk of IST days, newest
# chunk first, so the days the UI asks for most land soonest and a run that is
# interrupted still leaves the recent window usable.
#
# Measured on SGT-GD-0226-0015 (a ~8s reporting interval, no
# idx_io_records_device_io_ts): ~11s per device-day, so 30 days ≈ 5.5 min and
# the default 180 days ≈ 33 min. Long enough that it belongs in tmux:
#
#   tmux new -s backfill
#   ./scripts/backfill-fuel-distance.sh 53f93b3a-aa30-4d2a-92d8-9a0def238f47
#   # detach with Ctrl-B then D; reattach with: tmux attach -t backfill
#
# Usage:
#   ./scripts/backfill-fuel-distance.sh <device-uuid> [days] [chunk]
#     days   total IST days back from today, inclusive (default 180)
#     chunk  days per statement (default 30) — lower it if a chunk runs long
#            enough to be uncomfortable, it changes nothing but granularity
#
# Env overrides:
#   ENV_FILE   path to the .env.local holding DB_* (default: repo root)
#
# Safe to re-run: every chunk is an idempotent upsert.
# ============================================================================

set -euo pipefail

DEVICE="${1:-}"
DAYS="${2:-180}"
CHUNK="${3:-30}"

if [ -z "$DEVICE" ]; then
  sed -n '2,30p' "$0" | sed 's/^# \?//'
  exit 2
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SQL="$ROOT/scripts/backfill-fuel-distance.sql"
ENV_FILE="${ENV_FILE:-$ROOT/.env.local}"

[ -f "$SQL" ] || { echo "fatal: $SQL not found"; exit 1; }
[ -f "$ENV_FILE" ] || { echo "fatal: $ENV_FILE not found — set ENV_FILE=/path/to/.env.local"; exit 1; }
[ -s "$ENV_FILE" ] || { echo "fatal: $ENV_FILE is EMPTY — restore it first"; exit 1; }

# Read only the DB_* keys. Deliberately not `source`: .env.local is not a shell
# script and must never be executed.
read_env() {
  local key="$1"
  sed -n "s/^[[:space:]]*${key}[[:space:]]*=[[:space:]]*//p" "$ENV_FILE" \
    | head -1 | sed 's/^["'\'']//; s/["'\'']$//'
}

DB_HOST="$(read_env DB_HOST)";  DB_HOST="${DB_HOST:-localhost}"
DB_PORT="$(read_env DB_PORT)";  DB_PORT="${DB_PORT:-5432}"
DB_NAME="$(read_env DB_NAME)"
DB_USER="$(read_env DB_USER)"
DB_PASSWORD="$(read_env DB_PASSWORD)"

[ -n "$DB_NAME" ] || { echo "fatal: DB_NAME missing from $ENV_FILE"; exit 1; }
[ -n "$DB_USER" ] || { echo "fatal: DB_USER missing from $ENV_FILE"; exit 1; }

export PGPASSWORD="$DB_PASSWORD"
PSQL=(psql -X -q -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME")

# ── Resolve the device, and with it the two formula choices ─────────────────
# mileage_io: FMC650 reports the odometer on IO 216, everything else on 16.
# use_can: the CAN rate method is gated on FMB150 in the live route
# (src/app/api/analytics/route.ts). Matching that gate here keeps the rollup and
# the live path from disagreeing about which devices even have a CAN figure.
META="$("${PSQL[@]}" -At -F'|' -c "
  SELECT device_name,
         device_type,
         CASE WHEN device_type = 'FMC650' THEN 216 ELSE 16 END,
         CASE WHEN device_type = 'FMB150' THEN 1 ELSE 0 END
    FROM devices WHERE id = '$DEVICE' AND deleted_at IS NULL")"

[ -n "$META" ] || { echo "fatal: device not found (or deleted): $DEVICE"; exit 1; }

IFS='|' read -r DEV_NAME DEV_TYPE MILEAGE_IO USE_CAN <<<"$META"

# ── Chunk boundaries in IST days ────────────────────────────────────────────
# `date -u` on a bare YYYY-MM-DD keeps the arithmetic away from the host's own
# timezone; TODAY is already the IST calendar day.
TODAY="$(TZ=Asia/Kolkata date +%F)"
OLDEST="$(date -u -d "$TODAY -$((DAYS - 1)) days" +%F)"

echo "device   : ${DEV_NAME:-$DEVICE} ($DEV_TYPE)"
echo "formulas : mileage IO $MILEAGE_IO, CAN rate $([ "$USE_CAN" = 1 ] && echo enabled || echo disabled)"
echo "window   : $OLDEST .. $TODAY  (${DAYS} IST days, ${CHUNK}/chunk)"
echo

started=$(date +%s)
i=0
while [ $((i * CHUNK)) -lt "$DAYS" ]; do
  to_off=$((i * CHUNK))
  from_off=$((to_off + CHUNK - 1))
  [ "$from_off" -gt $((DAYS - 1)) ] && from_off=$((DAYS - 1))

  c_from="$(date -u -d "$TODAY -$from_off days" +%F)"
  c_to="$(date -u -d "$TODAY -$to_off days" +%F)"

  echo "[$(date +%H:%M:%S)] chunk $((i + 1)): $c_from .. $c_to"
  t0=$(date +%s)

  # statement_timeout/work_mem are per-connection, so they are set here rather
  # than in the .sql — psql runs each -f in one session, but the -c below would
  # otherwise get its own.
  "${PSQL[@]}" \
    -c "SET statement_timeout = 0; SET work_mem = '64MB';" \
    -v dev="$DEVICE" -v c_from="$c_from" -v c_to="$c_to" \
    -v mileage_io="$MILEAGE_IO" -v use_can="$USE_CAN" \
    -f "$SQL"

  echo "           done in $(( $(date +%s) - t0 ))s"
  i=$((i + 1))
done

echo
echo "[$(date +%H:%M:%S)] all chunks done in $(( $(date +%s) - started ))s"
echo

# ── Coverage report ─────────────────────────────────────────────────────────
# rows_present must equal DAYS. Anything less and serveFromSummary() still falls
# back to the live scan, because the gate needs a row for every requested day.
"${PSQL[@]}" -c "
  SELECT COUNT(*)                                     AS rows_present,
         MIN(day) AS oldest, MAX(day) AS newest,
         COUNT(*) FILTER (WHERE distance_km > 0)      AS days_with_distance,
         COUNT(*) FILTER (WHERE fuel_litres_can > 0
                             OR fuel_litres_level > 0) AS days_with_fuel,
         ROUND(SUM(distance_km), 2)                   AS total_km,
         ROUND(SUM(GREATEST(fuel_litres_can, fuel_litres_level)), 2) AS total_litres,
         ROUND(SUM(distance_km)
               / NULLIF(SUM(GREATEST(fuel_litres_can, fuel_litres_level)), 0), 2) AS overall_kmpl,
         ROUND(SUM(GREATEST(fuel_litres_can, fuel_litres_level)) * 2.68, 2) AS total_co2_kg
    FROM device_daily_summary
   WHERE device_id = '$DEVICE'"
