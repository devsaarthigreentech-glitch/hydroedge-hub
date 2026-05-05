"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { DeviceList } from "@/components/devices/DeviceList";
import { DeviceDetail } from "@/components/devices/DeviceDetail";
import { CustomerList } from "@/components/customers/CustomerList";
import { CustomerDetail } from "@/components/customers/CustomerDetail";
import { AddCustomerModal } from "@/components/customers/AddCustomerModal";
import { filterDevices } from "@/lib/utils";
import { Device, Customer, ViewType, Command } from "@/types";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserList } from "@/components/users/UserList";
import { AddUserModal } from "@/components/users/AddUserModal";
import { useIsMobile } from "@/hooks/useIsMobile";
import { THEME } from "@/lib/theme";

export default function PortalPage() {
  const { status } = useSession();
const router = useRouter();

useEffect(() => {
  if (status === "unauthenticated") {
    router.push("/login");
  }
}, [status, router]);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<ViewType>("devices");
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [telemetryData, setTelemetryData] = useState<any[]>([]);
  const [commandHistory, setCommandHistory] = useState<Command[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | undefined>(undefined);

  const [showUserModal, setShowUserModal] = useState(false);
  const [userCount, setUserCount] = useState(0);

  const isMobile = useIsMobile();

  // Real data from API
  const [devices, setDevices] = useState<Device[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleDeviceDeleted = () => {
    setDevices(prev => prev.filter(d => d.id !== selectedDevice?.id));
    setSelectedDevice(null);
  };

  const handleDeviceUpdated = (updatedDevice: Device) => {
    setDevices(prev => prev.map(d => d.id === updatedDevice.id ? { ...d, ...updatedDevice } : d));
    setSelectedDevice(prev => prev ? { ...prev, ...updatedDevice } : null);
  };

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(d => {
      if (d.success) setUserCount(d.total);
    });
  }, []);

  const { data: session } = useSession();
  const user = session?.user as any;
  const customerType = (user?.role === 'super_admin')
    ? undefined
    : (user?.customerType || 'customer');

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
      const interval = setInterval(fetchTelemetry, 30000);
      return () => clearInterval(interval);
    }
  }, [selectedDevice]);

  const deviceCount = filterDevices(devices,"","all");

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

    setTimeout(() => {
      setCommandHistory((prev) =>
        prev.map((c) =>
          c.id === newCommand.id
            ? { ...c, status: "executed", response: "OK", executed_at: new Date().toISOString() }
            : c
        )
      );
    }, 2000);
  };

  const handleCustomerFilterChange = (customerId: string) => {
    setCustomerFilter(customerId);
    setCurrentView("devices");
  };

  // Open a customer's detail panel
  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCurrentView("customers");
    setSelectedDevice(null);
  };

  // Called when CustomerDetail saves changes
  const handleCustomerUpdated = (updated: Customer) => {
    setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
    setSelectedCustomer(updated);
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
        background: THEME.background.primary,
        color: THEME.text.primary,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', monospace",
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
          setSelectedCustomer(null);
        }}
        customers={customers}
        customerFilter={customerFilter}
        onCustomerFilterChange={handleCustomerFilterChange}
        selectedCustomerId={selectedCustomer?.id}
        onCustomerSelect={handleCustomerSelect}
        customerCount={customers.length}
        deviceCount={deviceCount.length}
        userCount={userCount}
        isMobile={isMobile}
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
          // selectedCustomer={selectedCustomer}
          isMobile={isMobile}
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
              isMobile={isMobile}
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
              onDeviceDeleted={handleDeviceDeleted}
              onDeviceUpdated={handleDeviceUpdated}
              customerType={customerType}
            />
          )}

          {/* Customer Detail View — shown when a specific customer is selected */}
          {currentView === "customers" && selectedCustomer && !selectedDevice && (
            <CustomerDetail
              customer={selectedCustomer}
              allCustomers={customers}
              onBack={() => {
                setSelectedCustomer(null);
              }}
              onCustomerUpdated={handleCustomerUpdated}
              onDeviceSelect={(device) => {
                setSelectedDevice(device);
              }}
            />
          )}

          {/* Customer List View — shown when no specific customer selected */}
          {currentView === "customers" && !selectedCustomer && !selectedDevice && (
            <CustomerList
              customers={customers}
              devices={devices}
              onSelectCustomer={(id) => {
                const c = customers.find(x => x.id === id);
                if (c) handleCustomerSelect(c);
              }}
              onAddCustomer={() => setShowCustomerModal(true)}
            />
          )}

          {/* User List View */}
{currentView === "users" && (
  <UserList
    customers={customers}
    onAddUser={() => setShowUserModal(true)}
  />
)}
        </div>
      </div>

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        customers={customers}
        onCustomerCreated={(newCustomer) => {
          setCustomers(prev => [...prev, newCustomer]);
        }}
      />

<AddUserModal
  isOpen={showUserModal}
  onClose={() => setShowUserModal(false)}
  customers={customers}
  onUserCreated={() => {
    setShowUserModal(false);
    // UserList fetches its own data, so no state to update
  }}
/>
    </div>
  );
}
// "use client";

