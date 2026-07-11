"use client";

import React, { useState, useCallback } from "react";
import { Device } from "@/types";
import { THEME } from "@/lib/theme";

// ── Measured-PID display names (frames only ever carry these) ────────────────
const PID_META: Record<string, { name: string; unit?: string; bool?: boolean }> = {
  "P-4075": { name: "Cell Current", unit: "A" },
  "P-4093": { name: "Supply Voltage", unit: "V" },
  "P-4094": { name: "Electrode Temp", unit: "°C" },
  "P-4095": { name: "Ambient Temp", unit: "°C" },
  "P-4096": { name: "Main Level Low", bool: true },
  "P-4097": { name: "Bubbler Level Low", bool: true },
  "P-4098": { name: "Electrolyte Level Low", bool: true },
  "P-4099": { name: "PS Over-Temp", bool: true },
  "P-4100": { name: "Active Bearer" },
  "P-4101": { name: "RSSI", unit: "dBm" },
  "P-4102": { name: "Permit State" },
  "P-4103": { name: "Load", unit: "kW" },
  "P-4104": { name: "Engine RPM", unit: "rpm" },
  "P-4105": { name: "Engine Load", unit: "%" },
  "P-4106": { name: "Fuel Rate", unit: "L/h" },
  "P-4107": { name: "Total Fuel", unit: "L" },
  "P-4108": { name: "Engine Hours", unit: "h" },
};

interface Frame {
  id: number;
  seq: number;
  up: number;
  ts: number;
  ts_utc: string | null;
  received_at: string;
  net: string | null;
  boot_id: string | null;
  source: string;
  d: Record<string, any>;
  faults: string[];
  gps: { fix?: number; sat?: number; lat?: number; lon?: number } | null;
}

function formatIST(ts: string): string {
  return new Date(ts).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  });
}

function fmtVal(pid: string, v: any): string {
  const m = PID_META[pid];
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (m?.unit) return `${v} ${m.unit}`;
  return String(v);
}

