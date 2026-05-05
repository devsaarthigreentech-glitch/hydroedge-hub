// "use client";

// import React from "react";
// import { Icons } from "@/components/ui/Icons";
// import { Customer, ViewType } from "@/types";
// import { THEME } from "@/lib/theme";

// interface SidebarProps {
//   isOpen: boolean;
//   onToggle: () => void;
//   currentView: ViewType;
//   onViewChange: (view: ViewType) => void;
//   customers: Customer[];
//   customerFilter: string;
//   onCustomerFilterChange: (customerId: string) => void;
//   // New props for customer detail navigation
//   selectedCustomerId?: string;
//   onCustomerSelect: (customer: Customer) => void;
//   customerCount?: number;
//   deviceCount?: number;
//   userCount?: number;
// }

// export function Sidebar({
//   isOpen,
//   onToggle,
//   currentView,
//   onViewChange,
//   customers,
//   customerFilter,
//   onCustomerFilterChange,
//   selectedCustomerId,
//   onCustomerSelect,
//   customerCount,
//   deviceCount,
//   userCount
// }: SidebarProps) {
//   return (
//     <div
//       style={{
//         width: isOpen ? 280 : 70,
//         background: THEME.background.card,
//         borderRight: `1px solid ${THEME.border.light}`,
//         display: "flex",
//         flexDirection: "column",
//         transition: "width 0.3s ease",
//         flexShrink: 0,
//         boxShadow: THEME.shadow.md,
//       }}
//     >
//       {/* Logo & Toggle */}
//       <div
//         style={{
//           padding: "16px",
//           borderBottom: `1px solid ${THEME.border.light}`,
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "space-between",
//           background: `linear-gradient(135deg, ${THEME.primary[500]} 0%, ${THEME.primary[600]} 100%)`,
//         }}
//       >
//         {isOpen && (
//           <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
//             <div
//               style={{
//                 width: 36,
//                 height: 36,
//                 background: "white",
//                 borderRadius: 8,
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 fontWeight: 800,
//                 fontSize: 16,
//                 color: THEME.primary[600],
//               }}
//             >
//               SH
//             </div>
//             <div>
//               <div style={{ fontWeight: 700, fontSize: 14, color: "white" }}>
//                 SGT Hydroedge
//               </div>
//               <div style={{ fontSize: 10, color: "rgba(255,255,255,0.8)" }}>
//                 v2.0.0
//               </div>
//             </div>
//           </div>
//         )}
//         <button
//           onClick={onToggle}
//           style={{
//             background: "rgba(255,255,255,0.2)",
//             border: "none",
//             borderRadius: 6,
//             padding: 8,
//             color: "white",
//             display: "flex",
//             cursor: "pointer",
//           }}
//         >
//           <Icons.Menu />
//         </button>
//       </div>

//       {/* Navigation */}
//       <div style={{ padding: "12px 8px" }}>
//         <NavButton
//           icon={<Icons.Devices />}
//           label="Devices"
//           isActive={currentView === "devices"}
//           isOpen={isOpen}
//           onClick={() => onViewChange("devices")}
//           count={deviceCount}
//         />
//         <NavButton
//           icon={<Icons.Customers />}
//           label="Customers"
//           isActive={currentView === "customers"}
//           isOpen={isOpen}
//           onClick={() => onViewChange("customers")}
//           count={customerCount}
//         />

//         <NavButton
//           icon={<Icons.User />}
//           label="Users"
//           isActive={currentView === "users"}
//           isOpen={isOpen}
//           onClick={() => onViewChange("users")}
//           count={userCount}
//         />
//       </div>

//       {/* Quick Filters — clicking opens Customer Detail, not device filter */}
//       {isOpen && (
//         <div style={{ padding: "0 16px", marginTop: 8 }}>
//           <div
//             style={{
//               fontSize: 11,
//               fontWeight: 600,
//               color: THEME.text.tertiary,
//               marginBottom: 8,
//               textTransform: "uppercase",
//               letterSpacing: 0.5,
//             }}
//           >
//             Customers
//           </div>

