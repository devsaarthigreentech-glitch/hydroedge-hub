# DG analytics — what a generator can and cannot tell you

A diesel generator bolted to a plinth is not a vehicle, but until now it was
reported as one: distance travelled, km/L, trip analysis, idle fuel wasted. Every
one of those describes travel a genset never does, and three of them were
computed from signals that do not carry what the label claimed.

This note covers what changed and why. Code: `src/lib/dg-metrics.ts`,
`src/app/api/analytics/dg/route.ts`, `DgAnalyticsTab.tsx`, `DgMapTab.tsx`.

## The CAN Bus panel was not CAN data

The telemetry tab showed a "CAN Bus Data" section on FMB120 units with values
like an engine worktime of 2,665,580,198 minutes and an AdBlue level of 1014%.

`getIOMap()` in `src/app/api/telemetry/[deviceId]/route.ts` only had real maps
for `FMC650` and `FMB150`. Everything else fell through to `SHARED_IO_MAP`,
which carried LV-CAN adapter meanings for ids 14 / 18 / 19 / 24. On an FMB1YX
with no adapter fitted those ids mean something else entirely:

| Was labelled | IO | Actually is | Symptom |
| --- | --- | --- | --- |
| `can.engine.worktime` | 14 | ICCID part 2 | 2,665,580,198 min ≈ 5,000 years |
| `can.fuel.rate` | 18 | Accelerometer Y (mG) | a fuel rate on a stopped engine |
| `can.adblue.level.percent` | 19 | Accelerometer Z (mG) | **1014%** — i.e. 1014 mG, gravity |
| `can.vehicle.speed` | 24 | GNSS speed | 0 km/h, right by coincidence |

The 1014 is the proof: a stationary device reads ≈1 g on whichever axis faces
down.

**Fix.** The CAN meanings moved out of `SHARED_IO_MAP` into
`CAN_ADAPTER_IO_MAP`, which `getIOMap()` merges **only** for device types whose
units actually carry an adapter (`FMC650`, `FMB150`). `FMB120` got a proper
`FMB120_ONLY` map with the real FMB1YX meanings, and an unrecognised
`device_type` now gets the bare shared map with no CAN assumptions — so it shows
fewer parameters rather than wrong ones.

Adding a type to the CAN merge asserts the adapter is physically fitted. Getting
that wrong feeds accelerometer noise into fuel analytics.

> One device, `SGT-GX-0225-0007`, has `device_type` set to the literal string
> `Teltonika`. Set it to its real model on the Edit tab or it stays on the
> conservative fallback map.

## Why there is no fuel figure for a DG

Fuel would have to come from a CAN adapter on the genset controller. These units
do not have one, so the analytics show no fuel rather than a number derived from
an accelerometer axis. If an adapter is ever fitted, add that device type to the
`CAN_ADAPTER_IO_MAP` merge in `getIOMap()` and the fuel path in
`src/lib/dg-metrics.ts` becomes available.

## What the DG Analytics tab shows

`AnalyticsTab` delegates to `DgAnalyticsTab` when `asset_name === 'DG'`. The
window picker (1D / 7D / 14D / custom range) is shared; the sections are not.

| Figure | Source | Rule |
| --- | --- | --- |
| Engine-on time | Din.1 (IO 1) | Sum of gaps between consecutive ON samples, gaps over 5 min discarded — same rule as the daily rollup in migration 001. |
| Under load | Din.1 = ON and Ain.1 > 2 A | Time actually producing. |
| Starts / longest run | Din.1 edges | OFF→ON transitions; runs under 60 s ignored as contact bounce. |
| Avg / peak output | Ain.1 (IO 9) ÷ divisor | 47 on FMC650, 83 on FMB150/FMB120. |
| Supply / battery / GSM | IO 66, 67, 21 | Minimum supply and battery, average signal. |
| Data availability | any packet | Clock hours with at least one packet, against the window length. |
| Position spread | `gps_records` | 2nd–98th percentile spread of fixes. |

Three things are flagged in the banner strip: the engine running with output
under 2 A for more than half its run time, average output outside ±10% of the
commissioned setpoint, and movement (below).

**Removed for DG:** total distance, fuel consumed, km/L against a baseline, CO₂
impact, trip analysis, idle time and idle fuel wastage. The three endpoints
behind them (`/api/analytics`, `/trips`, `/idle`) are no longer even called for a
DG — they are the expensive queries on that page and none of their output was
rendered.