// import React, { useState, useEffect } from "react";
// import { useSession, signOut } from "next-auth/react";
// import { useRouter } from "next/navigation";
// import { TelemetryTab } from "@/components/device-detail/TelemetryTab";
// import { AnalyticsTab } from "@/components/device-detail/AnalyticsTab";
// import { InfoTab } from "@/components/device-detail/InfoTab";
// import { Device, TelemetryParameter } from "@/types";

// type TabType = "telemetry" | "analytics" | "info";

// export default function CustomerPortal() {
//   const { data: session, status } = useSession();
//   const router = useRouter();
//   const [devices, setDevices] = useState<Device[]>([]);
//   const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
//   const [activeTab, setActiveTab] = useState<TabType>("telemetry");
//   const [telemetryData, setTelemetryData] = useState<TelemetryParameter[]>([]);
//   const [lastUpdate, setLastUpdate] = useState<string | undefined>();
//   const [loading, setLoading] = useState(true);
//   const [sidebarOpen, setSidebarOpen] = useState(true);

//   const user = session?.user as any;

//   // Redirect if not logged in
//   useEffect(() => {
//     if (status === "unauthenticated") {
//       router.push("/login");
//     }
//   }, [status, router]);

//   // Fetch devices for this customer
//   useEffect(() => {
//     if (status !== "authenticated") return;
//     async function fetchDevices() {
//       setLoading(true);
//       try {
//         const res = await fetch("/api/customer/devices");
//         const data = await res.json();
//         if (data.success) {
//           setDevices(data.data || []);
//         }
//       } catch (err) {
//         console.error("Failed to fetch devices:", err);
//       }
//       setLoading(false);
//     }
//     fetchDevices();
//   }, [status]);

//   // Fetch telemetry for selected device
//   useEffect(() => {
//     if (!selectedDevice) return;
//     async function fetchTelemetry() {
//       try {
//         const res = await fetch(`/api/telemetry/${selectedDevice?.id}`);
//         const data = await res.json();
//         if (data.success) {
//           setTelemetryData(data.data);
//           setLastUpdate(data.lastUpdate);
//         }
//       } catch (err) {
//         console.error("Error fetching telemetry:", err);
//       }
//     }
//     fetchTelemetry();
//     const interval = setInterval(fetchTelemetry, 30000);
//     return () => clearInterval(interval);
//   }, [selectedDevice]);

//   if (status === "loading" || loading) {
//     return (
//       <div style={{
//         display: "flex", alignItems: "center", justifyContent: "center",
//         height: "100vh", background: "#1a1a1a", color: "#e0e0e0",
//         fontFamily: "'JetBrains Mono', monospace",
//       }}>
//         <div style={{ textAlign: "center" }}>
//           <div style={{
//             border: "3px solid #333", borderTop: "3px solid #00c853",
//             borderRadius: "50%", width: 50, height: 50,
//             animation: "spin 1s linear infinite", margin: "0 auto 20px",
//           }} />
//           <div>Loading portal...</div>
//         </div>
//       </div>
//     );
//   }

//   const tabs: { key: TabType; label: string; icon: string }[] = [
//     { key: "telemetry", label: "Telemetry", icon: "📡" },
//     { key: "analytics", label: "Analytics", icon: "📊" },
//     { key: "info", label: "Info", icon: "ℹ️" },
//   ];

//   return (
//     <div style={{
//       display: "flex", height: "100vh", width: "100vw",
//       background: "#1a1a1a", color: "#e0e0e0",
//       fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
//       fontSize: 13, overflow: "hidden",
//     }}>

//       {/* Sidebar */}
//       {sidebarOpen && (
//         <div style={{
//           width: 280, background: "#111", borderRight: "1px solid #2a2a2a",
//           display: "flex", flexDirection: "column", overflow: "hidden",
//         }}>
//           {/* Sidebar header */}
//           <div style={{
//             padding: "16px", borderBottom: "1px solid #2a2a2a",
//           }}>
//             <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>
//               Hydroedge<span style={{ color: "#00c853" }}> Hub</span>
//             </div>
//             <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
//               {user?.name || "Customer Portal"}
//             </div>
//           </div>

//           {/* Device list */}
//           <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
//             <div style={{
//               fontSize: 10, fontWeight: 700, color: "#555",
//               textTransform: "uppercase", letterSpacing: 1,
//               padding: "8px 10px", marginBottom: 4,
//             }}>
//               Devices ({devices.length})
//             </div>

