"use client";

import React, { useState } from "react";
import { Device, Customer } from "@/types";
import { Icons } from "@/components/ui/Icons";
import { timeAgo } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import { NanoLiveTab } from "../device-detail/NanoLiveTab";
import { NanoConfigTab } from "../device-detail/NanoConfigTab";
import { NanoHistoryTab } from "../device-detail/NanoHistoryTab";
import { NanoCommandsTab } from "../device-detail/NanoCommandsTab";
import { NanoAlertsTab } from "../device-detail/NanoAlertsTab";
import { NanoEditTab } from "../device-detail/NanoEditTab";

// Local tab set — independent of the shared Teltonika DeviceTab union.
type NanoTab = "live" | "edit" | "config" | "commands" | "alerts" | "history";

interface NanoDeviceDetailProps {
  device: Device;
  onClose: () => void;
  customers?: Customer[];
  customerType?: string;
}

export function NanoDeviceDetail({ device, onClose, customers = [] }: NanoDeviceDetailProps) {
  const [tab, setTab] = useState<NanoTab>("live");
  const isMobile = useIsMobile();
  const isOnline = device.connection_status === "online";

  const tabs: Array<{ key: NanoTab; label: string; icon: React.ReactNode }> = [
    { key: "edit", label: "EDIT", icon: <Icons.Edit /> },
    { key: "live", label: "LIVE", icon: <Icons.Telemetry /> },
    { key: "config", label: "CONFIG", icon: <Icons.Commands /> },
    { key: "commands", label: "COMMANDS", icon: <Icons.Commands /> },
    { key: "alerts", label: "ALERTS", icon: <Icons.Info /> },
    { key: "history", label: "HISTORY", icon: <Icons.Logs /> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ── Header (dark, matches DeviceDetail) ── */}
      <div
        style={{
          background: "#242424",
          borderBottom: "1px solid #333",
          borderLeft: `4px solid ${isOnline ? "#00c853" : "#525252"}`,
          padding: isMobile ? "12px 14px" : "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 4, display: "flex" }}>
          <Icons.Close />
        </button>
        {!isMobile && (
          <div style={{ width: 40, height: 40, borderRadius: 8, background: "#2a2a2a", border: "1px solid #3a3a3a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icons.Devices />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>{device.device_name || device.imei}</div>
          <div style={{ fontSize: 11, color: "#6b7280", fontFamily: "monospace" }}>▫ {device.imei}</div>
        </div>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: isOnline ? "#00c853" : "#424242", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isOnline ? "0 0 12px rgba(0,200,83,0.4)" : "none" }}>
          <Icons.Power />
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa", background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", padding: "1px 8px", borderRadius: 6 }}>
              NANO
            </span>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#00e676" }}>GreenVision</div>
          </div>
          <div style={{ fontSize: 10, color: "#6b7280" }}>⏱ {timeAgo(device.last_location_time)}</div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div
        style={{
          display: "flex", background: "#1e1e1e", borderBottom: "1px solid #333",
          overflowX: "auto", overflowY: "hidden", flexShrink: 0,
          WebkitOverflowScrolling: "touch" as any, scrollbarWidth: "none" as any,
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: "flex", alignItems: "center", gap: isMobile ? 4 : 6,
              padding: isMobile ? "10px 12px" : "10px 18px", border: "none", cursor: "pointer",
              background: tab === t.key ? "#2a2a2a" : "transparent",
              color: tab === t.key ? "#f1f5f9" : "#6b7280",
              borderBottom: tab === t.key ? "2px solid #00e676" : "2px solid transparent",
              fontSize: isMobile ? 10 : 11, fontWeight: 600, letterSpacing: 0.5,
              fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s",
            }}
          >
            {!isMobile && t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: "auto", WebkitOverflowScrolling: "touch" as any }}>
        {tab === "edit" && <NanoEditTab device={device} customers={customers} />}
        {tab === "live" && <NanoLiveTab device={device} />}
        {tab === "config" && <NanoConfigTab device={device} />}
        {tab === "history" && <NanoHistoryTab device={device} />}
        {tab === "commands" && <NanoCommandsTab device={device} />}
        {tab === "alerts" && <NanoAlertsTab device={device} />}
      </div>

      <style>{`div::-webkit-scrollbar { height: 0; width: 0; }`}</style>
    </div>
  );
}

function Placeholder({ label }: { label: string }) {
  return (
    <div style={{ padding: 60, textAlign: "center", color: "#6b7280", background: "#151515", height: "100%" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🚧</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", marginBottom: 4, textTransform: "capitalize" }}>{label} — coming next</div>
      <div style={{ fontSize: 12 }}>This Nano tab is being wired up.</div>
    </div>
  );
}