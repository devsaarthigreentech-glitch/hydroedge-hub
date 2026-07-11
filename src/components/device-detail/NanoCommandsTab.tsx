"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Device } from "@/types";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useConfirm } from "@/components/ui/ConfirmModal";

interface CmdLog { id: string; verb: string; pid: string | null; value_text: string | null; status: string; result_reason: string | null; sent_at: string; }

const C = {
  bg: "#181818", card: "#1e1e1e", border: "#2a2a2a", field: "#111",
  text: "#e2e8f0", dim: "#6b7280", faint: "#525252",
  accent: "#7c3aed", green: "#00c853", red: "#f87171", amber: "#fbbf24", blue: "#60a5fa",
};

// Quick-set commands — the values you touch often (Config has all 284).
const QUICK_SETS: Array<{ pid: string; label: string; desc: string; unit?: string; placeholder: string; danger?: boolean }> = [
  { pid: "P-802", label: "Current Setpoint", desc: "Manual electrolyser current target", unit: "A", placeholder: "e.g. 8", danger: true },
  { pid: "P-803", label: "Max Current Limit", desc: "Upper bound on commanded current", unit: "A", placeholder: "e.g. 20" },
  { pid: "P-804", label: "Min Current", desc: "Floor current when generating", unit: "A", placeholder: "e.g. 3" },
  { pid: "P-602", label: "Reporting Cadence", desc: "Seconds between telemetry frames", unit: "s", placeholder: "e.g. 60" },
];

