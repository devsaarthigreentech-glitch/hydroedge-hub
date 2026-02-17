// "use client";

// import React, { useState } from "react";
// import { TelemetryParameter } from "@/types";
// import { Icons } from "@/components/ui/Icons";
// import { THEME } from "@/lib/theme";

// interface TelemetryTabProps {
//   telemetry: TelemetryParameter[];
// }

// export function TelemetryTab({ telemetry }: TelemetryTabProps) {
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

//   return (
//     <div style={{ padding: 24, height: "100%", overflow: "auto" }}>
//       {/* Header */}
//       <div style={{ marginBottom: 20 }}>
//         <div style={{ fontSize: 18, fontWeight: 700, color: THEME.text.primary, marginBottom: 8 }}>
//           Live Telemetry
//         </div>
//         <div style={{ fontSize: 13, color: THEME.text.secondary }}>
//           Real-time sensor data and system parameters
//         </div>
//       </div>

//       {/* Filters */}
//       <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
//         <button
//           onClick={() => setFilter("all")}
//           style={{
//             padding: "8px 16px",
//             background: filter === "all" ? THEME.primary[500] : THEME.background.secondary,
//             color: filter === "all" ? "white" : THEME.text.secondary,
//             border: `1px solid ${filter === "all" ? THEME.primary[500] : THEME.border.light}`,
//             borderRadius: 8,
//             fontSize: 12,
//             fontWeight: 600,
//             cursor: "pointer",
//             transition: "all 0.2s",
//           }}
//         >
//           All ({telemetry.length})
//         </button>
//         <button
//           onClick={() => setFilter("system")}
//           style={{
//             padding: "8px 16px",
//             background: filter === "system" ? THEME.secondary[500] : THEME.background.secondary,
//             color: filter === "system" ? "white" : THEME.text.secondary,
//             border: `1px solid ${filter === "system" ? THEME.secondary[500] : THEME.border.light}`,
//             borderRadius: 8,
//             fontSize: 12,
//             fontWeight: 600,
//             cursor: "pointer",
//             transition: "all 0.2s",
//           }}
//         >
//           System ({systemParams.length})
//         </button>
//         <button
//           onClick={() => setFilter("sensor")}
//           style={{
//             padding: "8px 16px",
//             background: filter === "sensor" ? THEME.accent[500] : THEME.background.secondary,
//             color: filter === "sensor" ? "white" : THEME.text.secondary,
//             border: `1px solid ${filter === "sensor" ? THEME.accent[500] : THEME.border.light}`,
//             borderRadius: 8,
//             fontSize: 12,
//             fontWeight: 600,
//             cursor: "pointer",
//             transition: "all 0.2s",
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
//             padding: "8px 16px",
//             background: THEME.background.card,
//             border: `1px solid ${THEME.border.light}`,
//             borderRadius: 8,
//             fontSize: 12,
//             color: THEME.text.primary,
//             outline: "none",
//           }}
//         />
//       </div>

//       {/* Grouped View */}
//       {filter === "all" || filter === "sensor" ? (
//         <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
//           {/* Position */}
//           {groupedSensors.position.length > 0 && (
//             <TelemetryGroup
//               title="📍 Position & Movement"
//               params={groupedSensors.position}
//               color={THEME.primary[500]}
//             />
//           )}

//           {/* GNSS */}
//           {groupedSensors.gnss.length > 0 && (
//             <TelemetryGroup
//               title="🛰️ GNSS & Satellites"
//               params={groupedSensors.gnss}
//               color={THEME.secondary[500]}
//             />
//           )}

//           {/* Battery & Power */}
//           {groupedSensors.battery.length > 0 && (
//             <TelemetryGroup
//               title="🔋 Power & Battery"
//               params={groupedSensors.battery}
//               color={THEME.accent[600]}
//             />
//           )}

//           {/* Engine */}
//           {groupedSensors.engine.length > 0 && (
//             <TelemetryGroup
//               title="🚗 Engine & Ignition"
//               params={groupedSensors.engine}
//               color={THEME.status.info}
//             />
//           )}

