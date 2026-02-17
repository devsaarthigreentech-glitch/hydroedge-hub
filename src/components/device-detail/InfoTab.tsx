// "use client";

// import React from "react";
// import { Device, Customer } from "@/types";
// import { formatTimestamp } from "@/lib/utils";

// interface InfoTabProps {
//   device: Device;
//   customer?: Customer;
// }

// export function InfoTab({ device, customer }: InfoTabProps) {
//   const infoRows = [
//     ["Device Name", device.device_name],
//     ["IMEI", device.imei],
//     ["Type", `${device.manufacturer} ${device.device_type}`],
//     ["Firmware", device.firmware_version],
//     ["Status", device.status],
//     ["Connection", device.connection_status],
//     ["SIM", device.sim_number || "—"],
//     ["Asset", device.asset_name || "—"],
//     ["Asset Type", device.asset_type || "—"],
//     ["Customer", customer?.name || "Unassigned"],
//     [
//       "Last Position",
//       device.last_latitude && device.last_longitude
//         ? `${device.last_latitude}, ${device.last_longitude}`
//         : "—",
//     ],
//     [
//       "Last Update",
//       device.last_location_time
//         ? formatTimestamp(device.last_location_time)
//         : "—",
//     ],
//     ["Tags", device.tags?.join(", ") || "—"],
//   ];

//   return (
//     <div style={{ padding: 24, maxWidth: 700 }}>
//       <div
//         style={{
//           fontSize: 16,
//           fontWeight: 700,
//           color: "#f1f5f9",
//           marginBottom: 20,
//         }}
//       >
//         Device Information
//       </div>
//       {infoRows.map(([label, val]) => (
//         <div
//           key={label}
//           style={{
//             display: "flex",
//             borderBottom: "1px solid #2a2a2a",
//             padding: "10px 0",
//           }}
//         >
//           <div
//             style={{
//               width: 160,
//               color: "#6b7280",
//               fontWeight: 500,
//               fontSize: 12,
//             }}
//           >
//             {label}
//           </div>
//           <div
//             style={{
//               color: "#e2e8f0",
//               fontSize: 13,
//               fontFamily: label === "IMEI" ? "monospace" : "inherit",
//             }}
//           >
//             {val}
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }
"use client";

import React from "react";
import { Device, Customer } from "@/types";
import { formatTimestamp } from "@/lib/utils";
import { THEME } from "@/lib/theme";

interface InfoTabProps {
  device: Device;
  customer?: Customer;
}

export function InfoTab({ device, customer }: InfoTabProps) {
  const sections = [
    {
      title: "📱 Device Details",
      icon: "📱",
      color: THEME.primary[500],
      bgColor: THEME.primary[50],
      rows: [
        ["Device Name", device.device_name],
        ["IMEI", device.imei, true], // true = monospace
        ["Type", `${device.manufacturer} ${device.device_type}`],
        ["Firmware", device.firmware_version],
      ],
    },
    {
      title: "🔌 Connection Status",
      icon: "🔌",
      color: THEME.secondary[500],
      bgColor: THEME.secondary[50],
      rows: [
        ["Status", device.status],
        ["Connection", device.connection_status],
        ["SIM Number", device.sim_number || "—", true],
      ],
    },
    {
      title: "🚗 Asset Information",
      icon: "🚗",
      color: THEME.accent[500],
      bgColor: THEME.accent[50],
      rows: [
        ["Asset Name", device.asset_name || "—"],
        ["Asset Type", device.asset_type || "—"],
        ["Customer", customer?.name || "Unassigned"],
        ["Tags", device.tags?.join(", ") || "—"],
      ],
    },
    {
      title: "📍 Location & Tracking",
      icon: "📍",
      color: "#3b82f6",
      bgColor: "#eff6ff",
      rows: [
        [
          "Last Position",
          device.last_latitude && device.last_longitude
            ? `${device.last_latitude}, ${device.last_longitude}`
            : "—",
          true,
        ],
        [
          "Last Update",
          device.last_location_time
            ? formatTimestamp(device.last_location_time)
            : "—",
        ],
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
                {section.title.replace(/^[^\s]+ /, "")}
              </div>
            </div>

            {/* Info Rows */}
            <div style={{ padding: "4px 0" }}>
              {section.rows.map((row, index) => {
                const label = row[0] as string;
                const value = row[1] as string;
                const isMonospace = row[2] as boolean | undefined;
                
                return (
                  <div
                    key={`${section.title}-${label}-${index}`}
                    style={{
                      display: "flex",
                      padding: "14px 20px",
                      borderBottom: index < section.rows.length - 1 ? `1px solid ${THEME.border.light}` : "none",
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
                        color: THEME.text.tertiary,
                        fontWeight: 600,
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        paddingTop: 2,
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        color: THEME.text.primary,
                        fontSize: 14,
                        fontWeight: 500,
                        fontFamily: isMonospace ? "JetBrains Mono, monospace" : "inherit",
                      }}
                    >
                      {value}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

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
              <div
                style={{
                  fontSize: 24,
                  marginBottom: 8,
                }}
              >
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
              <div
                style={{
                  fontSize: 24,
                  marginBottom: 8,
                }}
              >
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
              <div
                style={{
                  fontSize: 24,
                  marginBottom: 8,
                }}
              >
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