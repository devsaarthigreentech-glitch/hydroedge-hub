"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Device } from "@/types";
import { useIsMobile } from "@/hooks/useIsMobile";

// ── Types matching /api/nano/config ─────────────────────────────────────────
interface Param {
  pid: string;
  name: string;
  description: string | null;
  data_type: string | null;
  units: string | null;
  valid_range: string | null;
  enum_values: string[] | null;
  default_value: string | null;
  access: string;
  settable_via: string[];
  sms_eligible: boolean;
  auth_req: boolean;
  notes: string | null;
  cloud_settable: boolean;
  current_value: string | null;
  current_res: string | null;
  current_ts: string | null;
}
interface Category { name: string; params: Param[]; editable: number; }
interface CmdLog { id: string; verb: string; pid: string | null; value_text: string | null; status: string; result_reason: string | null; sent_at: string; }

// ── 28 registry categories → 8 navigable meta-sections ──────────────────────
const SECTIONS: Array<{ name: string; icon: string; cats: string[] }> = [
  { name: "Identity & Setup", icon: "🏷️", cats: ["Device Identity & Provisioning", "Customer & Installation", "Feature Presence (Sensor Options)"] },
  { name: "Network & Cloud", icon: "🌐", cats: ["Cellular / Network", "MQTT / Cloud", "Config File & Management Meta"] },
  { name: "Telemetry & Logging", icon: "📡", cats: ["Telemetry / Reporting", "Live Telemetry / Measured Status", "Message Buffer / Store-and-Forward", "Logging / SD Card"] },
  { name: "HHO Control", icon: "⚡", cats: ["Current Control", "Cell Current & HHO Measurement", "Safety Limits"] },
  { name: "Engine & Power", icon: "🚛", cats: ["Engine / Application Profile", "Engine Detection & Start Interlock", "Battery Management", "CAN / J1939 Engine Data", "Energy Meter / RS485 Modbus", "Stop/Start & DOUT"] },
  { name: "Fluids & Environment", icon: "💧", cats: ["Fill-System Health", "Water Management", "Pressure / Water Quality / Cold-Climate"] },
  { name: "Alerts & SMS", icon: "🔔", cats: ["Alerts / Notifications", "SMS Command Authorization"] },
  { name: "Service & Time", icon: "🛠️", cats: ["Service / Runtime Counters", "Time / RTC", "OTA / Firmware Update", "Recovery / Retry Policy"] },
];

// NanoV3 on/off switches (writable, persisted bools in config_table.c). Shown in
// the feature-flag truth table; a PID not yet in nano_registry is skipped.
const FLAG_PIDS = ["P-515", "P-609", "P-1303", "P-1306", "P-1501", "P-4200", "P-4300", "P-5101", "P-5110", "P-5400", "P-5500"];

const C = {
  railBg: "#151515", rowBg: "#1a1a1a", border: "#2a2a2a", field: "#111",
  text: "#e2e8f0", dim: "#6b7280", faint: "#525252",
  accent: "#7c3aed", accentBg: "rgba(124,58,237,0.1)", accentBd: "rgba(124,58,237,0.25)",
  green: "#00c853", amber: "#fbbf24", red: "#f87171",
};

