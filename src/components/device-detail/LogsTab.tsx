"use client";

import React from "react";
import { Device } from "@/types";

interface LogsTabProps {
  device: Device;
}

export function LogsTab({ device }: LogsTabProps) {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 16 }}>
        Logs & Messages
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
        Message log will display parsed AVL data packets here.
        <br />
        Connect to live GPS server for real-time data.
      </div>
    </div>
  );
}
