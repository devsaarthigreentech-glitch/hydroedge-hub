// "use client";

// import { Customer } from "@/types";

// interface Props {
//   customer: Customer;
//   stats: { total_devices: number; online_devices: number; sub_customers: number };
// }

// const BORDER = "#e2e8f0";
// const GREEN = "#22c55e";

// function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
//   return (
//     <div
//       style={{
//         display: "flex",
//         justifyContent: "space-between",
//         alignItems: "flex-start",
//         padding: "10px 0",
//         borderBottom: `1px solid ${BORDER}`,
//         gap: 12,
//       }}
//     >
//       <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, flexShrink: 0 }}>{label}</span>
//       <span style={{ fontSize: 12, color: "#0f172a", fontWeight: 600, textAlign: "right" }}>
//         {value ?? <span style={{ color: "#cbd5e1" }}>—</span>}
//       </span>
//     </div>
//   );
// }

// function Section({ title, children }: { title: string; children: React.ReactNode }) {
//   return (
//     <div
//       style={{
//         background: "#fff",
//         border: `1px solid ${BORDER}`,
//         borderRadius: 12,
//         padding: "16px 20px",
//         marginBottom: 16,
//       }}
//     >
//       <div
//         style={{
//           fontSize: 11,
//           fontWeight: 700,
//           color: "#94a3b8",
//           textTransform: "uppercase",
//           letterSpacing: 1,
//           marginBottom: 8,
//         }}
//       >
//         {title}
//       </div>
//       {children}
//     </div>
//   );
// }

// export function CustomerOverviewTab({ customer, stats }: Props) {
//   const deviceUsagePct = customer.max_devices
//     ? Math.min((stats.total_devices / customer.max_devices) * 100, 100)
//     : 0;

//   return (
//     <div style={{ padding: 20, maxWidth: 800 }}>
//       {/* Device usage bar */}
//       <Section title="Device Usage">
//         <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
//           <span style={{ color: "#64748b" }}>
//             {stats.total_devices} of {customer.max_devices ?? "∞"} devices used
//           </span>
//           <span style={{ color: deviceUsagePct > 80 ? "#ef4444" : GREEN, fontWeight: 700 }}>
//             {deviceUsagePct.toFixed(0)}%
//           </span>
//         </div>
//         <div style={{ background: "#f1f5f9", borderRadius: 4, height: 8, overflow: "hidden" }}>
//           <div
//             style={{
//               height: "100%",
//               width: `${deviceUsagePct}%`,
//               borderRadius: 4,
//               background:
//                 deviceUsagePct > 80
//                   ? "#ef4444"
//                   : deviceUsagePct > 60
//                   ? "#f59e0b"
//                   : GREEN,
//               transition: "width 0.5s ease",
//             }}
//           />
//         </div>
//         <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
//           {[
//             { label: "Total Devices", value: stats.total_devices, color: "#6366f1" },
//             { label: "Online Now",    value: stats.online_devices, color: GREEN },
//             { label: "Offline",       value: stats.total_devices - stats.online_devices, color: "#94a3b8" },
//             { label: "Sub-Orgs",      value: stats.sub_customers, color: "#f59e0b" },
//           ].map(({ label, value, color }) => (
//             <div
//               key={label}
//               style={{
//                 flex: 1,
//                 background: "#f8fafc",
//                 borderRadius: 8,
//                 padding: "10px 12px",
//                 border: `1px solid ${BORDER}`,
//               }}
//             >
//               <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
//               <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, textTransform: "uppercase" }}>
//                 {label}
//               </div>
//             </div>
//           ))}
//         </div>
//       </Section>

//       {/* Basic info */}
//       <Section title="Organization">
//         <InfoRow label="Company Name"   value={customer.company_name} />
//         <InfoRow label="Account Name"   value={customer.name} />
//         <InfoRow label="Customer Type"  value={customer.customer_type} />
//         <InfoRow label="Status"         value={customer.status} />
//         <InfoRow label="Plan"           value={(customer as any).plan_type} />
//         <InfoRow label="Hierarchy Level" value={customer.hierarchy_level} />
//         <InfoRow label="Timezone"       value={(customer as any).timezone} />
//         <InfoRow label="Member Since"   value={new Date(customer.created_at).toLocaleDateString()} />
//       </Section>

//       {/* Contact */}
//       <Section title="Contact Details">
//         <InfoRow label="Email"          value={customer.email} />
//         <InfoRow label="Phone"          value={customer.phone} />
//         <InfoRow label="Contact Person" value={(customer as any).contact_person_name} />
//         <InfoRow label="Contact Email"  value={(customer as any).contact_person_email} />
//         <InfoRow label="Contact Phone"  value={(customer as any).contact_person_phone} />
//       </Section>

