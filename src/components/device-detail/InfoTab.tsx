"use client";

import React from "react";
import { Device, Customer } from "@/types";
import { formatTimestamp } from "@/lib/utils";

interface InfoTabProps {
  device: Device;
  customer?: Customer;
}

export function InfoTab({ device, customer }: InfoTabProps) {
  const infoRows = [
    ["Device Name", device.device_name],
    ["IMEI", device.imei],
    ["Type", `${device.manufacturer} ${device.device_type}`],
    ["Firmware", device.firmware_version],
    ["Status", device.status],
    ["Connection", device.connection_status],
    ["SIM", device.sim_number || "—"],
    ["Asset", device.asset_name || "—"],
    ["Asset Type", device.asset_type || "—"],
    ["Customer", customer?.name || "Unassigned"],
    [
      "Last Position",
      device.last_latitude && device.last_longitude
        ? `${device.last_latitude}, ${device.last_longitude}`
        : "—",
    ],
    [
      "Last Update",
      device.last_location_time
        ? formatTimestamp(device.last_location_time)
        : "—",
    ],
    ["Tags", device.tags?.join(", ") || "—"],
  ];

  return (
    <div style={{ padding: 24, maxWidth: 700 }}>
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: "#f1f5f9",
          marginBottom: 20,
        }}
      >
        Device Information
      </div>
      {infoRows.map(([label, val]) => (
        <div
          key={label}
          style={{
            display: "flex",
            borderBottom: "1px solid #2a2a2a",
            padding: "10px 0",
          }}
        >
          <div
            style={{
              width: 160,
              color: "#6b7280",
              fontWeight: 500,
              fontSize: 12,
            }}
          >
            {label}
          </div>
          <div
            style={{
              color: "#e2e8f0",
              fontSize: 13,
              fontFamily: label === "IMEI" ? "monospace" : "inherit",
            }}
          >
            {val}
          </div>
        </div>
      ))}
    </div>
  );
}
