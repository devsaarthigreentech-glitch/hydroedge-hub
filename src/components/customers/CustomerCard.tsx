// "use client";

// import React from "react";
// import { Customer } from "@/types";
// import { Icons } from "@/components/ui/Icons";

// interface CustomerCardProps {
//   customer: Customer;
//   deviceCount: number;
//   onlineCount: number;
//   childCount: number;
//   onSelectCustomer: (customerId: string) => void;
// }

// export function CustomerCard({
//   customer,
//   deviceCount,
//   onlineCount,
//   childCount,
//   onSelectCustomer,
// }: CustomerCardProps) {
//   return (
//     <div
//       style={{
//         marginLeft: customer.hierarchy_level * 32,
//         background: "#242424",
//         borderRadius: 10,
//         border: "1px solid #333",
//         padding: "16px 20px",
//         marginBottom: 10,
//         borderLeft: `3px solid ${
//           customer.hierarchy_level === 0
//             ? "#7c3aed"
//             : customer.hierarchy_level === 1
//             ? "#00c853"
//             : "#fbbf24"
//         }`,
//         transition: "all 0.15s",
//         cursor: "pointer",
//       }}
//       onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#00e676")}
//       onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#333")}
//     >
//       <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
//         {/* Avatar */}
//         <div
//           style={{
//             width: 44,
//             height: 44,
//             borderRadius: 10,
//             background:
//               customer.hierarchy_level === 0
//                 ? "rgba(124, 58, 237, 0.2)"
//                 : "rgba(0, 200, 83, 0.1)",
//             border: `1px solid ${
//               customer.hierarchy_level === 0
//                 ? "rgba(124, 58, 237, 0.3)"
//                 : "rgba(0, 200, 83, 0.2)"
//             }`,
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             fontWeight: 800,
//             fontSize: 14,
//             color: customer.hierarchy_level === 0 ? "#c4b5fd" : "#4ade80",
//           }}
//         >
//           {customer.name.slice(0, 2).toUpperCase()}
//         </div>

//         {/* Info */}
//         <div style={{ flex: 1 }}>
//           <div
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: 8,
//               marginBottom: 3,
//             }}
//           >
//             <span style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>
//               {customer.name}
//             </span>
//             <span
//               style={{
//                 fontSize: 9,
//                 padding: "2px 8px",
//                 borderRadius: 3,
//                 background:
//                   customer.status === "active"
//                     ? "rgba(0, 200, 83, 0.15)"
//                     : "rgba(251, 191, 36, 0.15)",
//                 color: customer.status === "active" ? "#4ade80" : "#fbbf24",
//                 textTransform: "uppercase",
//                 fontWeight: 700,
//               }}
//             >
//               {customer.status}
//             </span>
//             <span
//               style={{
//                 fontSize: 9,
//                 padding: "2px 8px",
//                 borderRadius: 3,
//                 background: "rgba(156, 163, 175, 0.1)",
//                 color: "#9ca3af",
//                 textTransform: "uppercase",
//                 fontWeight: 600,
//               }}
//             >
//               {customer.customer_type}
//             </span>
//           </div>
//           <div style={{ fontSize: 11, color: "#6b7280" }}>
//             {customer.company_name} · {customer.city}, {customer.country}
//           </div>
//         </div>

//         {/* Metrics */}
//         <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
//           <div style={{ textAlign: "center" }}>
//             <div style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9" }}>
//               {deviceCount}
//             </div>
//             <div
//               style={{
//                 fontSize: 9,
//                 color: "#6b7280",
//                 textTransform: "uppercase",
//               }}
//             >
//               Devices
//             </div>
//           </div>
//           <div style={{ textAlign: "center" }}>
//             <div style={{ fontSize: 20, fontWeight: 800, color: "#4ade80" }}>
//               {onlineCount}
//             </div>
//             <div
//               style={{
//                 fontSize: 9,
//                 color: "#6b7280",
//                 textTransform: "uppercase",
//               }}
//             >
//               Online
//             </div>
//           </div>
//           {childCount > 0 && (
//             <div style={{ textAlign: "center" }}>
//               <div style={{ fontSize: 20, fontWeight: 800, color: "#c4b5fd" }}>
//                 {childCount}
//               </div>
//               <div
//                 style={{
//                   fontSize: 9,
//                   color: "#6b7280",
//                   textTransform: "uppercase",
//                 }}
//               >
//                 Sub-cust
//               </div>
//             </div>
//           )}
//           <div style={{ textAlign: "center" }}>
//             <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>
//               {deviceCount}/{customer.max_devices}
//             </div>
//             <div
//               style={{
//                 fontSize: 9,
//                 color: "#6b7280",
//                 textTransform: "uppercase",
//               }}
//             >
//               Limit
//             </div>
//             {/* Progress bar */}
//             <div
//               style={{
//                 width: 60,
//                 height: 3,
//                 background: "#333",
//                 borderRadius: 2,
//                 marginTop: 3,
//               }}
//             >
//               <div
//                 style={{
//                   width: `${Math.min(
//                     (deviceCount / customer.max_devices) * 100,
//                     100
//                   )}%`,
//                   height: "100%",
//                   borderRadius: 2,
//                   background:
//                     deviceCount / customer.max_devices > 0.8
//                       ? "#ef4444"
//                       : "#00c853",
//                 }}
//               />
//             </div>
//           </div>
//         </div>