//       {/* Address */}
//       <Section title="Address">
//         <InfoRow label="Address Line 1" value={(customer as any).address_line1} />
//         <InfoRow label="Address Line 2" value={(customer as any).address_line2} />
//         <InfoRow label="City"           value={customer.city} />
//         <InfoRow label="State"          value={customer.state} />
//         <InfoRow label="Country"        value={customer.country} />
//         <InfoRow label="Postal Code"    value={(customer as any).postal_code} />
//       </Section>

//       {/* Notes */}
//       {(customer as any).notes && (
//         <Section title="Notes">
//           <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: 0 }}>
//             {(customer as any).notes}
//           </p>
//         </Section>
//       )}
//     </div>
//   );
// }
"use client";

import { Customer } from "@/types";

interface Props {
  customer: Customer;
  stats: { total_devices: number; online_devices: number; sub_customers: number };
}

const BORDER = "#e2e8f0";
const GREEN = "#22c55e";

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        padding: "10px 0",
        borderBottom: `1px solid ${BORDER}`,
        gap: 12,
      }}
    >
      <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: "#0f172a", fontWeight: 600, textAlign: "right" }}>
        {value ?? <span style={{ color: "#cbd5e1" }}>—</span>}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

export function CustomerOverviewTab({ customer, stats }: Props) {
  const deviceUsagePct = customer.max_devices
    ? Math.min((stats.total_devices / customer.max_devices) * 100, 100)
    : 0;

  return (
    <div style={{ padding: 20, maxWidth: 800 }}>
      {/* Device usage bar */}
      <Section title="Device Usage">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
          <span style={{ color: "#64748b" }}>
            {stats.total_devices} of {customer.max_devices ?? "∞"} devices used
          </span>
          <span style={{ color: deviceUsagePct > 80 ? "#ef4444" : GREEN, fontWeight: 700 }}>
            {deviceUsagePct.toFixed(0)}%
          </span>
        </div>
        <div style={{ background: "#f1f5f9", borderRadius: 4, height: 8, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${deviceUsagePct}%`,
              borderRadius: 4,
              background:
                deviceUsagePct > 80
                  ? "#ef4444"
                  : deviceUsagePct > 60
                  ? "#f59e0b"
                  : GREEN,
              transition: "width 0.5s ease",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
          {[
            { label: "Total Devices", value: stats.total_devices, color: "#6366f1" },
            { label: "Online Now",    value: stats.online_devices, color: GREEN },
            { label: "Offline",       value: stats.total_devices - stats.online_devices, color: "#94a3b8" },
            { label: "Sub-Orgs",      value: stats.sub_customers, color: "#f59e0b" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                flex: 1,
                background: "#f8fafc",
                borderRadius: 8,
                padding: "10px 12px",
                border: `1px solid ${BORDER}`,
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, textTransform: "uppercase" }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Basic info */}
      <Section title="Organization">
        <InfoRow label="Account Name"   value={customer.name} />
        <InfoRow label="Company Name"   value={(customer as any).company_name} />
        <InfoRow label="Customer Type"  value={customer.customer_type} />
        <InfoRow label="Status"         value={customer.status} />
        <InfoRow label="Plan"           value={(customer as any).plan_type} />
        <InfoRow label="Hierarchy Level" value={customer.hierarchy_level} />
        <InfoRow label="Timezone"       value={(customer as any).timezone} />
        <InfoRow label="Member Since"   value={new Date(customer.created_at).toLocaleDateString()} />
      </Section>

      {/* Contact */}
      <Section title="Contact Details">
        <InfoRow label="Email"          value={customer.email} />
        <InfoRow label="Phone"          value={customer.phone} />
        <InfoRow label="Contact Person" value={(customer as any).contact_person_name} />
        <InfoRow label="Contact Email"  value={(customer as any).contact_person_email} />
        <InfoRow label="Contact Phone"  value={(customer as any).contact_person_phone} />
      </Section>

      {/* Address */}
      <Section title="Address">
        <InfoRow label="Address Line 1" value={(customer as any).address_line1} />
        <InfoRow label="Address Line 2" value={(customer as any).address_line2} />
        <InfoRow label="City"           value={customer.city} />
        <InfoRow label="State"          value={customer.state} />
        <InfoRow label="Country"        value={customer.country} />
        <InfoRow label="Postal Code"    value={(customer as any).postal_code} />
      </Section>

      {/* Notes */}
      {(customer as any).notes && (
        <Section title="Notes">
          <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: 0 }}>
            {(customer as any).notes}
          </p>
        </Section>
      )}
    </div>
  );
}