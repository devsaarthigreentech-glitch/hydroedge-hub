"use client";

import React, { useState } from "react";
import { Customer } from "@/types";

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onUserCreated: (user: any) => void;
}

const GREEN = "#22c55e";
const BORDER = "#e2e8f0";

export function AddUserModal({ isOpen, onClose, customers, onUserCreated }: AddUserModalProps) {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: "user",
    customer_id: "",
    timezone: "Asia/Kolkata",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const set = (field: string) => (e: any) => {
    setForm({ ...form, [field]: e.target.value });
    setError("");
  };

  async function handleSubmit() {
    if (!form.username.trim() || !form.email.trim() || !form.password.trim()) {
      setError("Username, email and password are required");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const payload = {
        ...form,
        customer_id: form.customer_id || null,
      };
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        onUserCreated(json.data);
        setForm({
          username: "", email: "", password: "", full_name: "",
          phone: "", role: "user", customer_id: "", timezone: "Asia/Kolkata",
        });
        onClose();
      } else {
        setError(json.error || "Failed to create user");
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    background: "#fff",
    border: `2px solid ${BORDER}`,
    borderRadius: 8,
    fontSize: 13,
    color: "#0f172a",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
    display: "block",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          width: 520,
          maxHeight: "85vh",
          overflow: "auto",
          boxShadow: "0 25px 50px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: `1px solid ${BORDER}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Add User</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
              Create a new user account
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", fontSize: 20,
              cursor: "pointer", color: "#94a3b8", padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: "20px 24px" }}>
          {/* Credentials section */}
          <div style={{
            fontSize: 11, fontWeight: 700, color: GREEN,
            textTransform: "uppercase", letterSpacing: 1,
            marginBottom: 12, paddingBottom: 6,
            borderBottom: `2px solid ${GREEN}22`,
          }}>
            Credentials
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Username *</label>
              <input style={inputStyle} value={form.username} onChange={set("username")} placeholder="johndoe" />
            </div>
            <div>
              <label style={labelStyle}>Password *</label>
              <input style={inputStyle} type="password" value={form.password} onChange={set("password")} placeholder="Min 6 characters" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Email *</label>
              <input style={inputStyle} type="email" value={form.email} onChange={set("email")} placeholder="john@example.com" />
            </div>
          </div>

          {/* Profile section */}
          <div style={{
            fontSize: 11, fontWeight: 700, color: "#6366f1",
            textTransform: "uppercase", letterSpacing: 1,
            marginBottom: 12, paddingBottom: 6,
            borderBottom: `2px solid #6366f122`,
          }}>
            Profile
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input style={inputStyle} value={form.full_name} onChange={set("full_name")} placeholder="John Doe" />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle} value={form.phone} onChange={set("phone")} placeholder="+91 ..." />
            </div>
          </div>

          {/* Access section */}
          <div style={{
            fontSize: 11, fontWeight: 700, color: "#f59e0b",
            textTransform: "uppercase", letterSpacing: 1,
            marginBottom: 12, paddingBottom: 6,
            borderBottom: `2px solid #f59e0b22`,
          }}>
            Access
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Role</label>
              <select style={inputStyle} value={form.role} onChange={set("role")}>
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="customer_admin">Customer Admin</option>
                <option value="user">User</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Linked Customer</label>
              <select style={inputStyle} value={form.customer_id} onChange={set("customer_id")}>
                <option value="">— None (Platform Admin) —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name || c.name} ({c.customer_type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Timezone</label>
              <select style={inputStyle} value={form.timezone} onChange={set("timezone")}>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="Asia/Kuala_Lumpur">Asia/Kuala_Lumpur (MYT)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
              </select>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 16,
              background: "rgba(239,68,68,0.08)", color: "#ef4444",
              fontSize: 12, fontWeight: 600, border: "1px solid rgba(239,68,68,0.2)",
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: "12px", background: "#f1f5f9",
                border: `1px solid ${BORDER}`, borderRadius: 8,
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                color: "#64748b", fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                flex: 1, padding: "12px",
                background: loading ? "#94a3b8" : GREEN,
                border: "none", borderRadius: 8,
                fontSize: 13, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                color: "#fff", fontFamily: "inherit",
              }}
            >
              {loading ? "Creating..." : "Create User"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}