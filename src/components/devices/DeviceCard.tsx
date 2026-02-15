"use client";

import React from "react";
import { Device, Customer } from "@/types";
import { Icons } from "@/components/ui/Icons";
import { timeAgo, isDeviceActive } from "@/lib/utils";

interface DeviceCardProps {
  device: Device;
  customer?: Customer;
  onClick: () => void;
  index: number;
}

export function DeviceCard({ device, customer, onClick, index }: DeviceCardProps) {
  const isOnline = device.connection_status === "online";
  const isActive = isDeviceActive(device.connection_status, device.last_location_time);

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "14px 20px",
        cursor: "pointer",
        background: isActive
          ? "rgba(0, 200, 83, 0.08)"
          : index % 2 === 0
          ? "#1e1e1e"
          : "#222",
        borderBottom: "1px solid #2a2a2a",
        borderLeft: isActive ? "3px solid #00e676" : "3px solid transparent",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = isActive
          ? "rgba(0, 200, 83, 0.14)"
          : "#2a2a2a")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = isActive
          ? "rgba(0, 200, 83, 0.08)"
          : index % 2 === 0
          ? "#1e1e1e"
          : "#222")
      }
    >
      {/* Device icon */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 8,
          background: isOnline ? "rgba(0, 200, 83, 0.15)" : "#2a2a2a",
          border: `1px solid ${
            isOnline ? "rgba(0, 200, 83, 0.3)" : "#3a3a3a"
          }`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 14,
          flexShrink: 0,
        }}
      >
        <Icons.Devices />
      </div>

      {/* Device info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}
        >
          <span
            style={{
              fontWeight: 600,
              fontSize: 13,
              color: "#f1f5f9",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {device.device_name}
          </span>
          {device.tags?.map((t) => (
            <span
              key={t}
              style={{
                fontSize: 9,
                padding: "1px 6px",
                borderRadius: 3,
                background:
                  t === "priority"
                    ? "rgba(239, 68, 68, 0.2)"
                    : t === "can"
                    ? "rgba(59, 130, 246, 0.2)"
                    : "rgba(156, 163, 175, 0.15)",
                color:
                  t === "priority"
                    ? "#fca5a5"
                    : t === "can"
                    ? "#93c5fd"
                    : "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                fontWeight: 600,
              }}
            >
              {t}
            </span>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 11,
            color: "#6b7280",
          }}
        >
          <span style={{ fontFamily: "monospace" }}>▫ {device.imei}</span>
          {device.sim_number && <span>☎ {device.sim_number}</span>}
        </div>
      </div>

      {/* Status indicators */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginLeft: 16 }}>
        {/* Connection status */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: isOnline ? "#00c853" : "#424242",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: isOnline ? "0 0 12px rgba(0, 200, 83, 0.4)" : "none",
          }}
        >
          <Icons.Power />
        </div>

        {/* Device type */}
        <div style={{ textAlign: "right", minWidth: 120 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#d4d4d8" }}>
            {device.manufacturer} {device.device_type}
          </div>
          <div style={{ fontSize: 10, color: isOnline ? "#4ade80" : "#6b7280" }}>
            ⏱ {timeAgo(device.last_location_time)}
          </div>
        </div>

        {/* Customer badge */}
        <div
          style={{
            fontSize: 10,
            padding: "4px 10px",
            borderRadius: 4,
            background: "rgba(124, 58, 237, 0.15)",
            color: "#c4b5fd",
            fontWeight: 500,
            minWidth: 80,
            textAlign: "center",
            border: "1px solid rgba(124, 58, 237, 0.2)",
          }}
        >
          {customer?.company_name || customer?.name || "—"}
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 10,
            fontSize: 10,
            color: "#525252",
            minWidth: 100,
          }}
        >
          <span>▣ 0</span>
          <span>⚡ 0</span>
          <span>⚙ 0</span>
          <span>⊞ 0</span>
        </div>
      </div>
    </div>
  );
}