//           {/* IO */}
//           {groupedSensors.io.length > 0 && (
//             <TelemetryGroup
//               title="⚡ Digital & Analog I/O"
//               params={groupedSensors.io}
//               color={THEME.primary[600]}
//             />
//           )}

//           {/* System */}
//           {(filter === "all" && systemParams.length > 0) && (
//             <TelemetryGroup
//               title="⚙️ System Information"
//               params={systemParams}
//               color={THEME.neutral[600]}
//             />
//           )}

//           {/* Other */}
//           {groupedSensors.other.length > 0 && (
//             <TelemetryGroup
//               title="📊 Other Sensors"
//               params={groupedSensors.other}
//               color={THEME.neutral[500]}
//             />
//           )}
//         </div>
//       ) : (
//         <TelemetryGroup
//           title="System Parameters"
//           params={filteredParams}
//           color={THEME.secondary[500]}
//         />
//       )}

//       {filteredParams.length === 0 && (
//         <div
//           style={{
//             padding: 40,
//             textAlign: "center",
//             color: THEME.text.tertiary,
//             fontSize: 14,
//           }}
//         >
//           No telemetry data available
//         </div>
//       )}
//     </div>
//   );
// }

// function TelemetryGroup({
//   title,
//   params,
//   color,
// }: {
//   title: string;
//   params: TelemetryParameter[];
//   color: string;
// }) {
//   const [isExpanded, setIsExpanded] = useState(true);

//   return (
//     <div
//       style={{
//         background: THEME.background.card,
//         border: `1px solid ${THEME.border.light}`,
//         borderRadius: 12,
//         overflow: "hidden",
//         boxShadow: THEME.shadow.sm,
//       }}
//     >
//       {/* Group Header */}
//       <div
//         onClick={() => setIsExpanded(!isExpanded)}
//         style={{
//           padding: "12px 16px",
//           background: THEME.background.secondary,
//           borderBottom: `2px solid ${color}`,
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "space-between",
//           cursor: "pointer",
//           transition: "all 0.2s",
//         }}
//         onMouseEnter={(e) => {
//           e.currentTarget.style.background = THEME.background.hover;
//         }}
//         onMouseLeave={(e) => {
//           e.currentTarget.style.background = THEME.background.secondary;
//         }}
//       >
//         <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//           <div style={{ fontSize: 14, fontWeight: 700, color: THEME.text.primary }}>
//             {title}
//           </div>
//           <div
//             style={{
//               fontSize: 11,
//               padding: "2px 8px",
//               borderRadius: 4,
//               background: THEME.neutral[200],
//               color: THEME.text.secondary,
//               fontWeight: 600,
//             }}
//           >
//             {params.length}
//           </div>
//         </div>
//         <div
//           style={{
//             transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
//             transition: "transform 0.2s",
//             color: THEME.text.tertiary,
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
//             gap: 1,
//             background: THEME.border.light,
//           }}
//         >
//           {params.map((param) => (
//             <div
//               key={param.id}
//               style={{
//                 padding: "12px 16px",
//                 background: THEME.background.card,
//                 display: "flex",
//                 justifyContent: "space-between",
//                 alignItems: "center",
//                 gap: 12,
//               }}
//             >
//               <div style={{ flex: 1, minWidth: 0 }}>
//                 <div
//                   style={{
//                     fontSize: 11,
//                     color: THEME.text.tertiary,
//                     fontFamily: "JetBrains Mono, monospace",
//                     marginBottom: 4,
//                     overflow: "hidden",
//                     textOverflow: "ellipsis",
//                     whiteSpace: "nowrap",
//                   }}
//                 >
//                   {param.name}
//                 </div>
//                 <div
//                   style={{
//                     fontSize: 14,
//                     fontWeight: 600,
//                     color: THEME.text.primary,
//                     fontFamily: "JetBrains Mono, monospace",
//                   }}
//                 >
//                   {param.value}
//                 </div>
//               </div>
//               <div
//                 style={{
//                   width: 6,
//                   height: 6,
//                   borderRadius: "50%",
//                   background: color,
//                   flexShrink: 0,
//                 }}
//                 className="animate-pulse"
//               />
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }
"use client";

