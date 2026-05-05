// "use client";

// import React, { useState } from "react";
// import { Device, DeviceTab, Customer, Command } from "@/types";
// import { Icons } from "@/components/ui/Icons";
// import { InfoTab } from "../device-detail/InfoTab";
// import { EditTab } from "../device-detail/EditTab";
// import { TelemetryTab } from "../device-detail/TelemetryTab";
// import { TelemetryGraphTab } from "../device-detail/TelemetryGraphTab";
// import { CommandsTab } from "../device-detail/CommandsTab";
// import { LogsTab } from "../device-detail/LogsTab";
// import { SettingsTab } from "../device-detail/SettingsTab";
// import { timeAgo } from "@/lib/utils";
// import { MapTab } from "../device-detail/MapTab";
// import { AnalyticsTab } from "../device-detail/AnalyticsTab";
// import { TeltonikaConfigurator } from "../device-detail/TeltonikaConfigurator";
// import { getAllowedTabs } from "@/lib/tab-permissions";

// interface DeviceDetailProps {
//   device: Device;
//   onClose: () => void;
//   customers: Customer[];
//   telemetry: any[];
//   commands: Command[];
//   lastUpdate? : string;
//   onSendCommand: (command: string) => void;
//   onDeviceDeleted:  () => void,
//   onDeviceUpdated: (device: Device) => void
//   customerType?: string;
// }

// export function DeviceDetail({
//   device,
//   onClose,
//   customers,
//   telemetry,
//   commands,
//   lastUpdate,
//   onSendCommand,
//   onDeviceDeleted,
//   onDeviceUpdated,
//   customerType

// }: DeviceDetailProps) {
//   const [selectedTab, setSelectedTab] = useState<DeviceTab>("telemetry");

//   const customer = customers.find((c) => c.id === device.customer_id);

//   const tabs = [
//     { key: "info" as DeviceTab, label: "INFO", icon: Icons.Info },
//     { key: "edit" as DeviceTab, label: "EDIT", icon: Icons.Edit },
//     { key: "telemetry" as DeviceTab, label: "TELEMETRY", icon: Icons.Telemetry },
//     { key: "graphs" as DeviceTab, label: "GRAPHS", icon: Icons.TrendingUp },
//     { key: "analytics" as DeviceTab, label: "ANALYTICS", icon: Icons.TrendingUp },
//     { key: "commands" as DeviceTab, label: "COMMANDS", icon: Icons.Commands },
//     { key: "config" as DeviceTab, label: "CONFIG", icon: Icons.Commands },
//     { key: "logs" as DeviceTab, label: "LOGS & MESSAGES", icon: Icons.Logs },
//     { key: "settings" as DeviceTab, label: "SETTINGS", icon: Icons.Settings },
//     { key: "map" as DeviceTab, label: "MAP", icon: Icons.MapPin }
//   ];

//   const visibleTabs = customerType
//   ? tabs.filter(tab => getAllowedTabs(customerType).includes(tab.key))
//   : tabs;

//   return (
//     <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
//       {/* Device header bar */}
//       <div
//         style={{
//           background:
//             device.connection_status === "online"
//               ? "rgba(0, 200, 83, 0.1)"
//               : "#242424",
//           borderBottom: "1px solid #333",
//           padding: "12px 20px",
//           display: "flex",
//           alignItems: "center",
//           gap: 16,
//         }}
//       >
//         <button
//           onClick={onClose}
//           style={{
//             background: "none",
//             border: "none",
//             color: "#94a3b8",
//             cursor: "pointer",
//             padding: 4,
//             display: "flex",
//           }}
//         >
//           <Icons.Close />
//         </button>
//         <div
//           style={{
//             width: 40,
//             height: 40,
//             borderRadius: 8,
//             background: "#2a2a2a",
//             border: "1px solid #3a3a3a",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//           }}
//         >
//           <Icons.Devices />
//         </div>
//         <div style={{ flex: 1 }}>
//           <div style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>
//             {device.device_name}
//           </div>
//           <div
//             style={{ fontSize: 11, color: "#6b7280", fontFamily: "monospace" }}
//           >
//             ▫ {device.imei}
//           </div>
//         </div>
//         <div
//           style={{
//             width: 32,
//             height: 32,
//             borderRadius: "50%",
//             background:
//               device.connection_status === "online" ? "#00c853" : "#424242",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             boxShadow:
//               device.connection_status === "online"
//                 ? "0 0 12px rgba(0, 200, 83, 0.4)"
//                 : "none",
//           }}
//         >
//           <Icons.Power />
//         </div>
//         <div style={{ textAlign: "right" }}>
//           <div style={{ fontSize: 12, fontWeight: 600, color: "#00e676" }}>
//             {device.manufacturer} {device.device_type}
//           </div>
//           <div style={{ fontSize: 10, color: "#6b7280" }}>
//             ⏱ {timeAgo(device.last_location_time)} · FW{" "}
//             {device.firmware_version}
//           </div>
//         </div>
//         <div
//           style={{
//             display: "flex",
//             gap: 10,
//             fontSize: 11,
//             color: "#525252",
//             borderLeft: "1px solid #333",
//             paddingLeft: 16,
//             marginLeft: 8,
//           }}
//         >
//           <span>▣ 0</span>
//           <span>⚡ 0</span>
//           <span>⚙ 0</span>
//           <span>⊞ 0</span>
//         </div>
//       </div>

