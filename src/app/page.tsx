"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { DeviceList } from "@/components/devices/DeviceList";
import { DeviceDetail } from "@/components/devices/DeviceDetail";
import { CustomerList } from "@/components/customers/CustomerList";
import { AddCustomerModal } from "@/components/customers/AddCustomerModal";
import { MOCK_CUSTOMERS, MOCK_DEVICES, generateTelemetry } from "@/data/mock-data";
import { filterDevices } from "@/lib/utils";
import { Device, ViewType, Command } from "@/types";

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<ViewType>("devices");
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [telemetryData, setTelemetryData] = useState<any[]>([]);
  const [commandHistory, setCommandHistory] = useState<Command[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // Simulate real-time telemetry updates
  useEffect(() => {
    if (selectedDevice) {
      setTelemetryData(generateTelemetry(selectedDevice.id));
      const interval = setInterval(() => {
        setTelemetryData(generateTelemetry(selectedDevice.id));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedDevice]);

  // Filter devices
  const filteredDevices = filterDevices(
    MOCK_DEVICES,
    searchQuery,
    customerFilter
  );

  const handleDeviceSelect = (device: Device) => {
    setSelectedDevice(device);
  };

  const handleCloseDevice = () => {
    setSelectedDevice(null);
  };

  const handleSendCommand = (command: string) => {
    if (!command.trim() || !selectedDevice) return;

    const newCommand: Command = {
      id: Date.now(),
      command: command,
      status: "sent",
      sent_at: new Date().toISOString(),
    };

    setCommandHistory((prev) => [newCommand, ...prev]);

    // Simulate command execution
    setTimeout(() => {
      setCommandHistory((prev) =>
        prev.map((c) =>
          c.id === newCommand.id
            ? {
                ...c,
                status: "executed",
                response: "OK",
                executed_at: new Date().toISOString(),
              }
            : c
        )
      );
    }, 2000);
  };

  const handleCustomerFilterChange = (customerId: string) => {
    setCustomerFilter(customerId);
    setCurrentView("devices");
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        background: "#1a1a1a",
        color: "#e0e0e0",
        fontFamily:
          "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', monospace",
        fontSize: "13px",
        overflow: "hidden",
      }}
    >
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        currentView={currentView}
        onViewChange={(view) => {
          setCurrentView(view);
          setSelectedDevice(null);
        }}
        customers={MOCK_CUSTOMERS}
        customerFilter={customerFilter}
        onCustomerFilterChange={handleCustomerFilterChange}
      />

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <TopBar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          selectedDevice={selectedDevice}
          currentView={currentView}
          customerFilter={customerFilter}
          onCustomerFilterChange={handleCustomerFilterChange}
          customers={MOCK_CUSTOMERS}
          deviceCount={filteredDevices.length}
        />

        {/* Content area */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {/* Device List View */}
          {currentView === "devices" && !selectedDevice && (
            <DeviceList
              devices={filteredDevices}
              customers={MOCK_CUSTOMERS}
              onDeviceSelect={handleDeviceSelect}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          )}

          {/* Device Detail View */}
          {selectedDevice && (
            <DeviceDetail
              device={selectedDevice}
              onClose={handleCloseDevice}
              customers={MOCK_CUSTOMERS}
              telemetry={telemetryData}
              commands={commandHistory}
              onSendCommand={handleSendCommand}
            />
          )}

          {/* Customer List View */}
          {currentView === "customers" && !selectedDevice && (
            <CustomerList
              customers={MOCK_CUSTOMERS}
              devices={MOCK_DEVICES}
              onSelectCustomer={handleCustomerFilterChange}
              onAddCustomer={() => setShowCustomerModal(true)}
            />
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        customers={MOCK_CUSTOMERS}
      />
    </div>
  );
}
