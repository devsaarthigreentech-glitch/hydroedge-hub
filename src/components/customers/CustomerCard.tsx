"use client";

import React from "react";
import { Customer } from "@/types";
import { Icons } from "@/components/ui/Icons";

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
  return (
    <div
      style={{
        marginLeft: customer.hierarchy_level * 32,
        background: "#242424",
        borderRadius: 10,
        border: "1px solid #333",
        padding: "16px 20px",
        marginBottom: 10,
        borderLeft: `3px solid ${
          customer.hierarchy_level === 0
            ? "#7c3aed"
            : customer.hierarchy_level === 1
            ? "#00c853"
            : "#fbbf24"
        }`,
        transition: "all 0.15s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#00e676")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#333")}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* Avatar */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background:
              customer.hierarchy_level === 0
                ? "rgba(124, 58, 237, 0.2)"
                : "rgba(0, 200, 83, 0.1)",
            border: `1px solid ${
              customer.hierarchy_level === 0
                ? "rgba(124, 58, 237, 0.3)"
                : "rgba(0, 200, 83, 0.2)"
            }`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 14,
            color: customer.hierarchy_level === 0 ? "#c4b5fd" : "#4ade80",
          }}
        >
          {customer.name.slice(0, 2).toUpperCase()}
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 3,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>
              {customer.name}
            </span>
            <span
              style={{
                fontSize: 9,
                padding: "2px 8px",
                borderRadius: 3,
                background:
                  customer.status === "active"
                    ? "rgba(0, 200, 83, 0.15)"
                    : "rgba(251, 191, 36, 0.15)",
                color: customer.status === "active" ? "#4ade80" : "#fbbf24",
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
                borderRadius: 3,
                background: "rgba(156, 163, 175, 0.1)",
                color: "#9ca3af",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              {customer.customer_type}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>
            {customer.company_name} · {customer.city}, {customer.country}
          </div>
        </div>

        {/* Metrics */}
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9" }}>
              {deviceCount}
            </div>
            <div
              style={{
                fontSize: 9,
                color: "#6b7280",
                textTransform: "uppercase",
              }}
            >
              Devices
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#4ade80" }}>
              {onlineCount}
            </div>
            <div
              style={{
                fontSize: 9,
                color: "#6b7280",
                textTransform: "uppercase",
              }}
            >
              Online
            </div>
          </div>
          {childCount > 0 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#c4b5fd" }}>
                {childCount}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: "#6b7280",
                  textTransform: "uppercase",
                }}
              >
                Sub-cust
              </div>
            </div>
          )}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>
              {deviceCount}/{customer.max_devices}
            </div>
            <div
              style={{
                fontSize: 9,
                color: "#6b7280",
                textTransform: "uppercase",
              }}
            >
              Limit
            </div>
            {/* Progress bar */}
            <div
              style={{
                width: 60,
                height: 3,
                background: "#333",
                borderRadius: 2,
                marginTop: 3,
              }}
            >
              <div
                style={{
                  width: `${Math.min(
                    (deviceCount / customer.max_devices) * 100,
                    100
                  )}%`,
                  height: "100%",
                  borderRadius: 2,
                  background:
                    deviceCount / customer.max_devices > 0.8
                      ? "#ef4444"
                      : "#00c853",
                }}
              />
            </div>
          </div>
        </div>

        {/* Access control button */}
        <div style={{ display: "flex", gap: 6 }}>
          <button
            style={{
              background: "#2a2a2a",
              border: "1px solid #3a3a3a",
              borderRadius: 6,
              padding: "6px 12px",
              color: "#c4b5fd",
              fontSize: 10,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontFamily: "inherit",
            }}
          >
            <Icons.Lock /> Access
          </button>
          <button
            onClick={() => onSelectCustomer(customer.id)}
            style={{
              background: "#2a2a2a",
              border: "1px solid #3a3a3a",
              borderRadius: 6,
              padding: "6px 12px",
              color: "#94a3b8",
              fontSize: 10,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontFamily: "inherit",
            }}
          >
            <Icons.Devices /> View Devices
          </button>
        </div>
      </div>
    </div>
  );
}
