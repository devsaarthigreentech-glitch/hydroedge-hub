"use client";

import React, { useState } from "react";
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

      {/* Device Table Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "50px 1fr 200px 150px 150px 120px 100px",
          gap: 16,
          padding: "12px 20px",
          background: THEME.background.secondary,
          borderBottom: `1px solid ${THEME.border.light}`,
          fontSize: 11,
          fontWeight: 600,
          color: THEME.text.tertiary,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        <div>Status</div>
        <div>Device Name</div>
        <div>IMEI</div>
        <div>Location</div>
        <div>Last Seen</div>
        <div>Type</div>
        <div>Customer</div>
      </div>

      {/* Device List */}
      <div style={{ flex: 1, overflow: "auto", background: THEME.background.primary }}>
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
          devices.map((device) => {
            const customer = customers.find((c) => c.id === device.customer_id);
            return (
              <DeviceListItem
                key={device.id}
                device={device}
                customer={customer}
                onSelect={() => onDeviceSelect(device)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function DeviceListItem({
  device,
  customer,
  onSelect,
}: {
  device: Device;
  customer?: Customer;
  onSelect: () => void;
}) {
  const isOnline = device.connection_status === "online";

  // Helper function to safely format coordinates
  const formatCoordinate = (coord: number | string | undefined): string => {
    if (!coord) return "";
    const num = typeof coord === "string" ? parseFloat(coord) : coord;
    return isNaN(num) ? "" : num.toFixed(4);
  };

  const lat = formatCoordinate(device.last_latitude);
  const lon = formatCoordinate(device.last_longitude);
  const hasGPS = lat && lon;

  return (
    <div
      onClick={onSelect}
      style={{
        display: "grid",
        gridTemplateColumns: "50px 1fr 200px 150px 150px 120px 100px",
        gap: 16,
        padding: "14px 20px",
        borderBottom: `1px solid ${THEME.border.light}`,
        cursor: "pointer",
        transition: "all 0.15s ease",
        alignItems: "center",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = THEME.background.hover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {/* Status Indicator */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: isOnline ? THEME.status.success : THEME.neutral[300],
            boxShadow: isOnline ? `0 0 12px ${THEME.status.success}` : "none",
          }}
          className={isOnline ? "animate-pulse" : ""}
        />
      </div>

      {/* Device Name */}
      <div>
        <div
          style={{
            fontWeight: 600,
            fontSize: 13,
            color: THEME.text.primary,
            marginBottom: 2,
          }}
        >
          {device.device_name || "Unnamed Device"}
        </div>
        <div style={{ fontSize: 11, color: THEME.text.tertiary }}>
          {device.asset_name || "No asset assigned"}
        </div>
      </div>

      {/* IMEI */}
      <div
        style={{
          fontSize: 12,
          color: THEME.text.secondary,
          fontFamily: "JetBrains Mono, monospace",
        }}
      >
        {device.imei}
      </div>

      {/* Location */}
      <div style={{ fontSize: 12, color: THEME.text.secondary }}>
        {hasGPS ? (
          <span style={{ color: THEME.primary[600] }}>
            {lat}, {lon}
          </span>
        ) : (
          <span style={{ color: THEME.text.tertiary }}>No GPS</span>
        )}
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

      {/* Customer */}
      <div
        style={{
          fontSize: 11,
          color: THEME.text.tertiary,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {customer?.name || "—"}
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