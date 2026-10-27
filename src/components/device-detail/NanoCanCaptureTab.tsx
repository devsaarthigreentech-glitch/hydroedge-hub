"use client";

// Remote CAN capture (NanoV3 firmware 28bc6a1): record the truck's raw CAN for
// up to 60 s without a laptop on site, then download it as a candump .log for
// SavvyCAN / cantools. Start = ordinary set commands (P-4221..P-4223, then
// P-4224 true); the device uploads the capture by itself and reports progress
// in P-4225. Captures are kept by the ingest (newest 20, at most 30 days).

import React, { useState, useEffect, useCallback } from "react";
import { Device } from "@/types";
import { useIsMobile } from "@/hooks/useIsMobile";

interface Capture {
  cap: string; n: number; received: number; complete: boolean; kbps: number | null;
  t0: string | null; frames: number | null; dropped: number | null; bytes: number;
  first_at: string; last_at: string;
}

const C = {
  bg: "#181818", card: "#1e1e1e", border: "#2a2a2a", field: "#111",
  text: "#e2e8f0", dim: "#6b7280", faint: "#525252",
  accent: "#7c3aed", green: "#00c853", red: "#f87171", amber: "#fbbf24", blue: "#60a5fa",
};

const fmtBytes = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(2)} MB` : b >= 1024 ? `${(b / 1024).toFixed(1)} KB` : `${b} B`);

// Device start time when its clock was set, else when the first chunk arrived.
const startedAt = (c: Capture) => {
  const t0 = Number(c.t0);
  return t0 > 0 ? new Date(t0 * 1000) : new Date(c.first_at);
};

const stateColor = (s: string | null) =>
  !s ? C.faint : /^failed/i.test(s) ? C.red : /^done/i.test(s) ? C.green : /^(capturing|uploading)/i.test(s) ? C.amber : C.dim;

export function NanoCanCaptureTab({ device }: { device: Device }) {
  const isMobile = useIsMobile();
  const [duration, setDuration] = useState("30");
  const [filter, setFilter] = useState("");
  const [changesOnly, setChangesOnly] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);
  const [stateAt, setStateAt] = useState<string | null>(null);
  const [captures, setCaptures] = useState<Capture[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/nano/cancapture?device_id=${device.id}`);
      const d = await res.json();
      if (d.success) {
        setState(d.data.state);
        setStateAt(d.data.state_at);
        setCaptures(d.data.captures);
      }
    } catch { /* next poll */ }
  }, [device.id]);

  // Seed the form with what the device last reported, else the defaults.
  useEffect(() => {
    if (seeded) return;
    fetch(`/api/nano/paramvalues?device_id=${device.id}&pids=P-4221,P-4222,P-4223`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return;
        const v = (pid: string) => d.data[pid]?.current ?? d.data[pid]?.default;
        if (v("P-4221") != null && v("P-4221") !== "") setDuration(String(v("P-4221")));
        if (v("P-4222") != null) setFilter(String(v("P-4222")));
        if (v("P-4223") != null) setChangesOnly(String(v("P-4223")).toLowerCase() === "true");
      })
      .catch(() => {})
      .finally(() => setSeeded(true));
  }, [device.id, seeded]);

  useEffect(() => { load(); const i = setInterval(load, 3000); return () => clearInterval(i); }, [load]);

  const set = async (pid: string, value: string) => {
    const res = await fetch("/api/nano/command", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: device.id, verb: "set", pid, value }),
    });
    const d = await res.json();
    if (!d.success) throw new Error(`${pid}: ${d.error || "command failed"}`);
  };

  const start = async () => {
    const secs = Number(duration);
    if (!Number.isInteger(secs) || secs < 1 || secs > 60) { setErr("Duration must be 1-60 s"); return; }
    setErr(null);
    setBusy("start");
    try {
      // Settings first; the device applies commands in the order they arrive.
      await set("P-4221", String(secs));
      await set("P-4222", filter.trim());
      await set("P-4223", changesOnly ? "true" : "false");
      await set("P-4224", "true");
      setTimeout(load, 2000);
    } catch (e: any) {
      setErr(e.message || "Network error");
    } finally {
      setBusy(null);
    }
  };

  const running = !!state && /^(capturing|uploading)/i.test(state);
  const dl = (c: Capture, format: "log" | "bin") => `/api/nano/cancapture/download?device_id=${device.id}&cap=${c.cap}&format=${format}`;
  const field = { background: C.field, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none" } as const;
  const link = { fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 6, textDecoration: "none", whiteSpace: "nowrap" } as const;

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: 520, padding: isMobile ? 14 : 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 16, fontWeight: 700 }}>Remote CAN Capture</span>
        <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: `${stateColor(state)}22`, color: stateColor(state), fontFamily: "monospace" }}
          title={stateAt ? `reported ${new Date(stateAt).toLocaleString()}` : undefined}>
          P-4225 · {state ?? "not reporting"}
        </span>
      </div>
      <div style={{ fontSize: 11, color: C.dim, marginBottom: 16, maxWidth: 760 }}>
        Records the vehicle&apos;s raw CAN frames for up to 60 s, then uploads them over the cellular link. Download the result as a
        candump <code>.log</code> for SavvyCAN or cantools. The bus is only listened to; OBD2 polling pauses while capturing. Needs CAN on (P-4200) and firmware 28bc6a1 or later.
      </div>

      {/* ── Start ── */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 20 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: C.dim }}>
          Duration (s) · P-4221
          <input type="number" min={1} max={60} value={duration} onChange={(e) => setDuration(e.target.value)} style={{ ...field, width: 90 }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: C.dim, flex: 1, minWidth: 200 }}>
          ID filter · P-4222
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="124, 1B8, 3B9  (hex, up to 16; empty = every id)" maxLength={95} spellCheck={false} style={field} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.dim, paddingBottom: 9, cursor: "pointer" }}
          title="Keep only frames whose payload changed since the previous frame of that id: a much smaller upload">
          <input type="checkbox" checked={changesOnly} onChange={(e) => setChangesOnly(e.target.checked)} />
          Changes only · P-4223
        </label>
        <button onClick={start} disabled={!!busy || running}
          style={{ background: running ? C.card : C.green, border: running ? `1px solid ${C.border}` : "none", borderRadius: 6, padding: "9px 20px", color: running ? C.dim : "#000", fontSize: 13, fontWeight: 700, cursor: busy || running ? "default" : "pointer", fontFamily: "inherit", opacity: busy ? 0.6 : 1 }}>
          {busy ? "Sending…" : running ? "Capture running" : "● Start capture"}
        </button>
        {err && <div style={{ width: "100%", fontSize: 11, color: C.red, fontFamily: "monospace" }}>{err}</div>}
      </div>

      {/* ── Captures ── */}
      <div style={{ fontSize: 11, color: C.dim, letterSpacing: 0.5, marginBottom: 10, textTransform: "uppercase" }}>
        Captures <span style={{ textTransform: "none", color: C.faint }}>· newest 20 kept, up to 30 days</span>
      </div>
      {captures.length === 0 && <div style={{ padding: 30, textAlign: "center", color: C.faint, fontSize: 12, background: C.card, borderRadius: 10, border: `1px solid ${C.border}` }}>No captures yet.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {captures.map((c) => {
          const partial = !c.complete;
          return (
            <div key={c.cap} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{startedAt(c).toLocaleString()}</div>
                <div style={{ fontSize: 10, color: C.faint, fontFamily: "monospace", marginTop: 2 }}>
                  cap {c.cap}{c.kbps ? ` · ${c.kbps} kbit/s` : ""}{Number(c.t0) > 0 ? "" : " · device clock unset"}
                </div>
              </div>
              <div style={{ fontSize: 12, color: C.dim, minWidth: 150 }}>
                {c.frames ?? "?"} frames · {fmtBytes(c.bytes)}
                {c.dropped ? <span style={{ color: C.amber }}> · {c.dropped} dropped</span> : null}
              </div>
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 700, background: partial ? "rgba(251,191,36,0.12)" : "rgba(0,200,83,0.12)", color: partial ? C.amber : C.green }}>
                {partial ? `incomplete ${c.received}/${c.n}` : `complete ${c.n}/${c.n}`}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <a href={dl(c, "log")} title={partial ? "Only the chunks received in order from the start" : "candump -l format"}
                  style={{ ...link, background: "rgba(124,58,237,0.15)", color: "#c4b5fd" }}>⬇ .log</a>
                <a href={dl(c, "bin")} title="Raw record stream: u32 t_ms, u32 id (bit 31 = 29-bit), u8 dlc, data; little-endian"
                  style={{ ...link, background: "rgba(107,114,128,0.15)", color: C.dim }}>raw</a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
