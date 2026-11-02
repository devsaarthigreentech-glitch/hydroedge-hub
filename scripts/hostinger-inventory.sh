#!/usr/bin/env bash
# Read-only inventory of the Hostinger archive box (srv626585, 145.223.19.24).
# Changes nothing. Run as root on the box:
#
#   bash hostinger-inventory.sh            # writes /root/inventory-<UTC date>.txt
#
# Paste the output file back. Lines that look like passwords/tokens are masked.
set -uo pipefail

OUT=/root/inventory-$(date -u +%Y%m%d-%H%M).txt
DB=sgt_hydroedge_archive
mask() { sed -E 's/((password|passwd|secret|token|api[_-]?key)[^=: ]*[=: ]+)[^ ]+/\1<masked>/Ig'; }
sec()  { printf '\n===== %s =====\n' "$*"; }
cd /tmp

{
sec "host";        hostnamectl 2>/dev/null; uptime; nproc; free -h
sec "disk";        df -hT -x tmpfs -x devtmpfs; lsblk -o NAME,SIZE,TYPE,MOUNTPOINT
sec "big dirs";    du -xsh /root/* /root/.[!.]* /var/www/* /home/* /opt/* /srv/* /var/lib/docker /var/lib/postgresql 2>/dev/null | sort -rh | head -40
sec "listening";   ss -tlnpu
sec "running services"; systemctl list-units --type=service --state=running --no-pager --plain
sec "enabled services"; systemctl list-unit-files --state=enabled --no-pager --plain
sec "timers";      systemctl list-timers --all --no-pager
sec "top processes by RSS"; ps -eo pid,user,rss,etime,cmd --sort=-rss | head -30 | cut -c1-200

sec "docker containers"; docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null || echo "no docker"
sec "docker restart policies"; for c in $(docker ps -aq 2>/dev/null); do docker inspect -f '{{.Name}} restart={{.HostConfig.RestartPolicy.Name}}' "$c"; done
sec "docker volumes"; docker volume ls 2>/dev/null; docker system df 2>/dev/null

sec "pm2 (root)";  pm2 ls 2>/dev/null || echo "no pm2 for root"
for h in /home/*; do u=$(basename "$h"); [[ -d $h/.pm2 ]] && { sec "pm2 ($u)"; sudo -u "$u" pm2 ls 2>/dev/null; }; done
sec "tmux/screen"; tmux ls 2>/dev/null || echo "no tmux"; screen -ls 2>/dev/null | head

sec "nginx sites-enabled"; ls -l /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null
sec "nginx server_name / proxy_pass / return"
nginx -T 2>/dev/null | grep -E '^# configuration file|server_name|listen|proxy_pass|return 30|^\s*root ' | mask
sec "nginx access logs (lines today, last 3 lines)"
for f in /var/log/nginx/*access*.log; do
  [[ -f $f ]] || continue
  echo "--- $f  $(stat -c '%y' "$f" | cut -c1-19)  today=$(grep -c "$(date +%d/%b/%Y)" "$f")"
  tail -3 "$f" | cut -c1-220
done
sec "client IPs hitting nginx today (top 15)"
cat /var/log/nginx/*access*.log 2>/dev/null | grep "$(date +%d/%b/%Y)" | awk '{print $1}' | sort | uniq -c | sort -rn | head -15

sec "certificates"; certbot certificates 2>/dev/null | grep -E 'Certificate Name|Domains|Expiry'
sec "crontabs"
for u in $(cut -d: -f1 /etc/passwd); do c=$(crontab -l -u "$u" 2>/dev/null | grep -v '^\s*#' | grep -v '^\s*$'); [[ -n $c ]] && { echo "--- $u"; echo "$c" | mask; }; done
ls -l /etc/cron.d/ 2>/dev/null
sec "firewall";    ufw status verbose 2>/dev/null || iptables -S 2>/dev/null | head -30

sec "postgres databases"; sudo -u postgres psql -X -l 2>/dev/null
sec "postgres tables ($DB)"
sudo -u postgres psql -X -d "$DB" -c "SELECT s.relname, s.n_live_tup, c.reltuples::bigint AS est_rows,
  s.n_tup_ins + s.n_tup_upd + s.n_tup_del AS writes_since_stats_reset,
  pg_size_pretty(pg_total_relation_size(s.relid)) AS total, s.last_vacuum, s.last_autovacuum
  FROM pg_stat_user_tables s JOIN pg_class c ON c.oid = s.relid ORDER BY pg_total_relation_size(s.relid) DESC;" 2>/dev/null
sec "postgres columns (io tables)"
sudo -u postgres psql -X -d "$DB" -c "SELECT table_name, string_agg(column_name || ' ' || data_type, ', ' ORDER BY ordinal_position)
  FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('io_records', 'io_records_prod') GROUP BY 1;" 2>/dev/null
sec "postgres indexes"; sudo -u postgres psql -X -d "$DB" -c "SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY 1, 2;" 2>/dev/null
sec "postgres connections"; sudo -u postgres psql -X -c "SELECT datname, usename, client_addr, state, count(*) FROM pg_stat_activity WHERE backend_type = 'client backend' GROUP BY 1,2,3,4;" 2>/dev/null
sec "pg_hba (non-comment)"; grep -vE '^\s*(#|$)' "$(sudo -u postgres psql -XAt -c 'SHOW hba_file' 2>/dev/null)" 2>/dev/null

sec "backups waiting for Spaces"
ls -lh /root/openremote-* /root/disabled-nginx /root/le-from-hostinger 2>/dev/null
du -sh /root/database-archive /root/database-archive/* 2>/dev/null
sec "tools for the export"; for t in rclone python3 pigz gzip tmux; do printf '%-8s %s\n' "$t" "$(command -v $t || echo MISSING)"; done; rclone version 2>/dev/null | head -1
} > "$OUT" 2>&1

echo "wrote $OUT ($(wc -l < "$OUT") lines)"
