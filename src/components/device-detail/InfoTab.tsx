"use client";

import React from "react";
import { Device, Customer } from "@/types";
import { formatTimestamp } from "@/lib/utils";
import { THEME } from "@/lib/theme";
import { getAssetSeries, getAssetLabel } from "@/lib/asset-series";

interface InfoTabProps {
  device: Device;
  customer?: Customer;
}

interface InfoRow {
  label: string;
  value?: string;
  /** Rendered instead of `value` when present — used for badges and pills. */
  node?: React.ReactNode;
  mono?: boolean;
}

interface InfoSection {
  title: string;
  icon: string;
  color: string;
  bgColor: string;
  rows: InfoRow[];
}

/** Small coloured pill used for boolean/state fields. */
function Pill({ text, tone }: { text: string; tone: "on" | "off" | "warn" }) {
  const palette = {
    on: { bg: THEME.primary[50], border: THEME.primary[500], fg: THEME.primary[700] },
    off: { bg: THEME.neutral[100], border: THEME.neutral[300], fg: THEME.text.secondary },
    warn: { bg: "#fef3c7", border: THEME.status.warning, fg: "#92400e" },
  }[tone];

  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 6,
        background: palette.bg,
        border: `1.5px solid ${palette.border}`,
        color: palette.fg,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.3,
      }}
    >
      {text}
    </span>
  );
}