//       {/* Tabs */}
//       <div
//         style={{
//           display: "flex",
//           background: "#1e1e1e",
//           borderBottom: "1px solid #333",
//           overflow: "auto",
//           flexShrink: 0,
//         }}
//       >
//         {visibleTabs.map((tab) => (
//           <button
//             key={tab.key}
//             onClick={() => setSelectedTab(tab.key)}
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: 6,
//               padding: "10px 18px",
//               border: "none",
//               cursor: "pointer",
//               background:
//                 selectedTab === tab.key ? "#2a2a2a" : "transparent",
//               color: selectedTab === tab.key ? "#f1f5f9" : "#6b7280",
//               borderBottom:
//                 selectedTab === tab.key
//                   ? "2px solid #00e676"
//                   : "2px solid transparent",
//               fontSize: 11,
//               fontWeight: 600,
//               letterSpacing: 0.5,
//               fontFamily: "inherit",
//               whiteSpace: "nowrap",
//               transition: "all 0.15s",
//             }}
//             onMouseEnter={(e) => {
//               if (selectedTab !== tab.key) e.currentTarget.style.color = "#d4d4d8";
//             }}
//             onMouseLeave={(e) => {
//               if (selectedTab !== tab.key) e.currentTarget.style.color = "#6b7280";
//             }}
//           >
//             <tab.icon />
//             {tab.label}
//           </button>
//         ))}
//       </div>

//       {/* Tab content */}
//       <div style={{ flex: 1, overflow: "auto" }}>
//         {selectedTab === "info" && <InfoTab device={device} customer={customer} />}
//         {selectedTab === "edit" && <EditTab device={device} customers={customers} onSaved={(updatedDevice) => {
//           onDeviceUpdated?.(updatedDevice);
//         }} 
//         onDeleted={() => {
//           onClose(); // close the detail panel
//           // Parent should refresh device list
//           onDeviceDeleted?.();
//         }}
//         />}
//         {selectedTab === "telemetry" && <TelemetryTab telemetry={telemetry} lastUpdate={lastUpdate} device={device} customerType={customerType}/>}
//         {selectedTab === "graphs" && <TelemetryGraphTab device={device} />}
//         {selectedTab === "analytics" && <AnalyticsTab device={device} />}
//         {selectedTab === "commands" && (
//           <CommandsTab device={device} /> 
//         )}
//         {selectedTab === "config" && (
//           <TeltonikaConfigurator device={device} /> 
//         )}
//         {selectedTab === "map" && <MapTab device={device} />}
//         {selectedTab === "logs" && <LogsTab device={device} />}
//         {selectedTab === "settings" && <SettingsTab device={device} />}
//       </div>
//     </div>
//   );
// }
"use client";

