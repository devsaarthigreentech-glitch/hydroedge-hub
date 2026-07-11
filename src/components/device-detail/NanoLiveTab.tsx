"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Device } from "@/types";
import { THEME } from "@/lib/theme";
import { timeAgo, formatTimestamp } from "@/lib/utils";

// ── Types matching /api/nano/live ──────────────────────────────────────────
interface Measured {
  pid: string;
  name: string;
  value: any;
  unit: string | null;
  category: string;
  data_type: string | null;
  conditional: boolean;
  present: boolean;
}
interface Fault {
  alert_id: string;
  severity: string;
  severity_rank: number;
  category: string | null;
  message_key: string | null;
  condition: string | null;
}
interface NanoState {
  online: boolean | null;
  net: string | null;
  last_ts_utc: string | null;
  last_seq: number | null;
  last_up: number | null;
  last_boot_id: string | null;
  updated_at: string | null;
  gps: { fix: number | null; sat: number | null; lat: number | null; lon: number | null };
  raw_d: Record<string, any> | null;
}

// ── Presentation grouping (registry lumps all measured into one category, so
//    we group by meaning here for a readable live view) ──────────────────────
const GROUPS: Array<{ title: string; icon: string; color: string; bg: string; pids: string[] }> = [
  { title: "Electrolyser & HHO", icon: "⚡", color: THEME.primary[500], bg: THEME.primary[50],
    pids: ["P-4075", "P-4093", "P-4094", "P-4095", "P-4102", "P-4099"] },
  { title: "Tank Levels", icon: "🪣", color: THEME.accent[600], bg: THEME.accent[50],
    pids: ["P-4096", "P-4097", "P-4098"] },
  { title: "Connectivity", icon: "📶", color: "#3b82f6", bg: "#eff6ff",
    pids: ["P-4100", "P-4101"] },
  { title: "Engine (CAN / Modbus)", icon: "🚛", color: "#7c3aed", bg: "#f5f3ff",
    pids: ["P-4103", "P-4104", "P-4105", "P-4106", "P-4107", "P-4108"] },
];

const SEV_COLOR: Record<string, string> = {
  Critical: "#dc2626", Fault: "#ef4444", Warning: "#f59e0b", Info: "#3b82f6", Unknown: "#6b7280",
};

