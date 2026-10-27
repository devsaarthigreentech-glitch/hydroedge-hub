"use client";

// Device health for field engineers: issues detected from the frame history
// (lib/nano-health: pump and valve timing, remote stops and their causes, tank
// levels, thermal, config mismatches, restarts, alerts), an overall verdict,
// and the service log of what was found and fixed. A fix logged against a
// finding marks it resolved until it happens again.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Device } from "@/types";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { HealthReport, Finding, Severity, Category, Verdict } from "@/lib/nano-health";

interface ServiceRow { id: string; t: number; created_at: string; author: string | null; kind: string; finding: string | null; notes: string; }
interface HealthData {
  days: number;
  truncated: boolean;
  report: HealthReport;
  service: ServiceRow[];
  serviceLogReady: boolean;
  configChanges: Array<{ t: number; pid: string | null; value: string | null }>;
}

const C = {
  bg: "#181818", card: "#1e1e1e", border: "#2a2a2a", field: "#111",
  text: "#e2e8f0", dim: "#6b7280", faint: "#525252",
  accent: "#7c3aed", green: "#00c853", red: "#f87171", amber: "#fbbf24", blue: "#60a5fa",
};

const VERDICT: Record<Verdict, { label: string; color: string; icon: string }> = {
  healthy: { label: "Healthy", color: C.green, icon: "✓" },
  watch: { label: "Watch", color: C.amber, icon: "!" },
  intervention: { label: "Needs intervention", color: C.red, icon: "✕" },
  no_data: { label: "No data", color: C.dim, icon: "?" },
};
const SEV_COLOR: Record<Severity, string> = { critical: C.red, warning: C.amber, info: C.blue };
const CATEGORY: Record<Category, string> = {
  service: "Service", faulty_part: "Faulty part", config: "Config", bug: "Possible bug",
  connectivity: "Connectivity", operation: "Operation", device_alert: "Device alert",
};
const KINDS: Array<{ id: string; label: string }> = [
  { id: "fix", label: "Fix" }, { id: "part", label: "Part replaced" }, { id: "config", label: "Config change" },
  { id: "inspection", label: "Inspection" }, { id: "note", label: "Note" },
];
const WINDOWS = [1, 7, 30];

