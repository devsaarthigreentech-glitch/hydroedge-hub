"use client";

import React, { useState, useEffect } from "react";
import { Customer } from "@/types";

interface User {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  customer_id: string | null;
  status: string;
  last_login_at: string | null;
  created_at: string;
  customer_name: string | null;
  customer_company: string | null;
  customer_type: string | null;
  timezone: string;
}

interface UserListProps {
  customers: Customer[];
  onAddUser: () => void;
}

const GREEN = "#22c55e";
const BORDER = "#e2e8f0";

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  super_admin: { bg: "rgba(239,68,68,0.1)", color: "#ef4444" },
  admin:       { bg: "rgba(168,85,247,0.1)", color: "#a855f7" },
  customer_admin: { bg: "rgba(59,130,246,0.1)", color: "#3b82f6" },
  user:        { bg: "rgba(34,197,94,0.1)",  color: GREEN },
  viewer:      { bg: "rgba(148,163,184,0.1)", color: "#94a3b8" },
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function UserList({ customers, onAddUser }: UserListProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const json = await res.json();
      if (json.success) setUsers(json.data);
    } catch (e) {
      console.error("Failed to fetch users:", e);
    }
    setLoading(false);
  }

  const filtered = users.filter((u) => {
    const matchesSearch =
      !search ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.customer_name || "").toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roles = [...new Set(users.map((u) => u.role))];

  async function handleDelete(user: User) {
    if (!confirm(`Delete user "${user.username}"? This is a soft delete.`)) return;
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
        if (editingUser?.id === user.id) setEditingUser(null);
      }
    } catch (e) {
      console.error("Delete failed:", e);
    }
  }

  function startEdit(user: User) {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name || "",
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      customer_id: user.customer_id || "",
      status: user.status,
      timezone: user.timezone || "Asia/Kolkata",
      password: "",
    });
    setError("");
  }

  async function handleSave() {
    if (!editingUser) return;
    setSaving(true);
    setError("");
    try {
      const payload: any = { ...editForm };
      if (!payload.password) delete payload.password;
      if (!payload.customer_id) payload.customer_id = null;

      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === editingUser.id ? { ...u, ...json.data } : u))
        );
        setEditingUser(null);
      } else {
        setError(json.error || "Update failed");
      }
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
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
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
    display: "block",
  };

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "#94a3b8" }}>
        Loading users...
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: "#f8fafc", minHeight: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Users</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
            {users.length} total · {users.filter((u) => u.status === "active").length} active
          </div>
        </div>
        <button
          onClick={onAddUser}
          style={{
            padding: "10px 20px",
            background: GREEN,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          + Add User
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 200 }}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ ...inputStyle, width: 160, flex: "none" }}
        >
          <option value="all">All Roles</option>
          {roles.map((r) => (
            <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {/* User cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((user) => {
          const rc = ROLE_COLORS[user.role] || ROLE_COLORS.user;
          const isEditing = editingUser?.id === user.id;

          return (
            <div
              key={user.id}
              style={{
                background: "#fff",
                border: `1px solid ${isEditing ? GREEN : BORDER}`,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              {/* User row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 18px",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: `linear-gradient(135deg, ${rc.color}44, ${rc.color}22)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: rc.color,
                    fontWeight: 800,
                    fontSize: 15,
                    flexShrink: 0,
                    border: `2px solid ${rc.color}33`,
                  }}
                >
                  {(user.full_name || user.username)[0].toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                      {user.full_name || user.username}
                    </span>
                    <span style={{
                      fontSize: 11, color: "#94a3b8",
                      fontFamily: "JetBrains Mono, monospace",
                    }}>
                      @{user.username}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <span>{user.email}</span>
                    {user.customer_name && (
                      <span style={{ color: "#6366f1" }}>
                        {user.customer_name}
                        {user.customer_type && ` · ${user.customer_type}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Role badge */}
                <div
                  style={{
                    padding: "4px 10px",
                    borderRadius: 8,
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    background: rc.bg,
                    color: rc.color,
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.role.replace(/_/g, " ")}
                </div>

                {/* Status */}
                <div
                  style={{
                    padding: "4px 10px",
                    borderRadius: 8,
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    background: user.status === "active" ? "rgba(34,197,94,0.1)" : "rgba(148,163,184,0.1)",
                    color: user.status === "active" ? GREEN : "#94a3b8",
                  }}
                >
                  {user.status}
                </div>

                {/* Last login */}
                <div style={{ fontSize: 11, color: "#94a3b8", minWidth: 70, textAlign: "right" }}>
                  {timeAgo(user.last_login_at)}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => isEditing ? setEditingUser(null) : startEdit(user)}
                    style={{
                      padding: "6px 12px",
                      background: isEditing ? "#f1f5f9" : "transparent",
                      border: `1px solid ${BORDER}`,
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      color: isEditing ? "#ef4444" : "#64748b",
                      fontFamily: "inherit",
                    }}
                  >
                    {isEditing ? "Cancel" : "Edit"}
                  </button>
                  <button
                    onClick={() => handleDelete(user)}
                    style={{
                      padding: "6px 10px",
                      background: "transparent",
                      border: `1px solid ${BORDER}`,
                      borderRadius: 6,
                      fontSize: 11,
                      cursor: "pointer",
                      color: "#ef4444",
                      fontFamily: "inherit",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Inline edit form */}
              {isEditing && (
                <div style={{
                  padding: "16px 18px",
                  borderTop: `1px solid ${BORDER}`,
                  background: "#fafbfc",
                }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Full Name</label>
                      <input
                        style={inputStyle}
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Email</label>
                      <input
                        style={inputStyle}
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Phone</label>
                      <input
                        style={inputStyle}
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Role</label>
                      <select
                        style={inputStyle}
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      >
                        <option value="super_admin">Super Admin</option>
                        <option value="admin">Admin</option>
                        <option value="customer_admin">Customer Admin</option>
                        <option value="user">User</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Customer</label>
                      <select
                        style={inputStyle}
                        value={editForm.customer_id}
                        onChange={(e) => setEditForm({ ...editForm, customer_id: e.target.value })}
                      >
                        <option value="">— No Customer —</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.company_name || c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Status</label>
                      <select
                        style={inputStyle}
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      >
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Timezone</label>
                      <select
                        style={inputStyle}
                        value={editForm.timezone}
                        onChange={(e) => setEditForm({ ...editForm, timezone: e.target.value })}
                      >
                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                        <option value="Asia/Kuala_Lumpur">Asia/Kuala_Lumpur (MYT)</option>
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">America/New_York (EST)</option>
                        <option value="Europe/London">Europe/London (GMT)</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>New Password</label>
                      <input
                        style={inputStyle}
                        type="password"
                        placeholder="Leave empty to keep current"
                        value={editForm.password}
                        onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      />
                    </div>
                  </div>

                  {error && (
                    <div style={{
                      marginTop: 12, padding: "8px 14px", borderRadius: 8,
                      background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: 12,
                    }}>
                      {error}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                    <button
                      onClick={() => setEditingUser(null)}
                      style={{
                        padding: "8px 20px", background: "#f1f5f9", border: `1px solid ${BORDER}`,
                        borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                        color: "#64748b", fontFamily: "inherit",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      style={{
                        padding: "8px 24px", background: saving ? "#94a3b8" : GREEN,
                        border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700,
                        cursor: saving ? "not-allowed" : "pointer", color: "#fff",
                        fontFamily: "inherit",
                      }}
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{
          padding: 60, textAlign: "center", color: "#94a3b8",
          background: "#fff", borderRadius: 12, border: `2px dashed ${BORDER}`,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
          <div style={{ fontWeight: 600, color: "#cbd5e1" }}>No users found</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            {search ? "Try a different search" : "Create your first user"}
          </div>
        </div>
      )}
    </div>
  );
}