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
  generations: Generation[];
  current_value: string | null;
  current_res: string | null;
  current_ts: string | null;
}
type Generation = "NanoV3" | "Gen2";
type GenView = Generation | "All";
interface Category { name: string; params: Param[]; editable: number; }
interface CmdLog { id: string; verb: string; pid: string | null; value_text: string | null; status: string; result_reason: string | null; reply_text: string | null; sent_at: string; }

// ── 28 registry categories → 8 navigable meta-sections ──────────────────────
const SECTIONS: Array<{ name: string; icon: string; cats: string[] }> = [
  { name: "Identity & Setup", icon: "🏷️", cats: ["Device Identity & Provisioning", "Customer & Installation", "Feature Presence (Sensor Options)"] },
  { name: "Network & Cloud", icon: "🌐", cats: ["Cellular / Network", "MQTT / Cloud", "Config File & Management Meta"] },
  { name: "Telemetry & Logging", icon: "📡", cats: ["Telemetry / Reporting", "Live Telemetry / Measured Status", "Message Buffer / Store-and-Forward", "Logging / SD Card"] },
  { name: "HHO Control", icon: "⚡", cats: ["Current Control", "Cell Current & HHO Measurement", "Safety Limits"] },
  { name: "Engine & Power", icon: "🚛", cats: ["Engine / Application Profile", "Engine Detection & Start Interlock", "Battery Management", "CAN / J1939 Engine Data", "Energy Meter / RS485 Modbus", "Stop/Start & DOUT", "Fuel Sender", "Backup Battery"] },
  { name: "Fluids & Environment", icon: "💧", cats: ["Fill-System Health", "Water Management", "Pressure / Water Quality / Cold-Climate"] },
  { name: "Alerts & SMS", icon: "🔔", cats: ["Alerts / Notifications", "SMS Command Authorization"] },
  { name: "Service & Time", icon: "🛠️", cats: ["Service / Runtime Counters", "Time / RTC", "OTA / Firmware Update", "Recovery / Retry Policy"] },
];

// NanoV3 on/off switches (writable, persisted bools in config_table.c). Shown in
// the feature-flag truth table; a PID not yet in nano_registry is skipped.
const FLAG_PIDS = ["P-515", "P-609", "P-1303", "P-1306", "P-1501", "P-4200", "P-4300", "P-5040", "P-5101", "P-5110", "P-5400", "P-5500"];

// Free-text parameters with a fixed format: shown as the input's placeholder.
// Custom CAN maps (P-4204 = Custom), max 95 chars; empty = off.
const CAN_MAP_FORMAT = "ID, BYTE, NBYTES, BE|LE, SCALE, OFFSET[, MASK[, SHIFT]]  e.g. 0x316, 2, 2, BE, 0.25, 0";
const PLACEHOLDERS: Record<string, string> = {
  "P-4210": CAN_MAP_FORMAT, "P-4211": CAN_MAP_FORMAT, "P-4212": CAN_MAP_FORMAT,
  "P-4213": CAN_MAP_FORMAT, "P-4214": CAN_MAP_FORMAT, "P-4215": CAN_MAP_FORMAT,
  "P-4222": "hex ids, e.g. 124, 1B8, 3B9 (up to 16; empty = every id)",
  // spare Custom CAN channels 1..8: map, and the label the Live tab shows
  ...Object.fromEntries([0, 1, 2, 3, 4, 5, 6, 7].flatMap((k) => [
    [`P-423${k}`, CAN_MAP_FORMAT], [`P-424${k}`, "label with unit, e.g. Odometer (km)"],
  ])),
};
const MAX_LEN: Record<string, number> = { "P-4210": 95, "P-4211": 95, "P-4212": 95, "P-4213": 95, "P-4214": 95, "P-4215": 95, "P-4222": 95,
  ...Object.fromEntries([0, 1, 2, 3, 4, 5, 6, 7].flatMap((k) => [[`P-423${k}`, 95], [`P-424${k}`, 95]])),
};

