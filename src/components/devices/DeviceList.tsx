"use client";

import React from "react";
import { Device, Customer } from "@/types";
import { DeviceSearchBar } from "./DeviceSearchBar";
import { Icons } from "@/components/ui/Icons";
import { THEME } from "@/lib/theme";
import { timeAgo } from "@/lib/utils";

interface DeviceListProps {
  devices: Device[];
  customers: Customer[];
  onDeviceSelect: (device: Device) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isMobile?: boolean;
}

export function DeviceList({
  devices,
  customers,
  onDeviceSelect,
  searchQuery,
  onSearchChange,
  isMobile = false,
}: DeviceListProps) {

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Search Header */}
      <div
        style={{
          padding: isMobile ? 8 : 10,
          background: THEME.background.card,
          borderBottom: `1px solid ${THEME.border.light}`,
        }}
      >
        <DeviceSearchBar searchQuery={searchQuery} onSearchChange={onSearchChange} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", WebkitOverflowScrolling: "touch" as any }}>
        {devices.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column" as const,
              alignItems: "center",
              justifyContent: "center",
              padding: "60px 20px",
              color: THEME.text.tertiary,
            }}
          >
            <Icons.Devices />
            <div style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>No devices found</div>
            <div style={{ marginTop: 4, fontSize: 12 }}>
              {searchQuery ? "Try adjusting your search" : "Add your first device to get started"}
            </div>
          </div>
        ) : isMobile ? (
          /* ══════ MOBILE: Card layout ══════ */
          <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            {devices.map((device) => {
              const customer = customers.find((c) => c.id === device.customer_id);
              const isOnline = device.connection_status === "online";
              return (
                <div
                  key={device.id}
                  onClick={() => onDeviceSelect(device)}
                  style={{
                    background: THEME.background.card,
                    border: `1px solid ${THEME.border.light}`,
                    borderRadius: 10,
                    padding: "12px 14px",
                    cursor: "pointer",
                  }}
                >
                  {/* Row 1: status + name + asset type badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div style={{
                      width: 9, height: 9, borderRadius: "50%", flexShrink: 0,
                      background: isOnline ? THEME.status.success : THEME.neutral[300],
                      boxShadow: isOnline ? `0 0 8px ${THEME.status.success}` : "none",
                    }} />
                    <div style={{
                      fontWeight: 600, fontSize: 13, color: THEME.text.primary,
                      flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
                    }}>
                      {device.device_name || device.imei || "Unnamed Device"}
                    </div>
                    {device.asset_type && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, flexShrink: 0,
                        background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa",
                      }}>
                        {device.asset_type}
                      </span>
                    )}
                    {device.device_type && (
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, flexShrink: 0,
                        background: device.protocol === "nano" ? "rgba(124,58,237,0.12)" : THEME.secondary[100],
                        color: device.protocol === "nano" ? "#7c3aed" : THEME.secondary[700],
                      }}>
                        {device.protocol === "nano" ? "NANO" : device.device_type}
                      </span>
                    )}
                  </div>
                  {/* Row 2: IMEI */}
                  <div style={{ fontSize: 11, color: THEME.text.tertiary, fontFamily: "monospace", marginBottom: 4 }}>
                    {device.imei}
                  </div>
                  {/* Row 3: last seen + customer */}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.text.secondary }}>
                    <span>{device.last_location_time ? timeAgo(device.last_location_time) : "Never"}</span>
                    <span style={{ color: THEME.text.tertiary }}>{customer?.name || "—"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ══════ DESKTOP: Table layout ══════ */
          <div>
            {/* Header row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "44px 1.5fr 90px 180px 130px 90px 1fr",
                gap: 12,
                padding: "12px 20px",
                background: THEME.background.secondary,
                borderBottom: `1px solid ${THEME.border.light}`,
                fontSize: 11,
                fontWeight: 600,
                color: THEME.text.tertiary,
                textTransform: "uppercase" as const,
                letterSpacing: 0.5,
                position: "sticky" as const,
                top: 0,
                zIndex: 1,
              }}
            >
              <div>Status</div>
              <div>Device Name</div>
              <div>Asset Type</div>
              <div>IMEI</div>
              <div>Last Seen</div>
              <div>Type</div>
              <div>Customer</div>
            </div>

            {/* Data rows */}
            {devices.map((device) => {
              const customer = customers.find((c) => c.id === device.customer_id);
              const isOnline = device.connection_status === "online";
              return (
                <div
                  key={device.id}
                  onClick={() => onDeviceSelect(device)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "44px 1.5fr 90px 180px 130px 90px 1fr",
                    gap: 12,
                    padding: "12px 20px",
                    borderBottom: `1px solid ${THEME.border.light}`,
                    cursor: "pointer",
                    transition: "background 0.15s",
                    alignItems: "center",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = THEME.background.hover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  {/* Status */}
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <div
                      style={{
                        width: 11, height: 11, borderRadius: "50%",
                        background: isOnline ? THEME.status.success : THEME.neutral[300],
                        boxShadow: isOnline ? `0 0 10px ${THEME.status.success}` : "none",
                      }}
                      className={isOnline ? "animate-pulse" : ""}
                    />
                  </div>

                  {/* Device Name — now gets more space with 1.5fr */}
                  {(() => {
                    // Resolve asset type: prefer asset_type, fall back to asset_name if it looks like a type
                    const knownTypes = ["EOW", "DG", "Vehicle", "Generator", "Container", "Light", "Heavy"];
                    const resolvedType = device.asset_type || (knownTypes.includes(device.asset_name || "") ? device.asset_name : null);
                    // Only show asset_name as subtitle if it's a real name, not just the type
                    const subtitle = device.asset_name && device.asset_name !== resolvedType ? device.asset_name : null;

                    return (
                      <>
                        <div style={{ overflow: "hidden" }}>
                          <div style={{
                            fontWeight: 600, fontSize: 13, color: THEME.text.primary,
                            marginBottom: 1, lineHeight: 1.3,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical" as any,
                            overflow: "hidden",
                          }}>
                            {device.device_name || device.imei || "Unnamed Device"}
                          </div>
                          {subtitle && (
                            <div style={{ fontSize: 11, color: THEME.text.tertiary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                              {subtitle}
                            </div>
                          )}
                        </div>

                        {/* Asset Type — highlighted badge */}
                        <div>
                          {resolvedType ? (
                            <span style={{
                              display: "inline-block",
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "3px 8px",
                              borderRadius: 5,
                              background: resolvedType === "EOW" ? "#fff7ed" :
                                resolvedType === "DG" ? "#eff6ff" :
                                  resolvedType === "Vehicle" || resolvedType === "Light" || resolvedType === "Heavy" ? "#f0fdf4" :
                                    THEME.neutral[100],
                              color: resolvedType === "EOW" ? "#c2410c" :
                                resolvedType === "DG" ? "#1d4ed8" :
                                  resolvedType === "Vehicle" || resolvedType === "Light" || resolvedType === "Heavy" ? "#15803d" :
                                    THEME.text.secondary,
                              border: resolvedType === "EOW" ? "1px solid #fed7aa" :
                                resolvedType === "DG" ? "1px solid #bfdbfe" :
                                  resolvedType === "Vehicle" || resolvedType === "Light" || resolvedType === "Heavy" ? "1px solid #bbf7d0" :
                                    `1px solid ${THEME.border.light}`,
                              letterSpacing: 0.3,
                            }}>
                              {resolvedType}
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: THEME.text.tertiary }}>—</span>
                          )}
                        </div>
                      </>
                    );
                  })()}

                  {/* IMEI */}
                  <div style={{
                    fontSize: 12, color: THEME.text.secondary,
                    fontFamily: "JetBrains Mono, monospace",
                    letterSpacing: -0.3,
                  }}>
                    {device.imei}
                  </div>

                  {/* Last Seen */}
                  <div style={{ fontSize: 12, color: THEME.text.secondary }}>
                    {device.last_location_time ? (
                      <span>{timeAgo(device.last_location_time)}</span>
                    ) : (
                      <span style={{ color: THEME.text.tertiary }}>Never</span>
                    )}
                  </div>

                  {/* Device Type */}
                  <div>
                    <span style={{
                      fontSize: 10, padding: "3px 8px", borderRadius: 4,
                      background: device.protocol === "nano" ? "rgba(124,58,237,0.12)" : THEME.secondary[100],
                      color: device.protocol === "nano" ? "#7c3aed" : THEME.secondary[700],
                      fontWeight: 600, whiteSpace: "nowrap" as const,
                    }}>
                      {device.protocol === "nano" ? "NANO" : device.device_type}
                    </span>
                  </div>

                  {/* Customer */}
                  <div style={{
                    fontSize: 12, color: THEME.text.secondary,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
                  }}>
                    {customer?.name || "—"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}