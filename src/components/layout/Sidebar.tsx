"use client";

import React from "react";
import { Icons } from "@/components/ui/Icons";
import { Customer, ViewType } from "@/types";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  customers: Customer[];
  customerFilter: string;
  onCustomerFilterChange: (customerId: string) => void;
}

export function Sidebar({
  isOpen,
  onToggle,
  currentView,
  onViewChange,
  customers,
  customerFilter,
  onCustomerFilterChange,
}: SidebarProps) {
  const rootCustomers = customers.filter((c) => c.hierarchy_level === 0);

  return (
    <div
      style={{
        width: isOpen ? 240 : 56,
        minWidth: isOpen ? 240 : 56,
        background: "#2d1b4e",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.2s ease",
        overflow: "hidden",
        borderRight: "1px solid #3d2b5e",
      }}
    >
      {/* Brand */}
      <div
        style={{
          padding: isOpen ? "18px 16px" : "18px 12px",
          borderBottom: "1px solid #3d2b5e",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
        }}
        onClick={onToggle}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "linear-gradient(135deg, #00c853, #00e676)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            fontSize: 14,
            color: "#1a1a1a",
            flexShrink: 0,
          }}
        >
          SH
        </div>
        {isOpen && (
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: "#fff",
                letterSpacing: 0.5,
              }}
            >
              SGT Hydroedge
            </div>
            <div style={{ fontSize: 10, color: "#a78bfa", marginTop: 1 }}>
              v1.0.0
            </div>
          </div>
        )}
      </div>

      {/* User info */}
      {isOpen && (
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #3d2b5e",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "#7c3aed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 12,
              color: "#fff",
            }}
          >
            SA
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>
              Super Admin
            </div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>
              admin@sghydroedge.com
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav style={{ padding: "12px 8px", flex: 1 }}>
        {[
          { key: "devices" as ViewType, label: "Devices", icon: Icons.Devices },
          {
            key: "customers" as ViewType,
            label: "Customers",
            icon: Icons.Customers,
          },
        ].map((item) => (
          <div
            key={item.key}
            onClick={() => onViewChange(item.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: isOpen ? "10px 12px" : "10px 12px",
              marginBottom: 4,
              borderRadius: 8,
              cursor: "pointer",
              background:
                currentView === item.key
                  ? "rgba(124, 58, 237, 0.3)"
                  : "transparent",
              color: currentView === item.key ? "#c4b5fd" : "#94a3b8",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              if (currentView !== item.key)
                e.currentTarget.style.background = "rgba(124, 58, 237, 0.15)";
            }}
            onMouseLeave={(e) => {
              if (currentView !== item.key)
                e.currentTarget.style.background = "transparent";
            }}
          >
            <item.icon />
            {isOpen && (
              <span style={{ fontWeight: 500, fontSize: 13 }}>
                {item.label}
              </span>
            )}
          </div>
        ))}

        {isOpen && (
          <div
            style={{
              margin: "16px 12px 8px",
              fontSize: 10,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: 1.5,
              fontWeight: 600,
            }}
          >
            Quick Filters
          </div>
        )}
        {isOpen &&
          rootCustomers.map((c) => (
            <div
              key={c.id}
              onClick={() => {
                onCustomerFilterChange(
                  customerFilter === c.id ? "all" : c.id
                );
                onViewChange("devices");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 12px",
                marginBottom: 2,
                borderRadius: 6,
                cursor: "pointer",
                background:
                  customerFilter === c.id
                    ? "rgba(0, 200, 83, 0.15)"
                    : "transparent",
                color: customerFilter === c.id ? "#00e676" : "#78716c",
                fontSize: 11,
              }}
            >
              <Icons.Dot
                color={customerFilter === c.id ? "#00e676" : "#525252"}
              />
              {c.company_name || c.name}
            </div>
          ))}
      </nav>

      {/* Footer */}
      {isOpen && (
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid #3d2b5e",
            fontSize: 10,
            color: "#525252",
          }}
        >
          © 2025 SGT Hydroedge
        </div>
      )}
    </div>
  );
}