export function NanoConfigTab({ device }: { device: Device }) {
  const isMobile = useIsMobile();
  const [categories, setCategories] = useState<Category[]>([]);
  const [counts, setCounts] = useState({ total: 0, editable: 0, readonly: 0 });
  const [selected, setSelected] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["HHO Control"]));
  const [search, setSearch] = useState("");
  const [editableOnly, setEditableOnly] = useState(true);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [reading, setReading] = useState(false);
  const [log, setLog] = useState<CmdLog[]>([]);
  const [showLog, setShowLog] = useState(!isMobile);
  const [showFlags, setShowFlags] = useState(false);

  const catMap = useMemo(() => {
    const m: Record<string, Category> = {};
    categories.forEach((c) => (m[c.name] = c));
    return m;
  }, [categories]);

  const loadConfig = useCallback(async () => {
    const res = await fetch(`/api/nano/config?device_id=${device.id}`);
    const data = await res.json();
    if (data.success) {
      setCategories(data.data.categories);
      setCounts(data.data.counts);
      if (!selected && data.data.categories.length) {
        const firstHHO = data.data.categories.find((c: Category) => c.name === "Current Control");
        setSelected(firstHHO ? "Current Control" : data.data.categories[0].name);
      }
    }
  }, [device.id, selected]);

  const loadLog = useCallback(async () => {
    const res = await fetch(`/api/nano/command?device_id=${device.id}&limit=25`);
    const data = await res.json();
    if (data.success) setLog(data.data);
  }, [device.id]);

  useEffect(() => { loadConfig(); }, [loadConfig]);
  useEffect(() => { loadLog(); const i = setInterval(loadLog, 3000); return () => clearInterval(i); }, [loadLog]);

  const setEdit = (pid: string, v: string) => {
    setEdits((p) => ({ ...p, [pid]: v }));
    setChanged((p) => new Set(p).add(pid));
  };

  const sendOne = useCallback(async (pid: string, value: string, confirm = false): Promise<boolean> => {
    const res = await fetch("/api/nano/command", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: device.id, verb: "set", pid, value, confirm }),
    });
    const data = await res.json();
    if (!data.success && data.needsConfirm) {
      if (window.confirm(`${pid} changes live electrolyser current. Send anyway?`)) {
        return sendOne(pid, value, true);
      }
      return false;
    }
    if (!data.success) { alert(`${pid}: ${data.error}`); return false; }
    return true;
  }, [device.id]);

  // Ask the device for every parameter. It answers a few per publish cycle,
  // so values land over several seconds; refresh while they arrive. The device
  // also sends the full set on its own each time it comes online.
  const readAll = useCallback(async () => {
    setReading(true);
    try {
      const res = await fetch("/api/nano/command", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: device.id, verb: "getall" }),
      });
      const data = await res.json();
      if (!data.success) { alert(data.error || "Read request failed"); return; }
      await loadLog();
      for (const ms of [3000, 8000, 15000, 30000]) setTimeout(loadConfig, ms);
    } catch {
      alert("Network error");
    } finally {
      setReading(false);
    }
  }, [device.id, loadConfig, loadLog]);

  const saveAll = useCallback(async () => {
    setSending(true);
    for (const pid of Array.from(changed)) {
      const ok = await sendOne(pid, edits[pid]);
      if (ok) setChanged((p) => { const n = new Set(p); n.delete(pid); return n; });
    }
    setSending(false);
    await loadLog();
    setTimeout(loadConfig, 1500); // pick up writeback-updated current values
  }, [changed, edits, sendOne, loadLog, loadConfig]);

  // ── Which params to show ──
  const visibleParams: Param[] = useMemo(() => {
    let list: Param[] = search
      ? categories.flatMap((c) => c.params)
      : selected ? (catMap[selected]?.params || []) : [];
    if (editableOnly) list = list.filter((p) => p.cloud_settable);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.pid.toLowerCase().includes(q));
    }
    return list;
  }, [search, selected, catMap, categories, editableOnly]);

  const flags = useMemo(
    () => categories.flatMap((c) => c.params).filter((p) => FLAG_PIDS.includes(p.pid)),
    [categories]
  );

  const statusColor = (s: string) =>
    s === "ok" ? C.green : s === "nack" || s === "failed" ? C.red : s === "sent" ? "#60a5fa" : C.amber;

  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", height: isMobile ? "auto" : "calc(100vh - 240px)", minHeight: 520, background: "#181818", color: C.text }}>

      {/* ══ RAIL ══ */}
      {!isMobile && (
        <div style={{ width: 230, minWidth: 230, background: C.railBg, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: 10, borderBottom: `1px solid ${C.border}` }}>
            <input
              value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search all params…"
              style={{ width: "100%", boxSizing: "border-box", background: C.field, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 10px", color: C.text, fontSize: 12, outline: "none", fontFamily: "inherit" }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 11, color: C.dim, cursor: "pointer" }}>
              <input type="checkbox" checked={editableOnly} onChange={(e) => setEditableOnly(e.target.checked)} />
              Editable only ({counts.editable})
            </label>
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
            {SECTIONS.map((sec) => {
              const cats = sec.cats.map((n) => catMap[n]).filter(Boolean);
              if (cats.length === 0) return null;
              const isOpen = openSections.has(sec.name);
              return (
                <div key={sec.name} style={{ marginBottom: 4 }}>
                  <div
                    onClick={() => setOpenSections((p) => { const n = new Set(p); n.has(sec.name) ? n.delete(sec.name) : n.add(sec.name); return n; })}
                    style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 8px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#cbd5e1" }}
                  >
                    <span style={{ fontSize: 13 }}>{sec.icon}</span>
                    <span style={{ flex: 1 }}>{sec.name}</span>
                    <span style={{ fontSize: 10, color: C.faint, transform: isOpen ? "rotate(90deg)" : "none", transition: "0.15s" }}>▶</span>
                  </div>
                  {isOpen && cats.map((c) => {
                    const active = selected === c.name && !search;
                    const shown = editableOnly ? c.editable : c.params.length;
                    if (editableOnly && c.editable === 0) return null;
                    return (
                      <div key={c.name} onClick={() => { setSelected(c.name); setSearch(""); }}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px 6px 26px", marginBottom: 1, borderRadius: 6, cursor: "pointer", fontSize: 11.5, background: active ? C.accentBg : "transparent", color: active ? "#c4b5fd" : C.dim }}>
                        <span style={{ flex: 1 }}>{c.name}</span>
                        <span style={{ fontSize: 9, color: C.faint }}>{shown}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ EDITOR ══ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* Mobile search / filter */}
        {isMobile && (
          <div style={{ padding: 10, borderBottom: `1px solid ${C.border}`, background: C.railBg, display: "flex", gap: 8, alignItems: "center" }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search params…"
              style={{ flex: 1, background: C.field, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 10px", color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
            <label style={{ fontSize: 11, color: C.dim, display: "flex", alignItems: "center", gap: 4 }}>
              <input type="checkbox" checked={editableOnly} onChange={(e) => setEditableOnly(e.target.checked)} /> Edit
            </label>
          </div>
        )}

        {/* Toolbar */}
        <div style={{ height: 46, background: C.rowBg, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 14px", gap: 10, flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{showFlags ? "Feature flags" : search ? `Search: "${search}"` : selected || "Config"}</span>
          <span style={{ fontSize: 11, color: C.dim }}>{showFlags ? `${flags.length} switches` : `${visibleParams.length} params`}</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowFlags((v) => !v)} style={btn(showFlags)}
            title="Truth table of the on/off switches: which are on by default and which are off.">
            Feature flags
          </button>
          <button onClick={readAll} disabled={reading} style={{ ...btn(false), opacity: reading ? 0.6 : 1 }}
            title="Ask the device to report every parameter. Values arrive over the next few seconds. The device also does this on its own each time it connects.">
            {reading ? "Requesting…" : "↻ Read from device"}
          </button>
          {isMobile && (
            <button onClick={() => setShowLog((v) => !v)} style={btn(showLog)}>Log {log.length ? `(${log.length})` : ""}</button>
          )}
          {changed.size > 0 && (
            <button onClick={saveAll} disabled={sending} style={{ background: C.green, border: "none", borderRadius: 6, padding: "6px 14px", color: "#000", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: sending ? 0.6 : 1 }}>
              {sending ? "Sending…" : `Save ${changed.size} change${changed.size > 1 ? "s" : ""}`}
            </button>
          )}
        </div>

        {/* Params */}
        <div style={{ flex: 1, overflow: "auto", padding: "10px 14px" }}>
          {showFlags && <FlagTable flags={flags} />}
          {!showFlags && visibleParams.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: C.faint, fontSize: 13 }}>
              {editableOnly ? "No editable params here — untick “Editable only” to see read-only values." : "No params."}
            </div>
          )}
          {!showFlags && visibleParams.map((p) => (
            <ParamRow key={p.pid} p={p} value={edits[p.pid] ?? (p.access === "WO" ? "" : (p.current_value ?? p.default_value ?? ""))} changed={changed.has(p.pid)}
              onChange={(v) => setEdit(p.pid, v)} onSet={async () => { const ok = await sendOne(p.pid, edits[p.pid] ?? (p.current_value ?? "")); if (ok) { setChanged((s) => { const n = new Set(s); n.delete(p.pid); return n; }); loadLog(); setTimeout(loadConfig, 1500); } }} />
          ))}
        </div>
      </div>

      {/* ══ COMMAND LOG ══ */}
      {(showLog || !isMobile) && (
        <div style={{ width: isMobile ? "100%" : 270, minWidth: isMobile ? undefined : 270, maxHeight: isMobile ? 280 : undefined, background: C.railBg, borderLeft: isMobile ? "none" : `1px solid ${C.border}`, borderTop: isMobile ? `1px solid ${C.border}` : "none", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 12, color: C.text }}>Command Log</div>
          <div style={{ flex: 1, overflow: "auto", padding: 6 }}>
            {log.length === 0 && <div style={{ textAlign: "center", padding: 24, color: C.faint, fontSize: 10 }}>No commands yet.</div>}
            {log.map((e) => (
              <div key={e.id} style={{ marginBottom: 4, padding: "6px 8px", borderRadius: 6, background: C.rowBg, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, fontWeight: 700, textTransform: "uppercase", background: `${statusColor(e.status)}22`, color: statusColor(e.status) }}>{e.status}</span>
                  <code style={{ fontSize: 10, color: "#c4b5fd", fontWeight: 600 }}>{e.verb} {e.pid || ""} {e.value_text || ""}</code>
                  <span style={{ fontSize: 8, color: C.faint, marginLeft: "auto" }}>{e.sent_at ? new Date(e.sent_at).toLocaleTimeString() : ""}</span>
                </div>
                {e.result_reason && <div style={{ marginTop: 3, fontSize: 9, color: C.red, fontFamily: "monospace" }}>{e.result_reason}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function btn(active: boolean): React.CSSProperties {
  return { background: active ? C.accentBg : "transparent", border: `1px solid ${active ? C.accentBd : C.border}`, borderRadius: 6, padding: "5px 10px", color: active ? "#c4b5fd" : C.dim, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
}

function FlagTable({ flags }: { flags: Param[] }) {
  const cell: React.CSSProperties = { padding: "7px 10px", fontSize: 12, borderBottom: `1px solid ${C.border}`, textAlign: "left" };
  const groups: Array<{ title: string; hint: string; rows: Param[] }> = [
    { title: "On by default", hint: "Active out of the box. Set false to shut down.", rows: flags.filter((p) => p.default_value === "true") },
    { title: "Off by default", hint: "Dormant out of the box. Set true to activate.", rows: flags.filter((p) => p.default_value !== "true") },
  ];
  return (
    <div>
      {groups.map((g) => (
        <div key={g.title} style={{ marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{g.title} <span style={{ color: C.dim, fontWeight: 400, fontSize: 11 }}>· {g.hint}</span></div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 6, background: C.rowBg, border: `1px solid ${C.border}`, borderRadius: 8 }}>
            <thead>
              <tr style={{ color: C.dim, fontSize: 10, textTransform: "uppercase" }}>
                <th style={cell}>Feature</th><th style={cell}>PID</th><th style={cell}>Default</th><th style={cell}>Device now</th><th style={cell}>Status</th>
              </tr>
            </thead>
            <tbody>
              {g.rows.length === 0 && <tr><td style={{ ...cell, color: C.faint }} colSpan={5}>None</td></tr>}
              {g.rows.map((p) => {
                const def = p.default_value === "true" ? "true" : "false";
                const known = p.current_value !== null && p.current_value !== undefined;
                const same = known && p.current_value === def;
                return (
                  <tr key={p.pid} title={p.description || undefined}>
                    <td style={{ ...cell, color: C.text, fontWeight: 600 }}>{p.name}</td>
                    <td style={{ ...cell, fontFamily: "monospace", color: "#93c5fd" }}>{p.pid}</td>
                    <td style={{ ...cell, fontFamily: "monospace", color: def === "true" ? C.green : C.dim }}>{def}</td>
                    <td style={{ ...cell, fontFamily: "monospace", color: known ? "#93c5fd" : C.faint }}>{known ? p.current_value : "—"}</td>
                    <td style={{ ...cell, color: !known ? C.faint : same ? C.dim : C.amber }}>{!known ? "not read yet" : same ? "factory default" : "changed"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
      <div style={{ fontSize: 10, color: C.faint }}>Change a switch from its category in Config. Read-only status flags and the OTA trigger are not listed.</div>
    </div>
  );
}

function ParamRow({ p, value, changed, onChange, onSet }: { p: Param; value: string; changed: boolean; onChange: (v: string) => void; onSet: () => void; }) {
  const editable = p.cloud_settable;
  const restart = p.notes?.includes("runtime_change=N");
  const field: React.CSSProperties = { background: C.field, border: `1px solid ${C.border}`, borderRadius: 5, padding: "6px 8px", color: C.text, fontSize: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box", width: "100%" };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 3, borderRadius: 8, background: changed ? "rgba(251,191,36,0.06)" : C.rowBg, border: `1px solid ${changed ? "rgba(251,191,36,0.25)" : C.border}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, fontSize: 12, color: C.text }}>{p.name}</span>
          <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: "rgba(59,130,246,0.08)", color: "#93c5fd", fontFamily: "monospace" }}>{p.pid}</span>
          {p.units && <span style={{ fontSize: 9, color: C.faint }}>{p.units}</span>}
          {!editable && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: "rgba(107,114,128,0.15)", color: C.dim }}>{p.access}{p.access === "RW" ? " · not cloud" : ""}</span>}
          {restart && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: "rgba(251,191,36,0.12)", color: C.amber }}>restart</span>}
          {p.auth_req && <span style={{ fontSize: 8, color: C.faint }}>🔒</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
          {p.current_value !== null && p.current_value !== undefined ? (
            <span style={{ fontSize: 10, color: C.dim }}>device: <span style={{ color: "#93c5fd", fontFamily: "monospace" }}>{p.current_value}</span></span>
          ) : (
            p.default_value && <span style={{ fontSize: 10, color: C.faint }}>default: {p.default_value}</span>
          )}
          {p.description && <span style={{ fontSize: 9, color: C.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.description}>{p.description}</span>}
        </div>
      </div>

      {editable ? (
        <div style={{ display: "flex", gap: 6, alignItems: "center", minWidth: 220 }}>
          <div style={{ flex: 1 }}>
            {p.enum_values && p.enum_values.length ? (
              <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...field, cursor: "pointer" }}>
                {p.enum_values.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : p.data_type === "bool" ? (
              <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...field, cursor: "pointer" }}>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : (
              <input type={p.access === "WO" ? "password" : ["float", "int16", "uint16", "uint32", "uint8"].includes(p.data_type || "") ? "number" : "text"}
                placeholder={p.access === "WO" ? "enter new value" : undefined} autoComplete={p.access === "WO" ? "new-password" : undefined}
                value={value} onChange={(e) => onChange(e.target.value)} style={field} />
            )}
          </div>
          <button onClick={onSet} disabled={!changed} title="Send to device"
            style={{ background: changed ? "rgba(0,200,83,0.12)" : "none", border: `1px solid ${changed ? "rgba(0,200,83,0.25)" : C.border}`, borderRadius: 5, padding: "5px 10px", color: changed ? C.green : C.faint, fontSize: 11, fontWeight: 700, cursor: changed ? "pointer" : "default", fontFamily: "inherit", opacity: changed ? 1 : 0.4 }}>
            Set
          </button>
        </div>
      ) : (
        <div style={{ minWidth: 120, textAlign: "right", fontSize: 12, color: "#93c5fd", fontFamily: "monospace" }}>
          {p.current_value ?? "—"}
        </div>
      )}
    </div>
  );
}