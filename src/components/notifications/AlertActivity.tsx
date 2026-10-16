"use client";

// ============================================================================
// Alert Activity — what the alert system saw, and what it sent
// ----------------------------------------------------------------------------
// One card per company: faults open now, faults that cleared in the last 48
// hours, and whether today's daily summary has gone out. Below that, every
// recent email attempt with its outcome. Reads GET /api/alerts/activity and
// refreshes every minute; it never sends anything itself.
// ============================================================================

import React, { useState, useEffect, useCallback } from "react";

const BORDER = "#e2e8f0";
const MUTED  = "#94a3b8";
const RED    = "#dc2626";
const AMBER  = "#d97706";
const GREEN  = "#16a34a";

interface Episode {
  id: number;
  device_id: string;
  device_name: string | null;
  imei: string | null;
  alert_id: string;
  severity: "critical" | "warning";
  message: string;
  first_seen_at: string;
  last_seen_at: string;
  cleared_at: string | null;
  customer_reported_at: string | null;
  support_notified_at: string | null;
}

interface CompanyActivity {
  id: string;
  name: string;
  timezone: string;
  timezone_set: boolean;
  local_time: string;
  digest_today: string;
  last_digest: { sent_at: string; status: string } | null;
  open: Episode[];
  resolved: Episode[];
}

interface Dispatch {
  id: number;
  kind: "customer_digest" | "support_digest" | "immediate";
  customer_name: string | null;
  sent_at: string;
  status: string;
  recipients: string;
  cc: string;
  episode_count: number;
  subject: string;
}

const KIND_LABEL: Record<Dispatch["kind"], string> = {
  customer_digest: "Daily summary",
  support_digest:  "Support digest",
  immediate:       "Urgent",
};

function when(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
}

