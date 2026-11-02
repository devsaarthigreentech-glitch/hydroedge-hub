# Hostinger box (srv626585) — inventory, Spaces export, website, shutdown

Companion to `ARCHIVE_DB.md`. Written 2026-10-15. Nothing in this runbook
deletes anything. The box is shut down only after §4's gate passes.

Scripts (copy both to the box, e.g. `scp scripts/{hostinger-inventory,export-archive-to-spaces}.sh root@145.223.19.24:/root/`):

- `scripts/hostinger-inventory.sh`: read-only. Writes `/root/inventory-<date>.txt`.
- `scripts/export-archive-to-spaces.sh`: streams Postgres → gzip → Spaces (no local
  disk needed), then re-reads every file **from the bucket** and counts its rows.
  State and logs are in `/var/tmp/spaces-export/`. Re-runnable: verified files are skipped.

## 1. Inventory

```bash
bash /root/hostinger-inventory.sh
```

### Result, 2026-10-15 08:49 UTC

- **Box:** Ubuntu 24.04, 8 vCPU, 31 GB RAM, 400 GB disk (132 GB used, 255 GB free), up 99
  days, a reboot is pending. ufw allows 22/80/443/5010/8090 from anywhere and 5432 from prod only.
- **Postgres 16** holds only `sgt_hydroedge_archive`:
  - `io_records_prod`: 51 GB, 455,964,178 inserts recorded. Indexes are the pkey and `(timestamp)`.
  - `io_records`: 26 GB, ~116.7 M rows, and 7,430 more writes than live rows, so a few
    rows were deleted or updated at some point. The histogram gives the exact count.
  - Both tables have the identical 10 columns, `timestamp` is `timestamptz`, and the DB is UTF8.
  - No prod connections were open at the time of the check.
- **Still running:** nginx (forwarders to prod on 80/443, a dead `ingest` site on 8090
  whose log ends 2026-02-05), pm2 `saarthi-app` (:3000) and `earthion` (:3001). Both are
  leftovers, since nginx forwards those domains to prod. Postgres, docker (all
  containers stopped) and certbot's timer are also running. There are no user crontabs.
- **Stopped containers:** OpenRemote ×5, n8n, gv-data-container, flespi-relay (8 months),
  and **tel-data-stream, exited (137) 4 days ago** with restart=no. That is the flespi →
  customer-broker relay, so the customer feed has already been off since about 2026-10-11.
- **Traffic:** 192 nginx hits today, all crawlers and scanners (Googlebot robots.txt,
  71.6.x, 104.237.x). No real visitors, so DNS has fully moved.
- **Certs** here still renew via certbot.timer. Only gv.saarthigreentech.com can still
  pass HTTP-01, because the others resolve to prod. That's harmless.
- **Data that only exists on this box,** besides Postgres:

  | Path | Size | Note |
  |---|---|---|
  | `/root/database-archive` | 26 GB | flespi backups, Mar 2026 |
  | `/root/openremote-files-2026-10-10.tar.gz` | 3.0 GB | |
  | `/root/fleet-management` | 3.7 GB | OpenRemote compose + data |
  | docker volumes `fleet-management_*`, `n8n_data` | 2.1 GB | n8n is already on prod |
  | `/root/openremote-pgdata-…tar.gz`, `openremote-db-….sql.gz` | 124 MB | |
  | `/root/n8n_data-2026-10-10.tar.gz`, `misc-code-2026-10-10.tar.gz` | 91 MB | |
  | `/root/saarthi-data-relay`, `teltonika-server`, `gv-data`, `coca_*`, `dev15_*`, `intern`, `/home/intern1`, `/home/ubuntu` | ~14 MB | small code/scripts |
  | `/var/www/saarthi-app`, `/var/www/earthion-website` | 2 GB | copies of what is deployed on prod |
  | `/etc/nginx`, `/etc/letsencrypt`, `/root/disabled-nginx` | small | |

- **Export tools:** `pigz`, `python3` and `tmux` are present, `rclone` is missing.

## 2. Export `io_records_prod` and `io_records`

### One-time setup

```bash
apt install -y rclone pigz tmux
install -m 600 /dev/null /root/.spaces-export.env
nano /root/.spaces-export.env        # SPACES_KEY=...  and  SPACES_SECRET=...
chmod +x /root/export-archive-to-spaces.sh
tmux new -s export
```

