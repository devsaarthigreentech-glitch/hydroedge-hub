"use client";

import React from "react";
import { Device, Customer } from "@/types";

interface EditTabProps {
  device: Device;
  customers: Customer[];
}

export function EditTab({ device, customers }: EditTabProps) {
  return (
    <div style={{ padding: 24, maxWidth: 650 }}>
      <div style={{ background: "#242424", borderRadius: 10, border: "1px solid #333", padding: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 20 }}>
          Edit Device
        </div>
        {[
          { label: "Device name", value: device.device_name, key: "device_name" },
          { label: "IMEI", value: device.imei, key: "imei", disabled: true },
          { label: "Device type", value: `${device.manufacturer} ${device.device_type}`, key: "type" },
          { label: "Asset name", value: device.asset_name || "", key: "asset_name" },
          { label: "SIM number", value: device.sim_number || "", key: "sim" },
        ].map((field) => (
          <div key={field.key} style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>
              {field.label}
            </label>
            <input
              defaultValue={field.value}
              disabled={field.disabled}
              style={{
                width: "100%",
                background: field.disabled ? "#1a1a1a" : "#1e1e1e",
                border: "1px solid #333",
                borderRadius: 6,
                padding: "10px 12px",
                color: "#e2e8f0",
                fontSize: 13,
                fontFamily: "inherit",
                outline: "none",
                opacity: field.disabled ? 0.5 : 1,
                boxSizing: "border-box",
              }}
            />
          </div>
        ))}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>
            Assigned Customer
          </label>
          <select
            defaultValue={device.customer_id}
            style={{
              width: "100%",
              background: "#1e1e1e",
              border: "1px solid #333",
              borderRadius: 6,
              padding: "10px 12px",
              color: "#e2e8f0",
              fontSize: 13,
              fontFamily: "inherit",
              outline: "none",
            }}
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {"— ".repeat(c.hierarchy_level)}
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button
            style={{
              background: "#00c853",
              color: "#000",
              border: "none",
              borderRadius: 6,
              padding: "10px 24px",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            SAVE
          </button>
          <button
            style={{
              background: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "10px 24px",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            DELETE
          </button>
        </div>
      </div>
    </div>
  );
}