import React, { useState } from "react";
import { Device, DeviceTab, Customer, Command } from "@/types";
import { Icons } from "@/components/ui/Icons";
import { InfoTab } from "../device-detail/InfoTab";
import { EditTab } from "../device-detail/EditTab";
import { TelemetryTab } from "../device-detail/TelemetryTab";
import { TelemetryGraphTab } from "../device-detail/TelemetryGraphTab";
import { CommandsTab } from "../device-detail/CommandsTab";
import { LogsTab } from "../device-detail/LogsTab";
import { SettingsTab } from "../device-detail/SettingsTab";
import { timeAgo } from "@/lib/utils";
import { MapTab } from "../device-detail/MapTab";
import { AnalyticsTab } from "../device-detail/AnalyticsTab";
import { TeltonikaConfigurator } from "../device-detail/TeltonikaConfigurator";
import { getAllowedTabs } from "@/lib/tab-permissions";
import { useIsMobile } from "@/hooks/useIsMobile";

interface DeviceDetailProps {
  device: Device;
  onClose: () => void;
  customers: Customer[];
  telemetry: any[];
  commands: Command[];
  lastUpdate?: string;
  onSendCommand: (command: string) => void;
  onDeviceDeleted: () => void;
  onDeviceUpdated: (device: Device) => void;
  customerType?: string;
}