export function NanoLiveTab({ device }: { device: Device }) {
  const [measured, setMeasured] = useState<Measured[]>([]);
  const [faults, setFaults] = useState<Fault[]>([]);
  const [state, setState] = useState<NanoState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [search, setSearch] = useState("");

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch(`/api/nano/live?device_id=${device.id}`);
      const data = await res.json();
      if (data.success) {
        setMeasured(data.data.measured || []);
        setFaults(data.data.faults || []);
        setState(data.data.state || null);
        setError(null);
      } else {
        setError(data.error || "Failed to load");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [device.id]);

  useEffect(() => {
    fetchLive();
    const i = setInterval(fetchLive, 10000); // frames arrive ~30s; poll 10s
    return () => clearInterval(i);
  }, [fetchLive]);

  const byPid: Record<string, Measured> = {};
  measured.forEach((m) => (byPid[m.pid] = m));

  const frameTime = state?.last_ts_utc || state?.updated_at || null;
  const isStale = frameTime ? Date.now() - new Date(frameTime).getTime() > 90000 : true;

  const matches = (m: Measured) =>
    !search ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.pid.toLowerCase().includes(search.toLowerCase());

  return (
    <div style={{ padding: 24, height: "100%", overflow: "auto", background: THEME.background.secondary }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: THEME.text.primary, marginBottom: 4 }}>
            Live Telemetry
          </div>
          <div style={{ fontSize: 13, color: THEME.text.secondary }}>
            GreenVision Nano · measured status every ~30s
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: isStale ? "#ef4444" : THEME.status.success }}>
              {frameTime ? timeAgo(frameTime) : "No data"}
            </div>
            <div style={{ fontSize: 10, color: THEME.text.tertiary, fontFamily: "JetBrains Mono, monospace" }}>
              {state ? `seq ${state.last_seq ?? "–"} · up ${state.last_up ?? "–"}s` : ""}
            </div>
          </div>
          <button
            onClick={() => setShowRaw((v) => !v)}
            style={{
              padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
              background: showRaw ? THEME.primary[500] : "white",
              color: showRaw ? "white" : THEME.text.secondary,
              border: `2px solid ${showRaw ? THEME.primary[500] : THEME.border.light}`,
              boxShadow: THEME.shadow.sm,
            }}
          >
            {"{ } Raw"}
          </button>
        </div>
      </div>

      {loading && measured.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: THEME.text.tertiary, fontSize: 13 }}>
          Loading live telemetry…
        </div>
      )}

      {error && (
        <div style={{
          padding: 16, marginBottom: 16, borderRadius: 12, background: "#fef2f2",
          border: "2px solid #fecaca", color: "#b91c1c", fontSize: 13, fontWeight: 600,
        }}>
          {error}
        </div>
      )}

      {!state && !loading && !error && (
        <div style={{
          padding: 60, textAlign: "center", color: THEME.text.tertiary, fontSize: 14,
          background: "white", borderRadius: 12, border: `2px dashed ${THEME.border.light}`,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📡</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No telemetry yet</div>
          <div style={{ fontSize: 12 }}>Device registered but hasn’t sent a frame.</div>
        </div>
      )}

      {/* Raw frame view */}
      {showRaw && state?.raw_d && (
        <pre style={{
          background: "#0f172a", color: "#a5f3fc", padding: 16, borderRadius: 12,
          fontSize: 12, fontFamily: "JetBrains Mono, monospace", overflow: "auto",
          marginBottom: 16, border: `1px solid ${THEME.border.light}`,
        }}>
          {JSON.stringify({ d: state.raw_d, faults: faults.map((f) => f.alert_id), gps: state.gps }, null, 2)}
        </pre>
      )}

      {/* Active faults */}
      {faults.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {faults.map((f) => {
            const c = SEV_COLOR[f.severity] || SEV_COLOR.Unknown;
            return (
              <div key={f.alert_id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                background: "white", borderRadius: 10, borderLeft: `4px solid ${c}`,
                boxShadow: THEME.shadow.sm,
              }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary }}>
                    {f.alert_id}
                    <span style={{
                      marginLeft: 8, fontSize: 10, fontWeight: 700, color: c,
                      background: `${c}15`, padding: "2px 8px", borderRadius: 6, textTransform: "uppercase",
                    }}>
                      {f.severity}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: THEME.text.secondary, marginTop: 2 }}>
                    {f.condition || f.message_key || "Active fault"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Search */}
      {state && (
        <input
          type="text"
          placeholder="Search parameters…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%", boxSizing: "border-box", marginBottom: 20, padding: "10px 18px",
            background: "white", border: `2px solid ${THEME.border.light}`, borderRadius: 10,
            fontSize: 13, color: THEME.text.primary, outline: "none", boxShadow: THEME.shadow.sm,
          }}
        />
      )}

      {/* Grouped measured cards */}
      {state && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {GROUPS.map((g) => {
            const items = g.pids.map((pid) => byPid[pid]).filter(Boolean).filter(matches);
            if (items.length === 0) return null;
            return (
              <MeasuredGroup key={g.title} group={g} items={items} frameTime={frameTime} isStale={isStale} />
            );
          })}

          {/* GPS */}
          {!search && (
            <div style={{ background: "white", border: `2px solid ${THEME.border.light}`, borderRadius: 12, overflow: "hidden", boxShadow: THEME.shadow.sm }}>
              <div style={{ padding: "14px 18px", background: THEME.primary[50], borderBottom: `3px solid ${THEME.primary[500]}`, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 20 }}>📍</span>
                <div style={{ fontSize: 15, fontWeight: 700, color: THEME.text.primary }}>Position & GPS</div>
              </div>
              <div style={{ padding: 16, fontSize: 13, color: THEME.text.secondary, fontFamily: "JetBrains Mono, monospace" }}>
                {state.gps && state.gps.fix && state.gps.fix > 0
                  ? `fix ${state.gps.fix} · ${state.gps.sat} sats · ${state.gps.lat}, ${state.gps.lon}`
                  : `No lock (fix ${state.gps?.fix ?? 0}, ${state.gps?.sat ?? 0} sats)`}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MeasuredGroup({
  group, items, frameTime, isStale,
}: {
  group: { title: string; icon: string; color: string; bg: string };
  items: Measured[];
  frameTime: string | null;
  isStale: boolean;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div style={{ background: "white", border: `2px solid ${THEME.border.light}`, borderRadius: 12, overflow: "hidden", boxShadow: THEME.shadow.sm }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding: "14px 18px", background: group.bg, borderBottom: `3px solid ${group.color}`,
          display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>{group.icon}</span>
          <div style={{ fontSize: 15, fontWeight: 700, color: THEME.text.primary }}>{group.title}</div>
          <div style={{ fontSize: 12, padding: "3px 10px", borderRadius: 6, background: "white", color: group.color, fontWeight: 700, border: `2px solid ${group.color}` }}>
            {items.length}
          </div>
        </div>
        <div style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", color: group.color, fontWeight: "bold", fontSize: 18 }}>▼</div>
      </div>

      {open && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 2, background: THEME.border.light, padding: 2 }}>
          {items.map((m) => {
            const display = renderValue(m);
            const cardColor = m.present ? group.color : THEME.neutral[300];
            return (
              <div
                key={m.pid}
                style={{
                  padding: "14px 16px", background: "white", display: "flex", flexDirection: "column", gap: 8,
                  borderRadius: 6, borderLeft: `3px solid ${!m.present ? THEME.neutral[300] : isStale ? "#ef4444" : group.color}`,
                }}
                title={frameTime ? formatTimestamp(frameTime) : ""}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: THEME.text.tertiary, fontFamily: "JetBrains Mono, monospace", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }} title={m.name}>
                      {m.name}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: display.muted ? THEME.text.tertiary : display.color || THEME.text.primary, fontFamily: "JetBrains Mono, monospace" }}>
                      {display.text}
                    </div>
                    <div style={{ fontSize: 9, color: THEME.text.tertiary, marginTop: 2, fontFamily: "JetBrains Mono, monospace" }}>
                      {m.pid}{m.conditional && !m.present ? " · not reporting" : ""}
                    </div>
                  </div>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: !m.present ? THEME.neutral[300] : cardColor, flexShrink: 0, marginTop: 4 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function renderValue(m: Measured): { text: string; muted?: boolean; color?: string } {
  if (!m.present) return { text: "—", muted: true };
  const v = m.value;
  if (typeof v === "boolean") {
    // For *_low / overtemp booleans, true is the noteworthy state
    return { text: v ? "TRUE" : "FALSE", color: v ? "#ef4444" : undefined };
  }
  if (typeof v === "number") return { text: m.unit ? `${v} ${m.unit}` : String(v) };
  return { text: String(v) };
}