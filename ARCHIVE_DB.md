# Archive database & daily summary — handoff

Context for a new session. Covers: how to reach the archive Postgres, what was
built around it and `device_daily_summary` (Aug 2026), what is still open, and
the exact commands to establish **current** state before doing anything.

> This doc records what was true when the work was done (2026-08-24/25) plus
> one later discovery (2026-10-07). **Run §6 first** — do not assume any
> "current state" line below still holds.

---

## 1. The two boxes

| | Production | Archive |
|---|---|---|
| Provider / hostname | DigitalOcean `ubuntu-s-1vcpu-1gb-blr1-01` | Hostinger `srv626585` |
| IP | `143.244.135.19` | `145.223.19.24` |
| Size | 1 vCPU / 1 GB RAM — fragile | small VPS |
| Database | `sgt_hydroedge` | `sgt_hydroedge_archive` (+ maybe staging table `io_records_prod`, §5) |
| Repo | `~/sgt-admin-panel/hydroedge-hub`, deployed by `git pull origin main && npm run build && pm2 restart all` | none |

**Neither database is reachable from the Windows dev box.** `.env.local` there
points at localhost and nothing listens, and the archive's `pg_hba` only admits
the prod droplet's IP. A session working from the repo must hand the user
commands to run and read the output back. Do not spend time trying to connect.

## 2. Accessing the archive

**On the archive box itself** (as root). Peer auth, so `-U` fails, switch user instead:

```bash
sudo -u postgres psql -l                                  # list databases
sudo -u postgres psql -d sgt_hydroedge_archive            # interactive
```

**From the prod droplet**, over the network with TLS (this is the path the app uses):

```bash
psql "host=145.223.19.24 port=5432 dbname=sgt_hydroedge_archive user=sgt_admin sslmode=require"
```

The password is in `/root/.pgpass` on prod and in prod's `.env.local` as
`ARCHIVE_DB_PASSWORD`. Never paste it into chat or commit it.

### What `sgt_hydroedge_archive` contains

- **Only `io_records`.** ~116.7 M rows, 26 GB. **No `devices`, no `gps_records`.**
  So you can't look a device up by IMEI there. Use the UUID from prod. Trips,
  idle and GPS distance can't be computed from it.
- Same 10 columns as prod (confirmed 2026-10-07): `id, gps_record_id, device_id,
  timestamp, io_id, io_name, io_value, io_value_text, unit, io_type`. The app only
  reads the first six, but any copy must carry all ten.
- Indexes: `io_records_pkey (id)`, `idx_io_device_io_id (device_id, io_id)`,
  `idx_io_device_io_timestamp (device_id, io_id, timestamp DESC)`,
  `idx_io_device_timestamp (device_id, timestamp DESC)`, `idx_io_gps_record (gps_record_id)`.
- Coverage checked for two devices:
  - **SGT-GD-0226-0015**: `2026-02-15 12:57 UTC` → `2026-03-23 13:29 UTC` (37 IST days, no gaps)
  - **SGT-GD-0226-0016**: through `2026-03-24 00:00 IST`
  - Other devices are present but **unverified**.

### Query rules (learned the hard way)

1. **Always filter on `device_id` AND `io_id`.** A `device_id`-only `COUNT(*)` ran
   a parallel seq scan over 26 GB and took 4m51s. Adding `io_id = 16` makes it an
   index range scan.
2. **Use `MIN`/`MAX` on their own, not mixed with `COUNT(*)`**, so the index
   answers them from its endpoints.
3. **Timestamps are device RTC values**, not server time. Junk years (1970, 2185)
   exist in these tables. Bucket by month before trusting a range.
4. **Duplicate packets.** Devices retransmit AVL records and the ingest stores
   every copy under a different `gps_record_id`, with the same timestamp and
   byte-identical values (up to 13 copies of one instant). Collapse to one row per
   `timestamp` before counting or averaging anything (see §4).

## 3. Devices involved

| | SGT-GD-0226-0015 | SGT-GD-0226-0016 |
|---|---|---|
| UUID | `53f93b3a-aa30-4d2a-92d8-9a0def238f47` | `55f6f637-5bc5-4d9b-8118-0083ff4528c5` |
| IMEI | `353201355703940` | — |
| Type | FMB150 | handled in another session, check `devices.device_type` |
| Report cadence | ~8 s (~10k packets/day) | ~2.5 min (572 rows on 2026-03-01) |
| Odometer | IO 16 (metres, cumulative) | check |
| Fuel | IO 18 = rate (L/h × 0.1), sentinel 65535; **no IO 107** | check, the other session suspected a July fuel issue |
| Engine | IO 1 (DIN1) | IO 1 |

The odometer on 0015 is continuous across both databases: archive ends at
2,724 km in March, prod is at ~12,097 km in August, ~80 km/day in between.

