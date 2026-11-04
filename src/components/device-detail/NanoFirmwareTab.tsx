"use client";

// Update one device to an uploaded firmware version. The job runs on the server
// (lib/nano-fw-runner), so this page can be closed; this only shows where it is.

import React, { useState, useEffect, useCallback } from "react";
import { Device } from "@/types";
import { useIsMobile } from "@/hooks/useIsMobile";

interface CardJob {
  id: string; status: string; label: string; active: boolean; target_version: string; from_version: string | null;
  created_by: string | null; created_at: string; finished_at: string | null;
}
interface CardData {
  version: string | null; version_at: string | null; ota_state: string | null; refusal: string | null;
  firmwares: Array<{ id: string; version: string; notes: string | null }>;
  job: CardJob | null;
}

const C = { bg: "#181818", card: "#1e1e1e", border: "#2a2a2a", field: "#111", text: "#e2e8f0", dim: "#6b7280", green: "#00c853", red: "#f87171", amber: "#fbbf24", blue: "#60a5fa" };
const jobColor = (s: string) => (s === "updated" ? C.green : s === "failed" || s === "rolled_back" || s === "timed_out" ? C.red : C.amber);

export function NanoFirmwareTab({ device }: { device: Device }) {
  const isMobile = useIsMobile();
  const [data, setData] = useState<CardData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [choice, setChoice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/nano/firmware/job?device_id=${device.id}`);
      const d = await res.json();
      if (d.success) { setData(d.data); setErr(null); }
      else setErr(d.error || "Could not load");
    } catch { /* next poll */ }
  }, [device.id]);
  useEffect(() => { load(); const i = setInterval(load, 5000); return () => clearInterval(i); }, [load]);

  const job = data?.job;
  const running = !!job?.active;
  const blocked = running ? "An update is already running" : data?.refusal || null;
  const target = data?.firmwares.find((f) => f.id === choice);

  const update = async () => {
    if (!target) return;
    const same = target.version === data?.version;
    const text = `${same ? "Reinstall" : "Update"} ${device.device_name || device.imei} to ${target.version}?\n\n` +
      "It downloads over the air, then restarts when the engine is off or the stop is held. " +
      "If the new image does not come online within 10 minutes it goes back to the old one.";
    if (!window.confirm(text)) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/nano/firmware/job", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: device.id, firmware_id: target.id }),
      });
      const d = await res.json();
      if (!d.success) setErr(d.error || "Could not start");
      setChoice("");
      await load();
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  };

  const canUpdate = !!target && !blocked && !busy;
  return (
    <div style={{ background: C.bg, color: C.text, minHeight: 520, padding: isMobile ? 14 : 20 }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, maxWidth: 720 }}>
        <div style={{ fontSize: 11, color: C.dim, textTransform: "uppercase", letterSpacing: 0.5 }}>Firmware on this device · P-104</div>
        <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "monospace", marginTop: 4 }}>{data?.version ?? "not reported"}</div>
        {data?.version_at && <div style={{ fontSize: 10, color: C.dim }}>reported {new Date(data.version_at).toLocaleString()}</div>}

        {job && (
          <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 8, background: `${jobColor(job.status)}14`, border: `1px solid ${jobColor(job.status)}44` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: jobColor(job.status), lineHeight: 1.45 }}>{job.label}</div>
            <div style={{ fontSize: 10, color: C.dim, marginTop: 3 }}>
              {job.from_version ? `${job.from_version} → ` : "→ "}{job.target_version}
              {job.created_by ? ` · ${job.created_by}` : ""} · started {new Date(job.created_at).toLocaleString()}
              {job.finished_at ? ` · ended ${new Date(job.finished_at).toLocaleString()}` : ""}
              {running ? " · carries on if you close this page" : ""}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
          <select value={choice} onChange={(e) => setChoice(e.target.value)} disabled={running}
            style={{ flex: 1, minWidth: 180, background: C.field, border: `1px solid ${C.border}`, borderRadius: 6, padding: "9px 10px", color: C.text, fontSize: 13, fontFamily: "inherit" }}>
            <option value="">Choose a version…</option>
            {data?.firmwares.map((f) => (
              <option key={f.id} value={f.id}>{f.version}{f.version === data.version ? " (installed)" : ""}{f.notes ? ` · ${f.notes.slice(0, 50)}` : ""}</option>
            ))}
          </select>
          <button onClick={update} disabled={!canUpdate}
            style={{ background: canUpdate ? C.green : C.card, border: canUpdate ? "none" : `1px solid ${C.border}`, borderRadius: 6, padding: "9px 22px", color: canUpdate ? "#000" : C.dim, fontSize: 13, fontWeight: 700, cursor: canUpdate ? "pointer" : "default", fontFamily: "inherit" }}>
            {busy ? "Starting…" : "Update"}
          </button>
        </div>
        {blocked && !running && <div style={{ fontSize: 11, color: C.amber, marginTop: 8 }}>{blocked}</div>}
        {data && data.firmwares.length === 0 && <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>Nothing uploaded yet: add a version on the Firmware page in the sidebar.</div>}
        {err && <div style={{ fontSize: 11, color: C.red, marginTop: 8 }}>{err}</div>}
      </div>
    </div>
  );
}
