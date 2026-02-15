"use client";

import React from "react";
import { Icons } from "@/components/ui/Icons";
import { Device, Customer } from "@/types";
import { timeAgo } from "@/lib/utils";

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
  return (
    <div
      style={{
        height: 48,
        background: "#242424",
        borderBottom: "1px solid #333",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 12,
        flexShrink: 0,
      }}
    >
      <button
        onClick={onToggleSidebar}
        style={{
          background: "none",
          border: "none",
          color: "#94a3b8",
          cursor: "pointer",
          padding: 4,
          display: "flex",
        }}
      >
        <Icons.Menu />
      </button>

      <span
        style={{
          fontWeight: 700,
          fontSize: 15,
          color: "#f1f5f9",
          letterSpacing: 0.5,
        }}
      >
        {selectedDevice
          ? selectedDevice.device_name
          : currentView === "customers"
          ? "Customers"
          : "Devices"}
      </span>

      <div style={{ flex: 1 }} />

      {selectedDevice && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            color: "#94a3b8",
          }}
        >
          <span style={{ color: "#00e676", fontWeight: 600 }}>
            {selectedDevice.manufacturer} {selectedDevice.device_type}
          </span>
          <span>·</span>
          <span>{timeAgo(selectedDevice.last_location_time)}</span>
        </div>
      )}

      {!selectedDevice && currentView === "devices" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#6b7280" }}>
            {deviceCount} device{deviceCount !== 1 ? "s" : ""}
          </span>
          <select
            value={customerFilter}
            onChange={(e) => onCustomerFilterChange(e.target.value)}
            style={{
              background: "#333",
              border: "1px solid #444",
              borderRadius: 6,
              color: "#e0e0e0",
              padding: "4px 8px",
              fontSize: 11,
              outline: "none",
            }}
          >
            <option value="all">All Customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
