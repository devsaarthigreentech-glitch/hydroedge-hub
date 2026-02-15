"use client";

import React from "react";
import { TelemetryParameter } from "@/types";
import { Icons } from "@/components/ui/Icons";
import { formatTimestamp } from "@/lib/utils";

interface TelemetryTabProps {
  telemetry: TelemetryParameter[];
}

export function TelemetryTab({ telemetry }: TelemetryTabProps) {
  return (
    <div style={{ padding: 0 }}>
      {/* Telemetry grid - Flespi style two-column cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
        }}
      >
        {telemetry.map((param, idx) => {
          const isSystem = param.type === "system";
          return (
            <div
              key={param.name}
              style={{
                padding: "12px 16px",
                minHeight: 62,
                background: isSystem ? "#2a2a2a" : "#3a3520",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                borderRight:
                  idx % 2 === 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
              }}
            >
              {/* Watermark text */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  fontSize: 28,
                  fontWeight: 800,
                  color: "rgba(255,255,255,0.04)",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  letterSpacing: 2,
                }}
              >
                {isSystem ? "SYSTEM" : "SENSOR"}
              </div>
              {/* Parameter name */}
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: isSystem ? "#a1a1aa" : "#d4d4a8",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {param.name}
              </div>
              {/* Value + timestamp + icons */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: isSystem ? "#e2e8f0" : "#fef3c7",
                    fontFamily: "monospace",
                    wordBreak: "break-all",
                    maxWidth: "70%",
                  }}
                >
                  {param.value}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 9, color: "#525252" }}>
                    {formatTimestamp(param.timestamp)}
                  </span>
                  {!isSystem && (
                    <span
                      style={{ color: "#525252", cursor: "pointer", opacity: 0.6 }}
                    >
                      <Icons.Chart />
                    </span>
                  )}
                  <span
                    style={{ color: "#525252", cursor: "pointer", opacity: 0.4 }}
                  >
                    <Icons.ThreeDots />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
