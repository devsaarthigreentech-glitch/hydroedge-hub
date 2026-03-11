"use client";

import { useState, useEffect } from "react";
import { Customer, Device } from "@/types";
import { CustomerOverviewTab } from "./CustomerOverViewTab";
import { CustomerEditTab } from "./CustomerEditTab";
import { CustomerDevicesTab } from "./CustomerDeviceTab";
import { CustomerSubTab } from "./CustomerSubTab";

interface CustomerDetailProps {
  customer: Customer;
  allCustomers: Customer[];
  onBack: () => void;
  onCustomerUpdated: (updated: Customer) => void;
  onDeviceSelect: (device: Device) => void;
}

type TabKey = "overview" | "edit" | "devices" | "sub-customers";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "overview",      label: "Overview",      icon: "📋" },
  { key: "devices",       label: "Devices",       icon: "📡" },
  { key: "sub-customers", label: "Sub-Customers",  icon: "🏢" },
  { key: "edit",          label: "Edit",           icon: "✏️" },
];

const GREEN = "#22c55e";
const BG = "#f8fafc";
const BORDER = "#e2e8f0";

export function CustomerDetail({
  customer,
  allCustomers,
  onBack,
  onCustomerUpdated,
  onDeviceSelect,
}: CustomerDetailProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [customerData, setCustomerData] = useState(customer);
  const [stats, setStats] = useState({ total_devices: 0, online_devices: 0, sub_customers: 0 });
  const [assetTypes, setAssetTypes] = useState<string[]>([]);

  // Fetch full customer details + stats on mount / when customer changes
  useEffect(() => {
    setCustomerData(customer);
    fetchDetails(customer.id);
  }, [customer.id]);

  async function fetchDetails(id: string) {
    try {
      const res = await fetch(`/api/customers/${id}`);
      const json = await res.json();
      if (json.success) {
        const { stats: s, asset_types, ...rest } = json.data;
        setCustomerData(rest);
        setStats(s);
        setAssetTypes(asset_types || []);
      }
    } catch (e) {
      console.error("fetchDetails error:", e);
    }
  }

  function handleSaved(updated: Customer) {
    setCustomerData(updated);
    onCustomerUpdated(updated);
    setActiveTab("overview");
  }

  const subCustomers = allCustomers.filter(
    (c) => c.parent_customer_id === customerData.id
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: BG }}>
      {/* ── Header bar ── */}
      <div
        style={{
          background: "#fff",
          borderBottom: `1px solid ${BORDER}`,
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
        }}
      >
        {/* Back button */}
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            padding: "6px 12px",
            cursor: "pointer",
            color: "#64748b",
            fontSize: 12,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          ← Back
        </button>

        {/* Customer avatar + name */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `linear-gradient(135deg, ${GREEN}, #16a34a)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 800,
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {(customerData.company_name || customerData.name || "?")[0].toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", lineHeight: 1.2 }}>
            {customerData.company_name || customerData.name}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
            {customerData.customer_type} · {customerData.email}
          </div>
        </div>

        {/* Status badge */}
        <div
          style={{
            padding: "4px 12px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            background:
              customerData.status === "active"
                ? "rgba(34,197,94,0.12)"
                : customerData.status === "trial"
                ? "rgba(234,179,8,0.12)"
                : "rgba(239,68,68,0.12)",
            color:
              customerData.status === "active"
                ? GREEN
                : customerData.status === "trial"
                ? "#ca8a04"
                : "#ef4444",
          }}
        >
          {customerData.status}
        </div>

        {/* Quick stats */}
        <div style={{ display: "flex", gap: 16, marginLeft: 8 }}>
          {[
            { label: "Devices", value: stats.total_devices, color: "#6366f1" },
            { label: "Online",  value: stats.online_devices, color: GREEN },
            { label: "Sub-orgs",value: stats.sub_customers,  color: "#f59e0b" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", marginTop: 2 }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div
        style={{
          display: "flex",
          background: "#fff",
          borderBottom: `1px solid ${BORDER}`,
          padding: "0 20px",
          flexShrink: 0,
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: "none",
                border: "none",
                borderBottom: isActive ? `3px solid ${GREEN}` : "3px solid transparent",
                padding: "12px 16px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? GREEN : "#64748b",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {tab.key === "devices" && stats.total_devices > 0 && (
                <span
                  style={{
                    background: isActive ? GREEN : "#e2e8f0",
                    color: isActive ? "#fff" : "#64748b",
                    borderRadius: 10,
                    padding: "1px 7px",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {stats.total_devices}
                </span>
              )}
              {tab.key === "sub-customers" && stats.sub_customers > 0 && (
                <span
                  style={{
                    background: isActive ? "#f59e0b" : "#e2e8f0",
                    color: isActive ? "#fff" : "#64748b",
                    borderRadius: 10,
                    padding: "1px 7px",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {stats.sub_customers}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {activeTab === "overview" && (
          <CustomerOverviewTab customer={customerData} stats={stats} />
        )}
        {activeTab === "edit" && (
          <CustomerEditTab
            customer={customerData}
            allCustomers={allCustomers}
            onSaved={handleSaved}
          />
        )}
        {activeTab === "devices" && (
          <CustomerDevicesTab
            customerId={customerData.id}
            assetTypes={assetTypes}
            onDeviceSelect={onDeviceSelect}
          />
        )}
        {activeTab === "sub-customers" && (
          <CustomerSubTab subCustomers={subCustomers} allCustomers={allCustomers} />
        )}
      </div>
    </div>
  );
}