import React, { useState } from "react";
import { TelemetryParameter } from "@/types";
import { Icons } from "@/components/ui/Icons";
import { THEME } from "@/lib/theme";

interface TelemetryTabProps {
  telemetry: TelemetryParameter[];
}

export function TelemetryTab({ telemetry }: TelemetryTabProps) {
  const [filter, setFilter] = useState<"all" | "system" | "sensor">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Group telemetry by category
  const systemParams = telemetry.filter((p) => p.type === "system");
  const sensorParams = telemetry.filter((p) => p.type === "sensor");

  // Filter based on selection
  let filteredParams = telemetry;
  if (filter === "system") filteredParams = systemParams;
  if (filter === "sensor") filteredParams = sensorParams;

  // Search filter
  if (searchQuery) {
    filteredParams = filteredParams.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.value.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // Group sensors by category
  const groupedSensors = {
    position: sensorParams.filter((p) => p.name.startsWith("position.")),
    gnss: sensorParams.filter((p) => p.name.startsWith("gnss.")),
    battery: sensorParams.filter((p) => p.name.includes("battery") || p.name.includes("voltage")),
    io: sensorParams.filter((p) => p.name.startsWith("io.") || p.name.startsWith("ain.") || p.name.startsWith("din.")),
    engine: sensorParams.filter((p) => p.name.includes("engine") || p.name.includes("ignition")),
    other: sensorParams.filter((p) =>
      !p.name.startsWith("position.") &&
      !p.name.startsWith("gnss.") &&
      !p.name.includes("battery") &&
      !p.name.includes("voltage") &&
      !p.name.startsWith("io.") &&
      !p.name.startsWith("ain.") &&
      !p.name.startsWith("din.") &&
      !p.name.includes("engine") &&
      !p.name.includes("ignition")
    ),
  };

  return (
    <div style={{ padding: 24, height: "100%", overflow: "auto", background: THEME.background.secondary }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: THEME.text.primary, marginBottom: 8 }}>
          Live Telemetry
        </div>
        <div style={{ fontSize: 13, color: THEME.text.secondary }}>
          Real-time sensor data and system parameters
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <button
          onClick={() => setFilter("all")}
          style={{
            padding: "10px 18px",
            background: filter === "all" ? THEME.primary[500] : "white",
            color: filter === "all" ? "white" : THEME.text.secondary,
            border: `2px solid ${filter === "all" ? THEME.primary[500] : THEME.border.light}`,
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: filter === "all" ? THEME.shadow.md : THEME.shadow.sm,
          }}
        >
          All ({telemetry.length})
        </button>
        <button
          onClick={() => setFilter("system")}
          style={{
            padding: "10px 18px",
            background: filter === "system" ? THEME.secondary[500] : "white",
            color: filter === "system" ? "white" : THEME.text.secondary,
            border: `2px solid ${filter === "system" ? THEME.secondary[500] : THEME.border.light}`,
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: filter === "system" ? THEME.shadow.md : THEME.shadow.sm,
          }}
        >
          System ({systemParams.length})
        </button>
        <button
          onClick={() => setFilter("sensor")}
          style={{
            padding: "10px 18px",
            background: filter === "sensor" ? THEME.accent[500] : "white",
            color: filter === "sensor" ? "white" : THEME.text.secondary,
            border: `2px solid ${filter === "sensor" ? THEME.accent[500] : THEME.border.light}`,
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: filter === "sensor" ? THEME.shadow.md : THEME.shadow.sm,
          }}
        >
          Sensors ({sensorParams.length})
        </button>

        {/* Search */}
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

      {/* Grouped View */}
      {filter === "all" || filter === "sensor" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Position */}
          {groupedSensors.position.length > 0 && (
            <TelemetryGroup
              icon="📍"
              title="Position & Movement"
              params={groupedSensors.position}
              color={THEME.primary[500]}
              bgColor={THEME.primary[50]}
            />
          )}

          {/* GNSS */}
          {groupedSensors.gnss.length > 0 && (
            <TelemetryGroup
              icon="🛰️"
              title="GNSS & Satellites"
              params={groupedSensors.gnss}
              color={THEME.secondary[500]}
              bgColor={THEME.secondary[50]}
            />
          )}

          {/* Battery & Power */}
          {groupedSensors.battery.length > 0 && (
            <TelemetryGroup
              icon="🔋"
              title="Power & Battery"
              params={groupedSensors.battery}
              color={THEME.accent[600]}
              bgColor={THEME.accent[50]}
            />
          )}

          {/* Engine */}
          {groupedSensors.engine.length > 0 && (
            <TelemetryGroup
              icon="🚗"
              title="Engine & Ignition"
              params={groupedSensors.engine}
              color="#3b82f6"
              bgColor="#eff6ff"
            />
          )}

          {/* IO */}
          {groupedSensors.io.length > 0 && (
            <TelemetryGroup
              icon="⚡"
              title="Digital & Analog I/O"
              params={groupedSensors.io}
              color={THEME.primary[600]}
              bgColor={THEME.primary[50]}
            />
          )}

          {/* System */}
          {(filter === "all" && systemParams.length > 0) && (
            <TelemetryGroup
              icon="⚙️"
              title="System Information"
              params={systemParams}
              color={THEME.neutral[600]}
              bgColor={THEME.neutral[100]}
            />
          )}

          {/* Other */}
          {groupedSensors.other.length > 0 && (
            <TelemetryGroup
              icon="📊"
              title="Other Sensors"
              params={groupedSensors.other}
              color={THEME.neutral[500]}
              bgColor={THEME.neutral[100]}
            />
          )}
        </div>
      ) : (
        <TelemetryGroup
          icon="⚙️"
          title="System Parameters"
          params={filteredParams}
          color={THEME.secondary[500]}
          bgColor={THEME.secondary[50]}
        />
      )}

      {filteredParams.length === 0 && (
        <div
          style={{
            padding: 60,
            textAlign: "center",
            color: THEME.text.tertiary,
            fontSize: 14,
            background: "white",
            borderRadius: 12,
            border: `2px dashed ${THEME.border.light}`,
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>📡</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No telemetry data available</div>
          <div style={{ fontSize: 12 }}>Waiting for device to send data...</div>
        </div>
      )}
    </div>
  );
}

