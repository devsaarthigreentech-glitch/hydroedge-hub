// "use client";

// import React from "react";
// import { Customer, Device } from "@/types";
// import { CustomerCard } from "./CustomerCard";
// import { Icons } from "@/components/ui/Icons";

// interface CustomerListProps {
//   customers: Customer[];
//   devices: Device[];
//   onSelectCustomer: (customerId: string) => void;
//   onAddCustomer: () => void;
// }

// export function CustomerList({
//   customers,
//   devices,
//   onSelectCustomer,
//   onAddCustomer,
// }: CustomerListProps) {
//   return (
//     <div style={{ padding: 20 }}>
//       <div
//         style={{
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "space-between",
//           marginBottom: 20,
//         }}
//       >
//         <div style={{ fontSize: 11, color: "#6b7280" }}>
//           {customers.length} customer{customers.length !== 1 ? "s" : ""} ·
//           Hierarchical view
//         </div>
//         <button
//           onClick={onAddCustomer}
//           style={{
//             background: "#7c3aed",
//             border: "none",
//             borderRadius: 6,
//             padding: "8px 16px",
//             color: "#fff",
//             fontWeight: 600,
//             fontSize: 12,
//             cursor: "pointer",
//             display: "flex",
//             alignItems: "center",
//             gap: 6,
//             fontFamily: "inherit",
//           }}
//         >
//           <Icons.Plus /> Add Customer
//         </button>
//       </div>

//       {/* Customer cards */}
//       {customers.map((customer) => {
//         const deviceCount = devices.filter(
//           (d) => d.customer_id === customer.id
//         ).length;
//         const onlineCount = devices.filter(
//           (d) =>
//             d.customer_id === customer.id && d.connection_status === "online"
//         ).length;
//         const childCount = customers.filter(
//           (c) => c.parent_customer_id === customer.id
//         ).length;

//         return (
//           <CustomerCard
//             key={customer.id}
//             customer={customer}
//             deviceCount={deviceCount}
//             onlineCount={onlineCount}
//             childCount={childCount}
//             onSelectCustomer={onSelectCustomer}
//           />
//         );
//       })}
//     </div>
//   );
// }

"use client";

import React from "react";
import { Customer, Device } from "@/types";
import { CustomerCard } from "./CustomerCard";
import { Icons } from "@/components/ui/Icons";
import { THEME } from "@/lib/theme";

interface CustomerListProps {
  customers: Customer[];
  devices: Device[];
  onSelectCustomer: (customerId: string) => void;
  onAddCustomer: () => void;
}

export function CustomerList({
  customers,
  devices,
  onSelectCustomer,
  onAddCustomer,
}: CustomerListProps) {
  return (
    <div style={{ padding: 20, background: THEME.background.secondary, minHeight: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 12, color: THEME.text.secondary }}>
          {customers.length} customer{customers.length !== 1 ? "s" : ""} · Hierarchical view
        </div>
        <button
          onClick={onAddCustomer}
          style={{
            background: THEME.primary[500],
            border: "none",
            borderRadius: 8,
            padding: "10px 20px",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "inherit",
            transition: "all 0.2s",
            boxShadow: THEME.shadow.md,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = THEME.primary[600];
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = THEME.primary[500];
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <Icons.Plus /> Add Customer
        </button>
      </div>

      {customers.map((customer) => {
        const deviceCount = devices.filter(
          (d) => d.customer_id === customer.id
        ).length;
        const onlineCount = devices.filter(
          (d) =>
            d.customer_id === customer.id && d.connection_status === "online"
        ).length;
        const childCount = customers.filter(
          (c) => c.parent_customer_id === customer.id
        ).length;

        return (
          <CustomerCard
            key={customer.id}
            customer={customer}
            deviceCount={deviceCount}
            onlineCount={onlineCount}
            childCount={childCount}
            onSelectCustomer={onSelectCustomer}
          />
        );
      })}
    </div>
  );
}