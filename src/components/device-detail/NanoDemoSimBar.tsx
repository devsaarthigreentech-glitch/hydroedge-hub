"use client";

// ============================================================================
// Simulation switch for demo Nano units (IMEI 99900...)
// ----------------------------------------------------------------------------
// A thin bar under the Nano header: on/off and a scenario. It only writes the
// nano_demo_sim row (/api/nano/demo-sim); the worker on the server does the
// simulating. Rendered for admins on demo units only, see isDemoNano().
// ============================================================================

import React, { useCallback, useEffect, useState } from "react";
import { Device } from "@/types";

interface Scenario { id: string; label: string; detail: string; severity?: string }
interface SimState {
  enabled: boolean;
  scenario: string;
  updated_by: string | null;
  worker_running: boolean;
  worker_note: string | null;
}

/** Same guard as the API and the worker: no real unit has a 99900... IMEI. */
export function isDemoNano(device: Device): boolean {
  return device.protocol === "nano" && String(device.imei || "").startsWith("99900");
}

export function NanoDemoSimBar({ device }: { device: Device }) {
  const [st, setSt] = useState<SimState | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/nano/demo-sim?device_id=${device.id}`);
      const j = await r.json();
      if (j.success) {
        setSt(j.data);
        setScenarios(j.scenarios || []);
        setError(null);
      } else {
        setError(j.error || "Could not load the simulation switch");
      }
    } catch {
      /* keep what we have on a transient error */
    }
  }, [device.id]);

  useEffect(() => {
    load();
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, [load]);

  const save = async (patch: Partial<Pick<SimState, "enabled" | "scenario">>) => {
    if (!st) return;
    setBusy(true);
    setSt({ ...st, ...patch });
    try {
      const r = await fetch("/api/nano/demo-sim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: device.id, ...patch }),
      });
      const j = await r.json();
      if (j.success) { setSt(j.data); setError(null); }
      else { setError(j.error || "Could not save"); load(); }
    } catch {
      setError("Could not save");
      load();
    } finally {
      setBusy(false);
    }
  };

  if (!st && !error) return null;

  const on = !!st?.enabled;
  const current = scenarios.find((s) => s.id === st?.scenario);
  const fixed = scenarios.filter((s) => !s.id.startsWith("alert:"));
  const alerts = scenarios.filter((s) => s.id.startsWith("alert:"));

  // The API sends alerts worst first, so the groups come out in that order.
  const severities = Array.from(new Set(alerts.map((s) => s.severity || "Other")));

  let status: { text: string; color: string };
  if (error) status = { text: error, color: "#f87171" };
  else if (!st!.worker_running) status = { text: "Simulator service is not running on the server", color: "#fbbf24" };
  else if (!on) status = { text: "Off · no frames are being sent", color: "#9ca3af" };
  else if (st!.worker_note?.includes("stopped by command"))
    status = { text: "Sending · plant stopped by command, press START to run it", color: "#fbbf24" };
  else if (st!.worker_note?.startsWith("rebooting")) status = { text: "Rebooting", color: "#fbbf24" };
  else status = { text: `Sending · ${current?.detail || st!.scenario}`, color: "#4ade80" };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      padding: "8px 20px", background: "#1b1a12", borderBottom: "1px solid #3a3520", flexShrink: 0,
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#fbbf24",
        background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.35)", padding: "2px 8px", borderRadius: 6 }}>
        SIMULATION
      </span>

      <button
        role="switch" aria-checked={on} disabled={busy || !st}
        onClick={() => save({ enabled: !on })}
        title={on ? "Stop the simulation" : "Start the simulation"}
        style={{
          width: 40, height: 22, borderRadius: 11, border: "none", cursor: busy ? "wait" : "pointer",
          background: on ? "#00c853" : "#4b5563", position: "relative", transition: "background .15s", padding: 0,
        }}
      >
        <span style={{
          position: "absolute", top: 3, left: on ? 21 : 3, width: 16, height: 16, borderRadius: 8,
          background: "#fff", transition: "left .15s",
        }} />
      </button>
      <span style={{ fontSize: 12, fontWeight: 600, color: on ? "#e5e7eb" : "#9ca3af" }}>{on ? "On" : "Off"}</span>

      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9ca3af" }}>
        Scenario
        <select
          value={st?.scenario || "normal"} disabled={busy || !st}
          onChange={(e) => save({ scenario: e.target.value })}
          style={{ background: "#262626", color: "#f1f5f9", border: "1px solid #404040", borderRadius: 6,
            fontSize: 12, padding: "4px 8px", fontFamily: "inherit", maxWidth: 280 }}
        >
          <optgroup label="Scenarios">
            {fixed.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </optgroup>
          {severities.map((sev) => (
            <optgroup key={sev} label={`Hold one alert · ${sev}`}>
              {alerts.filter((s) => (s.severity || "Other") === sev).map((s) => <option key={s.id} value={s.id} title={s.detail}>{s.label}</option>)}
            </optgroup>
          ))}
        </select>
      </label>

      <span style={{ fontSize: 11, color: status.color, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        <span style={{ width: 7, height: 7, borderRadius: 4, background: status.color, flexShrink: 0 }} />
        {status.text}
      </span>
      {st?.updated_by && (
        <span style={{ fontSize: 10, color: "#6b7280", marginLeft: "auto" }}>last set by {st.updated_by}</span>
      )}
    </div>
  );
}