export function AlertActivity() {
  const [companies, setCompanies]   = useState<CompanyActivity[]>([]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [updated, setUpdated]       = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const res  = await fetch("/api/alerts/activity");
      const json = await res.json();
      if (json.success) {
        setCompanies(json.customers);
        setDispatches(json.dispatches);
        setError("");
        setUpdated(new Date());
      } else {
        setError(json.error || "Failed to load alert activity");
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  if (loading) {
    return <div style={{ padding: 60, textAlign: "center", color: MUTED }}>Loading alert activity...</div>;
  }

  const openTotal  = companies.reduce((n, c) => n + c.open.length, 0);
  const failed24h  = dispatches.filter(
    (d) => d.status !== "sent" && Date.now() - new Date(d.sent_at).getTime() < 24 * 3600_000
  ).length;
  const sent24h    = dispatches.filter(
    (d) => d.status === "sent" && Date.now() - new Date(d.sent_at).getTime() < 24 * 3600_000
  ).length;

  return (
    <div style={{ padding: 24, background: "#f8fafc", minHeight: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Alert Activity</div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 4, lineHeight: 1.6 }}>
            Customers get one summary a day at 09:00 their time, covering everything since the last one.
            Support gets a digest at most every 6 hours, only when a new fault starts.
            Low external power is sent immediately.
          </div>
        </div>
        <button
          onClick={load}
          style={{
            padding: "8px 14px", background: "#fff", border: `2px solid ${BORDER}`, borderRadius: 8,
            fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer", fontFamily: "inherit",
          }}
        >
          Refresh{updated ? ` · ${updated.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : ""}
        </button>
      </div>

      {error && (
        <div style={{
          marginBottom: 16, padding: "10px 14px", borderRadius: 8,
          background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: 12,
        }}>
          {error}
        </div>
      )}

      {/* Summary tiles */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <Tile label="Open faults"        value={openTotal} color={openTotal > 0 ? RED : GREEN} />
        <Tile label="Emails sent (24h)"   value={sent24h}   color={GREEN} />
        <Tile label="Emails failed (24h)" value={failed24h} color={failed24h > 0 ? RED : MUTED} />
      </div>

      {/* Companies */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {companies.map((c) => (
          <div key={c.id} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{c.name}</div>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>
                  {c.local_time} local · {c.timezone}
                  {!c.timezone_set && (
                    <span style={{ color: AMBER }}> — timezone not set, using IST. Set it under Customers → Edit.</span>
                  )}
                </div>
              </div>
              <DigestChip text={c.digest_today} />
              <div style={{ fontSize: 11, color: MUTED, textAlign: "right", minWidth: 150 }}>
                Last summary: {c.last_digest ? when(c.last_digest.sent_at) : "never"}
                {c.last_digest && c.last_digest.status !== "sent" && (
                  <div style={{ color: RED }}>{c.last_digest.status}</div>
                )}
              </div>
            </div>

            {(c.open.length > 0 || c.resolved.length > 0) && (
              <div style={{ borderTop: `1px solid ${BORDER}`, padding: "6px 18px 12px" }}>
                {c.open.map((e) => <EpisodeRow key={e.id} e={e} />)}
                {c.resolved.map((e) => <EpisodeRow key={e.id} e={e} />)}
              </div>
            )}
            {c.open.length === 0 && c.resolved.length === 0 && (
              <div style={{ borderTop: `1px solid ${BORDER}`, padding: "10px 18px", fontSize: 12, color: MUTED }}>
                No faults in the last 48 hours.
              </div>
            )}
          </div>
        ))}
        {companies.length === 0 && !error && (
          <div style={{ padding: 40, textAlign: "center", color: MUTED, background: "#fff", borderRadius: 12, border: `2px dashed ${BORDER}` }}>
            No subscribed companies with GreenX / GreenDrive devices.
          </div>
        )}
      </div>

      {/* Email log */}
      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>Recent emails</div>
      <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f8fafc", textAlign: "left" }}>
              {["Time", "Type", "Company", "Items", "Result", "To"].map((h) => (
                <th key={h} style={{ padding: "8px 12px", fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dispatches.map((d) => (
              <tr key={d.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                <td style={{ padding: "8px 12px", whiteSpace: "nowrap", color: "#0f172a" }}>{when(d.sent_at)}</td>
                <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>{KIND_LABEL[d.kind] || d.kind}</td>
                <td style={{ padding: "8px 12px" }}>{d.customer_name || "—"}</td>
                <td style={{ padding: "8px 12px" }}>{d.episode_count}</td>
                <td style={{ padding: "8px 12px", color: d.status === "sent" ? GREEN : RED, fontWeight: 600 }}>
                  {d.status === "sent" ? "Delivered" : d.status}
                </td>
                <td style={{ padding: "8px 12px", color: "#475569", maxWidth: 320 }}>
                  {d.recipients || <span style={{ color: MUTED }}>—</span>}
                  {d.cc && <span style={{ color: MUTED }}> · cc {d.cc}</span>}
                </td>
              </tr>
            ))}
            {dispatches.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 24, textAlign: "center", color: MUTED }}>
                  No alert emails recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EpisodeRow({ e }: { e: Episode }) {
  const open   = e.cleared_at === null;
  const isCrit = e.severity === "critical";
  const color  = !open ? GREEN : isCrit ? RED : AMBER;
  return (
    <div style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: `1px solid #f1f5f9`, alignItems: "flex-start", opacity: open ? 1 : 0.7 }}>
      <span style={{
        fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, color: "#fff",
        background: color, textTransform: "uppercase", marginTop: 2, flexShrink: 0, minWidth: 58, textAlign: "center",
      }}>
        {open ? e.severity : "resolved"}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 600 }}>{e.device_name || e.imei}</div>
        <div style={{ fontSize: 12, color: "#334155" }}>{e.message}</div>
      </div>
      <div style={{ fontSize: 11, color: MUTED, textAlign: "right", flexShrink: 0, lineHeight: 1.5 }}>
        since {when(e.first_seen_at)}
        {!open && <div>cleared {when(e.cleared_at)}</div>}
        <div>
          {e.customer_reported_at ? `told customer ${when(e.customer_reported_at)}` : "not yet reported"}
        </div>
      </div>
    </div>
  );
}

function DigestChip({ text }: { text: string }) {
  const color = text === "sent" ? GREEN
    : text.startsWith("failed") ? RED
    : text.startsWith("due") ? AMBER
    : MUTED;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
      color, border: `1px solid ${color}`, whiteSpace: "nowrap",
    }}>
      Today: {text === "sent" ? "summary sent" : text}
    </span>
  );
}

function Tile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 20px", minWidth: 120 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 5 }}>{label}</div>
    </div>
  );
}