//           {customers.slice(0, 8).map((customer) => {
//             const isSelected = selectedCustomerId === customer.id;
//             return (
//               <button
//                 key={customer.id}
//                 onClick={() => onCustomerSelect(customer)}
//                 style={{
//                   width: "100%",
//                   display: "flex",
//                   alignItems: "center",
//                   gap: 8,
//                   padding: "8px 12px",
//                   background: isSelected ? THEME.primary[50] : "transparent",
//                   border: isSelected ? `1px solid ${THEME.primary[200]}` : "1px solid transparent",
//                   borderRadius: 6,
//                   color: isSelected ? THEME.primary[700] : THEME.text.secondary,
//                   fontSize: 12,
//                   fontWeight: isSelected ? 600 : 400,
//                   marginBottom: 2,
//                   cursor: "pointer",
//                   textAlign: "left",
//                   transition: "all 0.15s",
//                 }}
//                 onMouseEnter={(e) => {
//                   if (!isSelected) e.currentTarget.style.background = THEME.background.hover;
//                 }}
//                 onMouseLeave={(e) => {
//                   if (!isSelected) e.currentTarget.style.background = "transparent";
//                 }}
//               >
//                 {/* Status dot */}
//                 <div
//                   style={{
//                     width: 7,
//                     height: 7,
//                     borderRadius: "50%",
//                     background: customer.status === "active" ? THEME.primary[500] : THEME.neutral[300],
//                     flexShrink: 0,
//                   }}
//                 />

//                 {/* Name */}
//                 <span
//                   style={{
//                     flex: 1,
//                     overflow: "hidden",
//                     textOverflow: "ellipsis",
//                     whiteSpace: "nowrap",
//                   }}
//                 >
//                   {customer.name}{customer.company_name ? ` — ${customer.company_name}` : ""}
//                 </span>

//                 {/* Arrow when selected */}
//                 {isSelected && (
//                   <span style={{ fontSize: 12, color: THEME.primary[500], flexShrink: 0 }}>›</span>
//                 )}
//               </button>
//             );
//           })}

//           {customers.length === 0 && (
//             <div style={{ fontSize: 11, color: THEME.text.tertiary, padding: "8px 12px" }}>
//               No customers yet
//             </div>
//           )}
//         </div>
//       )}

//       {/* Footer */}
//       <div style={{ marginTop: "auto", padding: 16, borderTop: `1px solid ${THEME.border.light}` }}>
//         {isOpen ? (
//           <div
//             style={{
//               background: THEME.background.secondary,
//               borderRadius: 8,
//               padding: 12,
//               border: `1px solid ${THEME.border.light}`,
//             }}
//           >
//             <div style={{ fontSize: 11, color: THEME.text.secondary, marginBottom: 4 }}>
//               System Status
//             </div>
//             <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
//               <div
//                 style={{
//                   width: 8,
//                   height: 8,
//                   borderRadius: "50%",
//                   background: THEME.status.success,
//                   boxShadow: `0 0 10px ${THEME.status.success}`,
//                 }}
//                 className="animate-pulse"
//               />
//               <span style={{ fontSize: 12, fontWeight: 600, color: THEME.text.primary }}>
//                 All Systems Operational
//               </span>
//             </div>
//           </div>
//         ) : (
//           <div
//             style={{
//               width: 8,
//               height: 8,
//               borderRadius: "50%",
//               background: THEME.status.success,
//               margin: "0 auto",
//             }}
//             className="animate-pulse"
//           />
//         )}
//       </div>
//     </div>
//   );
// }

// function NavButton({
//   icon,
//   label,
//   isActive,
//   isOpen,
//   onClick,
//   count
// }: {
//   icon: React.ReactNode;
//   label: string;
//   isActive: boolean;
//   isOpen: boolean;
//   onClick: () => void;
//   count?: number;
// }) {
//   return (
//     <button
//       onClick={onClick}
//       style={{
//         width: "100%",
//         display: "flex",
//         alignItems: "center",
//         gap: 12,
//         padding: "12px 14px",
//         background: isActive ? THEME.primary[50] : "transparent",
//         border: isActive ? `1px solid ${THEME.primary[200]}` : "1px solid transparent",
//         borderRadius: 8,
//         color: isActive ? THEME.primary[700] : THEME.text.secondary,
//         fontSize: 13,
//         fontWeight: isActive ? 600 : 500,
//         marginBottom: 4,
//         cursor: "pointer",
//         transition: "all 0.2s",
//       }}
//       onMouseEnter={(e) => {
//         if (!isActive) e.currentTarget.style.background = THEME.background.hover;
//       }}
//       onMouseLeave={(e) => {
//         if (!isActive) e.currentTarget.style.background = "transparent";
//       }}
//     >
//       <div style={{ flexShrink: 0 }}>{icon}</div>
//       {isOpen && <span>{label}</span>}

