# Firmware updates from GreenVision

Upload a NanoV3 `.bin` on the **Firmware** page (admins only), then open a device,
go to its **Firmware** tab and press **Update**. No firmware change is needed on 3.x
units: the job drives the same P-5300..P-5304 they already take.

## How it fits together

- **Files:** `FIRMWARE_DIR` (default `/var/lib/sgt-firmware`) as `<token>.bin`. Outside
  the build output, so a redeploy keeps them. The app needs write access.
- **Download:** `FIRMWARE_PUBLIC_BASE` (default `http://143.244.135.19:8080`) +
  `/fw/<token>.bin`, no login. The whole URL has to fit P-5300's 95 characters.
  The modem's AT+HTTP has only been proven on plain http, so it stays http; the
  SHA-256 reaches the device over MQTT.
- **Jobs:** `nano_fw_jobs`, advanced every 5 s by `lib/nano-fw-runner` (started from
  `src/instrumentation.ts`), so closing the page or restarting the app changes nothing.
  The rules are in `lib/nano-fw-job.ts`.

## nginx

Two things are needed: uploads above nginx's default 1 MB, and plain http on port
8080 with an exact Content-Length.

```nginx
# /etc/nginx/conf.d/sgt-firmware.conf
client_max_body_size 5m;

server {
    listen 8080;
    server_name _;
    location /fw/ {
        proxy_pass http://127.0.0.1:APP_PORT;
        proxy_http_version 1.1;
        gzip off;
    }
    location / { return 404; }
}
```

`APP_PORT` is the port `sgt-admin` listens on. If `grep -rn client_max_body_size /etc/nginx`
already shows a value in `nginx.conf` or in the admin site, remove the line above and
raise that one instead, or nginx refuses the duplicate or the smaller value wins.

Port 8080 must be open in the firewall, and nothing else may be listening on it (the
temporary `python -m http.server` from the first OTA test).

## Limits

One device at a time. No image signing, no https. `nano_fw_jobs.batch_id` is there
for a later fleet update.