export function InfoTab({ device, customer }: InfoTabProps) {
  // Mirrors the Edit tab: asset_name stores the asset TYPE (EOW/DG/...), while
  // asset_type holds the free-text label for the asset the unit sits on.
  const series = getAssetSeries(device.asset_name);
  const isTested = !!device.tested;
  const isLocked = !!device.name_locked;

  const sections: InfoSection[] = [
    {
      title: "Device Details",
      icon: "📱",
      color: THEME.primary[500],
      bgColor: THEME.primary[50],
      rows: [
        { label: "Device Name", value: device.device_name || "—" },
        { label: "IMEI", value: device.imei, mono: true },
        { label: "Type", value: `${device.manufacturer} ${device.device_type}` },
        { label: "Protocol", value: device.protocol || "—" },
        { label: "Firmware", value: device.firmware_version || "—" },
      ],
    },
    {
      title: "Commissioning",
      icon: "🏷️",
      color: THEME.secondary[500],
      bgColor: THEME.secondary[50],
      rows: [
        {
          label: "Tested",
          node: isTested ? <Pill text="✓ TESTED" tone="on" /> : <Pill text="NOT TESTED" tone="off" />,
        },
        {
          label: "Name Lock",
          node: isLocked ? <Pill text="🔒 LOCKED" tone="on" /> : <Pill text="UNLOCKED" tone="warn" />,
        },
      ],
    },
    {
      title: "Asset Information",
      icon: "🚗",
      color: THEME.accent[500],
      bgColor: THEME.accent[50],
      rows: [
        { label: "Asset Type", value: getAssetLabel(device.asset_name) },
        { label: "Asset Type Series", value: device.asset_type || "—" },
        {
          label: "Health Monitoring",
          node: series?.healthMonitoring ? (
            <Pill text={`⚡ ${series.brand} ENABLED`} tone="on" />
          ) : (
            <Pill text="NOT APPLICABLE" tone="off" />
          ),
        },
        { label: "Customer", value: customer?.name || "Unassigned" },
        { label: "Tags", value: device.tags?.join(", ") || "—" },
      ],
    },
    {
      title: "Connection Status",
      icon: "🔌",
      color: THEME.secondary[500],
      bgColor: THEME.secondary[50],
      rows: [
        { label: "Status", value: device.status },
        { label: "Connection", value: device.connection_status },
        { label: "SIM Number", value: device.sim_number || "—", mono: true },
        {
          label: "Last Contact",
          value: device.last_contact_at ? formatTimestamp(device.last_contact_at) : "—",
        },
      ],
    },
    {
      title: "Location & Tracking",
      icon: "📍",
      color: "#3b82f6",
      bgColor: "#eff6ff",
      rows: [
        {
          label: "Last Position",
          value:
            device.last_latitude && device.last_longitude
              ? `${device.last_latitude}, ${device.last_longitude}`
              : "—",
          mono: true,
        },
        {
          label: "Last Update",
          value: device.last_location_time ? formatTimestamp(device.last_location_time) : "—",
        },
      ],
    },
    {
      title: "Record",
      icon: "🗂️",
      color: THEME.neutral[400],
      bgColor: THEME.neutral[50],
      rows: [
        { label: "Created", value: device.created_at ? formatTimestamp(device.created_at) : "—" },
        { label: "Last Modified", value: device.updated_at ? formatTimestamp(device.updated_at) : "—" },
      ],
    },
  ];

  return (
    <div style={{ padding: 24, height: "100%", overflow: "auto", background: THEME.background.secondary }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: THEME.text.primary, marginBottom: 8 }}>
          Device Information
        </div>
        <div style={{ fontSize: 13, color: THEME.text.secondary }}>
          Complete device details and configuration
        </div>
      </div>

      {/* Sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 900 }}>
        {sections.map((section) => (
          <div
            key={section.title}
            style={{
              background: "white",
              border: `2px solid ${THEME.border.light}`,
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: THEME.shadow.sm,
            }}
          >
            {/* Section Header */}
            <div
              style={{
                padding: "14px 18px",
                background: section.bgColor,
                borderBottom: `3px solid ${section.color}`,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 20 }}>{section.icon}</span>
              <div style={{ fontSize: 15, fontWeight: 700, color: THEME.text.primary }}>
                {section.title}
              </div>
            </div>

            {/* Info Rows */}
            <div style={{ padding: "4px 0" }}>
              {section.rows.map((row, index) => (
                <div
                  key={`${section.title}-${row.label}`}
                  style={{
                    display: "flex",
                    padding: "14px 20px",
                    borderBottom:
                      index < section.rows.length - 1 ? `1px solid ${THEME.border.light}` : "none",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = section.bgColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "white";
                  }}
                >
                  <div
                    style={{
                      width: 180,
                      flexShrink: 0,
                      color: THEME.text.tertiary,
                      fontWeight: 600,
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      paddingTop: 2,
                    }}
                  >
                    {row.label}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      color: THEME.text.primary,
                      fontSize: 14,
                      fontWeight: 500,
                      fontFamily: row.mono ? "JetBrains Mono, monospace" : "inherit",
                    }}
                  >
                    {row.node ?? row.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Notes — free-form, so it gets its own full-width card */}
        <div
          style={{
            background: "white",
            border: `2px solid ${THEME.border.light}`,
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: THEME.shadow.sm,
          }}
        >
          <div
            style={{
              padding: "14px 18px",
              background: THEME.accent[50],
              borderBottom: `3px solid ${THEME.accent[500]}`,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 20 }}>📝</span>
            <div style={{ fontSize: 15, fontWeight: 700, color: THEME.text.primary }}>Notes</div>
          </div>
          <div
            style={{
              padding: 20,
              fontSize: 14,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              color: device.notes ? THEME.text.primary : THEME.text.tertiary,
            }}
          >
            {device.notes || "No notes recorded for this device."}
          </div>
        </div>

        {/* Quick Stats Card */}
        <div
          style={{
            background: "white",
            border: `2px solid ${THEME.border.light}`,
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: THEME.shadow.sm,
          }}
        >
          <div
            style={{
              padding: "14px 18px",
              background: THEME.neutral[100],
              borderBottom: `3px solid ${THEME.neutral[400]}`,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 20 }}>📊</span>
            <div style={{ fontSize: 15, fontWeight: 700, color: THEME.text.primary }}>
              Quick Stats
            </div>
          </div>

          <div
            style={{
              padding: 20,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            {/* Online Status */}
            <div
              style={{
                padding: 16,
                background: device.connection_status === "online" ? THEME.primary[50] : THEME.neutral[50],
                border: `2px solid ${device.connection_status === "online" ? THEME.primary[500] : THEME.neutral[300]}`,
                borderRadius: 10,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>
                {device.connection_status === "online" ? "🟢" : "⚫"}
              </div>
              <div style={{ fontSize: 11, color: THEME.text.tertiary, marginBottom: 4, fontWeight: 600 }}>
                STATUS
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: device.connection_status === "online" ? THEME.primary[600] : THEME.text.secondary,
                }}
              >
                {device.connection_status?.toUpperCase() || "UNKNOWN"}
              </div>
            </div>

            {/* Device Active */}
            <div
              style={{
                padding: 16,
                background: device.status === "active" ? THEME.accent[50] : THEME.neutral[50],
                border: `2px solid ${device.status === "active" ? THEME.accent[500] : THEME.neutral[300]}`,
                borderRadius: 10,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>
                {device.status === "active" ? "✅" : "⏸️"}
              </div>
              <div style={{ fontSize: 11, color: THEME.text.tertiary, marginBottom: 4, fontWeight: 600 }}>
                DEVICE STATUS
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: device.status === "active" ? THEME.accent[600] : THEME.text.secondary,
                }}
              >
                {device.status?.toUpperCase() || "UNKNOWN"}
              </div>
            </div>

            {/* Commissioning — Tested + locked name is the "done" state */}
            <div
              style={{
                padding: 16,
                background: isTested && isLocked ? THEME.primary[50] : THEME.neutral[50],
                border: `2px solid ${isTested && isLocked ? THEME.primary[500] : THEME.neutral[300]}`,
                borderRadius: 10,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>
                {isTested && isLocked ? "🔒" : isTested ? "🧪" : "🛠️"}
              </div>
              <div style={{ fontSize: 11, color: THEME.text.tertiary, marginBottom: 4, fontWeight: 600 }}>
                COMMISSIONING
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: isTested && isLocked ? THEME.primary[600] : THEME.text.secondary,
                }}
              >
                {isTested && isLocked ? "COMMISSIONED" : isTested ? "TESTED" : "IN SETUP"}
              </div>
            </div>

            {/* Location Available */}
            <div
              style={{
                padding: 16,
                background: device.last_latitude ? THEME.secondary[50] : THEME.neutral[50],
                border: `2px solid ${device.last_latitude ? THEME.secondary[500] : THEME.neutral[300]}`,
                borderRadius: 10,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>
                {device.last_latitude ? "📍" : "❓"}
              </div>
              <div style={{ fontSize: 11, color: THEME.text.tertiary, marginBottom: 4, fontWeight: 600 }}>
                LOCATION
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: device.last_latitude ? THEME.secondary[600] : THEME.text.secondary,
                }}
              >
                {device.last_latitude ? "AVAILABLE" : "NO DATA"}
              </div>
            </div>
          </div>
        </div>

        {/* Device ID Card */}
        <div
          style={{
            background: "white",
            border: `2px solid ${THEME.border.light}`,
            borderRadius: 12,
            padding: 20,
            boxShadow: THEME.shadow.sm,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: THEME.text.tertiary, marginBottom: 6, fontWeight: 600 }}>
              DEVICE ID
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: THEME.text.primary,
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {device.id}
            </div>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(device.id)}
            style={{
              padding: "8px 16px",
              background: THEME.primary[50],
              border: `2px solid ${THEME.primary[500]}`,
              borderRadius: 8,
              color: THEME.primary[600],
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = THEME.primary[500];
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = THEME.primary[50];
              e.currentTarget.style.color = THEME.primary[600];
            }}
          >
            📋 COPY ID
          </button>
        </div>
      </div>
    </div>
  );
}
