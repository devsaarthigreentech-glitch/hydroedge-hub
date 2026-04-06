// // // src/app/portal/page.tsx
// // "use client";

// // import { useSession, signOut } from "next-auth/react";
// // import { useState, useEffect } from "react";
// // import { InfoTab } from "../device-detail/InfoTab";
// // import { AnalyticsTab } from "../device-detail/AnalyticsTab";
// // import { TelemetryTab } from "../device-detail/TelemetryTab";
// // // import TelemetryTab from "";
// // // import AnalyticsTab from "@/components/AnalyticsTab";
// // // import InfoTab from "@/components/InfoTab";
// // // import VisibilitySettings from "@/components/VisibilitySettings";

// // interface Device {
// //   id: string;
// //   imei: string;
// //   device_name: string;
// //   device_type: string;
// //   asset_name: string;
// //   asset_type: string;
// //   status: string;
// //   connection_status: string;
// //   last_latitude: number;
// //   last_longitude: number;
// //   last_location_time: string;
// //   access_level: string;
// // }

// // interface CustomerGroup {
// //   customer_name: string;
// //   hierarchy_depth: number;
// //   devices: Device[];
// // }

// // type TabType = "telemetry" | "analytics" | "info";

// // export default function PortalPage() {
// //   const { data: session } = useSession();
// //   const [groups, setGroups] = useState<CustomerGroup[]>([]);
// //   const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
// //   const [activeTab, setActiveTab] = useState<TabType>("telemetry");
// //   const [loading, setLoading] = useState(true);
// //   const [sidebarOpen, setSidebarOpen] = useState(true);
// //   const [showSettings, setShowSettings] = useState(false);

// //   const user = session?.user as any;

// //   useEffect(() => {
// //     fetchDevices();
// //   }, []);

// //   const fetchDevices = async () => {
// //     setLoading(true);
// //     try {
// //       const res = await fetch("/api/customer/devices");
// //       const data = await res.json();
// //       setGroups(data.customers || []);
// //       // Auto-select first device
// //       if (data.customers?.[0]?.devices?.[0]) {
// //         setSelectedDevice(data.customers[0].devices[0]);
// //       }
// //     } catch (err) {
// //       console.error("Failed to fetch devices:", err);
// //     }
// //     setLoading(false);
// //   };

// //   const tabs: { key: TabType; label: string; icon: string }[] = [
// //     { key: "telemetry", label: "Telemetry", icon: "📡" },
// //     { key: "analytics", label: "Analytics", icon: "📊" },
// //     { key: "info", label: "Info", icon: "ℹ️" },
// //   ];

// //   const statusColor = (s: string) =>
// //     s === "online" ? "bg-emerald-500" : "bg-slate-600";

// //   return (
// //     <div className="min-h-screen bg-slate-950 text-white flex flex-col">
// //       {/* Top bar */}
// //       <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
// //         <div className="flex items-center gap-3">
// //           <button
// //             onClick={() => setSidebarOpen(!sidebarOpen)}
// //             className="text-slate-400 hover:text-white p-1"
// //           >
// //             ☰
// //           </button>
// //           <h1 className="text-lg font-semibold">
// //             Hydroedge<span className="text-emerald-400"> Hub</span>
// //           </h1>
// //         </div>
// //         <div className="flex items-center gap-4">
// //           <button
// //             onClick={() => setShowSettings(!showSettings)}
// //             className="text-slate-400 hover:text-white text-sm"
// //             title="Visibility Settings"
// //           >
// //             ⚙️ Settings
// //           </button>
// //           <span className="text-sm text-slate-400">
// //             {user?.customerName || user?.name}
// //           </span>
// //           <button
// //             onClick={() => signOut({ callbackUrl: "/login" })}
// //             className="text-sm text-slate-400 hover:text-red-400 transition"
// //           >
// //             Sign Out
// //           </button>
// //         </div>
// //       </header>

// //       {/* Settings modal */}
// //       {showSettings && (
// //         <VisibilitySettings onClose={() => setShowSettings(false)} />
// //       )}

// //       <div className="flex flex-1 overflow-hidden">
// //         {/* Sidebar - Device list grouped by customer */}
// //         {sidebarOpen && (
// //           <aside className="w-72 bg-slate-900 border-r border-slate-800 overflow-y-auto shrink-0">
// //             <div className="p-3">
// //               <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
// //                 Devices
// //               </h2>

