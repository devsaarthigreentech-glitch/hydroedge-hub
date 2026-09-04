# Weekly customer report

Every Monday morning each company gets one email summarising how its GreenX /
GreenDrive units ran over the previous Monday–Sunday week (IST). It is a
performance summary, not an alert feed — the alert digest in
[NOTIFICATIONS.md](NOTIFICATIONS.md) still handles faults day to day.

Route: `src/app/api/reports/weekly/route.ts`. Template: `src/lib/weekly-report.ts`.
Metrics: `src/lib/dg-metrics.ts` (shared with the Analytics tab — see
[DG_ANALYTICS.md](DG_ANALYTICS.md)).

## Setup

```bash
node scripts/apply-migration.js db/migrations/008_weekly_report.sql
```

Adds `devices.weekly_report` (the per-device override) and `weekly_report_log`
(the double-send guard). Idempotent. The route runs without it, but then every
device is treated as `auto` and nothing stops a second send for the same week.

## Which devices appear

A company can have far more devices assigned than running. The report only
lists units that are actually operational, decided per device:

| `devices.weekly_report` | Result |
| --- | --- |
| `never` | Left out, always. Alerts are unaffected. |
| `always` | Listed, always — shown as "No data" if it did not report. |
| `auto` (default) | Listed only when **all** of: `status = 'active'`; commissioned (`tested` is on, **or** it already carries an `SGT-Gx-…` series name); reported within **30 days** of the week's end. |

Change the override on the device's **Edit** tab ("Weekly Report"), or:

```bash
curl -X PATCH http://localhost:3000/api/devices/<uuid> -H 'Content-Type: application/json' -d '{"weekly_report":"never"}'
```

**Check before trusting it.** The dry run lists every device with the decision
and the reason:

```bash
curl "http://localhost:3000/api/reports/weekly?customer_id=<uuid>"
```

Only `DG` and `EOW` series are considered at all. Companies with
`customers.notifications_enabled = false` are skipped entirely, and the To list
follows the same rule as alerts: subscribed, active users with an email address,
support on CC.

## What is in it

Per unit, for the week. The engine and electrical figures are computed by
`src/lib/dg-metrics.ts`, the same module behind the Analytics tab, so the email
and the screen cannot quote different numbers for the same period.

| Figure | Source | Notes |
| --- | --- | --- |
| Engine-on time | Din.1 (IO 1) | Sum of gaps between consecutive ON samples, gaps over 5 min discarded — the same rule as the Analytics rollup, so both agree. |
| Under load | Din.1 = ON and Ain.1 > 2 A | Time the unit was actually producing. A big gap between this and engine-on time is flagged. |
| Starts / longest run | Din.1 edges | OFF→ON transitions; runs under 60 s ignored as bounce. |
| Avg / peak output | Ain.1 (IO 9) ÷ divisor | 47 on FMC650, 83 on FMB150/FMB120. Compared against the commissioned setpoint (±10%) when one is set. |
| Supply voltage, tracker battery | IO 66, IO 67 | Minimum for the week — a sagging supply shows up here before it strands the unit. |
| GSM signal | IO 21 | Weekly average. |
| Data availability | any packet | Clock hours with at least one packet, out of 168. Under 50% is flagged as under-counted. |
| Position changed | `gps_records` | Spread of the week's fixes (2nd–98th percentile). Over `DG_MOVED_KM` (20 km) on a DG is flagged — a stationary genset should not move. |
| Water shortage | `device_water_short_log` | Episodes overlapping the week and engine-on time spent short. |
| Alerts | `notification_log` | Each distinct alert the scan raised, and how many times. |

### Layout

A dark green masthead carries the customer, the dates and a count of units
needing attention, then a one-paragraph summary that names the unit most
responsible for any shortfall, then fleet totals.

How much each unit gets is the hierarchy:

| Status | What it shows |
| --- | --- |
| Needs attention | Eight figures, a Mon–Sun bar chart of hours run, and the observations block written as plain sentences. |
| Ran normally | Four figures. Nothing else — a unit that is fine does not need a chart, and giving it one buries the unit that is not. |
| No data | One line saying when it was last heard from. |

Units needing attention sort first. The only warm colour in the design marks a
genuine shortfall — output current is coloured only when producing time is under
half the run time, the same test that writes the matching sentence.

Preview the exact HTML for a company without sending anything:

```
http://localhost:3000/api/reports/weekly?customer_id=<uuid>&format=html
```

## Sending

Test first — everything goes to you, no CC, nothing logged:

```bash
curl -X POST "http://localhost:3000/api/reports/weekly?test_to=you@sgthydroedge.com&customer_id=<uuid>"
```

Preview the HTML in a browser instead:

```
http://localhost:3000/api/reports/weekly?customer_id=<uuid>&format=html
```

Then schedule it. Monday 09:00 server-local (adjust if the host is not on IST):

```
0 9 * * 1  curl -s -X POST http://localhost:3000/api/reports/weekly >> /var/log/weekly-report.log 2>&1
```

The route reports on the most recent **completed** week, so running it any day
Monday–Sunday gives the same answer. Running it twice does nothing the second
time: `weekly_report_log` records each delivered report per company per week.
A failed send is logged too but does not close the gate, so a retry works.

| Param | Effect |
| --- | --- |
| `?customer_id=uuid` | One company only. |
| `?week_ending=YYYY-MM-DD` | Report the seven days ending on that IST date (e.g. to re-send a past week, or to preview the current one mid-week). |
| `?dry_run=1` | POST computes and returns JSON, sends nothing. |
| `?force=1` | Send even if this company/week is already logged as sent. |
| `?test_to=you@x` | Redirect every email to you. Skips the log and the gate. |

## Cost

Per included device the route runs one query over the week's `io_records` for
IO 1 / 9 / 21 / 66 / 67 plus a coverage count, one over `gps_records`, and two
small lookups. With the current `(device_id, timestamp)` index that is a few
seconds per device on the production host; the pool allows 120 s per statement.
A company with dozens of *operational* units would be the point to move these
figures into `device_daily_summary` instead of computing them live.
