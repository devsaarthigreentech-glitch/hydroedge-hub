"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Device } from "@/types";
import { THEME } from "@/lib/theme";

interface AlertEvent {
  id: number;
  alert_id: string;
  src: string | null;
  ev: string | null;
  ts_utc: string | null;
  received_at: string;
  stops: boolean | null;
  severity: string | null;
  severity_rank: number | null;
  category: string | null;
  condition: string | null;
  message_key: string | null;
}
interface ActiveAlert {
  alert_id: string; src: string | null; ev: string | null; ts_utc: string | null;
  severity: string | null; severity_rank: number | null; category: string | null; condition: string | null;
}

const SEV: Record<string, { color: string; bg: string; bd: string }> = {
  Critical: { color: "#dc2626", bg: "#fef2f2", bd: "#fecaca" },
  Fault: { color: "#ea580c", bg: "#fff7ed", bd: "#fed7aa" },
  Warning: { color: "#d97706", bg: "#fffbeb", bd: "#fde68a" },
  Info: { color: "#2563eb", bg: "#eff6ff", bd: "#bfdbfe" },
  Unknown: { color: "#6b7280", bg: "#f9fafb", bd: "#e5e7eb" },
};

function formatIST(ts: string): string {
  return new Date(ts).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  });
}

export function NanoAlertsTab({ device }: { device: Device }) {
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [active, setActive] = useState<ActiveAlert[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/nano/alerts?device_id=${device.id}&limit=150`);
      const d = await res.json();
      if (d.success) {
        setEvents(d.data.events || []);
        setActive(d.data.active || []);
        setSummary(d.data.summary || {});
        setLoaded(true);
      } else setError(d.error || "Failed to load alerts");
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }, [device.id]);

  useEffect(() => { load(); }, [load]);

  const sev = (s: string | null) => SEV[s || "Unknown"] || SEV.Unknown;
  const th: React.CSSProperties = { textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 700, color: THEME.text.tertiary, textTransform: "uppercase", letterSpacing: 1, borderBottom: `2px solid ${THEME.border.light}`, whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "10px 14px", fontSize: 12.5, color: THEME.text.secondary, verticalAlign: "top" };

  return (
    <div style={{ padding: 24, height: "100%", overflow: "auto", background: THEME.background.secondary }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: THEME.text.primary, marginBottom: 4 }}>Alerts</div>
          <div style={{ fontSize: 13, color: THEME.text.secondary }}>Faults and events reported by this device.</div>
        </div>
        <button onClick={load} disabled={loading}
          style={{ background: "white", border: `2px solid ${THEME.border.light}`, borderRadius: 10, padding: "8px 18px", fontWeight: 700, fontSize: 13, color: THEME.text.secondary, cursor: "pointer", fontFamily: "inherit", boxShadow: THEME.shadow.sm }}>
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
      </div>

      {error && <div style={{ padding: 14, marginBottom: 16, borderRadius: 10, background: "#fef2f2", border: "2px solid #fecaca", color: "#b91c1c", fontSize: 13, fontWeight: 600 }}>⚠️ {error}</div>}

      {/* Severity summary */}
      {loaded && (
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {(["Critical", "Fault", "Warning", "Info"] as const).map((s) => {
            const c = SEV[s]; const n = summary[s] || 0;
            return (
              <div key={s} style={{ flex: "1 1 120px", background: "white", border: `2px solid ${n > 0 ? c.bd : THEME.border.light}`, borderRadius: 12, padding: "12px 16px", boxShadow: THEME.shadow.sm }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: n > 0 ? c.color : THEME.neutral[300], fontFamily: "JetBrains Mono, monospace" }}>{n}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: THEME.text.tertiary, textTransform: "uppercase", letterSpacing: 0.5 }}>{s}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active alerts */}
      {loaded && active.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: THEME.text.tertiary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Currently Active ({active.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {active.map((a, i) => {
              const c = sev(a.severity);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "white", borderRadius: 10, borderLeft: `4px solid ${c.color}`, boxShadow: THEME.shadow.sm }}>
                  <span style={{ fontSize: 20 }}>{a.severity === "Critical" || a.severity === "Fault" ? "🔴" : a.severity === "Warning" ? "🟠" : "🔵"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: THEME.text.primary }}>{a.alert_id}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: c.color, background: c.bg, border: `1px solid ${c.bd}`, padding: "2px 8px", borderRadius: 6, textTransform: "uppercase" }}>{a.severity || "?"}</span>
                      {a.src && <span style={{ fontSize: 10, color: THEME.text.tertiary, fontFamily: "monospace", background: THEME.neutral[100], padding: "2px 8px", borderRadius: 6 }}>{a.src}</span>}
                      {a.category && <span style={{ fontSize: 11, color: THEME.text.tertiary }}>{a.category}</span>}
                    </div>
                    <div style={{ fontSize: 12.5, color: THEME.text.secondary, marginTop: 3 }}>{a.condition || "Active fault"}</div>
                  </div>
                  <div style={{ fontSize: 11, color: THEME.text.tertiary, fontFamily: "JetBrains Mono, monospace", whiteSpace: "nowrap" }}>{a.ts_utc ? formatIST(a.ts_utc) : ""}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loaded && active.length === 0 && (
        <div style={{ background: "#f0fdf4", border: "2px solid #bbf7d0", borderRadius: 12, padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}>✅</span>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#166534" }}>No active alerts — all clear.</div>
        </div>
      )}

      {/* Event history */}
      {loaded && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: THEME.text.tertiary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Event History</div>
          <div style={{ background: "white", borderRadius: 12, border: `2px solid ${THEME.border.light}`, overflow: "hidden", boxShadow: THEME.shadow.sm }}>
            {events.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: THEME.text.tertiary }}>No alert events recorded for this device.</div>
            ) : (
              <div style={{ overflowX: "auto", maxHeight: 480 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ position: "sticky", top: 0, background: THEME.neutral[50], zIndex: 1 }}>
                    <tr>
                      <th style={th}>Time (IST)</th>
                      <th style={th}>Alert</th>
                      <th style={th}>Severity</th>
                      <th style={th}>Phase</th>
                      <th style={th}>Source</th>
                      <th style={th}>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e) => {
                      const c = sev(e.severity);
                      const cleared = e.ev === "cleared";
                      return (
                        <tr key={e.id} style={{ borderBottom: `1px solid ${THEME.neutral[100]}`, opacity: cleared ? 0.6 : 1 }}>
                          <td style={{ ...td, fontFamily: "JetBrains Mono, monospace", fontSize: 11.5, whiteSpace: "nowrap" }}>{e.ts_utc ? formatIST(e.ts_utc) : formatIST(e.received_at) + " (rx)"}</td>
                          <td style={{ ...td, fontWeight: 700, color: THEME.text.primary, whiteSpace: "nowrap" }}>{e.alert_id}</td>
                          <td style={td}><span style={{ fontSize: 10, fontWeight: 700, color: c.color, background: c.bg, border: `1px solid ${c.bd}`, padding: "2px 8px", borderRadius: 6, textTransform: "uppercase", whiteSpace: "nowrap" }}>{e.severity || "?"}</span></td>
                          <td style={td}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: cleared ? THEME.status.success : c.color }}>
                              {cleared ? "✓ cleared" : e.ev === "raised" ? "▲ raised" : (e.ev || "—")}
                            </span>
                          </td>
                          <td style={{ ...td, fontFamily: "monospace", fontSize: 11, color: THEME.text.tertiary, whiteSpace: "nowrap" }}>{e.src || "—"}</td>
                          <td style={td}>{e.condition || e.message_key || "—"}{e.stops ? <span style={{ marginLeft: 6, fontSize: 9, color: "#dc2626", fontWeight: 700 }}>STOPS ENGINE</span> : null}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}