// Firmware generation toggle. The registry holds Gen 2 (nano_iot_firmware) and
// NanoV3 parameters side by side (migration 030 says which is which); 53 IDs
// are shared and show in both views.
const GEN_VIEWS: Array<{ id: GenView; label: string }> = [
  { id: "NanoV3", label: "NanoV3" }, { id: "Gen2", label: "Gen 2" }, { id: "All", label: "All" },
];
const genKey = (deviceId: string) => `nanoConfigGen:${deviceId}`;

// Gen 2 parameter -> its NanoV3 counterpart(s), shown as a hint in the Gen 2 view.
const pidRange = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => `P-${a + i}`);
const V3_EQUIV: Record<string, string[]> = {
  "P-3020": ["P-5021"], "P-4040": ["P-5020"], "P-4043": ["P-5026", "P-5027"],
  "P-4044": ["P-5028"], "P-4045": ["P-5028"], "P-801": ["P-5201"], "P-806": ["P-5200"],
  // Modbus -> RS485: same settings, different order
  "P-901": ["P-5500"], "P-902": ["P-5504"], "P-903": ["P-5501"], "P-904": ["P-5502"], "P-905": ["P-5503"],
  "P-1601": pidRange(5300, 5304), "P-1602": ["P-5300"],
  "P-1001": ["P-5102"], "P-1002": ["P-5102", "P-5105", "P-5106"], "P-1003": ["P-5105", "P-5106"],
  "P-3058": ["P-5103"], "P-3042": ["P-5110"], "P-3056": ["P-5111"], "P-3057": ["P-5112"],
  "P-3043": ["P-5700"], "P-3027": ["P-5701", "P-5702"], "P-3029": ["P-5702"], "P-3028": ["P-5709"],
  "P-1004": ["P-5040", "P-5041"], "P-1203": ["P-5040", "P-5041"], "P-4020": ["P-5040", "P-5041"],
  "P-4088": ["P-4110", "P-4111"], "P-4089": ["P-4112"], "P-4094": ["P-4118"],
  "P-702": ["P-1301", "P-1302"], "P-703": ["P-1301", "P-1302"], "P-704": ["P-1301", "P-1302"],
};

const C = {
  railBg: "#151515", rowBg: "#1a1a1a", border: "#2a2a2a", field: "#111",
  text: "#e2e8f0", dim: "#6b7280", faint: "#525252",
  accent: "#7c3aed", accentBg: "rgba(124,58,237,0.1)", accentBd: "rgba(124,58,237,0.25)",
  green: "#00c853", amber: "#fbbf24", red: "#f87171",
};

