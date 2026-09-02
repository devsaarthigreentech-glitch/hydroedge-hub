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
journey. What is there instead: the installed position, a circle showing how far
the fixes spread over 7 / 30 / 90 days, the last fix time, and the movement
verdict.

A 3D genset model on the map is the intended next step; this flat marker version
carries the position and drift logic it would sit on.