The key goes in that file only, never in chat or the repo.

### Run order (inside tmux)

```bash
cd /root
./export-archive-to-spaces.sh preflight              # Spaces write/read/delete, columns, write counters
./export-archive-to-spaces.sh histogram io_records_prod
./export-archive-to-spaces.sh histogram io_records
```

The histogram gives exact rows per UTC month. `io_records_prod` must total
**455,964,178** (the offload verify), or the script stops. Look at both histograms
and pick the real month range for each table. Everything outside it (1970, 2015,
2185, NULL) goes to `junk-timestamps.csv.gz`, so nothing is dropped. For example:

```bash
./export-archive-to-spaces.sh export io_records_prod 2026-01 2026-10
./export-archive-to-spaces.sh export io_records      2026-01 2026-03
./export-archive-to-spaces.sh schema
./export-archive-to-spaces.sh verify io_records_prod  # second, independent read-back
./export-archive-to-spaces.sh verify io_records
./export-archive-to-spaces.sh report                  # writes /var/tmp/spaces-export/EXPORT_VERIFIED only if all match
```

How each file is proven:

1. The expected count for the file is the histogram's `count(*)` for that month.
2. After upload, the object is streamed back from Spaces, gunzipped, and parsed as
   CSV (quoted newlines count correctly). The header must match the 10 columns, every
   row must have 10 fields, and the row count must equal the expected count.
3. `report` checks that per-table file totals equal the Postgres totals, and that the
   `pg_stat` write counters haven't moved since preflight (so nothing wrote mid-export).
   It then uploads `manifest.csv` (rows and sha256 per file) and `README.txt`.

Expect the 26 GB `io_records` to need one full table scan per exported month, because
it has no timestamp-only index. `io_records_prod` uses its `(timestamp)` index.

## 3. Website: already on DigitalOcean, finish the cutover

Checked from public DNS on 2026-10-15:

| Name | A record | HTTPS |
|---|---|---|
| sgthydroedge.com, www | 143.244.135.19 (prod) | 200, LE cert to 2027-01-01 |
| saarthigreen.com, saarthigreentech.com, www | prod | 301 → sgthydroedge.com |
| earthion.co.in, www | prod | 200, LE cert to 2026-12-17 |
| n8n.saarthigreen.com | prod | 200 |
| admin.sgthydroedge.com | prod | — |
| **gv.saarthigreentech.com** | **145.223.19.24 (Hostinger)** | times out (OpenRemote is stopped) |
| fleet.saarthigreentech.com | no A record | — |
| **kuber.ventures, www** | **145.223.19.24 (Hostinger VPS)** | HTTP serves the VPS's default "Welcome to nginx!" page; HTTPS serves earthion's cert |

kuber.ventures (found 2026-10-15): registered at **GoDaddy**, expires **2026-11-13** with
auto-renew off. DNS is on Hostinger nameservers (`dns-parking.com`), and MX is Microsoft 365.
The Hostinger Premium Web Hosting plan for it (auto-renews 2027-10-02) has no site. Plan:
- Before the VPS expires, delete the `@` and `www` A records in hPanel. Keep MX, TXT and autodiscover.
- Later, put a static holding page on prod ("contact karun@kuber.ventures") and point the A records at 143.244.135.19.
- Move DNS to GoDaddy nameservers, recreating the M365 records first. Then cancel the Premium
  Web Hosting auto-renew and remove the Hostinger card.
- Renew the domain at GoDaddy before 2026-11-13, or both the site and the email stop.

Public records on 2026-10-16. DNSSEC is off (no DS record) and M365 DKIM isn't enabled:

| Type | Name | Value |
|---|---|---|
| MX | @ | 0 `kuber-ventures.mail.protection.outlook.com` |
| TXT | @ | `v=spf1 include:spf.protection.outlook.com -all` |
| TXT | @ | `MS=ms13957309` |
| TXT | _dmarc | `v=DMARC1; p=none` |
| CNAME | autodiscover | `autodiscover.outlook.com` |
| A | @ | 145.223.19.24 (expiring VPS, drop it) |
| CNAME | www | @ |

MX is Google Workspace (sgthydroedge.com, earthion.co.in) and Microsoft 365
(saarthigreen.com, saarthigreentech.com). No mail depends on Hostinger.