//         {/* Access control button */}
//         <div style={{ display: "flex", gap: 6 }}>
//           <button
//             style={{
//               background: "#2a2a2a",
//               border: "1px solid #3a3a3a",
//               borderRadius: 6,
//               padding: "6px 12px",
//               color: "#c4b5fd",
//               fontSize: 10,
//               cursor: "pointer",
//               display: "flex",
//               alignItems: "center",
//               gap: 4,
//               fontFamily: "inherit",
//             }}
//           >
//             <Icons.Lock /> Access
//           </button>
//           <button
//             onClick={() => onSelectCustomer(customer.id)}
//             style={{
//               background: "#2a2a2a",
//               border: "1px solid #3a3a3a",
//               borderRadius: 6,
//               padding: "6px 12px",
//               color: "#94a3b8",
//               fontSize: 10,
//               cursor: "pointer",
//               display: "flex",
//               alignItems: "center",
//               gap: 4,
//               fontFamily: "inherit",
//             }}
//           >
//             <Icons.Devices /> View Devices
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import React from "react";
import { Customer } from "@/types";
import { THEME } from "@/lib/theme";

interface CustomerCardProps {
  customer: Customer;
  deviceCount: number;
  onlineCount: number;
  childCount: number;
  onSelectCustomer: (customerId: string) => void;
}

export function CustomerCard({
  customer,
  deviceCount,
  onlineCount,
  childCount,
  onSelectCustomer,
}: CustomerCardProps) {
  const levelColor =
    customer.hierarchy_level === 0
      ? THEME.primary[500]
      : customer.hierarchy_level === 1
      ? THEME.status.success
      : "#f59e0b";

  const levelBg =
    customer.hierarchy_level === 0
      ? THEME.primary[50]
      : customer.hierarchy_level === 1
      ? "#f0fdf4"
      : "#fffbeb";

  const usagePercent = Math.min((deviceCount / (customer.max_devices || 1)) * 100, 100);

  return (
    <div
      onClick={() => onSelectCustomer(customer.id)}
      style={{
        marginLeft: customer.hierarchy_level * 28,
        background: "white",
        borderRadius: 12,
        border: `2px solid ${THEME.border.light}`,
        borderLeft: `4px solid ${levelColor}`,
        padding: "16px 20px",
        marginBottom: 10,
        cursor: "pointer",
        transition: "all 0.2s",
        boxShadow: THEME.shadow.sm,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = levelColor;
        e.currentTarget.style.boxShadow = THEME.shadow.md;
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = THEME.border.light;
        e.currentTarget.style.borderLeftColor = levelColor;
        e.currentTarget.style.boxShadow = THEME.shadow.sm;
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* Avatar */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: levelBg,
            border: `2px solid ${levelColor}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 14,
            color: levelColor,
            flexShrink: 0,
          }}
        >
          {(customer.name ?? "").slice(0, 2).toUpperCase()}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
            <span style={{
              fontWeight: 700, fontSize: 14, color: THEME.text.primary,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {customer.name}
            </span>
            <span
              style={{
                fontSize: 9,
                padding: "2px 8px",
                borderRadius: 4,
                background: customer.status === "active" ? "#dcfce7" : "#fef3c7",
                color: customer.status === "active" ? "#16a34a" : "#d97706",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              {customer.status}
            </span>
            <span
              style={{
                fontSize: 9,
                padding: "2px 8px",
                borderRadius: 4,
                background: THEME.neutral[100],
                color: THEME.text.tertiary,
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              {customer.customer_type}
            </span>
          </div>
          <div style={{ fontSize: 12, color: THEME.text.secondary }}>
            {customer.company_name}
            {customer.city && ` · ${customer.city}`}
            {customer.country && `, ${customer.country}`}
          </div>
        </div>

        {/* Metrics */}
        <div style={{ display: "flex", gap: 20, alignItems: "center", flexShrink: 0 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: THEME.text.primary }}>
              {deviceCount}
            </div>
            <div style={{ fontSize: 9, color: THEME.text.tertiary, textTransform: "uppercase", fontWeight: 600 }}>
              Devices
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: THEME.status.success }}>
              {onlineCount}
            </div>
            <div style={{ fontSize: 9, color: THEME.text.tertiary, textTransform: "uppercase", fontWeight: 600 }}>
              Online
            </div>
          </div>

          {childCount > 0 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: THEME.primary[500] }}>
                {childCount}
              </div>
              <div style={{ fontSize: 9, color: THEME.text.tertiary, textTransform: "uppercase", fontWeight: 600 }}>
                Sub-cust
              </div>
            </div>
          )}

          {/* Device limit with progress bar */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: THEME.text.secondary }}>
              {deviceCount}/{customer.max_devices}
            </div>
            <div style={{ fontSize: 9, color: THEME.text.tertiary, textTransform: "uppercase", fontWeight: 600 }}>
              Limit
            </div>
            <div
              style={{
                width: 60,
                height: 4,
                background: THEME.neutral[200],
                borderRadius: 2,
                marginTop: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${usagePercent}%`,
                  height: "100%",
                  borderRadius: 2,
                  background: usagePercent > 80 ? "#ef4444" : THEME.status.success,
                  transition: "width 0.3s",
                }}
              />
            </div>
          </div>
        </div>

        {/* Arrow indicator */}
        <div style={{
          fontSize: 18,
          color: THEME.text.tertiary,
          flexShrink: 0,
          transition: "transform 0.2s",
        }}>
          ›
        </div>
      </div>
    </div>
  );
}