"use client";

import React from "react";
import { Icons } from "@/components/ui/Icons";
import { Device, Customer } from "@/types";
import { THEME } from "@/lib/theme";

interface TopBarProps {
  onToggleSidebar: () => void;
  selectedDevice: Device | null;
  currentView: string;
  customerFilter: string;
  onCustomerFilterChange: (customerId: string) => void;
  customers: Customer[];
  deviceCount: number;
}

export function TopBar({
  onToggleSidebar,
  selectedDevice,
  currentView,
  customerFilter,
  onCustomerFilterChange,
  customers,
  deviceCount,
}: TopBarProps) {
  const customer = customers.find((c) => c.id === customerFilter);

  return (
    <div
      style={{
        height: 60,
        background: THEME.background.card,
        borderBottom: `1px solid ${THEME.border.light}`,
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        gap: 20,
        flexShrink: 0,
        boxShadow: THEME.shadow.sm,
      }}
    >
      {/* Breadcrumb */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
        <Icons.Menu />
        <span style={{ color: THEME.text.tertiary, fontSize: 14 }}>/</span>
        
        {currentView === "devices" && (
          <>
            <span style={{ fontSize: 14, fontWeight: 600, color: THEME.text.primary }}>
              Devices
            </span>
            {customerFilter !== "all" && customer && (
              <>
                <span style={{ color: THEME.text.tertiary, fontSize: 14 }}>/</span>
                <span style={{ fontSize: 14, color: THEME.text.secondary }}>
                  {customer.name}
                </span>
              </>
            )}
          </>
        )}
        
        {currentView === "customers" && (
          <span style={{ fontSize: 14, fontWeight: 600, color: THEME.text.primary }}>
            Customers
          </span>
        )}
        
        {selectedDevice && (
          <>
            <span style={{ color: THEME.text.tertiary, fontSize: 14 }}>/</span>
            <span style={{ fontSize: 14, color: THEME.text.secondary }}>
              {selectedDevice.device_name}
            </span>
          </>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            background: THEME.background.secondary,
            borderRadius: 8,
            border: `1px solid ${THEME.border.light}`,
          }}
        >
          <Icons.Devices />
          <div>
            <div style={{ fontSize: 10, color: THEME.text.tertiary, fontWeight: 500 }}>
              Total Devices
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: THEME.text.primary }}>
              {deviceCount}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            background: `linear-gradient(135deg, ${THEME.primary[50]} 0%, ${THEME.primary[100]} 100%)`,
            borderRadius: 8,
            border: `1px solid ${THEME.primary[200]}`,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: THEME.status.success,
            }}
            className="animate-pulse"
          />
          <div>
            <div style={{ fontSize: 10, color: THEME.primary[700], fontWeight: 500 }}>
              Online
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: THEME.primary[700] }}>
              {deviceCount}
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${THEME.primary[400]} 0%, ${THEME.primary[600]} 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            border: `2px solid ${THEME.primary[200]}`,
          }}
        >
          SA
        </div>
      </div>
    </div>
  );
}