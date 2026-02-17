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
  return (
    <div
      style={{
        width: isOpen ? 280 : 70,
        background: THEME.background.card,
        borderRight: `1px solid ${THEME.border.light}`,
        display: "flex",
        flexDirection: "column",
        transition: "width 0.3s ease",
        flexShrink: 0,
        boxShadow: THEME.shadow.md,
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
        {isOpen && (
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
              }}
            >
              SH
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "white" }}>
                SGT Hydroedge
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.8)" }}>
                v1.0.0
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
          <Icons.Menu />
        </button>
      </div>

      {/* Navigation */}
      <div style={{ padding: "12px 8px" }}>
        <NavButton
          icon={<Icons.Devices />}
          label="Devices"
          isActive={currentView === "devices"}
          isOpen={isOpen}
          onClick={() => onViewChange("devices")}
        />
        <NavButton
          icon={<Icons.Customers />}
          label="Customers"
          isActive={currentView === "customers"}
          isOpen={isOpen}
          onClick={() => onViewChange("customers")}
        />
      </div>

      {/* Quick Filters */}
      {isOpen && (
        <div style={{ padding: "0 16px", marginTop: 8 }}>
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
            Quick Filters
          </div>
          <CustomerFilterButton
            label="All Customers"
            count={customers.length}
            isActive={customerFilter === "all"}
            onClick={() => onCustomerFilterChange("all")}
          />
          {customers.slice(0, 5).map((customer) => (
            <CustomerFilterButton
              key={customer.id}
              label={customer.name}
              isActive={customerFilter === customer.id}
              onClick={() => onCustomerFilterChange(customer.id)}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: "auto", padding: 16, borderTop: `1px solid ${THEME.border.light}` }}>
        {isOpen ? (
          <div
            style={{
              background: THEME.background.secondary,
              borderRadius: 8,
              padding: 12,
              border: `1px solid ${THEME.border.light}`,
            }}
          >
            <div style={{ fontSize: 11, color: THEME.text.secondary, marginBottom: 4 }}>
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
              <span style={{ fontSize: 12, fontWeight: 600, color: THEME.text.primary }}>
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
  );
}

function NavButton({
  icon,
  label,
  isActive,
  isOpen,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  isOpen: boolean;
  onClick: () => void;
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
        border: isActive ? `1px solid ${THEME.primary[200]}` : "1px solid transparent",
        borderRadius: 8,
        color: isActive ? THEME.primary[700] : THEME.text.secondary,
        fontSize: 13,
        fontWeight: isActive ? 600 : 500,
        marginBottom: 4,
        cursor: "pointer",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = THEME.background.hover;
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "transparent";
        }
      }}
    >
      <div style={{ flexShrink: 0 }}>{icon}</div>
      {isOpen && <span>{label}</span>}
    </button>
  );
}

function CustomerFilterButton({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 12px",
        background: isActive ? THEME.primary[50] : "transparent",
        border: "none",
        borderRadius: 6,
        color: isActive ? THEME.primary[700] : THEME.text.secondary,
        fontSize: 12,
        fontWeight: isActive ? 600 : 400,
        marginBottom: 2,
        cursor: "pointer",
        textAlign: "left",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = THEME.background.hover;
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "transparent";
        }
      }}
    >
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {count !== undefined && (
        <span
          style={{
            background: isActive ? THEME.primary[200] : THEME.neutral[200],
            color: isActive ? THEME.primary[700] : THEME.text.secondary,
            padding: "2px 6px",
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 600,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}