export function NanoCommandsTab({ device }: { device: Device }) {
  const isMobile = useIsMobile();
  const { confirm, modal } = useConfirm();
  const [log, setLog] = useState<CmdLog[]>([]);
  const [permit, setPermit] = useState<string | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [meta, setMeta] = useState<Record<string, { current: string | null; default: string | null; unit: string | null; range: string | null }>>({});

  const loadMeta = useCallback(async () => {
    const pids = QUICK_SETS.map((q) => q.pid).join(",");
    const res = await fetch(`/api/nano/paramvalues?device_id=${device.id}&pids=${pids}`);
    const d = await res.json();
    if (d.success) {
      setMeta(d.data);
      // seed inputs with confirmed value, else default — only if the user hasn't typed
      setVals((prev) => {
        const next = { ...prev };
        for (const q of QUICK_SETS) {
          if (next[q.pid] === undefined) {
            const m = d.data[q.pid];
            const seed = m?.current ?? m?.default;
            if (seed !== null && seed !== undefined && seed !== "") next[q.pid] = String(seed);
          }
        }
        return next;
      });
    }
  }, [device.id]);

  const loadLog = useCallback(async () => {
    const res = await fetch(`/api/nano/command?device_id=${device.id}&limit=25`);
    const d = await res.json();
    if (d.success) setLog(d.data);
  }, [device.id]);

  const loadLive = useCallback(async () => {
    const res = await fetch(`/api/nano/live?device_id=${device.id}`);
    const d = await res.json();
    if (d.success) {
      const p = (d.data.measured || []).find((m: any) => m.pid === "P-4102");
      setPermit(p?.value ?? null);
      setOnline(d.data.state?.online ?? null);
    }
  }, [device.id]);

  useEffect(() => { loadLive(); loadLog(); loadMeta(); const i = setInterval(loadLog, 3000); return () => clearInterval(i); }, [loadLog, loadLive, loadMeta]);

  const send = useCallback(async (body: any, tag: string) => {
    setBusy(tag);
    try {
      const res = await fetch("/api/nano/command", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: device.id, ...body }),
      });
      let d = await res.json();
      if (!d.success && d.needsConfirm) {
        const ok = await confirm({ title: "Confirm current change", message: `${body.pid} changes live electrolyser current on this cell. Send anyway?`, confirmLabel: "Send", danger: true });
        if (!ok) return;
        const res2 = await fetch("/api/nano/command", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_id: device.id, ...body, confirm: true }),
        });
        d = await res2.json();
      }
      if (!d.success) alert(d.error || "Command failed");
    } catch { alert("Network error"); }
    finally {
      setBusy(null);
      await loadLog();
      setTimeout(() => { loadLive(); loadMeta(); }, 1500);
    }
  }, [device.id, loadLog, loadLive, loadMeta]);

  const doStartStop = async (verb: "start" | "stop") => {
    const word = verb === "start" ? "START (Run)" : "STOP";
    const ok = await confirm({ title: `${word}?`, message: `Send ${word} to ${device.device_name || device.imei}?`, confirmLabel: word, danger: verb === "stop" });
    if (!ok) return;
    send({ verb }, verb);
  };

  const doSet = (pid: string) => {
    const v = vals[pid];
    if (v === undefined || v === "") { alert("Enter a value first"); return; }
    send({ verb: "set", pid, value: v }, pid);
  };

  const statusColor = (s: string) => s === "ok" ? C.green : s === "nack" || s === "failed" ? C.red : s === "sent" ? C.blue : C.amber;
  const running = permit && !["STANDBY", "STOP", "STOPPED", "OFF"].includes(String(permit).toUpperCase());

  return (
    <>
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", background: C.bg, color: C.text, minHeight: 520, height: isMobile ? "auto" : "calc(100vh - 240px)" }}>

      {/* ══ Actions ══ */}
      <div style={{ flex: 1, overflow: "auto", padding: 20, minWidth: 0 }}>

        {/* Status pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Operational Commands</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "3px 10px", borderRadius: 20, background: online ? "rgba(0,200,83,0.12)" : "rgba(107,114,128,0.15)", color: online ? C.green : C.dim }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: online ? C.green : C.faint }} />
            {online == null ? "unknown" : online ? "online" : "offline"}
          </span>
          {permit && <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: "rgba(124,58,237,0.12)", color: "#c4b5fd" }}>permit: {permit}</span>}
        </div>

        {/* Start / Stop */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <button onClick={() => doStartStop("start")} disabled={!!busy}
            style={{ padding: "18px", borderRadius: 12, border: `1px solid ${running ? C.border : "rgba(0,200,83,0.4)"}`, background: running ? C.card : "rgba(0,200,83,0.1)", color: running ? C.dim : C.green, fontSize: 15, fontWeight: 700, cursor: busy ? "wait" : "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 22 }}>▶</span>
            {busy === "start" ? "Sending…" : "START"}
            <span style={{ fontSize: 10, color: C.faint, fontWeight: 400 }}>P-1101 · Run</span>
          </button>
          <button onClick={() => doStartStop("stop")} disabled={!!busy}
            style={{ padding: "18px", borderRadius: 12, border: `1px solid rgba(248,113,113,0.4)`, background: "rgba(248,113,113,0.08)", color: C.red, fontSize: 15, fontWeight: 700, cursor: busy ? "wait" : "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 22 }}>■</span>
            {busy === "stop" ? "Sending…" : "STOP"}
            <span style={{ fontSize: 10, color: C.faint, fontWeight: 400 }}>P-1101 · Stop (latching)</span>
          </button>
        </div>

        {/* Quick sets */}
        <div style={{ fontSize: 11, color: C.dim, letterSpacing: 0.5, marginBottom: 10, textTransform: "uppercase" }}>Quick Set</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {QUICK_SETS.map((q) => (
            <div key={q.pid} style={{ background: C.card, border: `1px solid ${q.danger ? "rgba(251,191,36,0.25)" : C.border}`, borderRadius: 10, padding: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  {q.label}
                  <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: "rgba(59,130,246,0.08)", color: "#93c5fd", fontFamily: "monospace" }}>{q.pid}</span>
                  {q.danger && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: "rgba(251,191,36,0.12)", color: C.amber }}>⚠ live current</span>}
                </div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>
                  {q.desc}
                  {meta[q.pid] && (meta[q.pid].current != null
                    ? <span style={{ marginLeft: 8, color: C.green }}>• on device: {meta[q.pid].current}{q.unit || ""}</span>
                    : meta[q.pid].default != null
                      ? <span style={{ marginLeft: 8, color: C.faint }}>• default: {meta[q.pid].default}{q.unit || ""} (unconfirmed)</span>
                      : null)}
                </div>
              </div>
              <input value={vals[q.pid] ?? ""} onChange={(e) => setVals((p) => ({ ...p, [q.pid]: e.target.value }))} placeholder={q.placeholder} type="number"
                style={{ width: 100, background: C.field, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none" }} />
              {q.unit && <span style={{ fontSize: 11, color: C.faint, marginLeft: -6 }}>{q.unit}</span>}
              <button onClick={() => doSet(q.pid)} disabled={busy === q.pid}
                style={{ background: C.green, border: "none", borderRadius: 6, padding: "8px 18px", color: "#000", fontSize: 12, fontWeight: 700, cursor: busy ? "wait" : "pointer", fontFamily: "inherit", opacity: busy === q.pid ? 0.6 : 1 }}>
                {busy === q.pid ? "…" : "Send"}
              </button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, fontSize: 11, color: C.faint }}>
          Need a setting that isn’t here? Every parameter is on the <strong style={{ color: C.dim }}>Config</strong> tab.
        </div>
      </div>

      {/* ══ Command log ══ */}
      <div style={{ width: isMobile ? "100%" : 300, minWidth: isMobile ? undefined : 300, maxHeight: isMobile ? 300 : undefined, background: "#151515", borderLeft: isMobile ? "none" : `1px solid ${C.border}`, borderTop: isMobile ? `1px solid ${C.border}` : "none", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 13 }}>Command Log</div>
        <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
          {log.length === 0 && <div style={{ textAlign: "center", padding: 30, color: C.faint, fontSize: 11 }}>No commands sent yet.</div>}
          {log.map((e) => (
            <div key={e.id} style={{ marginBottom: 5, padding: "8px 10px", borderRadius: 6, background: C.card, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 8, padding: "1px 6px", borderRadius: 3, fontWeight: 700, textTransform: "uppercase", background: `${statusColor(e.status)}22`, color: statusColor(e.status) }}>{e.status}</span>
                <code style={{ fontSize: 11, color: "#c4b5fd", fontWeight: 600 }}>{e.verb} {e.pid || ""} {e.value_text || ""}</code>
                <span style={{ fontSize: 8, color: C.faint, marginLeft: "auto" }}>{e.sent_at ? new Date(e.sent_at).toLocaleTimeString() : ""}</span>
              </div>
              {e.result_reason && <div style={{ marginTop: 3, fontSize: 9, color: C.red, fontFamily: "monospace" }}>{e.result_reason}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
    {modal}
    </>
  );
}