export function DeviceDetail({
  device,
  onClose,
  customers,
  telemetry,
  commands,
  lastUpdate,
  onSendCommand,
  onDeviceDeleted,
  onDeviceUpdated,
  customerType,
}: DeviceDetailProps) {
  const [selectedTab, setSelectedTab] = useState<DeviceTab>("telemetry");
  const isMobile = useIsMobile();

  const customer = customers.find((c) => c.id === device.customer_id);
  const isOnline = device.connection_status === "online";

  const tabs = [
    { key: "info" as DeviceTab, label: "INFO", icon: Icons.Info },
    { key: "edit" as DeviceTab, label: "EDIT", icon: Icons.Edit },
    { key: "telemetry" as DeviceTab, label: "TELEMETRY", icon: Icons.Telemetry },
    { key: "graphs" as DeviceTab, label: "GRAPHS", icon: Icons.TrendingUp },
    { key: "analytics" as DeviceTab, label: "ANALYTICS", icon: Icons.TrendingUp },
    { key: "commands" as DeviceTab, label: "COMMANDS", icon: Icons.Commands },
    { key: "config" as DeviceTab, label: "CONFIG", icon: Icons.Commands },
    { key: "logs" as DeviceTab, label: "LOGS & MESSAGES", icon: Icons.Logs },
    { key: "settings" as DeviceTab, label: "SETTINGS", icon: Icons.Settings },
    { key: "map" as DeviceTab, label: "MAP", icon: Icons.MapPin },
  ];

  const visibleTabs = customerType
    ? tabs.filter((tab) => getAllowedTabs(customerType).includes(tab.key))
    : tabs;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* ── Device Header ── */}
      {isMobile ? (
        /* ── MOBILE HEADER: compact card ── */
        <div
          style={{
            background: "#242424",
            borderBottom: "1px solid #333",
            borderLeft: `4px solid ${isOnline ? "#00c853" : "#525252"}`,
            padding: "12px 14px",
            flexShrink: 0,
          }}
        >
          {/* Row 1: back + status dot + name */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <button
              onClick={onClose}
              style={{
                background: "#333",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                padding: 6,
                display: "flex",
                borderRadius: 6,
                flexShrink: 0,
              }}
            >
              <Icons.Close />
            </button>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: isOnline ? "#00c853" : "#525252",
                boxShadow: isOnline ? "0 0 8px rgba(0,200,83,0.5)" : "none",
                flexShrink: 0,
              }}
            />
            <div
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: "#f1f5f9",
                flex: 1,
                lineHeight: 1.3,
                // Allow wrapping instead of truncating — names are important
                wordBreak: "break-word",
              }}
            >
              {device.device_name}
            </div>
          </div>

          {/* Row 2: IMEI */}
          <div
            style={{
              fontSize: 11,
              color: "#6b7280",
              fontFamily: "monospace",
              marginLeft: 52, // align under the name (button 32 + gap 10 + dot 10)
              marginBottom: 6,
            }}
          >
            {device.imei}
          </div>

          {/* Row 3: type badge + last seen */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginLeft: 52,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#00e676",
                background: "rgba(0,230,118,0.1)",
                border: "1px solid rgba(0,230,118,0.2)",
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              {device.manufacturer} {device.device_type}
            </span>
            <span style={{ fontSize: 10, color: "#6b7280" }}>
              ⏱ {timeAgo(device.last_location_time)}
            </span>
          </div>
        </div>
      ) : (
        /* ── DESKTOP HEADER: horizontal layout ── */
        <div
          style={{
            background: "#242424",
            borderBottom: "1px solid #333",
            borderLeft: `4px solid ${isOnline ? "#00c853" : "#525252"}`,
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: 4,
              display: "flex",
            }}
          >
            <Icons.Close />
          </button>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: "#2a2a2a",
              border: "1px solid #3a3a3a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icons.Devices />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>
              {device.device_name}
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", fontFamily: "monospace" }}>
              ▫ {device.imei}
            </div>
          </div>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: isOnline ? "#00c853" : "#424242",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: isOnline ? "0 0 12px rgba(0, 200, 83, 0.4)" : "none",
            }}
          >
            <Icons.Power />
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#00e676" }}>
              {device.manufacturer} {device.device_type}
            </div>
            <div style={{ fontSize: 10, color: "#6b7280" }}>
              ⏱ {timeAgo(device.last_location_time)} · FW {device.firmware_version}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              fontSize: 11,
              color: "#525252",
              borderLeft: "1px solid #333",
              paddingLeft: 16,
              marginLeft: 8,
            }}
          >
            <span>▣ 0</span>
            <span>⚡ 0</span>
            <span>⚙ 0</span>
            <span>⊞ 0</span>
          </div>
        </div>
      )}

      {/* ── Tab Bar — horizontally scrollable ── */}
      <div
        style={{
          display: "flex",
          background: "#1e1e1e",
          borderBottom: "1px solid #333",
          overflowX: "auto",
          overflowY: "hidden",
          flexShrink: 0,
          WebkitOverflowScrolling: "touch" as any,
          // Hide scrollbar but keep scrollable
          scrollbarWidth: "none" as any,
          msOverflowStyle: "none" as any,
        }}
      >
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedTab(tab.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 4 : 6,
              padding: isMobile ? "10px 12px" : "10px 18px",
              border: "none",
              cursor: "pointer",
              background: selectedTab === tab.key ? "#2a2a2a" : "transparent",
              color: selectedTab === tab.key ? "#f1f5f9" : "#6b7280",
              borderBottom:
                selectedTab === tab.key
                  ? "2px solid #00e676"
                  : "2px solid transparent",
              fontSize: isMobile ? 10 : 11,
              fontWeight: 600,
              letterSpacing: 0.5,
              fontFamily: "inherit",
              whiteSpace: "nowrap",
              flexShrink: 0,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              if (selectedTab !== tab.key)
                e.currentTarget.style.color = "#d4d4d8";
            }}
            onMouseLeave={(e) => {
              if (selectedTab !== tab.key)
                e.currentTarget.style.color = "#6b7280";
            }}
          >
            {/* Hide tab icons on mobile to save space */}
            {!isMobile && <tab.icon />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div style={{ flex: 1, overflow: "auto", WebkitOverflowScrolling: "touch" as any }}>
        {selectedTab === "info" && (
          <InfoTab device={device} customer={customer} />
        )}
        {selectedTab === "edit" && (
          <EditTab
            device={device}
            customers={customers}
            onSaved={(updatedDevice) => {
              onDeviceUpdated?.(updatedDevice);
            }}
            onDeleted={() => {
              onClose();
              onDeviceDeleted?.();
            }}
          />
        )}
        {selectedTab === "telemetry" && (
          <TelemetryTab
            telemetry={telemetry}
            lastUpdate={lastUpdate}
            device={device}
            customerType={customerType}
          />
        )}
        {selectedTab === "graphs" && <TelemetryGraphTab device={device} />}
        {selectedTab === "analytics" && <AnalyticsTab device={device} />}
        {selectedTab === "commands" && <CommandsTab device={device} />}
        {selectedTab === "config" && <TeltonikaConfigurator device={device} />}
        {selectedTab === "map" && <MapTab device={device} />}
        {selectedTab === "logs" && <LogsTab device={device} />}
        {selectedTab === "settings" && <SettingsTab device={device} />}
      </div>

      {/* Hide scrollbar via inline style tag */}
      <style>{`
        div::-webkit-scrollbar { height: 0; width: 0; }
      `}</style>
    </div>
  );
}