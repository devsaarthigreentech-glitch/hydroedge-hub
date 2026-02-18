"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { DeviceList } from "@/components/devices/DeviceList";
import { DeviceDetail } from "@/components/devices/DeviceDetail";
import { CustomerList } from "@/components/customers/CustomerList";
import { AddCustomerModal } from "@/components/customers/AddCustomerModal";
import { filterDevices } from "@/lib/utils";
import { Device, Customer, ViewType, Command } from "@/types";

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<ViewType>("devices");
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [telemetryData, setTelemetryData] = useState<any[]>([]);
  const [commandHistory, setCommandHistory] = useState<Command[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | undefined>(undefined);

  // Real data from API
  const [devices, setDevices] = useState<Device[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch customers from database
  useEffect(() => {
    async function fetchCustomers() {
      try {
        const response = await fetch('/api/customers');
        const data = await response.json();
        
        if (data.success) {
          setCustomers(data.data);
        } else {
          setError(data.error || 'Failed to fetch customers');
        }
      } catch (err: any) {
        console.error('Error fetching customers:', err);
        setError(err.message);
      }
    }
    
    fetchCustomers();
  }, []);

  // Fetch devices from database
  useEffect(() => {
    async function fetchDevices() {
      try {
        setLoading(true);
        const url = customerFilter === 'all' 
          ? '/api/devices'
          : `/api/devices?customer_id=${customerFilter}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
          setDevices(data.data);
        } else {
          setError(data.error || 'Failed to fetch devices');
        }
      } catch (err: any) {
        console.error('Error fetching devices:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDevices();
  }, [customerFilter]);

  // Fetch real-time telemetry from database
  useEffect(() => {
    if (selectedDevice) {
      async function fetchTelemetry() {
        try {
          const response = await fetch(`/api/telemetry/${selectedDevice?.id}`);
          const data = await response.json();
          
          if (data.success) {
            setTelemetryData(data.data);
            setLastUpdate(data.lastUpdate);
          }
        } catch (err) {
          console.error('Error fetching telemetry:', err);
        }
      }
      
      fetchTelemetry();
      
      // Auto-refresh telemetry every 5 seconds
      const interval = setInterval(fetchTelemetry, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedDevice]);

  // Filter devices
  const filteredDevices = filterDevices(devices, searchQuery, customerFilter);

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

    // TODO: Send to actual command API
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

  // Show loading state
  if (loading && devices.length === 0) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#1a1a1a",
        color: "#e0e0e0",
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            border: "3px solid #333",
            borderTop: "3px solid #00c853",
            borderRadius: "50%",
            width: "50px",
            height: "50px",
            animation: "spin 1s linear infinite",
            margin: "0 auto 20px",
          }}></div>
          <div>Loading data from database...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#1a1a1a",
        color: "#ef4444",
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        <div style={{ textAlign: "center", maxWidth: "500px", padding: "20px" }}>
          <div style={{ fontSize: "48px", marginBottom: "20px" }}>⚠️</div>
          <div style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "10px" }}>
            Database Connection Error
          </div>
          <div style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "20px" }}>
            {error}
          </div>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>
            Check your .env.local file and ensure PostgreSQL is running
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              background: "#00c853",
              color: "#000",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: "bold",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
        customers={customers}
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
          customers={customers}
          deviceCount={filteredDevices.length}
        />

        {/* Content area */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {/* Device List View */}
          {currentView === "devices" && !selectedDevice && (
            <DeviceList
              devices={filteredDevices}
              customers={customers}
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
              customers={customers}
              telemetry={telemetryData}
              commands={commandHistory}
              onSendCommand={handleSendCommand}
              lastUpdate={lastUpdate}
            />
          )}

          {/* Customer List View */}
          {currentView === "customers" && !selectedDevice && (
            <CustomerList
              customers={customers}
              devices={devices}
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
        customers={customers}
      />
    </div>
  );
}