export function NanoConfigTab({ device }: { device: Device }) {
  const isMobile = useIsMobile();
  const [categories, setCategories] = useState<Category[]>([]);
  const [firmware, setFirmware] = useState<string | null>(null);
  const [genView, setGenViewState] = useState<GenView | null>(null);
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
  const [cmdText, setCmdText] = useState("");
  const [cmdErr, setCmdErr] = useState<string | null>(null);
  const [cmdBusy, setCmdBusy] = useState(false);

  // Generation view: the choice remembered for this device in this browser,
  // else the device's own firmware (NanoV3 unless its frames say Gen 2).
  useEffect(() => {
    if (genView || !firmware) return;
    let saved: string | null = null;
    try { saved = localStorage.getItem(genKey(device.id)); } catch { /* private mode */ }
    setGenViewState(GEN_VIEWS.some((g) => g.id === saved) ? (saved as GenView) : firmware === "gen2" ? "Gen2" : "NanoV3");
  }, [device.id, firmware, genView]);
  const setGenView = (g: GenView) => {
    setGenViewState(g);
    try { localStorage.setItem(genKey(device.id), g); } catch { /* not remembered */ }
  };
  const view: GenView = genView ?? "NanoV3";

  // Categories narrowed to the chosen generation; counts follow.
  const genCategories = useMemo(() => categories
    .map((c) => {
      const params = view === "All" ? c.params : c.params.filter((p) => p.generations.includes(view));
      return { ...c, params, editable: params.filter((p) => p.cloud_settable).length };
    })
    .filter((c) => c.params.length > 0), [categories, view]);
  const editableCount = useMemo(() => genCategories.reduce((n, c) => n + c.editable, 0), [genCategories]);

  const catMap = useMemo(() => {
    const m: Record<string, Category> = {};
    genCategories.forEach((c) => (m[c.name] = c));
    return m;
  }, [genCategories]);

  // A category can be empty in the other generation: fall back to the first one shown.
  useEffect(() => {
    if (selected && genCategories.length && !catMap[selected]) {
      setSelected(catMap["Current Control"] ? "Current Control" : genCategories[0].name);
    }
  }, [selected, catMap, genCategories]);

  // From a Gen 2 hint to the NanoV3 parameter(s): one PID, or the shared prefix of a group.
  const showV3 = (pids: string[]) => {
    setGenView("NanoV3");
    setShowFlags(false);
    setSearch(pids.length === 1 ? pids[0] : pids[0].slice(0, -1));
  };

  const loadConfig = useCallback(async () => {
    const res = await fetch(`/api/nano/config?device_id=${device.id}`);
    const data = await res.json();
    if (data.success) {
      setCategories(data.data.categories);
      setFirmware(data.data.firmware ?? "unknown");
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

  // Ask the device for one parameter. The reply lands in nano_param_values a
  // few seconds later, so refresh while it arrives.
  const getOne = useCallback(async (pid: string) => {
    try {
      const res = await fetch("/api/nano/command", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: device.id, verb: "get", pid }),
      });
      const data = await res.json();
      if (!data.success) { alert(`${pid}: ${data.error || "Read request failed"}`); return; }
      await loadLog();
      for (const ms of [2000, 5000, 10000]) setTimeout(loadConfig, ms);
    } catch {
      alert("Network error");
    }
  }, [device.id, loadConfig, loadLog]);

  // Typed command ("set P-5021 24V", "get P-5021", "reboot"): parsed and checked
  // server-side, sent like the buttons. Works for P-IDs the registry does not
  // know yet, so new firmware parameters can be tried straight away.
  const sendTyped = useCallback(async (text: string, confirm = false) => {
    if (!text.trim()) return;
    setCmdBusy(true);
    setCmdErr(null);
    try {
      const res = await fetch("/api/nano/command", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: device.id, text, confirm }),
      });
      const data = await res.json();
      if (!data.success && data.needsConfirm) {
        if (window.confirm(`${data.error}\n\nSend anyway?`)) return sendTyped(text, true);
        return;
      }
      if (!data.success) { setCmdErr(data.error || "Command failed"); return; }
      setCmdText("");
      await loadLog();
      setTimeout(loadConfig, 1500);   // pick up the device's reply
    } catch {
      setCmdErr("Network error");
    } finally {
      setCmdBusy(false);
    }
  }, [device.id, loadLog, loadConfig]);

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
      ? genCategories.flatMap((c) => c.params)
      : selected ? (catMap[selected]?.params || []) : [];
    if (editableOnly) list = list.filter((p) => p.cloud_settable);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.pid.toLowerCase().includes(q));
    }
    return list;
  }, [search, selected, catMap, genCategories, editableOnly]);

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
            <GenToggle view={view} onChange={setGenView} firmware={firmware} />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search all params…"
              style={{ width: "100%", boxSizing: "border-box", background: C.field, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 10px", color: C.text, fontSize: 12, outline: "none", fontFamily: "inherit" }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 11, color: C.dim, cursor: "pointer" }}>
              <input type="checkbox" checked={editableOnly} onChange={(e) => setEditableOnly(e.target.checked)} />
              Editable only ({editableCount})
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
          <div style={{ padding: 10, borderBottom: `1px solid ${C.border}`, background: C.railBg, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ width: "100%" }}><GenToggle view={view} onChange={setGenView} firmware={firmware} /></div>
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
              onChange={(v) => setEdit(p.pid, v)} onSet={async () => { const ok = await sendOne(p.pid, edits[p.pid] ?? (p.current_value ?? "")); if (ok) { setChanged((s) => { const n = new Set(s); n.delete(p.pid); return n; }); loadLog(); setTimeout(loadConfig, 1500); } }}
              onGet={() => getOne(p.pid)}
              v3Equiv={view !== "NanoV3" && !p.generations.includes("NanoV3") ? V3_EQUIV[p.pid] : undefined} onShowV3={showV3} />
          ))}
        </div>
      </div>

      {/* ══ COMMAND LOG ══ */}
      {(showLog || !isMobile) && (
        <div style={{ width: isMobile ? "100%" : 270, minWidth: isMobile ? undefined : 270, maxHeight: isMobile ? 280 : undefined, background: C.railBg, borderLeft: isMobile ? "none" : `1px solid ${C.border}`, borderTop: isMobile ? `1px solid ${C.border}` : "none", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: C.text, marginBottom: 6 }}>Type a command</div>
            <form onSubmit={(e) => { e.preventDefault(); sendTyped(cmdText); }} style={{ display: "flex", gap: 6 }}>
              <input
                value={cmdText} onChange={(e) => { setCmdText(e.target.value); setCmdErr(null); }}
                placeholder="set P-5021 24V" spellCheck={false} autoComplete="off" disabled={cmdBusy}
                style={{ flex: 1, minWidth: 0, background: C.field, border: `1px solid ${cmdErr ? C.red : C.border}`, borderRadius: 6, padding: "6px 8px", color: C.text, fontSize: 12, fontFamily: "monospace", outline: "none" }}
              />
              <button type="submit" disabled={cmdBusy || !cmdText.trim()}
                style={{ background: C.accentBg, border: `1px solid ${C.accentBd}`, borderRadius: 6, padding: "5px 10px", color: "#c4b5fd", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: cmdBusy || !cmdText.trim() ? 0.5 : 1 }}>
                {cmdBusy ? "…" : "Send"}
              </button>
            </form>
            {cmdErr && <div style={{ marginTop: 5, fontSize: 10, color: C.red }}>{cmdErr}</div>}
            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
              {["set P-5021 24V", "get P-5021", "getall", "reboot"].map((ex) => (
                <button key={ex} type="button" onClick={() => { setCmdText(ex); setCmdErr(null); }}
                  title="Fill the box with this example"
                  style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 4, padding: "1px 6px", color: C.dim, fontSize: 9, fontFamily: "monospace", cursor: "pointer" }}>
                  {ex}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 5, fontSize: 9, color: C.faint, lineHeight: 1.4 }}>
              Same as the device console. Any P-ID works, even one GreenVision does not list yet; the device rejects anything it cannot apply.
            </div>
          </div>
          <div style={{ padding: "8px 12px 4px", fontWeight: 700, fontSize: 12, color: C.text }}>Command Log</div>
          <div style={{ flex: 1, overflow: "auto", padding: 6 }}>
            {log.length === 0 && <div style={{ textAlign: "center", padding: 24, color: C.faint, fontSize: 10 }}>No commands yet.</div>}
            {log.map((e) => (
              <div key={e.id} style={{ marginBottom: 4, padding: "6px 8px", borderRadius: 6, background: C.rowBg, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, fontWeight: 700, textTransform: "uppercase", background: `${statusColor(e.status)}22`, color: statusColor(e.status) }}>{e.status}</span>
                  <code style={{ fontSize: 10, color: "#c4b5fd", fontWeight: 600 }}>{e.verb} {e.pid || ""} {e.value_text || ""}</code>
                  <span style={{ fontSize: 8, color: C.faint, marginLeft: "auto" }}>{e.sent_at ? new Date(e.sent_at).toLocaleTimeString() : ""}</span>
                </div>
                {/* What a get returned (val of the device's t:cfg reply; up to 95 chars, e.g. a SHA-256) */}
                {e.verb === "get" && e.reply_text != null && <div style={{ marginTop: 3, fontSize: 9, color: C.green, fontFamily: "monospace", wordBreak: "break-all" }}>= {e.reply_text}</div>}
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

function GenToggle({ view, onChange, firmware }: { view: GenView; onChange: (g: GenView) => void; firmware: string | null }) {
  const fw = firmware === "v3" ? "NanoV3" : firmware === "gen2" ? "Gen 2" : null;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", background: C.field, border: `1px solid ${C.border}`, borderRadius: 6, padding: 2 }}>
        {GEN_VIEWS.map((g) => (
          <button key={g.id} onClick={() => onChange(g.id)}
            title={g.id === "All" ? "Both generations" : `Only parameters in the ${g.label} firmware (shared IDs show in both)`}
            style={{ flex: 1, background: view === g.id ? C.accentBg : "transparent", border: `1px solid ${view === g.id ? C.accentBd : "transparent"}`, borderRadius: 4, padding: "4px 0", color: view === g.id ? "#c4b5fd" : C.dim, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {g.label}
          </button>
        ))}
      </div>
      {fw && <div style={{ marginTop: 4, fontSize: 9, color: C.faint }}>This device reports {fw} firmware.</div>}
    </div>
  );
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

function ParamRow({ p, value, changed, onChange, onSet, onGet, v3Equiv, onShowV3 }: { p: Param; value: string; changed: boolean; onChange: (v: string) => void; onSet: () => void; onGet: () => void; v3Equiv?: string[]; onShowV3: (pids: string[]) => void; }) {
  const editable = p.cloud_settable;
  const restart = p.notes?.includes("runtime_change=N");
  const field: React.CSSProperties = { background: C.field, border: `1px solid ${C.border}`, borderRadius: 5, padding: "6px 8px", color: C.text, fontSize: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box", width: "100%" };
  // Reads just this parameter from the device; the reply updates "device:".
  const getBtn = (
    <button onClick={onGet} title="Read this value from the device"
      style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 5, padding: "5px 10px", color: "#93c5fd", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
      Get
    </button>
  );

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
          {v3Equiv && (
            <span onClick={() => onShowV3(v3Equiv)} title="Show the NanoV3 parameter"
              style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: C.accentBg, color: "#c4b5fd", cursor: "pointer" }}>
              NanoV3 uses {v3Equiv.join(" / ")}
            </span>
          )}
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
                placeholder={p.access === "WO" ? "enter new value" : PLACEHOLDERS[p.pid]} autoComplete={p.access === "WO" ? "new-password" : undefined}
                maxLength={MAX_LEN[p.pid]} title={PLACEHOLDERS[p.pid]}
                value={value} onChange={(e) => onChange(e.target.value)} style={field} />
            )}
          </div>
          <button onClick={onSet} disabled={!changed} title="Send to device"
            style={{ background: changed ? "rgba(0,200,83,0.12)" : "none", border: `1px solid ${changed ? "rgba(0,200,83,0.25)" : C.border}`, borderRadius: 5, padding: "5px 10px", color: changed ? C.green : C.faint, fontSize: 11, fontWeight: 700, cursor: changed ? "pointer" : "default", fontFamily: "inherit", opacity: changed ? 1 : 0.4 }}>
            Set
          </button>
          {getBtn}
        </div>
      ) : (
        <div style={{ minWidth: 120, display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
          <span style={{ fontSize: 12, color: "#93c5fd", fontFamily: "monospace" }}>{p.current_value ?? "—"}</span>
          {getBtn}
        </div>
      )}
    </div>
  );
}