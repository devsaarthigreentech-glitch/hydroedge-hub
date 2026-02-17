"use client";

import React from "react";
import { Device, Customer } from "@/types";
import { Icons } from "@/components/ui/Icons";
import { timeAgo } from "@/lib/utils";
import { THEME } from "@/lib/theme";

interface DeviceCardProps {
  device: Device;
  customer?: Customer;
  onSelect: () => void;
}

export function DeviceCard({ device, customer, onSelect }: DeviceCardProps) {
  const isOnline = device.connection_status === "online";

  return (
    <div
      onClick={onSelect}
      style={{
        background: THEME.background.card,
        border: `1px solid ${THEME.border.light}`,
        borderRadius: 12,
        padding: 16,
        cursor: "pointer",
        transition: "all 0.2s ease",
        boxShadow: THEME.shadow.sm,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = THEME.primary[300];
        e.currentTarget.style.boxShadow = THEME.shadow.md;
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = THEME.border.light;
        e.currentTarget.style.boxShadow = THEME.shadow.sm;
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 10,
            background: isOnline
              ? `linear-gradient(135deg, ${THEME.primary[100]} 0%, ${THEME.primary[200]} 100%)`
              : THEME.background.secondary,
            border: `2px solid ${isOnline ? THEME.primary[300] : THEME.border.light}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isOnline ? THEME.primary[600] : THEME.text.tertiary,
            flexShrink: 0,
          }}
        >
          <Icons.Devices />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: THEME.text.primary,
              marginBottom: 4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {device.device_name || device.imei}
          </div>
          <div
            style={{
              fontSize: 11,
              color: THEME.text.tertiary,
              fontFamily: "JetBrains Mono, monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {device.imei}
          </div>
        </div>

        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: isOnline ? THEME.status.success : THEME.neutral[300],
            boxShadow: isOnline ? `0 0 12px ${THEME.status.success}` : "none",
            flexShrink: 0,
          }}
          className={isOnline ? "animate-pulse" : ""}
        />
      </div>

      {/* Info Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 12,
          padding: 12,
          background: THEME.background.secondary,
          borderRadius: 8,
        }}
      >
        <InfoItem
          icon={<Icons.Info />}
          label="Location"
          value={device.last_latitude && device.last_longitude
            ? `${device.last_latitude.toFixed(4)}, ${device.last_longitude.toFixed(4)}`
            : "No GPS"}
        />
        <InfoItem
          icon={<Icons.Info />}
          label="Last Seen"
          value={device.last_location_time ? timeAgo(device.last_location_time) : "Never"}
        />
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 10,
              padding: "4px 8px",
              borderRadius: 4,
              background: THEME.primary[100],
              color: THEME.primary[700],
              fontWeight: 600,
            }}
          >
            {device.manufacturer}
          </span>
          <span
            style={{
              fontSize: 10,
              padding: "4px 8px",
              borderRadius: 4,
              background: THEME.secondary[100],
              color: THEME.secondary[700],
              fontWeight: 600,
            }}
          >
            {device.device_type}
          </span>
        </div>

        {customer && (
          <div
            style={{
              fontSize: 11,
              color: THEME.text.tertiary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {customer.name}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ color: THEME.primary[500], flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 9, color: THEME.text.tertiary, fontWeight: 500 }}>
          {label}
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: THEME.text.primary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}