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
  isMobile?: boolean;
}

export function TopBar({
  onToggleSidebar,
  selectedDevice,
  currentView,
  customerFilter,
  customers,
  isMobile = false,
}: TopBarProps) {

  if (!isMobile) return null;
  
  const customer = customers.find((c) => c.id === customerFilter);

  return (
    <div
      style={{
        height: 44,
        background: THEME.background.card,
        borderBottom: `1px solid ${THEME.border.light}`,
        display: "flex",
        alignItems: "center",
        padding: isMobile ? "0 10px" : "0 16px",
        gap: isMobile ? 8 : 14,
        flexShrink: 0,
      }}
    >
      {/* ── Hamburger (mobile only) ── */}
      {isMobile && (
        <button
          onClick={onToggleSidebar}
          style={{
            background: "none",
            border: "none",
            color: THEME.text.secondary,
            cursor: "pointer",
            padding: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 6,
            flexShrink: 0,
          }}
          aria-label="Toggle sidebar"
        >
          <Icons.Menu />
        </button>
      )}

      {/* ── Breadcrumb ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
        {currentView === "devices" && (
          <>
            <span style={{ fontSize: 13, fontWeight: 600, color: THEME.text.primary, whiteSpace: "nowrap" }}>
              Devices
            </span>
            {customerFilter !== "all" && customer && !isMobile && (
              <>
                <span style={{ color: THEME.text.tertiary, fontSize: 13 }}>/</span>
                <span style={{ fontSize: 13, color: THEME.text.secondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {customer.name}
                </span>
              </>
            )}
          </>
        )}

        {currentView === "customers" && (
          <span style={{ fontSize: 13, fontWeight: 600, color: THEME.text.primary }}>Customers</span>
        )}

        {currentView === "users" && (
          <span style={{ fontSize: 13, fontWeight: 600, color: THEME.text.primary }}>Users</span>
        )}

        {selectedDevice && (
          <>
            {!isMobile && <span style={{ color: THEME.text.tertiary, fontSize: 13 }}>/</span>}
            <span
              style={{
                fontSize: 13,
                color: isMobile ? THEME.text.primary : THEME.text.secondary,
                fontWeight: isMobile ? 600 : 400,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {selectedDevice.device_name}
            </span>
          </>
        )}
      </div>
    </div>
  );
}