## 4. What was built (Aug 2026)

### `device_daily_summary` (prod)

- Table and `refresh_device_daily_summary(uuid, date)` come from
  `db/migrations/001_device_daily_summary.sql`. One row per device per IST day.
- `GET /api/analytics` serves from it when the window is whole IST days
  (`src/lib/analytics-window.ts`). The **coverage gate** needs a row for *every*
  requested day. One missing day sends the whole window to the live raw scan,
  which on dense devices hits the pool's 15 s `query_timeout`.
- Only `distance_km, fuel_litres_level, fuel_litres_can, can_fuel_readings,
  is_partial, computed_at` are read. Trips and idle have their own routes and
  always scan raw.

**`refresh_device_daily_summary` is unusable on dense devices.** It took 6.5 min
for one day of 0015, because prod lacks the `(device_id, io_id, timestamp)` index
(migration 002 was never applied) and the function also computes
GPS/trips/idle. Instead we use:

- `scripts/backfill-fuel-distance.sql` + `.sh`: distance + fuel only, set-based,
  newest chunk first. ~11 s per device-day. Usage:
  `./scripts/backfill-fuel-distance.sh <uuid> [days=180] [chunk=30]`. It resolves
  `mileage_io` (216 for FMC650, else 16) and the CAN gate (FMB150 only) from
  `devices`, and reads `DB_*` from `.env.local`. Its `ON CONFLICT` deliberately
  leaves trip/idle/GPS columns alone.
- Consequence: trip/idle/GPS columns stay 0 for rows written this way. Nothing
  reads them today.

**Fuel formula.** `fuel_litres_can = engine_on_hours × avg(IO18 × 0.1 while IO1 = 1)`,
with `IO18 < 60000` filtering the sentinel. `fuel_litres_level = (MAX−MIN) × 0.1`
of IO 107 where present. The API prefers CAN when `can_fuel_readings > 0`. kmpl and
CO₂ (`× 2.68 kg/L`) are derived on read, never stored.

**Duplicate-packet fix.** The live route joins `io_records` to itself on timestamp
(`src/app/api/analytics/route.ts`, `JOIN io_records d`). That emits the cross
product of the duplicates. On 0015 2026-08-22 it gave 13,525 "readings" for
3,303 real ones and pushed avg L/h from 9.25 to 10.40. The distortion runs in
**both** directions day to day. The backfill script pivots to one row per
timestamp with `MAX() FILTER`, which is exact because duplicates never disagree on
value. Distance and engine-hours are unaffected either way.

Known-good values to verify against (0015, 2026-08-22): `distance_km 185.96`,
`fuel_litres_can 67.32`, `can_fuel_readings 3303`, `engine_on_hours 7.279`.

### Done

- Backfilled 0015 for 2026-02-26 → 2026-08-24 (180 rows, 27 min). Totals:
  10,163.89 km, 3,490.34 L, 2.91 km/L.
- `analytics-window.ts`: the date picker sends an inclusive `23:59` end, which was
  rejected, so **every** custom range went live. Both conventions are now accepted
  (commit `8c19435`).
- `AnalyticsTab.tsx`: clears stale data when a fetch fails. Before the fix it
  showed the previous window's totals under the new label.
- `scripts/db-status.js`: `to_regproc` → `to_regprocedure`. The old call always
  reported the function missing.
- `scripts/verify-daily-summary.js`: added `--device <uuid|imei|name>`.
- Commands were given to import 0015's archive history (2026-02-15 → 2026-03-23)
  into prod as computed summary rows only, with the merge rule "fill only rows
  where prod is all zeros". **Whether the user ran it is unconfirmed**, see §6.

### Logs & Messages read from the archive (commit `5450a7a`)

- `src/lib/archive-db.ts`: a lazy second pool (`max: 4`, 8 s connect, TLS) plus
  `planLogSources()`.
- `src/app/api/io-logs/[deviceId]/route.ts`: the only endpoint `LogsTab` calls.
  It queries only `io_id, io_value, timestamp` from `io_records`. Windows entirely
  before the cutover go to the archive, windows after go to prod, and straddling
  windows query both and merge (7-day cap, `LIMIT 1000`). The response carries
  `sources: ['primary'|'archive']`.
- Opt-in. All of `ARCHIVE_DB_HOST`, `ARCHIVE_CUTOVER_UTC` and `ARCHIVE_DEVICE_IDS`
  must be set (see `.env.example`). Cutover is `2026-03-24T00:00:00+05:30`.
  Only 0015 and 0016 are listed.
- If the archive fails, the request returns 500 rather than silently returning the
  prod half.
- Verified on prod: 0015 Feb → `['archive'] 1000`, 0015 Aug → `['primary'] 1000`,
  0016 Mar → `['archive'] 572`.
