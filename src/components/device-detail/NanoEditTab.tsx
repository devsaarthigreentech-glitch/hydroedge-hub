"use client";

import React, { useState } from "react";
import { Device, Customer } from "@/types";
import { THEME } from "@/lib/theme";

const STATUSES = ["active", "inactive", "suspended", "maintenance", "stolen"];

export function NanoEditTab({
  device,
  customers = [],
  onSaved,
}: {
  device: Device;
  customers?: Customer[];
  onSaved?: (updated: Partial<Device>) => void;
}) {
  const [form, setForm] = useState({
    device_name: device.device_name || "",
    customer_id: device.customer_id || "",
    asset_name: device.asset_name || "",
    asset_type: device.asset_type || "",
    sim_number: device.sim_number || "",
    status: device.status || "active",
    tags: (device.tags || []).join(", "),
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (k: string, v: string) => { setForm((p) => ({ ...p, [k]: v })); setMsg(null); };

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/nano/device", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: device.id, ...form }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ ok: true, text: "Saved." });
        onSaved?.(data.data);
      } else {
        setMsg({ ok: false, text: data.error || "Save failed" });
      }
    } catch {
      setMsg({ ok: false, text: "Network error" });
    } finally {
      setSaving(false);
    }
  };

  const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: THEME.text.tertiary, marginBottom: 6, display: "block" };
  const input: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 13,
    border: `2px solid ${THEME.border.light}`, borderRadius: 8, color: THEME.text.primary,
    background: "white", outline: "none", fontFamily: "inherit",
  };
  const field = (l: string, node: React.ReactNode, hint?: string) => (
    <div style={{ marginBottom: 18 }}>
      <label style={label}>{l}</label>
      {node}
      {hint && <div style={{ fontSize: 11, color: THEME.text.tertiary, marginTop: 5 }}>{hint}</div>}
    </div>
  );

  return (
    <div style={{ padding: 24, height: "100%", overflow: "auto", background: THEME.background.secondary }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: THEME.text.primary, marginBottom: 4 }}>Edit Device</div>
          <div style={{ fontSize: 13, color: THEME.text.secondary }}>Metadata for this Nano unit. IMEI and protocol are fixed.</div>
        </div>

        {/* Read-only identity */}
        <div style={{ background: "white", border: `2px solid ${THEME.border.light}`, borderRadius: 12, padding: 16, marginBottom: 20, boxShadow: THEME.shadow.sm, display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, color: THEME.text.tertiary }}>IMEI</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text.primary, fontFamily: "JetBrains Mono, monospace" }}>{device.imei}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: THEME.text.tertiary }}>Protocol</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#7c3aed" }}>NANO · GreenVision</div>
          </div>
          {device.firmware_version && (
            <div>
              <div style={{ fontSize: 11, color: THEME.text.tertiary }}>Firmware</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text.primary }}>{device.firmware_version}</div>
            </div>
          )}
        </div>

        {/* Editable form */}
        <div style={{ background: "white", border: `2px solid ${THEME.border.light}`, borderRadius: 12, padding: 20, boxShadow: THEME.shadow.sm }}>
          {field("Device Name", <input style={input} value={form.device_name} onChange={(e) => set("device_name", e.target.value)} placeholder="e.g. SGT Nano — Site A" />, "Leave blank to fall back to the IMEI.")}

          {field("Customer",
            <select style={{ ...input, cursor: "pointer" }} value={form.customer_id} onChange={(e) => set("customer_id", e.target.value)}>
              <option value="">— Unassigned —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company_name ? ` — ${c.company_name}` : ""}</option>)}
            </select>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {field("Asset Name", <input style={input} value={form.asset_name} onChange={(e) => set("asset_name", e.target.value)} placeholder="e.g. Electrolyser 1" />)}
            {field("Asset Type", <input style={input} value={form.asset_type} onChange={(e) => set("asset_type", e.target.value)} placeholder="e.g. Electrolyser / EOW" />)}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {field("SIM Number", <input style={input} value={form.sim_number} onChange={(e) => set("sim_number", e.target.value)} placeholder="ICCID / MSISDN" />)}
            {field("Status",
              <select style={{ ...input, cursor: "pointer" }} value={form.status} onChange={(e) => set("status", e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </div>

          {field("Tags", <input style={input} value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="comma, separated, tags" />, "Comma-separated.")}

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
            <button onClick={save} disabled={saving}
              style={{ background: THEME.primary[500], color: "white", border: "none", borderRadius: 10, padding: "11px 28px", fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", boxShadow: THEME.shadow.md, opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
            {msg && (
              <span style={{ fontSize: 13, fontWeight: 600, color: msg.ok ? THEME.status.success : "#dc2626" }}>
                {msg.ok ? "✓ " : "⚠️ "}{msg.text}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}