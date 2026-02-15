"use client";

import React from "react";
import { Device } from "@/types";

interface SettingsTabProps {
  device: Device;
}

export function SettingsTab({ device }: SettingsTabProps) {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 16 }}>
        Device Settings
      </div>
      <div
        style={{
          color: "#525252",
          fontSize: 12,
          textAlign: "center",
          padding: 40,
          border: "1px dashed #333",
          borderRadius: 8,
        }}
      >
        Configure reporting interval, APN, geofence assignments, and alert thresholds.
        <br />
        Coming soon.
      </div>
    </div>
  );
}