## Performance — why the tab timed out, and what fixes it

The first version ran one statement with eight CTEs over `io_records`. On a 46 GB
/ 314 M-row table sharing a 1 vCPU host with the GPS ingest, that is a single
long query — and one timeout returned `Error: timeout exceeded` with nothing
else, throwing away the engine run time along with everything slow.

Four things changed, in order of how much they matter:

**1. Build the index from migration 002.** This is the real fix and it is not
code. Every query here is `device_id = ? AND io_id = ? AND timestamp BETWEEN ?`,
which is exactly what `idx_io_records_device_io_ts (device_id, io_id, timestamp)`
serves. Without it Postgres scans backwards on `(device_id, timestamp)`
discarding rows by `io_id`, once per signal. Check whether it exists:

```bash
psql -c "SELECT indexrelname, idx_scan FROM pg_stat_user_indexes WHERE indexrelname = 'idx_io_records_device_io_ts';"
```

If it returns nothing, build it — read the warnings in the migration first, it
takes hours on this hardware and needs disk headroom:

```bash
node scripts/apply-migration.js db/migrations/002_analytics_source_indexes.sql --no-transaction
```

**2. One query per signal group, settled independently.** `engine` (Din.1),
`output` (Ain.1), `health` (supply/battery/GSM/coverage) and `movement` (GPS) now
run as separate statements. A slow group blanks its own tiles and is named in the
response's `degraded` list; the rest of the page is still correct. Each group has
a 12 s ceiling, under the pool's 15 s `statement_timeout`.

**3. The Ain.1 ↔ Din.1 self-join is gone.** Output current used to be joined to a
same-instant `Din.1 = 1` row to prove the engine was running. That was the most
expensive thing on the page and proved nothing: a genset cannot put out more than
2 A stopped, so `amps > 2` already implies running. A join of two 100 k-row
ranges became one range scan.

**4. No second connection pool.** The route briefly opened its own pool with a
longer `statement_timeout`. On a host already tight on connections that produced
`timeout exceeded when trying to connect` — a *connection* timeout, not a query
one. It now uses the shared pool from `@/lib/db` like everything else.

Also: keeping `scripts/rollup-daily-summary.js` on cron means
`device_daily_summary.engine_on_hours` covers recent days, and the route falls
back to it for the headline figure when the live scan cannot finish.

```
*/15 * * * *  cd /srv/app && node scripts/rollup-daily-summary.js --today --changed-only
20   0 * * *  cd /srv/app && node scripts/rollup-daily-summary.js --days 3
```

If the tab is still slow after all this, the next step is extending
`device_daily_summary` with the DG columns (load hours, starts, amps, supply) and
serving the whole tab from the rollup — the same treatment the vehicle analytics
already had.

## Movement

Distance means one thing for a genset: has somebody moved it. `DG_MOVED_KM` is
**20 km**, set deliberately well clear of the noise floor — consumer GNSS wanders
by tens of metres while standing still, so a threshold near zero would flag every
unit every week. Under 10 usable fixes the spread is reported as unknown rather
than guessed.

The same constant drives the Analytics banner, the Map tab and the weekly report,
so all three agree. Change it in `src/lib/dg-metrics.ts` and everything follows.

## Map tab

`MapTab` delegates to `DgMapTab` for a DG. Route playback is gone — a generator
has no route, and the polyline was GNSS jitter around one point drawn as a
journey.

There is **no time-range picker**. "Where is this unit installed" has one answer,
not three; the drift check behind it runs over a fixed 30 days
(`DRIFT_WINDOW_DAYS`) and is never surfaced as a control.

The base layer toggles between **satellite** (default) and street. A genset
usually sits in a yard or a field where the street map is empty white space, so
imagery is what actually confirms which plot the unit is on. Zoom opens at 16
rather than 17 — one notch out is the difference between recognisable
surroundings and a featureless square.

The drift figure comes from `?only=movement`, which reads `gps_records` and
nothing else, so a slow `io_records` query can no longer blank the map. The
marker is drawn from the device row and appears without waiting for it.

A 3D genset model instead of the plain marker is the intended next step; this
flat version carries the position and drift logic it would sit on.
