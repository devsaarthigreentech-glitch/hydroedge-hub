"use client";

import React, { useState } from "react";
import { Device, DeviceTab, Customer, Command } from "@/types";
import { Icons } from "@/components/ui/Icons";
import { InfoTab } from "../device-detail/InfoTab";
import { EditTab } from "../device-detail/EditTab";
import { TelemetryTab } from "../device-detail/TelemetryTab";
import { TelemetryGraphTab } from "../device-detail/TelemetryGraphTab";
import { CommandsTab } from "../device-detail/CommandsTab";
import { LogsTab } from "../device-detail/LogsTab";
import { SettingsTab } from "../device-detail/SettingsTab";
import { timeAgo } from "@/lib/utils";

interface DeviceDetailProps {
  device: Device;
  onClose: () => void;
  customers: Customer[];
  telemetry: any[];
  commands: Command[];
  onSendCommand: (command: string) => void;
}

export function DeviceDetail({
  device,
  onClose,
  customers,
  telemetry,
  commands,
  onSendCommand,
}: DeviceDetailProps) {
  const [selectedTab, setSelectedTab] = useState<DeviceTab>("telemetry");

  const customer = customers.find((c) => c.id === device.customer_id);

  const tabs = [
    { key: "info" as DeviceTab, label: "INFO", icon: Icons.Info },
    { key: "edit" as DeviceTab, label: "EDIT", icon: Icons.Edit },
    { key: "telemetry" as DeviceTab, label: "TELEMETRY", icon: Icons.Telemetry },
    { key: "graphs" as DeviceTab, label: "GRAPHS", icon: Icons.TrendingUp }, // <<<< ADD THIS
    { key: "commands" as DeviceTab, label: "COMMANDS", icon: Icons.Commands },
    { key: "logs" as DeviceTab, label: "LOGS & MESSAGES", icon: Icons.Logs },
    { key: "settings" as DeviceTab, label: "SETTINGS", icon: Icons.Settings },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Device header bar */}
      <div
        style={{
          background:
            device.connection_status === "online"
              ? "rgba(0, 200, 83, 0.1)"
              : "#242424",
          borderBottom: "1px solid #333",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            padding: 4,
            display: "flex",
          }}
        >
          <Icons.Close />
        </button>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: "#2a2a2a",
            border: "1px solid #3a3a3a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icons.Devices />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>
            {device.device_name}
          </div>
          <div
            style={{ fontSize: 11, color: "#6b7280", fontFamily: "monospace" }}
          >
            ▫ {device.imei}
          </div>
        </div>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background:
              device.connection_status === "online" ? "#00c853" : "#424242",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow:
              device.connection_status === "online"
                ? "0 0 12px rgba(0, 200, 83, 0.4)"
                : "none",
          }}
        >
          <Icons.Power />
        </button>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#00e676" }}>
            {device.manufacturer} {device.device_type}
          </div>
          <div style={{ fontSize: 10, color: "#6b7280" }}>
            ⏱ {timeAgo(device.last_location_time)} · FW{" "}
            {device.firmware_version}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            fontSize: 11,
            color: "#525252",
            borderLeft: "1px solid #333",
            paddingLeft: 16,
            marginLeft: 8,
          }}
        >
          <span>▣ 0</span>
          <span>⚡ 0</span>
          <span>⚙ 0</span>
          <span>⊞ 0</span>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          background: "#1e1e1e",
          borderBottom: "1px solid #333",
          overflow: "auto",
          flexShrink: 0,
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedTab(tab.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 18px",
              border: "none",
              cursor: "pointer",
              background:
                selectedTab === tab.key ? "#2a2a2a" : "transparent",
              color: selectedTab === tab.key ? "#f1f5f9" : "#6b7280",
              borderBottom:
                selectedTab === tab.key
                  ? "2px solid #00e676"
                  : "2px solid transparent",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.5,
              fontFamily: "inherit",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              if (selectedTab !== tab.key) e.currentTarget.style.color = "#d4d4d8";
            }}
            onMouseLeave={(e) => {
              if (selectedTab !== tab.key) e.currentTarget.style.color = "#6b7280";
            }}
          >
            <tab.icon />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {selectedTab === "info" && <InfoTab device={device} customer={customer} />}
        {selectedTab === "edit" && <EditTab device={device} customers={customers} />}
        {selectedTab === "telemetry" && <TelemetryTab telemetry={telemetry} />}
        {selectedTab === "graphs" && <TelemetryGraphTab device={device} />}  {/* <<<< ADD THIS */}
        {selectedTab === "commands" && (
          <CommandsTab device={device} />  {/* <<<< REMOVE commands and onSendCommand props */}
        )}
        {selectedTab === "logs" && <LogsTab device={device} />}
        {selectedTab === "settings" && <SettingsTab device={device} />}
      </div>
    </div>
  );
}