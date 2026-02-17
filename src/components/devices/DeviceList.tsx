"use client";

import React from "react";
import { Device, Customer } from "@/types";
import { DeviceCard } from "./DeviceCard";
import { DeviceSearchBar } from "./DeviceSearchBar";
import { Icons } from "@/components/ui/Icons";
import { THEME } from "@/lib/theme";

interface DeviceListProps {
  devices: Device[];
  customers: Customer[];
  onDeviceSelect: (device: Device) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function DeviceList({
  devices,
  customers,
  onDeviceSelect,
  searchQuery,
  onSearchChange,
}: DeviceListProps) {
  const onlineCount = devices.filter((d) => d.connection_status === "online").length;
  const offlineCount = devices.length - onlineCount;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Search and Stats Header */}
      <div
        style={{
          padding: 20,
          background: THEME.background.card,
          borderBottom: `1px solid ${THEME.border.light}`,
        }}
      >
        <DeviceSearchBar searchQuery={searchQuery} onSearchChange={onSearchChange} />

        {/* Quick Stats */}
        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <StatCard
            icon={<Icons.Devices />}
            label="Total Devices"
            value={devices.length}
            color={THEME.primary[500]}
            bgColor={THEME.primary[50]}
          />
          <StatCard
            icon={<Icons.Power />}
            label="Online"
            value={onlineCount}
            color={THEME.status.success}
            bgColor="#f0fdf4"
          />
          <StatCard
            icon={<Icons.Power />}
            label="Offline"
            value={offlineCount}
            color={THEME.neutral[500]}
            bgColor={THEME.neutral[100]}
          />
        </div>
      </div>

      {/* Device Grid */}
      <div style={{ flex: 1, overflow: "auto", padding: 20, background: THEME.background.secondary }}>
        {devices.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: THEME.text.tertiary,
            }}
          >
            <Icons.Devices />
            <div style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>
              No devices found
            </div>
            <div style={{ marginTop: 4, fontSize: 12 }}>
              {searchQuery
                ? "Try adjusting your search"
                : "Add your first device to get started"}
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 16,
            }}
          >
            {devices.map((device) => {
              const customer = customers.find((c) => c.id === device.customer_id);
              return (
                <DeviceCard
                  key={device.id}
                  device={device}
                  customer={customer}
                  onSelect={() => onDeviceSelect(device)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        background: THEME.background.card,
        border: `1px solid ${THEME.border.light}`,
        borderRadius: 10,
        padding: 16,
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: THEME.shadow.sm,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          background: bgColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: color,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, color: THEME.text.tertiary, fontWeight: 500 }}>
          {label}
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: THEME.text.primary }}>
          {value}
        </div>
      </div>
    </div>
  );
}