//       <span
//         style={{
//           background: isActive ? THEME.primary[200] : THEME.neutral[200],
//           color: isActive ? THEME.primary[700] : THEME.text.secondary,
//           borderRadius: 10,
//           padding: "2px 7px",
//           fontSize: 11,
//           fontWeight: 700,
//           lineHeight: 1.4,
//         }}
//       >{count}
//       </span>
//     </button>
//   );
// }

"use client";

import React from "react";
import { Icons } from "@/components/ui/Icons";
import { Customer, ViewType } from "@/types";
import { THEME } from "@/lib/theme";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  customers: Customer[];
  customerFilter: string;
  onCustomerFilterChange: (customerId: string) => void;
  selectedCustomerId?: string;
  onCustomerSelect: (customer: Customer) => void;
  customerCount?: number;
  deviceCount?: number;
  userCount?: number;
  isMobile?: boolean;
}

export function Sidebar({
  isOpen,
  onToggle,
  currentView,
  onViewChange,
  customers,
  customerFilter,
  onCustomerFilterChange,
  selectedCustomerId,
  onCustomerSelect,
  customerCount,
  deviceCount,
  userCount,
  isMobile = false,
}: SidebarProps) {

  // On mobile, clicking a nav item should also close the sidebar
  const handleNavClick = (view: ViewType) => {
    onViewChange(view);
    if (isMobile) onToggle();
  };

  const handleCustomerClick = (customer: Customer) => {
    onCustomerSelect(customer);
    if (isMobile) onToggle();
  };

  // On mobile the sidebar is always "expanded" when visible (no collapsed icon-only state)
  const showLabels = isMobile ? true : isOpen;
  const sidebarWidth = isMobile ? 280 : isOpen ? 280 : 70;

  return (
    <>
      {/* ── Dark backdrop (mobile only, when open) ── */}
      {isMobile && isOpen && (
        <div
          onClick={onToggle}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.45)",
            zIndex: 998,
            transition: "opacity 0.3s ease",
          }}
        />
      )}

      {/* ── Sidebar panel ── */}
      <div
        style={{
          // Mobile: fixed overlay sliding in from left
          // Desktop: normal inline flex child
          ...(isMobile
            ? {
                position: "fixed" as const,
                top: 0,
                left: isOpen ? 0 : -sidebarWidth - 10,
                bottom: 0,
                width: sidebarWidth,
                zIndex: 999,
                boxShadow: isOpen ? "4px 0 24px rgba(0,0,0,0.25)" : "none",
              }
            : {
                width: sidebarWidth,
              }),
          background: THEME.background.card,
          borderRight: `1px solid ${THEME.border.light}`,
          display: "flex",
          flexDirection: "column" as const,
          transition: isMobile ? "left 0.3s ease" : "width 0.3s ease",
          flexShrink: 0,
          boxShadow: isMobile ? undefined : THEME.shadow.md,
          overflow: "hidden",
        }}
      >
        {/* Logo & Toggle */}
        <div
          style={{
            padding: "16px",
            borderBottom: `1px solid ${THEME.border.light}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: `linear-gradient(135deg, ${THEME.primary[500]} 0%, ${THEME.primary[600]} 100%)`,
          }}
        >
          {showLabels && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  background: "white",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 16,
                  color: THEME.primary[600],
                  flexShrink: 0,
                }}
              >
                SH
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "white" }}>
                  SGT Hydroedge
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.8)" }}>
                  v3.0.0
                </div>
              </div>
            </div>
          )}
          <button
            onClick={onToggle}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: 6,
              padding: 8,
              color: "white",
              display: "flex",
              cursor: "pointer",
            }}
          >
            {/* On mobile show ✕ close icon, on desktop show hamburger */}
            {isMobile ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <Icons.Menu />
            )}
          </button>
        </div>

        {/* Navigation */}
        <div style={{ padding: "12px 8px" }}>
          <NavButton
            icon={<Icons.Devices />}
            label="Devices"
            isActive={currentView === "devices"}
            isOpen={showLabels}
            onClick={() => handleNavClick("devices")}
            count={deviceCount}
          />
          <NavButton
            icon={<Icons.Customers />}
            label="Customers"
            isActive={currentView === "customers"}
            isOpen={showLabels}
            onClick={() => handleNavClick("customers")}
            count={customerCount}
          />
          <NavButton
            icon={<Icons.User />}
            label="Users"
            isActive={currentView === "users"}
            isOpen={showLabels}
            onClick={() => handleNavClick("users")}
            count={userCount}
          />
        </div>

        {/* Quick Filters — clicking opens Customer Detail */}
        {showLabels && (
          <div
            style={{
              padding: "0 16px",
              marginTop: 8,
              flex: 1,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch" as any,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: THEME.text.tertiary,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Customers
            </div>

            {customers.slice(0, 8).map((customer) => {
              const isSelected = selectedCustomerId === customer.id;
              return (
                <button
                  key={customer.id}
                  onClick={() => handleCustomerClick(customer)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    background: isSelected ? THEME.primary[50] : "transparent",
                    border: isSelected
                      ? `1px solid ${THEME.primary[200]}`
                      : "1px solid transparent",
                    borderRadius: 6,
                    color: isSelected ? THEME.primary[700] : THEME.text.secondary,
                    fontSize: 12,
                    fontWeight: isSelected ? 600 : 400,
                    marginBottom: 2,
                    cursor: "pointer",
                    textAlign: "left" as const,
                    transition: "all 0.15s",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected)
                      e.currentTarget.style.background = THEME.background.hover;
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background:
                        customer.status === "active"
                          ? THEME.primary[500]
                          : THEME.neutral[300],
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {customer.name}
                    {customer.company_name
                      ? ` — ${customer.company_name}`
                      : ""}
                  </span>
                  {isSelected && (
                    <span
                      style={{
                        fontSize: 12,
                        color: THEME.primary[500],
                        flexShrink: 0,
                      }}
                    >
                      ›
                    </span>
                  )}
                </button>
              );
            })}

            {customers.length === 0 && (
              <div
                style={{
                  fontSize: 11,
                  color: THEME.text.tertiary,
                  padding: "8px 12px",
                }}
              >
                No customers yet
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: "auto",
            padding: 16,
            borderTop: `1px solid ${THEME.border.light}`,
          }}
        >
          {showLabels ? (
            <div
              style={{
                background: THEME.background.secondary,
                borderRadius: 8,
                padding: 12,
                border: `1px solid ${THEME.border.light}`,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: THEME.text.secondary,
                  marginBottom: 4,
                }}
              >
                System Status
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: THEME.status.success,
                    boxShadow: `0 0 10px ${THEME.status.success}`,
                  }}
                  className="animate-pulse"
                />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: THEME.text.primary,
                  }}
                >
                  All Systems Operational
                </span>
              </div>
            </div>
          ) : (
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: THEME.status.success,
                margin: "0 auto",
              }}
              className="animate-pulse"
            />
          )}
        </div>
      </div>
    </>
  );
}

function NavButton({
  icon,
  label,
  isActive,
  isOpen,
  onClick,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  isOpen: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        background: isActive ? THEME.primary[50] : "transparent",
        border: isActive
          ? `1px solid ${THEME.primary[200]}`
          : "1px solid transparent",
        borderRadius: 8,
        color: isActive ? THEME.primary[700] : THEME.text.secondary,
        fontSize: 13,
        fontWeight: isActive ? 600 : 500,
        marginBottom: 4,
        cursor: "pointer",
        transition: "all 0.2s",
        fontFamily: "inherit",
      }}
      onMouseEnter={(e) => {
        if (!isActive)
          e.currentTarget.style.background = THEME.background.hover;
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = "transparent";
      }}
    >
      <div style={{ flexShrink: 0 }}>{icon}</div>
      {isOpen && <span>{label}</span>}
      {isOpen && count !== undefined && (
        <span
          style={{
            marginLeft: "auto",
            background: isActive ? THEME.primary[200] : THEME.neutral[200],
            color: isActive ? THEME.primary[700] : THEME.text.secondary,
            borderRadius: 10,
            padding: "2px 7px",
            fontSize: 11,
            fontWeight: 700,
            lineHeight: 1.4,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}