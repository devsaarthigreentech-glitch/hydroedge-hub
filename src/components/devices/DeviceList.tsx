"use client";

import React from "react";
import { Device, Customer } from "@/types";
import { DeviceCard } from "./DeviceCard";
import { DeviceSearchBar } from "./DeviceSearchBar";

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
  const getCustomer = (customerId: string) =>
    customers.find((c) => c.id === customerId);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Device cards */}
      <div style={{ flex: 1, overflow: "auto", padding: 0 }}>
        {devices.map((device, idx) => (
          <DeviceCard
            key={device.id}
            device={device}
            customer={getCustomer(device.customer_id)}
            onClick={() => onDeviceSelect(device)}
            index={idx}
          />
        ))}
      </div>

      {/* Search bar */}
      <DeviceSearchBar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
      />
    </div>
  );
}
