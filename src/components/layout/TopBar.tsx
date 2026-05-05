// "use client";

// import React from "react";
// import { Icons } from "@/components/ui/Icons";
// import { Device, Customer } from "@/types";
// import { THEME } from "@/lib/theme";
// import { signOut } from "next-auth/react";

// interface TopBarProps {
//   onToggleSidebar: () => void;
//   selectedDevice: Device | null;
//   currentView: string;
//   customerFilter: string;
//   onCustomerFilterChange: (customerId: string) => void;
//   customers: Customer[];
//   deviceCount: number;
// }

// export function TopBar({
//   onToggleSidebar,
//   selectedDevice,
//   currentView,
//   customerFilter,
//   onCustomerFilterChange,
//   customers,
//   deviceCount,
// }: TopBarProps) {
//   const customer = customers.find((c) => c.id === customerFilter);

//   return (
//     <div
//       style={{
//         height: 60,
//         background: THEME.background.card,
//         borderBottom: `1px solid ${THEME.border.light}`,
//         display: "flex",
//         alignItems: "center",
//         padding: "0 24px",
//         gap: 20,
//         flexShrink: 0,
//         boxShadow: THEME.shadow.sm,
//       }}
//     >
//       {/* Breadcrumb */}
//       <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
//         {/* <Icons.Menu /> */}
//         {/* <span style={{ color: THEME.text.tertiary, fontSize: 14 }}>/</span> */}

//         {currentView === "devices" && (
//           <>
//             <span style={{ fontSize: 14, fontWeight: 600, color: THEME.text.primary }}>
//               Devices
//             </span>
//             {customerFilter !== "all" && customer && (
//               <>
//                 <span style={{ color: THEME.text.tertiary, fontSize: 14 }}>/</span>
//                 <span style={{ fontSize: 14, color: THEME.text.secondary }}>
//                   {customer.name}
//                 </span>
//               </>
//             )}
//           </>
//         )}

//         {currentView === "customers" && (
//           <span style={{ fontSize: 14, fontWeight: 600, color: THEME.text.primary }}>
//             Customers
//           </span>
//         )}

//         {selectedDevice && (
//           <>
//             <span style={{ color: THEME.text.tertiary, fontSize: 14 }}>/</span>
//             <span style={{ fontSize: 14, color: THEME.text.secondary }}>
//               {selectedDevice.device_name}
//             </span>
//           </>
//         )}
//       </div>

//       {/* Stats */}
//       <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
//         {/* <div
//           style={{
//             display: "flex",
//             alignItems: "center",
//             gap: 8,
//             padding: "8px 16px",
//             background: THEME.background.secondary,
//             borderRadius: 8,
//             border: `1px solid ${THEME.border.light}`,
//           }}
//         >
//           <Icons.Devices />
//           <div>
//             <div style={{ fontSize: 10, color: THEME.text.tertiary, fontWeight: 500 }}>
//               Total Devices
//             </div>
//             <div style={{ fontSize: 16, fontWeight: 700, color: THEME.text.primary }}>
//               {deviceCount}
//             </div>
//           </div>
//         </div>

//         <div
//           style={{
//             display: "flex",
//             alignItems: "center",
//             gap: 8,
//             padding: "8px 16px",
//             background: `linear-gradient(135deg, ${THEME.primary[50]} 0%, ${THEME.primary[100]} 100%)`,
//             borderRadius: 8,
//             border: `1px solid ${THEME.primary[200]}`,
//           }}
//         >
//           <div
//             style={{
//               width: 8,
//               height: 8,
//               borderRadius: "50%",
//               background: THEME.status.success,
//             }}
//             className="animate-pulse"
//           />
//           <div>
//             <div style={{ fontSize: 10, color: THEME.primary[700], fontWeight: 500 }}>
//               Online
//             </div>
//             <div style={{ fontSize: 16, fontWeight: 700, color: THEME.primary[700] }}>
//               {deviceCount}
//             </div>
//           </div>
//         </div> */}