//             {devices.length === 0 ? (
//               <div style={{ padding: "20px 10px", color: "#555", textAlign: "center" }}>
//                 No devices assigned
//               </div>
//             ) : (
//               devices.map((device) => {
//                 const isSelected = selectedDevice?.id === device.id;
//                 const isOnline = device.connection_status === "online";
//                 return (
//                   <div
//                     key={device.id}
//                     onClick={() => {
//                       setSelectedDevice(device);
//                       setActiveTab("telemetry");
//                     }}
//                     style={{
//                       padding: "10px 12px",
//                       borderRadius: 8,
//                       marginBottom: 2,
//                       cursor: "pointer",
//                       background: isSelected ? "rgba(0,200,83,0.1)" : "transparent",
//                       border: isSelected ? "1px solid rgba(0,200,83,0.3)" : "1px solid transparent",
//                       transition: "all 0.15s",
//                     }}
//                     onMouseEnter={(e) => {
//                       if (!isSelected) e.currentTarget.style.background = "#1a1a1a";
//                     }}
//                     onMouseLeave={(e) => {
//                       if (!isSelected) e.currentTarget.style.background = "transparent";
//                     }}
//                   >
//                     <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//                       <div style={{
//                         width: 8, height: 8, borderRadius: "50%",
//                         background: isOnline ? "#00c853" : "#555",
//                         boxShadow: isOnline ? "0 0 6px #00c853" : "none",
//                       }} />
//                       <span style={{ fontWeight: 600, color: "#fff", fontSize: 13 }}>
//                         {device.asset_name || device.device_name || device.imei}
//                       </span>
//                     </div>
//                     <div style={{ fontSize: 11, color: "#555", marginLeft: 16, marginTop: 3 }}>
//                       {device.imei}
//                       {device.asset_type && ` · ${device.asset_type}`}
//                     </div>
//                   </div>
//                 );
//               })
//             )}
//           </div>

//           {/* Sign out */}
//           <div style={{ padding: 12, borderTop: "1px solid #2a2a2a" }}>
//             <button
//               onClick={() => signOut({ callbackUrl: "/login" })}
//               style={{
//                 width: "100%", padding: "8px", background: "#222",
//                 border: "1px solid #333", borderRadius: 6,
//                 color: "#888", fontSize: 12, cursor: "pointer",
//                 fontFamily: "inherit",
//               }}
//               onMouseEnter={(e) => e.currentTarget.style.color = "#ef4444"}
//               onMouseLeave={(e) => e.currentTarget.style.color = "#888"}
//             >
//               Sign Out
//             </button>
//           </div>
//         </div>
//       )}

//       {/* Main content */}
//       <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

//         {/* Top bar */}
//         <div style={{
//           height: 48, background: "#111", borderBottom: "1px solid #2a2a2a",
//           display: "flex", alignItems: "center", padding: "0 16px", gap: 12,
//         }}>
//           <button
//             onClick={() => setSidebarOpen(!sidebarOpen)}
//             style={{
//               background: "none", border: "none", color: "#888",
//               fontSize: 18, cursor: "pointer", padding: 4,
//             }}
//           >
//             ☰
//           </button>

//           {selectedDevice ? (
//             <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//               <div style={{
//                 width: 10, height: 10, borderRadius: "50%",
//                 background: selectedDevice.connection_status === "online" ? "#00c853" : "#555",
//               }} />
//               <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
//                 {selectedDevice.asset_name || selectedDevice.device_name || selectedDevice.imei}
//               </span>
//               <span style={{
//                 fontSize: 11, background: "#222", color: "#666",
//                 padding: "3px 8px", borderRadius: 4,
//               }}>
//                 {selectedDevice.imei}
//               </span>
//             </div>
//           ) : (
//             <span style={{ color: "#666" }}>Select a device</span>
//           )}
//         </div>

//         {selectedDevice ? (
//           <>
//             {/* Tab bar */}
//             <div style={{
//               display: "flex", gap: 2, padding: "0 16px",
//               background: "#111", borderBottom: "1px solid #2a2a2a",
//             }}>
//               {tabs.map((tab) => {
//                 const isActive = activeTab === tab.key;
//                 return (
//                   <button
//                     key={tab.key}
//                     onClick={() => setActiveTab(tab.key)}
//                     style={{
//                       padding: "10px 20px",
//                       background: isActive ? "#1a1a1a" : "transparent",
//                       color: isActive ? "#00c853" : "#666",
//                       border: "none",
//                       borderTop: isActive ? "2px solid #00c853" : "2px solid transparent",
//                       fontSize: 13, fontWeight: isActive ? 700 : 500,
//                       cursor: "pointer", fontFamily: "inherit",
//                       transition: "all 0.15s",
//                     }}
//                   >
//                     {tab.icon} {tab.label}
//                   </button>
//                 );
//               })}
//             </div>

//             {/* Tab content */}
//             <div style={{ flex: 1, overflow: "auto" }}>
//               {activeTab === "telemetry" && (
//                 <TelemetryTab
//                   telemetry={telemetryData}
//                   lastUpdate={lastUpdate}
//                   device={selectedDevice}
//                 />
//               )}
//               {activeTab === "analytics" && (
//                 <AnalyticsTab device={selectedDevice} />
//               )}
//               {activeTab === "info" && (
//                 <InfoTab device={selectedDevice} />
//               )}
//             </div>
//           </>
//         ) : (
//           <div style={{
//             flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
//             color: "#444", flexDirection: "column", gap: 12,
//           }}>
//             <div style={{ fontSize: 48 }}>📡</div>
//             <div style={{ fontSize: 16, fontWeight: 600 }}>Select a device from the sidebar</div>
//             <div style={{ fontSize: 12, color: "#333" }}>
//               View telemetry, analytics and device info
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }