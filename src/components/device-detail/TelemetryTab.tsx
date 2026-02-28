// "use client";

// import React, { useState } from "react";
// import { TelemetryParameter } from "@/types";
// import { Icons } from "@/components/ui/Icons";
// import { THEME } from "@/lib/theme";
// import { timeAgo, formatTimestamp } from "@/lib/utils";

// interface TelemetryTabProps {
//   telemetry: TelemetryParameter[];
//   lastUpdate?: string; // ISO timestamp string from database
// }

// export function TelemetryTab({ telemetry, lastUpdate }: TelemetryTabProps) {
//   const [filter, setFilter] = useState<"all" | "system" | "sensor">("all");
//   const [searchQuery, setSearchQuery] = useState("");

//   // Group telemetry by category
//   const systemParams = telemetry.filter((p) => p.type === "system");
//   const sensorParams = telemetry.filter((p) => p.type === "sensor");

//   // Filter based on selection
//   let filteredParams = telemetry;
//   if (filter === "system") filteredParams = systemParams;
//   if (filter === "sensor") filteredParams = sensorParams;

//   // Search filter
//   if (searchQuery) {
//     filteredParams = filteredParams.filter((p) =>
//       p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       p.value.toLowerCase().includes(searchQuery.toLowerCase())
//     );
//   }

//   // Group sensors by category
//   const groupedSensors = {
//     position: sensorParams.filter((p) => p.name.startsWith("position.")),
//     gnss: sensorParams.filter((p) => p.name.startsWith("gnss.")),
//     battery: sensorParams.filter((p) => p.name.includes("battery") || p.name.includes("voltage")),
//     io: sensorParams.filter((p) => p.name.startsWith("io.") || p.name.startsWith("ain.") || p.name.startsWith("din.")),
//     engine: sensorParams.filter((p) => p.name.includes("engine") || p.name.includes("ignition")),
//     other: sensorParams.filter((p) =>
//       !p.name.startsWith("position.") &&
//       !p.name.startsWith("gnss.") &&
//       !p.name.includes("battery") &&
//       !p.name.includes("voltage") &&
//       !p.name.startsWith("io.") &&
//       !p.name.startsWith("ain.") &&
//       !p.name.startsWith("din.") &&
//       !p.name.includes("engine") &&
//       !p.name.includes("ignition")
//     ),
//   };

//   // Use existing utility functions for timestamp formatting
//   const relativeTime = lastUpdate ? timeAgo(lastUpdate) : "Never";
//   const fullTimestamp = lastUpdate ? formatTimestamp(lastUpdate) : "No data received";
//   const isoTimestamp = lastUpdate || "";

//   return (
//     <div style={{ padding: 24, height: "100%", overflow: "auto", background: THEME.background.secondary }}>
//       {/* Header with Last Update */}
//       <div style={{ marginBottom: 20 }}>
//         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
//           <div>
//             <div style={{ fontSize: 18, fontWeight: 700, color: THEME.text.primary, marginBottom: 4 }}>
//               Live Telemetry
//             </div>
//             <div style={{ fontSize: 13, color: THEME.text.secondary }}>
//               Real-time sensor data and system parameters
//             </div>
//           </div>
          
//           {/* Last Update Badge */}
//           {/* {lastUpdate && (
//             <div
//               style={{
//                 background: "white",
//                 border: `2px solid ${THEME.primary[500]}`,
//                 borderRadius: 10,
//                 padding: "10px 16px",
//                 boxShadow: THEME.shadow.sm,
//               }}
//               title={`Full timestamp: ${fullTimestamp}\nISO: ${isoTimestamp}`}
//             >
//               <div style={{ fontSize: 10, color: THEME.text.tertiary, marginBottom: 4, fontWeight: 600, textTransform: "uppercase" }}>
//                 Last Updated
//               </div>
//               <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//                 <span style={{ fontSize: 16 }}>🕐</span>
//                 <div>
//                   <div style={{ fontSize: 13, fontWeight: 700, color: THEME.primary[600] }}>
//                     {relativeTime}
//                   </div>
//                   <div style={{ fontSize: 10, color: THEME.text.tertiary, fontFamily: "JetBrains Mono, monospace" }}>
//                     {fullTimestamp}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )} */}
//         </div>
//       </div>

//       {/* Filters */}
//       <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
//         <button
//           onClick={() => setFilter("all")}
//           style={{
//             padding: "10px 18px",
//             background: filter === "all" ? THEME.primary[500] : "white",
//             color: filter === "all" ? "white" : THEME.text.secondary,
//             border: `2px solid ${filter === "all" ? THEME.primary[500] : THEME.border.light}`,
//             borderRadius: 10,
//             fontSize: 13,
//             fontWeight: 700,
//             cursor: "pointer",
//             transition: "all 0.2s",
//             boxShadow: filter === "all" ? THEME.shadow.md : THEME.shadow.sm,
//           }}
//         >
//           All ({telemetry.length})
//         </button>
//         <button
//           onClick={() => setFilter("system")}
//           style={{
//             padding: "10px 18px",
//             background: filter === "system" ? THEME.secondary[500] : "white",
//             color: filter === "system" ? "white" : THEME.text.secondary,
//             border: `2px solid ${filter === "system" ? THEME.secondary[500] : THEME.border.light}`,
//             borderRadius: 10,
//             fontSize: 13,
//             fontWeight: 700,
//             cursor: "pointer",
//             transition: "all 0.2s",
//             boxShadow: filter === "system" ? THEME.shadow.md : THEME.shadow.sm,
//           }}
//         >
//           System ({systemParams.length})
//         </button>
//         <button
//           onClick={() => setFilter("sensor")}
//           style={{
//             padding: "10px 18px",
//             background: filter === "sensor" ? THEME.accent[500] : "white",
//             color: filter === "sensor" ? "white" : THEME.text.secondary,
//             border: `2px solid ${filter === "sensor" ? THEME.accent[500] : THEME.border.light}`,
//             borderRadius: 10,
//             fontSize: 13,
//             fontWeight: 700,
//             cursor: "pointer",
//             transition: "all 0.2s",
//             boxShadow: filter === "sensor" ? THEME.shadow.md : THEME.shadow.sm,
//           }}
//         >
//           Sensors ({sensorParams.length})
//         </button>

//         {/* Search */}
//         <input
//           type="text"
//           placeholder="Search parameters..."
//           value={searchQuery}
//           onChange={(e) => setSearchQuery(e.target.value)}
//           style={{
//             flex: 1,
//             minWidth: 200,
//             padding: "10px 18px",
//             background: "white",
//             border: `2px solid ${THEME.border.light}`,
//             borderRadius: 10,
//             fontSize: 13,
//             color: THEME.text.primary,
//             outline: "none",
//             boxShadow: THEME.shadow.sm,
//           }}
//         />
//       </div>

//       {/* Grouped View */}
//       {filter === "all" || filter === "sensor" ? (
//         <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
//           {/* Position */}
//           {groupedSensors.position.length > 0 && (
//             <TelemetryGroup
//               icon="📍"
//               title="Position & Movement"
//               params={groupedSensors.position}
//               color={THEME.primary[500]}
//               bgColor={THEME.primary[50]}
//             />
//           )}

//           {/* GNSS */}
//           {groupedSensors.gnss.length > 0 && (
//             <TelemetryGroup
//               icon="🛰️"
//               title="GNSS & Satellites"
//               params={groupedSensors.gnss}
//               color={THEME.secondary[500]}
//               bgColor={THEME.secondary[50]}
//             />
//           )}

//           {/* Battery & Power */}
//           {groupedSensors.battery.length > 0 && (
//             <TelemetryGroup
//               icon="🔋"
//               title="Power & Battery"
//               params={groupedSensors.battery}
//               color={THEME.accent[600]}
//               bgColor={THEME.accent[50]}
//             />
//           )}

//           {/* Engine */}
//           {groupedSensors.engine.length > 0 && (
//             <TelemetryGroup
//               icon="🚗"
//               title="Engine & Ignition"
//               params={groupedSensors.engine}
//               color="#3b82f6"
//               bgColor="#eff6ff"
//             />
//           )}

//           {/* IO */}
//           {groupedSensors.io.length > 0 && (
//             <TelemetryGroup
//               icon="⚡"
//               title="Digital & Analog I/O"
//               params={groupedSensors.io}
//               color={THEME.primary[600]}
//               bgColor={THEME.primary[50]}
//             />
//           )}

//           {/* System */}
//           {(filter === "all" && systemParams.length > 0) && (
//             <TelemetryGroup
//               icon="⚙️"
//               title="System Information"
//               params={systemParams}
//               color={THEME.neutral[600]}
//               bgColor={THEME.neutral[100]}
//             />
//           )}

//           {/* Other */}
//           {groupedSensors.other.length > 0 && (
//             <TelemetryGroup
//               icon="📊"
//               title="Other Sensors"
//               params={groupedSensors.other}
//               color={THEME.neutral[500]}
//               bgColor={THEME.neutral[100]}
//             />
//           )}
//         </div>
//       ) : (
//         <TelemetryGroup
//           icon="⚙️"
//           title="System Parameters"
//           params={filteredParams}
//           color={THEME.secondary[500]}
//           bgColor={THEME.secondary[50]}
//         />
//       )}

//       {filteredParams.length === 0 && (
//         <div
//           style={{
//             padding: 60,
//             textAlign: "center",
//             color: THEME.text.tertiary,
//             fontSize: 14,
//             background: "white",
//             borderRadius: 12,
//             border: `2px dashed ${THEME.border.light}`,
//           }}
//         >
//           <div style={{ fontSize: 48, marginBottom: 12 }}>📡</div>
//           <div style={{ fontWeight: 600, marginBottom: 4 }}>No telemetry data available</div>
//           <div style={{ fontSize: 12 }}>Waiting for device to send data...</div>
//         </div>
//       )}
//     </div>
//   );
// }

// function TelemetryGroup({
//   icon,
//   title,
//   params,
//   color,
//   bgColor,
// }: {
//   icon: string;
//   title: string;
//   params: TelemetryParameter[];
//   color: string;
//   bgColor: string;
// }) {
//   const [isExpanded, setIsExpanded] = useState(true);

//   return (
//     <div
//       style={{
//         background: "white",
//         border: `2px solid ${THEME.border.light}`,
//         borderRadius: 12,
//         overflow: "hidden",
//         boxShadow: THEME.shadow.sm,
//         transition: "all 0.2s",
//       }}
//     >
//       {/* Group Header */}
//       <div
//         onClick={() => setIsExpanded(!isExpanded)}
//         style={{
//           padding: "14px 18px",
//           background: bgColor,
//           borderBottom: `3px solid ${color}`,
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "space-between",
//           cursor: "pointer",
//           transition: "all 0.2s",
//         }}
//         onMouseEnter={(e) => {
//           e.currentTarget.style.transform = "translateX(4px)";
//         }}
//         onMouseLeave={(e) => {
//           e.currentTarget.style.transform = "translateX(0)";
//         }}
//       >
//         <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
//           <span style={{ fontSize: 20 }}>{icon}</span>
//           <div style={{ fontSize: 15, fontWeight: 700, color: THEME.text.primary }}>
//             {title}
//           </div>
//           <div
//             style={{
//               fontSize: 12,
//               padding: "3px 10px",
//               borderRadius: 6,
//               background: "white",
//               color: color,
//               fontWeight: 700,
//               border: `2px solid ${color}`,
//             }}
//           >
//             {params.length}
//           </div>
//         </div>
//         <div
//           style={{
//             transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
//             transition: "transform 0.2s",
//             color: color,
//             fontWeight: "bold",
//             fontSize: 18,
//           }}
//         >
//           ▼
//         </div>
//       </div>

//       {/* Parameters Grid */}
//       {isExpanded && (
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
//             gap: 2,
//             background: THEME.border.light,
//             padding: 2,
//           }}
//         >
//           {params.map((param) => {
//             // Calculate time ago for this specific parameter
//             const paramTimeAgo = param.timestamp ? timeAgo(param.timestamp) : "Unknown";
//             const isStale = param.timestamp 
//               ? (Date.now() - new Date(param.timestamp).getTime()) > 60000 // Stale if > 1 minute old
//               : true;
            
//             return (
//               <div
//                 key={param.id}
//                 style={{
//                   padding: "14px 16px",
//                   background: "white",
//                   display: "flex",
//                   flexDirection: "column",
//                   gap: 8,
//                   borderRadius: 6,
//                   transition: "all 0.2s",
//                   borderLeft: isStale ? `3px solid #ef4444` : `3px solid ${color}`,
//                 }}
//                 onMouseEnter={(e) => {
//                   e.currentTarget.style.background = bgColor;
//                   e.currentTarget.style.transform = "scale(1.02)";
//                 }}
//                 onMouseLeave={(e) => {
//                   e.currentTarget.style.background = "white";
//                   e.currentTarget.style.transform = "scale(1)";
//                 }}
//                 title={param.timestamp ? formatTimestamp(param.timestamp) : "No timestamp"}
//               >
//                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
//                   <div style={{ flex: 1, minWidth: 0 }}>
//                     <div
//                       style={{
//                         fontSize: 11,
//                         color: THEME.text.tertiary,
//                         fontFamily: "JetBrains Mono, monospace",
//                         marginBottom: 4,
//                         overflow: "hidden",
//                         textOverflow: "ellipsis",
//                         whiteSpace: "nowrap",
//                         fontWeight: 500,
//                       }}
//                     >
//                       {param.name}
//                     </div>
//                     <div
//                       style={{
//                         fontSize: 15,
//                         fontWeight: 700,
//                         color: THEME.text.primary,
//                         fontFamily: "JetBrains Mono, monospace",
//                       }}
//                     >
//                       {param.value}
//                     </div>
//                   </div>
//                   <div
//                     style={{
//                       width: 8,
//                       height: 8,
//                       borderRadius: "50%",
//                       background: isStale ? "#ef4444" : color,
//                       flexShrink: 0,
//                       boxShadow: isStale ? `0 0 8px #ef4444` : `0 0 8px ${color}`,
//                       marginTop: 4,
//                     }}
//                     className={isStale ? "" : "animate-pulse"}
//                   />
//                 </div>
                
//                 {/* Timestamp for each parameter */}
//                 <div
//                   style={{
//                     display: "flex",
//                     alignItems: "center",
//                     gap: 6,
//                     paddingTop: 8,
//                     borderTop: `1px solid ${THEME.border.light}`,
//                   }}
//                 >
//                   <span style={{ fontSize: 10 }}>🕐</span>
//                   <div
//                     style={{
//                       fontSize: 10,
//                       color: isStale ? "#ef4444" : THEME.text.tertiary,
//                       fontWeight: 600,
//                       fontFamily: "JetBrains Mono, monospace",
//                     }}
//                   >
//                     {paramTimeAgo}
//                   </div>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// }
"use client";

import React, { useState } from "react";
import { TelemetryParameter } from "@/types";
import { THEME } from "@/lib/theme";
import { timeAgo, formatTimestamp } from "@/lib/utils";

interface TelemetryTabProps {
  telemetry: TelemetryParameter[];
  lastUpdate?: string;
}

export function TelemetryTab({ telemetry, lastUpdate }: TelemetryTabProps) {
  const [filter, setFilter] = useState<"all" | "system" | "sensor">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const systemParams = telemetry.filter((p) => p.type === "system" || p.category === "system");
  const sensorParams = telemetry.filter((p) => p.type === "sensor" || (p.type !== "system" && p.category !== "system"));

  let filteredParams = telemetry;
  if (filter === "system") filteredParams = systemParams;
  if (filter === "sensor") filteredParams = sensorParams;

  if (searchQuery) {
    filteredParams = filteredParams.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(p.value).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // ── Grouped by category ───────────────────────────────────────────────────
  const grouped = {
    position: sensorParams.filter((p) =>
      p.name.startsWith("position.") || p.category === "gps"
    ),
    can: sensorParams.filter((p) =>
      p.category === "can" || p.name.startsWith("can.")
    ),
    power: sensorParams.filter((p) =>
      p.category === "power" ||
      p.name.includes("battery") ||
      p.name.includes("voltage") ||
      p.name.includes("external.power")
    ),
    engine: sensorParams.filter((p) =>
      (p.category !== "can") && (
        p.name.includes("engine") ||
        p.name.includes("ignition") ||
        p.name.includes("movement")
      )
    ),
    io: sensorParams.filter((p) =>
      p.category === "digital" ||
      p.category === "analog" ||
      p.name.startsWith("io.") ||
      p.name.startsWith("ain.") ||
      p.name.startsWith("din.") ||
      p.name.startsWith("dout.")
    ),
    temperature: sensorParams.filter((p) =>
      p.category === "temperature"
    ),
    fuel: sensorParams.filter((p) =>
      p.category === "fuel" && !p.name.startsWith("can.")
    ),
    vehicle: sensorParams.filter((p) =>
      p.category === "vehicle" || p.category === "motion"
    ),
    other: sensorParams.filter((p) =>
      p.category !== "gps" &&
      p.category !== "can" &&
      p.category !== "power" &&
      p.category !== "digital" &&
      p.category !== "analog" &&
      p.category !== "temperature" &&
      p.category !== "fuel" &&
      p.category !== "vehicle" &&
      p.category !== "motion" &&
      !p.name.includes("engine") &&
      !p.name.includes("ignition") &&
      !p.name.includes("movement") &&
      !p.name.includes("battery") &&
      !p.name.includes("voltage") &&
      !p.name.includes("external.power")
    ),
  };

  return (
    <div style={{ padding: 24, height: "100%", overflow: "auto", background: THEME.background.secondary }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: THEME.text.primary, marginBottom: 4 }}>
          Live Telemetry
        </div>
        <div style={{ fontSize: 13, color: THEME.text.secondary }}>
          Real-time sensor data and system parameters
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {(["all", "system", "sensor"] as const).map((f) => {
          const count = f === "all" ? telemetry.length : f === "system" ? systemParams.length : sensorParams.length;
          const label = f.charAt(0).toUpperCase() + f.slice(1);
          const activeColor = f === "all" ? THEME.primary[500] : f === "system" ? THEME.secondary[500] : THEME.accent[500];
          const isActive = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "10px 18px",
                background: isActive ? activeColor : "white",
                color: isActive ? "white" : THEME.text.secondary,
                border: `2px solid ${isActive ? activeColor : THEME.border.light}`,
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: isActive ? THEME.shadow.md : THEME.shadow.sm,
              }}
            >
              {label} ({count})
            </button>
          );
        })}

        <input
          type="text"
          placeholder="Search parameters..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            minWidth: 200,
            padding: "10px 18px",
            background: "white",
            border: `2px solid ${THEME.border.light}`,
            borderRadius: 10,
            fontSize: 13,
            color: THEME.text.primary,
            outline: "none",
            boxShadow: THEME.shadow.sm,
          }}
        />
      </div>

      {/* Search results — flat list */}
      {searchQuery ? (
        <TelemetryGroup
          icon="🔍"
          title={`Search: "${searchQuery}"`}
          params={filteredParams}
          color={THEME.primary[500]}
          bgColor={THEME.primary[50]}
        />
      ) : filter === "system" ? (
        <TelemetryGroup
          icon="⚙️"
          title="System Parameters"
          params={systemParams}
          color={THEME.neutral[600]}
          bgColor={THEME.neutral[100]}
        />
      ) : (
        // Grouped view for "all" and "sensor"
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {grouped.position.length > 0 && (
            <TelemetryGroup icon="📍" title="Position & GPS" params={grouped.position}
              color={THEME.primary[500]} bgColor={THEME.primary[50]} />
          )}
          {grouped.can.length > 0 && (
            <TelemetryGroup icon="🚛" title="CAN Bus Data" params={grouped.can}
              color="#7c3aed" bgColor="#f5f3ff" />
          )}
          {grouped.power.length > 0 && (
            <TelemetryGroup icon="🔋" title="Power & Battery" params={grouped.power}
              color={THEME.accent[600]} bgColor={THEME.accent[50]} />
          )}
          {grouped.engine.length > 0 && (
            <TelemetryGroup icon="🚗" title="Engine & Ignition" params={grouped.engine}
              color="#3b82f6" bgColor="#eff6ff" />
          )}
          {grouped.fuel.length > 0 && (
            <TelemetryGroup icon="⛽" title="Fuel" params={grouped.fuel}
              color="#f59e0b" bgColor="#fffbeb" />
          )}
          {grouped.temperature.length > 0 && (
            <TelemetryGroup icon="🌡️" title="Temperature" params={grouped.temperature}
              color="#ef4444" bgColor="#fef2f2" />
          )}
          {grouped.vehicle.length > 0 && (
            <TelemetryGroup icon="🛣️" title="Vehicle & Motion" params={grouped.vehicle}
              color="#10b981" bgColor="#f0fdf4" />
          )}
          {grouped.io.length > 0 && (
            <TelemetryGroup icon="⚡" title="Digital & Analog I/O" params={grouped.io}
              color={THEME.primary[600]} bgColor={THEME.primary[50]} />
          )}
          {filter === "all" && systemParams.length > 0 && (
            <TelemetryGroup icon="⚙️" title="System Information" params={systemParams}
              color={THEME.neutral[600]} bgColor={THEME.neutral[100]} />
          )}
          {grouped.other.length > 0 && (
            <TelemetryGroup icon="📊" title="Other" params={grouped.other}
              color={THEME.neutral[500]} bgColor={THEME.neutral[100]} />
          )}
        </div>
      )}

      {filteredParams.length === 0 && !searchQuery && (
        <div style={{
          padding: 60, textAlign: "center", color: THEME.text.tertiary,
          fontSize: 14, background: "white", borderRadius: 12,
          border: `2px dashed ${THEME.border.light}`,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📡</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No telemetry data available</div>
          <div style={{ fontSize: 12 }}>Waiting for device to send data...</div>
        </div>
      )}
    </div>
  );
}

function TelemetryGroup({
  icon, title, params, color, bgColor,
}: {
  icon: string;
  title: string;
  params: TelemetryParameter[];
  color: string;
  bgColor: string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div style={{
      background: "white",
      border: `2px solid ${THEME.border.light}`,
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: THEME.shadow.sm,
    }}>
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: "14px 18px",
          background: bgColor,
          borderBottom: `3px solid ${color}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <div style={{ fontSize: 15, fontWeight: 700, color: THEME.text.primary }}>{title}</div>
          <div style={{
            fontSize: 12, padding: "3px 10px", borderRadius: 6,
            background: "white", color, fontWeight: 700, border: `2px solid ${color}`,
          }}>
            {params.length}
          </div>
        </div>
        <div style={{
          transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s", color, fontWeight: "bold", fontSize: 18,
        }}>▼</div>
      </div>

      {isExpanded && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 2,
          background: THEME.border.light,
          padding: 2,
        }}>
          {params.map((param) => {
            const paramTimeAgo = param.timestamp ? timeAgo(param.timestamp) : "Unknown";
            const isStale = param.timestamp
              ? (Date.now() - new Date(param.timestamp).getTime()) > 60000
              : true;

            // Format value: show unit inline, handle booleans nicely
            const displayValue = (() => {
              const v = String(param.value);
              if (v === "true")  return "✅ ON";
              if (v === "false") return "❌ OFF";
              if (v === "1" && (param.name.includes("ignition") || param.name.includes("din") || param.name.includes("dout"))) return "✅ ON";
              if (v === "0" && (param.name.includes("ignition") || param.name.includes("din") || param.name.includes("dout"))) return "❌ OFF";
              return param.unit ? `${v} ${param.unit}` : v;
            })();

            return (
              <div
                key={param.id ?? param.name}
                style={{
                  padding: "14px 16px",
                  background: "white",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  borderRadius: 6,
                  transition: "all 0.15s",
                  borderLeft: `3px solid ${isStale ? "#ef4444" : color}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = bgColor;
                  e.currentTarget.style.transform = "scale(1.02)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "white";
                  e.currentTarget.style.transform = "scale(1)";
                }}
                title={param.timestamp ? formatTimestamp(param.timestamp) : "No timestamp"}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 11,
                      color: THEME.text.tertiary,
                      fontFamily: "JetBrains Mono, monospace",
                      marginBottom: 4,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontWeight: 500,
                    }}>
                      {param.name}
                    </div>
                    <div style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: THEME.text.primary,
                      fontFamily: "JetBrains Mono, monospace",
                    }}>
                      {displayValue}
                    </div>
                    {/* Show raw value if multiplier was applied */}
                    {param.raw_value && (
                      <div style={{ fontSize: 9, color: THEME.text.tertiary, marginTop: 2 }}>
                        raw: {param.raw_value}
                      </div>
                    )}
                  </div>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: isStale ? "#ef4444" : color,
                    flexShrink: 0,
                    boxShadow: `0 0 8px ${isStale ? "#ef4444" : color}`,
                    marginTop: 4,
                  }} />
                </div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  paddingTop: 8, borderTop: `1px solid ${THEME.border.light}`,
                }}>
                  <span style={{ fontSize: 10 }}>🕐</span>
                  <div style={{
                    fontSize: 10,
                    color: isStale ? "#ef4444" : THEME.text.tertiary,
                    fontWeight: 600,
                    fontFamily: "JetBrains Mono, monospace",
                  }}>
                    {paramTimeAgo}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}