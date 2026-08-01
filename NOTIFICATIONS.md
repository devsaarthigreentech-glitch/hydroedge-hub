# Alert emails — turning them on and choosing who gets them

The alert scan looks at every GreenX / GreenDrive device, works out which alarms
are active, groups them per company, and sends one email per company to the
**users linked to that company** (support is always CC'd).

Nothing sends until you schedule the scan. This document covers the subscribe /
unsubscribe switches first, then enabling the schedule.

## Who receives an email

Three independent switches gate every send. All default to **on**, so a newly
created company or user is subscribed unless you say otherwise.

| Switch | Where | Effect when off |
| --- | --- | --- |
| `customers.notifications_enabled` | Notifications screen, company row | The company's devices are skipped by the scan. No email, no log entry, nobody at that company is contacted. |
| `users.notifications_enabled` | Notifications screen (expand a company) or the Users list | That one person is dropped from the recipient list. Their colleagues still get the email. |
| `device_alert_settings.alerts_enabled` | per-device (pre-existing) | That device is skipped. |

A person is emailed only when **all** of these hold:

- their company is subscribed, **and**
- they are subscribed, **and**
- their account status is `active`, **and**
- they have an email address.

One consequence worth knowing: if a company is subscribed but every person in it
is individually muted, the alert still goes out with the support team on CC and
an empty To. That is deliberate — internal support keeps visibility. To stop a
company's alerts completely, mute the **company**, not its people.

## Setup

```bash
node scripts/apply-migration.js db/migrations/004_notification_subscriptions.sql
```

```bash
node scripts/apply-migration.js db/migrations/005_water_short_accumulator.sql
```

`004` adds the subscribe/unsubscribe columns and unsubscribes Turbo Energy,
replacing the customer-id that used to be hardcoded in the alert route. `005`
converts the water-shortage tracker to an accumulator (see below). Both are
idempotent — re-running changes nothing.

Check the result:

```bash
npm run notifications:status
```

That prints every company, whether it is subscribed, and the exact address list
that would be used. `--off` shows only unsubscribed companies; `--emails` prints
a flat deduplicated recipient list.

## Changing who is subscribed

**From the UI.** Sidebar → **Notifications**. Each company has a switch; expand a
row to reach the individual people. The Users screen also carries a per-user
alerts toggle for quick one-off changes.

**From the API.**

```bash
curl -X PATCH http://localhost:3000/api/notifications \
  -H 'Content-Type: application/json' \
  -d '{"scope":"customer","id":"<uuid>","enabled":false}'
```

`scope` is `customer` or `user`. `GET /api/notifications` returns the whole tree
with the effective recipient list per company.

## Enabling the schedule

Test first — this redirects every email to you, skips the cooldown, and writes
nothing to `notification_log`:

```bash
curl -X POST "http://localhost:3000/api/alerts/check?test_to=you@sgthydroedge.com"
```

The response lists, per company, who *would* have been mailed in production
(`production_would_send_to`). Confirm Turbo Energy is absent before going live.

Then schedule the real thing. **Every 5 minutes**, not hourly:

```
*/5 * * * *  curl -s -X POST http://localhost:3000/api/alerts/check >> /var/log/alerts.log 2>&1
```

A frequent scan does not produce more email — the per-alert cooldown is one day
(`DEFAULT_COOLDOWN = 60 * 24`). The cadence matters because the water-shortage
counter below advances once per scan, so the scan interval *is* its resolution.

To scan a single company, add `?customer_id=<uuid>`.

## Water-shortage timing

Water alarms (electrolyser cell, bubbler, main tank) fire only after the
condition has held for **one hour of engine-on time**. That hour is accumulated,
not measured on a wall clock:

| Situation | Effect on the counter |
| --- | --- |
| Engine running, condition true | Adds the time since the previous scan |
| Engine running, condition clear | Holds; resets only after 15 continuous minutes clear |
| Engine off, or telemetry over 30 min old | Pauses — nothing added, nothing lost |

So 15 minutes of running, a shutdown, then another 20 minutes leaves the counter
around 35 minutes rather than restarting from zero. The 15-minute clear buffer is
what stops a noisy float switch from wiping an hour of genuine evidence with one
bad reading; a real refill still resets it, just 15 minutes later.

Two deliberate biases, both erring toward *not* alarming:

- The counter credits nothing for the first scan of an episode and the first
  scan after each restart, because the true transition happened somewhere inside
  that interval. It therefore reads up to one scan interval low per restart — at
  a 5-minute cron, the 15+20 example lands at 25–30 minutes rather than exactly
  35. Shorten the cron to tighten this.
- Any single scan credits at most 10 minutes, so a stalled cron or a long outage
  cannot hand over hours at once and manufacture an alarm.

State lives in `device_water_short_log`, one open row per device and signal.
`short_seconds` is the accumulated total, `clear_seconds` is the buffer, and
`last_tick_at` is `NULL` while paused. Closed rows (`cleared_at` set) remain as a
history of past episodes.

## Before you expose this

`POST /api/alerts/check` currently has **no authentication**. Anyone who can
reach the app can trigger a scan, and a scan sends real mail to real customers.
On localhost behind a firewall that is fine. If the app is reachable from the
internet, put the endpoint behind a shared secret (the pattern used by
`/api/cron/rollup` in the hydroedge-hub repo: read `CRON_SECRET`, require it as a
bearer token, refuse to run when the variable is unset) before adding the cron
entry.