So the website move is done. What's left is making sure nothing still leans on Hostinger:

1. **Forwarder traffic.** The inventory's "nginx access logs" section should show
   almost no hits on Hostinger today beyond bots. Real visitors there mean a stale
   DNS record somewhere.
2. **Prod survives a reboot.** On prod: `pm2 ls` shows `saarthi-app` (:3002) and
   `earthion` (:3001) online, `pm2 save` has been run, and `systemctl is-enabled pm2-root`.
   `docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' n8n` should be `unless-stopped` or `always`.
3. **Cert renewal on prod.** `certbot renew --dry-run` passes for every site domain,
   including earthion.co.in (it expires first, on 12-17).
4. **Contact forms.** Submit one test enquiry on sgthydroedge.com and on earthion.co.in,
   and confirm the n8n execution and the email arrive.
5. **Deploy source.** On prod, `/var/www/saarthi-app` should be on `draft/sgt-redesign`
   with its `.env.local` present, so the next deploy doesn't regress to `main`.
6. **gv.saarthigreentech.com.** Delete its GoDaddy A record once the OpenRemote backups
   are in Spaces (§4). After that nothing points at 145.223.19.24.

## 4. Before shutting the box down

Shut down only when every line is true:

- [x] `/var/tmp/spaces-export/EXPORT_VERIFIED` exists and `report` printed COMPLETE for both tables.
      **Done 2026-10-15 12:26 UTC.** `io_records_prod/`: 17 months (2024-08 → 2026-10) + junk
      (23,000 rows, 2015-01) = 455,964,178 rows. `archive_io_records/`: 13 months (2024-08 →
      2026-03) = 116,747,841 rows. Both match Postgres, and each file was read back twice with
      identical sha256. 3.7 GB total, plus `schema.sql`, `manifest.csv` and `README.txt`.
- [x] Other data copied and byte-checked (lands in `box-files/`). **Done 2026-10-15 14:12 UTC.**
      `database-archive`: 203 files, 27,258,736,010 bytes, checked with `rclone check --download`.
      The 9 tarballs/dumps were each checked by sha256 of the bucket copy. Commands used:
      ```bash
      D=$(date -u +%F); Z='pigz -p 4'
      tar -I "$Z" -cf /root/etc-configs-$D.tar.gz /etc/nginx /etc/letsencrypt /etc/postgresql /root/disabled-nginx /root/.pm2/dump.pm2
      tar -I "$Z" -cf /root/small-code-$D.tar.gz /root/saarthi-data-relay /root/teltonika-server /root/gv-data /root/coca_* /root/dev15_* /root/intern /root/n8n-data /home/intern1 /home/ubuntu
      tar -I "$Z" -cf /root/fleet-management-$D.tar.gz -C /root fleet-management
      tar -I "$Z" -cf /root/docker-volumes-$D.tar.gz -C /var/lib/docker/volumes .   # all containers stopped
      ./export-archive-to-spaces.sh files /root/database-archive /root/openremote-*-2026-10-10.* \
          /root/n8n_data-2026-10-10.tar.gz /root/misc-code-2026-10-10.tar.gz \
          /root/{etc-configs,small-code,fleet-management,docker-volumes}-$D.tar.gz
      ```
      `/root/database-archive` goes up as a plain folder so each file stays readable on its own.
      Everything else goes up as a tarball, which keeps permissions and symlinks.
      The `/var/www` sites are already deployed on prod, so they're skipped.
- [ ] **tel-data-stream** (`/root/saarthi-data-relay/flespi_debug.py`) has been stopped
      since about 2026-10-11 (exit 137, restart=no). It relays flespi telemetry for three
      devices to the customer broker 104.251.212.17. Confirm with the customer that the
      feed isn't needed, or move it to prod.
- [ ] The inventory shows nothing else running that isn't accounted for.
- [ ] §3 items 1–5 pass.
- [ ] Prod `.env.local` no longer needs `ARCHIVE_DB_*`. Today `/api/io-logs` still reads the
      archive's `io_records` for 0015/0016 before 2026-03-24. Once the box is off, those
      requests return 500, so unset the three `ARCHIVE_*` variables and restart, or accept
      that those logs go dark until they are served from the Spaces files.

Then: take a final Hostinger snapshot if the plan offers one, power off, wait a week, cancel.