//         {/* User Profile */}
//         {/* <div
//           style={{
//             width: 36,
//             height: 36,
//             borderRadius: "50%",
//             background: `linear-gradient(135deg, ${THEME.primary[400]} 0%, ${THEME.primary[600]} 100%)`,
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             color: "white",
//             fontWeight: 700,
//             fontSize: 14,
//             cursor: "pointer",
//             border: `2px solid ${THEME.primary[200]}`,
//           }}
//         >
//           SA
//         </div> */}
//         <div style={{ position: "relative" }}>
//           <button
//             onClick={() => signOut({ callbackUrl: "/login" })}
//             style={{
//               padding: "6px 14px",
//               background: "transparent",
//               border: "1px solid #e0e0e0",
//               borderRadius: 6,
//               color: "#666",
//               fontSize: 12,
//               cursor: "pointer",
//               fontFamily: "inherit",
//               fontWeight: 600,
//               transition: "all 0.15s",
//             }}
//             onMouseEnter={(e) => {
//               e.currentTarget.style.borderColor = "#ef4444";
//               e.currentTarget.style.color = "#ef4444";
//             }}
//             onMouseLeave={(e) => {
//               e.currentTarget.style.borderColor = "#e0e0e0";
//               e.currentTarget.style.color = "#666";
//             }}
//           >
//             Sign Out
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }
"use client";

import React from "react";
import { Icons } from "@/components/ui/Icons";
import { Device, Customer } from "@/types";
import { THEME } from "@/lib/theme";
import { signOut } from "next-auth/react";

interface TopBarProps {
  onToggleSidebar: () => void;
  selectedDevice: Device | null;
  currentView: string;
  customerFilter: string;
  onCustomerFilterChange: (customerId: string) => void;
  customers: Customer[];
  deviceCount: number;
  isMobile?: boolean;
}

export function TopBar({
  onToggleSidebar,
  selectedDevice,
  currentView,
  customerFilter,
  onCustomerFilterChange,
  customers,
  deviceCount,
  isMobile = false,
}: TopBarProps) {
  const customer = customers.find((c) => c.id === customerFilter);

  return (
    <div
      style={{
        height: isMobile ? 52 : 60,
        background: THEME.background.card,
        borderBottom: `1px solid ${THEME.border.light}`,
        display: "flex",
        alignItems: "center",
        padding: isMobile ? "0 12px" : "0 24px",
        gap: isMobile ? 10 : 20,
        flexShrink: 0,
        boxShadow: THEME.shadow.sm,
      }}
    >
      {/* ── Hamburger menu button ── */}
      <button
        onClick={onToggleSidebar}
        style={{
          background: "none",
          border: "none",
          color: THEME.text.secondary,
          cursor: "pointer",
          padding: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
          flexShrink: 0,
        }}
        aria-label="Toggle sidebar"
      >
        <Icons.Menu />
      </button>

      {/* ── Breadcrumb ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: 8,
          overflow: "hidden",
        }}
      >
        {currentView === "devices" && (
          <>
            <span
              style={{
                fontSize: isMobile ? 14 : 14,
                fontWeight: 600,
                color: THEME.text.primary,
                whiteSpace: "nowrap",
              }}
            >
              Devices
            </span>
            {customerFilter !== "all" && customer && !isMobile && (
              <>
                <span style={{ color: THEME.text.tertiary, fontSize: 14 }}>/</span>
                <span
                  style={{
                    fontSize: 14,
                    color: THEME.text.secondary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {customer.name}
                </span>
              </>
            )}
          </>
        )}

        {currentView === "customers" && (
          <span style={{ fontSize: 14, fontWeight: 600, color: THEME.text.primary }}>
            Customers
          </span>
        )}

        {currentView === "users" && (
          <span style={{ fontSize: 14, fontWeight: 600, color: THEME.text.primary }}>
            Users
          </span>
        )}

        {selectedDevice && (
          <>
            {!isMobile && (
              <span style={{ color: THEME.text.tertiary, fontSize: 14 }}>/</span>
            )}
            <span
              style={{
                fontSize: 14,
                color: isMobile ? THEME.text.primary : THEME.text.secondary,
                fontWeight: isMobile ? 600 : 400,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {selectedDevice.device_name}
            </span>
          </>
        )}
      </div>

      {/* ── Sign Out ── */}
      <div style={{ flexShrink: 0 }}>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            padding: isMobile ? "6px 10px" : "6px 14px",
            background: "transparent",
            border: "1px solid #e0e0e0",
            borderRadius: 6,
            color: "#666",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
            fontWeight: 600,
            transition: "all 0.15s",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#ef4444";
            e.currentTarget.style.color = "#ef4444";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#e0e0e0";
            e.currentTarget.style.color = "#666";
          }}
        >
          {isMobile ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          ) : (
            "Sign Out"
          )}
        </button>
      </div>
    </div>
  );
}