// //               {loading ? (
// //                 <p className="text-slate-500 text-sm p-2">Loading...</p>
// //               ) : groups.length === 0 ? (
// //                 <p className="text-slate-500 text-sm p-2">No devices found</p>
// //               ) : (
// //                 groups.map((group) => (
// //                   <div key={group.customer_name} className="mb-4">
// //                     <div className="flex items-center gap-2 mb-1.5 px-2">
// //                       <span className="text-xs font-medium text-slate-400">
// //                         {group.customer_name}
// //                       </span>
// //                       {group.hierarchy_depth > 0 && (
// //                         <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
// //                           L{group.hierarchy_depth}
// //                         </span>
// //                       )}
// //                     </div>
// //                     {group.devices.map((device) => (
// //                       <button
// //                         key={device.id}
// //                         onClick={() => setSelectedDevice(device)}
// //                         className={`w-full text-left px-3 py-2 rounded-lg mb-0.5 transition text-sm ${
// //                           selectedDevice?.id === device.id
// //                             ? "bg-emerald-600/20 border border-emerald-600/40"
// //                             : "hover:bg-slate-800"
// //                         }`}
// //                       >
// //                         <div className="flex items-center gap-2">
// //                           <span
// //                             className={`w-2 h-2 rounded-full ${statusColor(device.connection_status)}`}
// //                           />
// //                           <span className="font-medium truncate">
// //                             {device.asset_name || device.device_name || device.imei}
// //                           </span>
// //                         </div>
// //                         <div className="text-xs text-slate-500 ml-4 mt-0.5">
// //                           {device.imei}
// //                           {device.asset_type && ` · ${device.asset_type}`}
// //                         </div>
// //                       </button>
// //                     ))}
// //                   </div>
// //                 ))
// //               )}
// //             </div>
// //           </aside>
// //         )}

// //         {/* Main content */}
// //         <main className="flex-1 flex flex-col overflow-hidden">
// //           {selectedDevice ? (
// //             <>
// //               {/* Device header + tabs */}
// //               <div className="border-b border-slate-800 bg-slate-900/50 px-6 pt-4">
// //                 <div className="flex items-center gap-3 mb-3">
// //                   <span
// //                     className={`w-3 h-3 rounded-full ${statusColor(selectedDevice.connection_status)}`}
// //                   />
// //                   <h2 className="text-lg font-semibold">
// //                     {selectedDevice.asset_name ||
// //                       selectedDevice.device_name ||
// //                       selectedDevice.imei}
// //                   </h2>
// //                   <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded">
// //                     {selectedDevice.imei}
// //                   </span>
// //                 </div>

// //                 {/* Tab bar */}
// //                 <div className="flex gap-1">
// //                   {tabs.map((tab) => (
// //                     <button
// //                       key={tab.key}
// //                       onClick={() => setActiveTab(tab.key)}
// //                       className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
// //                         activeTab === tab.key
// //                           ? "bg-slate-950 text-emerald-400 border-t-2 border-emerald-400"
// //                           : "text-slate-400 hover:text-white hover:bg-slate-800/50"
// //                       }`}
// //                     >
// //                       {tab.icon} {tab.label}
// //                     </button>
// //                   ))}
// //                 </div>
// //               </div>

// //               {/* Tab content */}
// //               <div className="flex-1 overflow-y-auto p-6">
// //                 {activeTab === "telemetry" && (
// //                   <TelemetryTab device={selectedDevice} />
// //                 )}
// //                 {activeTab === "analytics" && (
// //                   <AnalyticsTab device={selectedDevice} />
// //                 )}
// //                 {activeTab === "info" && <InfoTab device={selectedDevice} />}
// //               </div>
// //             </>
// //           ) : (
// //             <div className="flex-1 flex items-center justify-center text-slate-600">
// //               Select a device from the sidebar
// //             </div>
// //           )}
// //         </main>
// //       </div>
// //     </div>
// //   );
// // }

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
        background: "#1a1a1a",
        color: "#e0e0e0",
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
              onDeviceDeleted={handleDeviceDeleted}
              onDeviceUpdated={handleDeviceUpdated}
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