- **Expected empty windows** where neither database has rows: 0015
  2026-03-24 → 03-27, and 0016 2026-03-24 00:00 → 11:28 IST.

## 5. Open issues (as of last contact)

1. **The summary goes stale every IST midnight (18:30 UTC).** Today's row goes
   missing, the coverage gate closes, and 1D/7D/14D fall back to the live scan and
   time out. Today's partial row also freezes at its last compute. No rollup cron
   existed (only `/api/alerts/check`). Proposed:
   ```
   40 18 * * *  /usr/bin/flock -n /tmp/rollup.lock /root/sgt-admin-panel/hydroedge-hub/scripts/backfill-fuel-distance.sh <uuid> 3 3 >> /var/log/rollup.log 2>&1
   15 */2 * * * /usr/bin/flock -n /tmp/rollup.lock /root/sgt-admin-panel/hydroedge-hub/scripts/backfill-fuel-distance.sh <uuid> 1 1 >> /var/log/rollup.log 2>&1
   ```
   Whether it was installed is unconfirmed. `crontab -l` will tell you.
2. **The live route still has the duplicate self-join** (still present in
   `analytics/route.ts` as of 2026-10-07). The other ~79 devices were rolled up
   with the old formula, so their CAN fuel is distorted and `?live=1` disagrees
   with the rollup. Size it with a per-device `COUNT(*) / COUNT(DISTINCT timestamp)`
   on IO 18 for FMB150s before re-rolling.
3. **Migration 002 index never applied on prod** (`(device_id, io_id, timestamp)`).
   This is the root cause of the slow function. Hours to build and needs disk.
4. **Prod disk full, 2026-10-07: `scripts/offload-io-records.sh`.** Prod disk
   (77 GB) hit 100% and Postgres stuck in crash recovery ("database system is in
   recovery mode", every login a 401). Cause: `io_records` at ~449 M rows / 63 GB
   of **live** data (38 GB heap + 25 GB indexes). An earlier bulk `DELETE` had
   rolled back when the disk filled, so `VACUUM` had nothing to reclaim. Short-term
   space came from `pm2 flush` and `journalctl --vacuum-size=100M`.

   The script moves the table off prod without `DELETE` (no WAL churn, no bloat):
   - `check`: tests the archive login (`/root/.pgpass`), confirms prod and archive
     `io_records` columns match, and estimates rows for 7/30/60/90/180-day cutoffs.
   - `copy`: pipes the **entire** prod `io_records` into a new staging table
     **`sgt_hydroedge_archive.io_records_prod`** (`CREATE TABLE … (LIKE io_records)`,
     loaded with no indexes, then `PK (id)` + `(timestamp)` built after). No
     downtime. Run in tmux.
   - `verify`: exact count on both sides for `id <= max(id)` of the copy. Writes
     `/var/tmp/io_offload.state` only if they match.
   - `swap CUTOFF`: **no downtime, ingest keeps running.** Preflight refuses
     dependent views, user triggers, inbound FKs, or an identity `id`. Then, in one
     short transaction (5 s `lock_timeout`, 5 retries), it creates
     `io_records_new (LIKE io_records INCLUDING ALL)` with the same owner and grants,
     renames `io_records → io_records_old` and `io_records_new → io_records`.
     Ingest's next INSERT lands in the empty table, and `id` keeps drawing from the
     same sequence. The frozen `io_records_old` tail (`id > SNAP_MAX`) is copied and
     checked exactly, `TOP_MAX` is recorded, and after a typed `DROP` the sequence is
     re-owned to the new table, `io_records_old` is dropped (frees the disk), and
     rows `>= CUTOFF AND id <= TOP_MAX` are reloaded. Outbound FKs are re-added
     `NOT VALID` after the reload. Re-runnable: it resumes if `io_records_old`
     exists. `restore CUTOFF` redoes only the reload.
   - Secondary indexes on the new table get auto names (`io_records_new_*_idx`),
     and only the pkey is renamed back. Nothing in the app references index names.
   - Column list is read from `information_schema` and must match on both sides.
     A hard-coded 6-column list would have silently dropped four columns.
   - Ingest rate at the time: ~1.4 M rows/day (~200 MB/day on disk). A 30-day
     cutoff keeps ~6 GB on prod, so retention has to become a recurring job.

   Why a staging table and not the archive's own `io_records`: no `CREATE DATABASE`
   right needed, no clash between prod ids and the archive's existing ids, a fast
   index-free load, and a place to filter (junk 2015/1970/2185 timestamps,
   duplicate packets, §2) before anything is merged into `io_records`.

   **If the swap has run, it changes everything above:**
   - Prod `io_records` before CUTOFF is gone, for **all** devices. It lives only in
     `io_records_prod` on the archive.
   - `io-logs` only routes 0015/0016, only before 2026-03-24, and only reads the
     archive's `io_records`, **not** `io_records_prod`. Every other device's logs
     before CUTOFF come back empty, not as an error, until filtered rows are merged
     into `io_records` and `ARCHIVE_DEVICE_IDS` / `ARCHIVE_CUTOVER_UTC` are widened.
   - The analytics live fallback and `backfill-fuel-distance.sh` both read prod
     `io_records`, so neither can recompute days before CUTOFF. Summary rows
     already written survive.
   - `io_records_prod` has only `(id)` and `(timestamp)` indexes, **no
     `(device_id, io_id, …)`**. Add one before per-device filtering work.
   - The archive box is being shut down, so filtered history must end up somewhere
     on DO (back in prod, or as compressed files in Spaces) before then.
   Before touching archive routing, find out which stage it reached (§6).

## 6. Establish current state — run these first

### On prod (`143.244.135.19`), as root

```bash
cd ~/sgt-admin-panel/hydroedge-hub && git log --oneline -5 && git status --short
crontab -l | grep -v '^#'
grep '^ARCHIVE_' .env.local | sed 's/PASSWORD=.*/PASSWORD=<set>/'
df -h /
cat /var/tmp/io_offload.state 2>/dev/null || echo "no offload state file (verify never ran)"
tail -20 /var/log/rollup.log 2>/dev/null || echo "no rollup log (cron never ran)"
```

```bash
sudo -u postgres psql -d sgt_hydroedge
```

```sql
-- Table sizes. Did the offload swap shrink io_records?
SELECT relname, n_live_tup, pg_size_pretty(pg_total_relation_size(relid)) AS size
FROM pg_stat_user_tables
WHERE relname IN ('io_records', 'gps_records', 'device_daily_summary');

-- Earliest raw row for 0015. ~2026-03-28 = not swapped; >= CUTOFF = swapped.
SELECT MIN(timestamp) FROM io_records
WHERE device_id = '53f93b3a-aa30-4d2a-92d8-9a0def238f47';

-- Was the migration 002 index ever built?
SELECT indexname FROM pg_indexes WHERE tablename = 'io_records';

-- Summary coverage for the two devices. Is today covered?
SELECT d.device_name, COUNT(*) AS rows, MIN(s.day), MAX(s.day),
       MAX(s.day) = (NOW() AT TIME ZONE 'Asia/Kolkata')::date AS covers_today,
       MAX(s.computed_at) AS last_computed
FROM device_daily_summary s JOIN devices d ON d.id = s.device_id
WHERE s.device_id IN ('53f93b3a-aa30-4d2a-92d8-9a0def238f47',
                      '55f6f637-5bc5-4d9b-8118-0083ff4528c5')
GROUP BY d.device_name;

-- Did 0015's archive import land? Expect pre_floor_rows = 11, recovered_days ≈ 26.
SELECT COUNT(*) FILTER (WHERE day < '2026-02-26') AS pre_floor_rows,
       COUNT(*) FILTER (WHERE day BETWEEN '2026-02-26' AND '2026-03-23'
                          AND distance_km > 0)    AS recovered_days
FROM device_daily_summary
WHERE device_id = '53f93b3a-aa30-4d2a-92d8-9a0def238f47';

-- Fleet-wide summary coverage
SELECT COUNT(*) AS rows, COUNT(DISTINCT device_id) AS devices, MIN(day), MAX(day)
FROM device_daily_summary;
```

API checks (on prod):

```bash
curl -s 'http://localhost:3000/api/analytics?device_id=53f93b3a-aa30-4d2a-92d8-9a0def238f47&days=14' | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("source"), d.get("summary"))'
```

```bash
curl -s 'http://localhost:3000/api/io-logs/53f93b3a-aa30-4d2a-92d8-9a0def238f47?io_ids=16&start=2026-02-16T00:00:00Z&end=2026-02-17T00:00:00Z' | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("sources"), d.get("count"))'
```

Expect `daily_summary` (anything else means the gate closed) and `['archive'] 1000`.

### On the archive (`145.223.19.24`), as root

```bash
df -h /
sudo -u postgres psql -d sgt_hydroedge_archive -c "SELECT relname, n_live_tup, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_stat_user_tables;"   # io_records_prod listed = offload copy started
```

## 7. Ground rules for whoever picks this up

- Prod is 1 vCPU / 1 GB and shares Postgres with the GPS ingest (python3 on TCP
  1883). One heavy query at a time, never parallel backfills, and anything over a
  few minutes goes in **tmux on the server**. The user's PC sleeping kills
  anything run from it.
- Time new queries with `\timing on` on a single day before running a range.
- Never write to prod summary rows without a known-good spot check (§4 values).
- Server clock is UTC and IST midnight is 18:30 UTC. Most "it worked an hour
  ago" analytics failures are the day rolling over.