function TelemetryGroup({
  icon,
  title,
  params,
  color,
  bgColor,
}: {
  icon: string;
  title: string;
  params: TelemetryParameter[];
  color: string;
  bgColor: string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div
      style={{
        background: "white",
        border: `2px solid ${THEME.border.light}`,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: THEME.shadow.sm,
        transition: "all 0.2s",
      }}
    >
      {/* Group Header */}
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
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateX(4px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateX(0)";
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <div style={{ fontSize: 15, fontWeight: 700, color: THEME.text.primary }}>
            {title}
          </div>
          <div
            style={{
              fontSize: 12,
              padding: "3px 10px",
              borderRadius: 6,
              background: "white",
              color: color,
              fontWeight: 700,
              border: `2px solid ${color}`,
            }}
          >
            {params.length}
          </div>
        </div>
        <div
          style={{
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            color: color,
            fontWeight: "bold",
            fontSize: 18,
          }}
        >
          ▼
        </div>
      </div>

      {/* Parameters Grid */}
      {isExpanded && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 2,
            background: THEME.border.light,
            padding: 2,
          }}
        >
          {params.map((param) => (
            <div
              key={param.id}
              style={{
                padding: "14px 16px",
                background: "white",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                borderRadius: 6,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = bgColor;
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "white";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: THEME.text.tertiary,
                    fontFamily: "JetBrains Mono, monospace",
                    marginBottom: 4,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontWeight: 500,
                  }}
                >
                  {param.name}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: THEME.text.primary,
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  {param.value}
                </div>
              </div>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: color,
                  flexShrink: 0,
                  boxShadow: `0 0 8px ${color}`,
                }}
                className="animate-pulse"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}