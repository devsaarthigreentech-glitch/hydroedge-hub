"use client";

import React from "react";
import { Customer } from "@/types";
import { Icons } from "@/components/ui/Icons";

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
}

export function AddCustomerModal({
  isOpen,
  onClose,
  customers,
}: AddCustomerModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#242424",
          borderRadius: 12,
          border: "1px solid #333",
          width: 500,
          maxHeight: "80vh",
          overflow: "auto",
          padding: 28,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>
            Add New Customer
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#6b7280",
              cursor: "pointer",
              display: "flex",
            }}
          >
            <Icons.Close />
          </button>
        </div>
        {[
          { label: "Customer Name", placeholder: "e.g. Turbo Energy Limited" },
          { label: "Company Name", placeholder: "e.g. Turbo Energy Ltd" },
          { label: "Email", placeholder: "admin@company.com" },
          { label: "Phone", placeholder: "+91..." },
          { label: "City", placeholder: "e.g. Chennai" },
          { label: "Country", placeholder: "e.g. India" },
        ].map((field) => (
          <div key={field.label} style={{ marginBottom: 14 }}>
            <label
              style={{
                fontSize: 10,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: 1,
                display: "block",
                marginBottom: 5,
              }}
            >
              {field.label}
            </label>
            <input
              placeholder={field.placeholder}
              style={{
                width: "100%",
                background: "#1e1e1e",
                border: "1px solid #333",
                borderRadius: 6,
                padding: "10px 12px",
                color: "#e2e8f0",
                fontSize: 13,
                fontFamily: "inherit",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        ))}
        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              fontSize: 10,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: 1,
              display: "block",
              marginBottom: 5,
            }}
          >
            Parent Customer
          </label>
          <select
            style={{
              width: "100%",
              background: "#1e1e1e",
              border: "1px solid #333",
              borderRadius: 6,
              padding: "10px 12px",
              color: "#e2e8f0",
              fontSize: 13,
              fontFamily: "inherit",
              outline: "none",
            }}
          >
            <option value="">— None (Root Customer) —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {"— ".repeat(c.hierarchy_level)}
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              fontSize: 10,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: 1,
              display: "block",
              marginBottom: 5,
            }}
          >
            Customer Type
          </label>
          <select
            style={{
              width: "100%",
              background: "#1e1e1e",
              border: "1px solid #333",
              borderRadius: 6,
              padding: "10px 12px",
              color: "#e2e8f0",
              fontSize: 13,
              fontFamily: "inherit",
              outline: "none",
            }}
          >
            <option value="customer">Customer</option>
            <option value="vendor">Vendor</option>
            <option value="partner">Partner</option>
            <option value="dealer">Dealer</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: "#00c853",
              color: "#000",
              border: "none",
              borderRadius: 6,
              padding: "12px",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Create Customer
          </button>
          <button
            onClick={onClose}
            style={{
              background: "#333",
              color: "#94a3b8",
              border: "none",
              borderRadius: 6,
              padding: "12px 20px",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