export function NanoHistoryTab({ device }: { device: Device }) {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState<{ count: number; time: number } | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [rawRows, setRawRows] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    setLoading(true); setError(""); setInfo(null); setExpanded(new Set());
    const t0 = performance.now();
    try {
      const res = await fetch(`/api/nano/frames?device_id=${device.id}&limit=${limit}`);
      const data = await res.json();
      const elapsed = Math.round(performance.now() - t0);
      if (data.success) {
        setFrames(data.data);
        setInfo({ count: data.count, time: elapsed });
        setLoaded(true);
      } else {
        setError(data.error || "Failed to load frames");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [device.id, limit]);

  const toggle = (id: number) =>
    setExpanded((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleRaw = (id: number) =>
    setRawRows((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const th: React.CSSProperties = {
    textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 700,
    color: THEME.text.tertiary, textTransform: "uppercase", letterSpacing: 1,
    borderBottom: `2px solid ${THEME.border.light}`, position: "sticky", top: 0,
    background: THEME.neutral[50], zIndex: 1, whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = { padding: "9px 14px", fontSize: 12, color: THEME.text.secondary, fontFamily: "JetBrains Mono, monospace", whiteSpace: "nowrap" };

  return (
    <div style={{ padding: 24, height: "100%", overflow: "auto", background: THEME.background.secondary }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: THEME.text.primary, marginBottom: 4 }}>Frame History</div>
        <div style={{ fontSize: 13, color: THEME.text.secondary }}>The most recent telemetry frames this device sent — click a row to decode it.</div>
      </div>

      {/* Controls */}
      <div style={{ background: "white", borderRadius: 12, border: `2px solid ${THEME.border.light}`, padding: 16, marginBottom: 20, boxShadow: THEME.shadow.sm, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: THEME.text.tertiary, fontWeight: 600 }}>Load latest</span>
          <select value={limit} onChange={(e) => setLimit(parseInt(e.target.value))}
            style={{ background: "white", border: `2px solid ${THEME.border.light}`, borderRadius: 8, padding: "8px 12px", color: THEME.text.primary, fontSize: 13, fontFamily: "inherit", outline: "none", cursor: "pointer" }}>
            <option value={50}>50 frames</option>
            <option value={100}>100 frames</option>
            <option value={200}>200 frames</option>
          </select>
        </div>
        <button onClick={load} disabled={loading}
          style={{ background: THEME.primary[500], color: "white", border: "none", borderRadius: 10, padding: "10px 24px", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", boxShadow: THEME.shadow.md, opacity: loading ? 0.7 : 1 }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = THEME.primary[600]; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = THEME.primary[500]; }}>
          {loading ? "Loading…" : loaded ? "↻ Reload" : "Load frames"}
        </button>
        {info && <span style={{ fontSize: 11, color: THEME.text.tertiary, fontFamily: "JetBrains Mono, monospace" }}>{info.count} frames · {info.time}ms</span>}
        {error && <span style={{ fontSize: 13, color: "#dc2626", fontWeight: 500 }}>⚠️ {error}</span>}
      </div>

      {/* Empty state */}
      {!loaded && !loading && (
        <div style={{ background: "white", borderRadius: 12, border: `2px dashed ${THEME.border.light}`, padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🛰️</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: THEME.text.primary, marginBottom: 8 }}>No frames loaded</div>
          <div style={{ fontSize: 13, color: THEME.text.tertiary }}>Press “Load frames” to pull this device’s most recent telemetry.</div>
        </div>
      )}

      {/* Table */}
      {loaded && (
        <div style={{ background: "white", borderRadius: 12, border: `2px solid ${THEME.border.light}`, overflow: "hidden", boxShadow: THEME.shadow.sm }}>
          {frames.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: THEME.text.tertiary }}>No frames yet for this device.</div>
          ) : (
            <div style={{ overflowX: "auto", maxHeight: 560 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...th, width: 30 }}></th>
                    <th style={th}>Time (IST)</th>
                    <th style={th}>Seq</th>
                    <th style={th}>Uptime</th>
                    <th style={th}>Net</th>
                    <th style={th}>Permit</th>
                    <th style={th}>Bearer</th>
                    <th style={th}>Faults</th>
                  </tr>
                </thead>
                <tbody>
                  {frames.map((f) => {
                    const isOpen = expanded.has(f.id);
                    const time = f.ts_utc ? formatIST(f.ts_utc) : formatIST(f.received_at) + " (rx)";
                    return (
                      <React.Fragment key={f.id}>
                        <tr onClick={() => toggle(f.id)}
                          style={{ borderBottom: `1px solid ${THEME.neutral[100]}`, cursor: "pointer", background: isOpen ? THEME.primary[50] : "transparent" }}
                          onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.background = THEME.neutral[50]; }}
                          onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.background = "transparent"; }}>
                          <td style={{ ...td, color: THEME.primary[500], textAlign: "center" }}>{isOpen ? "▾" : "▸"}</td>
                          <td style={td}>{time}</td>
                          <td style={td}>{f.seq}</td>
                          <td style={td}>{f.up}s</td>
                          <td style={td}>{f.net || "—"}</td>
                          <td style={{ ...td, color: THEME.text.primary, fontWeight: 600 }}>{f.d?.["P-4102"] ?? "—"}</td>
                          <td style={td}>{f.d?.["P-4100"] ?? "—"}</td>
                          <td style={td}>
                            {f.faults && f.faults.length > 0
                              ? f.faults.map((a) => <span key={a} style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", padding: "1px 6px", borderRadius: 4, marginRight: 4 }}>{a}</span>)
                              : <span style={{ color: THEME.status.success }}>clear</span>}
                          </td>
                        </tr>

                        {isOpen && (
                          <tr>
                            <td colSpan={8} style={{ padding: 0, background: THEME.background.secondary, borderBottom: `1px solid ${THEME.border.light}` }}>
                              <div style={{ padding: 16 }}>
                                {/* Decoded measured values */}
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, marginBottom: 12 }}>
                                  {Object.entries(f.d || {}).map(([pid, v]) => {
                                    const m = PID_META[pid];
                                    return (
                                      <div key={pid} style={{ background: "white", border: `1px solid ${THEME.border.light}`, borderRadius: 8, padding: "8px 12px" }}>
                                        <div style={{ fontSize: 10, color: THEME.text.tertiary }}>{m?.name || pid} <span style={{ color: THEME.neutral[300] }}>· {pid}</span></div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: THEME.text.primary, fontFamily: "JetBrains Mono, monospace" }}>{fmtVal(pid, v)}</div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* GPS + meta */}
                                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: THEME.text.secondary, fontFamily: "JetBrains Mono, monospace" }}>
                                  <span>📍 {f.gps && f.gps.fix && f.gps.fix > 0 ? `${f.gps.lat}, ${f.gps.lon} (fix ${f.gps.fix}, ${f.gps.sat} sats)` : `no lock (fix ${f.gps?.fix ?? 0})`}</span>
                                  <span>frame #{f.id}</span>
                                  <span>boot {f.boot_id ? f.boot_id.slice(0, 8) : "—"}</span>
                                  {f.source !== "live" && <span style={{ color: "#b45309" }}>{f.source}</span>}
                                  <button onClick={(e) => { e.stopPropagation(); toggleRaw(f.id); }}
                                    style={{ background: "none", border: `1px solid ${THEME.border.light}`, borderRadius: 6, padding: "2px 10px", fontSize: 11, color: THEME.text.secondary, cursor: "pointer", fontFamily: "inherit" }}>
                                    {rawRows.has(f.id) ? "Hide raw" : "{ } Raw"}
                                  </button>
                                </div>

                                {rawRows.has(f.id) && (
                                  <pre style={{ marginTop: 10, background: "#0f172a", color: "#a5f3fc", padding: 12, borderRadius: 8, fontSize: 11, fontFamily: "JetBrains Mono, monospace", overflow: "auto" }}>
                                    {JSON.stringify({ d: f.d, faults: f.faults, gps: f.gps }, null, 2)}
                                  </pre>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}