const fmtDur = (s: number) => (s < 120 ? `${Math.round(s)} s` : s < 7200 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1)} h`);
const fmtT = (t: number) => new Date(t).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
function ago(t: number) {
  const s = (Date.now() - t) / 1000;
  return s < 90 ? "just now" : s < 5400 ? `${Math.round(s / 60)} min ago` : s < 129600 ? `${Math.round(s / 3600)} h ago` : `${Math.round(s / 86400)} d ago`;
}

export function NanoHealthTab({ device }: { device: Device }) {
  const isMobile = useIsMobile();
  const [days, setDays] = useState(7);
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [showInfo, setShowInfo] = useState(false);
  const [form, setForm] = useState({ kind: "fix", finding: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/nano/health?device_id=${device.id}&days=${days}`);
      const d = await res.json();
      if (d.success) setData(d.data);
      else setErr(d.message || d.error || "Could not build the report");
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  }, [device.id, days]);

  useEffect(() => { load(); }, [load]);

  const report = data?.report;
  const findings = report?.findings || [];
  const shown = findings.filter((f) => showInfo || f.severity !== "info" || f.resolvedBy);
  const counts = useMemo(() => ({
    critical: findings.filter((f) => !f.resolvedBy && f.severity === "critical").length,
    warning: findings.filter((f) => !f.resolvedBy && f.severity === "warning").length,
    info: findings.filter((f) => !f.resolvedBy && f.severity === "info").length,
    resolved: findings.filter((f) => f.resolvedBy).length,
  }), [findings]);

  const toggle = (k: string) => setOpen((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const logFix = (f: Finding) => {
    setForm({ kind: "fix", finding: f.key, notes: "" });
    document.getElementById("nano-service-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const save = async () => {
    if (!form.notes.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/nano/servicelog", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: device.id, ...form }),
      });
      const d = await res.json();
      if (!d.success) { alert(d.error || "Could not save"); return; }
      setForm({ kind: "fix", finding: "", notes: "" });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this service log entry?")) return;
    await fetch(`/api/nano/servicelog?id=${id}`, { method: "DELETE" });
    load();
  };

  // Timeline: issue episodes, config changes and service entries, newest first.
  const timeline = useMemo(() => {
    if (!data) return [];
    const items: Array<{ t: number; color: string; title: string; sub?: string }> = [];
    for (const f of findings) {
      if (f.key === "data_gap") continue;
      for (const e of f.episodes) {
        items.push({ t: e.start, color: SEV_COLOR[f.severity], title: f.title, sub: [e.durS ? fmtDur(e.durS) + (e.open ? "+" : "") : "", e.note].filter(Boolean).join(" · ") });
      }
    }
    for (const c of data.configChanges) items.push({ t: c.t, color: C.accent, title: `Config: ${c.pid} set to ${c.value ?? ""}` });
    for (const s of data.service) items.push({ t: s.t, color: C.green, title: `${KINDS.find((k) => k.id === s.kind)?.label || s.kind}${s.author ? ` by ${s.author}` : ""}`, sub: s.notes });
    return items.sort((a, b) => b.t - a.t).slice(0, 200);
  }, [data, findings]);

  const v = VERDICT[report?.verdict || "no_data"];
  const field = { background: C.field, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontSize: 12, fontFamily: "inherit", outline: "none" } as const;
  const sectionTitle = { fontSize: 11, color: C.dim, letterSpacing: 0.5, margin: "22px 0 10px", textTransform: "uppercase" } as const;

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: 520, padding: isMobile ? 14 : 20 }}>
      {/* ── Verdict ── */}
      <div style={{ display: "flex", gap: 14, alignItems: "stretch", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 260, background: `${v.color}14`, border: `1px solid ${v.color}55`, borderRadius: 12, padding: 16, display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ width: 46, height: 46, borderRadius: 23, background: v.color, color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, flexShrink: 0 }}>{v.icon}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: v.color }}>{loading && !report ? "Analysing…" : v.label}</div>
            <div style={{ fontSize: 12, color: C.text, marginTop: 3, lineHeight: 1.45 }}>{err ? <span style={{ color: C.red }}>{err}</span> : report?.summary}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
          <div style={{ display: "flex", background: C.field, border: `1px solid ${C.border}`, borderRadius: 6, padding: 2 }}>
            {WINDOWS.map((d) => (
              <button key={d} onClick={() => setDays(d)}
                style={{ background: days === d ? "rgba(124,58,237,0.15)" : "transparent", border: "none", borderRadius: 4, padding: "5px 12px", color: days === d ? "#c4b5fd" : C.dim, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {d === 1 ? "24 h" : `${d} days`}
              </button>
            ))}
          </div>
          <button onClick={load} disabled={loading}
            style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", color: C.dim, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Analysing…" : "↻ Re-analyse"}
          </button>
        </div>
      </div>

      {report && (
        <div style={{ fontSize: 10, color: C.faint, marginTop: 8 }}>
          {report.coverage.frames} frames · {report.coverage.boots} boot{report.coverage.boots === 1 ? "" : "s"}
          {report.coverage.firstT ? ` · ${fmtT(report.coverage.firstT)} to ${fmtT(report.coverage.lastT!)}` : ""}
          {report.coverage.nanoV3 && !report.coverage.onChange ? " · P-609 off: pump/valve timing not checked" : ""}
          {data?.truncated ? " · window truncated to the newest frames" : ""}
        </div>
      )}

      {/* ── Counts ── */}
      {report && report.verdict !== "no_data" && (
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          {([["critical", "Critical", C.red], ["warning", "Warning", C.amber], ["info", "Info", C.blue], ["resolved", "Fixed", C.green]] as const).map(([k, label, color]) => (
            <div key={k} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", minWidth: 90 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: counts[k] ? color : C.faint }}>{counts[k]}</div>
              <div style={{ fontSize: 10, color: C.dim }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Findings ── */}
      <div style={{ ...sectionTitle, display: "flex", alignItems: "center", gap: 10 }}>
        <span>Findings</span>
        <label style={{ textTransform: "none", letterSpacing: 0, display: "flex", alignItems: "center", gap: 5, cursor: "pointer", color: C.faint }}>
          <input type="checkbox" checked={showInfo} onChange={(e) => setShowInfo(e.target.checked)} /> show info ({counts.info})
        </label>
      </div>
      {report && shown.length === 0 && (
        <div style={{ padding: 26, textAlign: "center", color: C.faint, fontSize: 12, background: C.card, borderRadius: 10, border: `1px solid ${C.border}` }}>
          {report.verdict === "no_data" ? "No frames in this period." : "Nothing that needs attention."}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {shown.map((f) => {
          const color = f.resolvedBy ? C.green : SEV_COLOR[f.severity];
          const isOpen = open.has(f.key);
          return (
            <div key={f.key} style={{ background: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${color}`, borderRadius: 10, padding: "10px 14px", opacity: f.resolvedBy ? 0.75 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", cursor: "pointer" }} onClick={() => toggle(f.key)}>
                <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, fontWeight: 800, textTransform: "uppercase", background: `${color}22`, color }}>{f.resolvedBy ? "fixed" : f.severity}</span>
                <span style={{ fontSize: 13, fontWeight: 700, flex: 1, minWidth: 180 }}>{f.title}</span>
                <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: "rgba(107,114,128,0.15)", color: C.dim }}>{CATEGORY[f.category]}</span>
                <span style={{ fontSize: 11, color: C.dim }}>
                  {f.count}×{f.longestS ? ` · longest ${fmtDur(f.longestS)}` : ""} · last {ago(f.lastT)}
                </span>
                <span style={{ fontSize: 10, color: C.faint, transform: isOpen ? "rotate(90deg)" : "none", transition: "0.15s" }}>▶</span>
              </div>
              {f.resolvedBy && (
                <div style={{ fontSize: 11, color: C.green, marginTop: 6 }}>
                  ✓ {f.resolvedBy.author || "Fix"} logged {fmtT(f.resolvedBy.t)}: {f.resolvedBy.notes}
                </div>
              )}
              {isOpen && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>{f.detail}</div>
                  <div style={{ fontSize: 12, color: "#c4b5fd", marginTop: 6, lineHeight: 1.5 }}><b>What to do:</b> {f.action}</div>
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 2 }}>
                    {f.episodes.map((e, i) => (
                      <div key={i} style={{ fontSize: 11, fontFamily: "monospace", color: C.dim, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ color: C.text }}>{fmtT(e.start)}</span>
                        {e.durS > 0 && <span>{fmtDur(e.durS)}{e.open ? "+ (ended by restart / still on)" : ""}</span>}
                        {e.note && <span style={{ color: C.amber }}>{e.note}</span>}
                      </div>
                    ))}
                    {f.count > f.episodes.length && <div style={{ fontSize: 10, color: C.faint }}>…and {f.count - f.episodes.length} earlier</div>}
                  </div>
                  {data?.serviceLogReady && (
                    <button onClick={() => logFix(f)}
                      style={{ marginTop: 10, background: "rgba(0,200,83,0.12)", border: "1px solid rgba(0,200,83,0.3)", borderRadius: 6, padding: "5px 12px", color: C.green, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      Log a fix for this
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Service log ── */}
      <div style={sectionTitle}>Service log</div>
      {data && !data.serviceLogReady ? (
        <div style={{ fontSize: 12, color: C.amber }}>The service log needs migration 032 on the server.</div>
      ) : (
        <>
          <div id="nano-service-form" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} style={{ ...field, cursor: "pointer" }}>
              {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
            </select>
            <select value={form.finding} onChange={(e) => setForm({ ...form, finding: e.target.value })} style={{ ...field, cursor: "pointer", maxWidth: isMobile ? "100%" : 300 }}
              title="Tie the entry to a finding: a fix marks it resolved until it happens again">
              <option value="">Not tied to a finding</option>
              {findings.map((f) => <option key={f.key} value={f.key}>{f.title}</option>)}
            </select>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={2000}
              placeholder="What was found and what was done, e.g. Bubbler solenoid stuck open, replaced valve"
              style={{ ...field, flex: 1, minWidth: 220, minHeight: 38, resize: "vertical" }} />
            <button onClick={save} disabled={saving || !form.notes.trim()}
              style={{ background: C.green, border: "none", borderRadius: 6, padding: "9px 18px", color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: saving || !form.notes.trim() ? 0.5 : 1 }}>
              {saving ? "Saving…" : "Add entry"}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {data?.service.length === 0 && <div style={{ fontSize: 11, color: C.faint }}>No service entries yet.</div>}
            {data?.service.map((s) => (
              <div key={s.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: C.dim }}>
                    <b style={{ color: C.green }}>{KINDS.find((k) => k.id === s.kind)?.label || s.kind}</b> · {fmtT(s.t)}{s.author ? ` · ${s.author}` : ""}
                    {s.finding && <> · <span style={{ color: "#c4b5fd" }}>{findings.find((f) => f.key === s.finding)?.title || s.finding}</span></>}
                  </div>
                  <div style={{ fontSize: 12, color: C.text, marginTop: 3, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{s.notes}</div>
                </div>
                <button onClick={() => remove(s.id)} title="Delete entry" style={{ background: "none", border: "none", color: C.faint, cursor: "pointer", fontSize: 13 }}>✕</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Timeline ── */}
      <div style={sectionTitle}>Timeline</div>
      {timeline.length === 0 && <div style={{ fontSize: 11, color: C.faint }}>Nothing recorded in this period.</div>}
      <div style={{ borderLeft: `2px solid ${C.border}`, marginLeft: 6, paddingLeft: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        {timeline.map((i, k) => (
          <div key={k} style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: -20, top: 4, width: 10, height: 10, borderRadius: 5, background: i.color }} />
            <div style={{ fontSize: 10, color: C.faint, fontFamily: "monospace" }}>{fmtT(i.t)}</div>
            <div style={{ fontSize: 12, color: C.text }}>{i.title}</div>
            {i.sub && <div style={{ fontSize: 11, color: C.dim, overflowWrap: "anywhere" }}>{i.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
