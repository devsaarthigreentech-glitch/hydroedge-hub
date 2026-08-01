"use client";

// ============================================================================
// Notification subscriptions — who receives alert emails
// ----------------------------------------------------------------------------
// One row per company with a master switch, expandable to per-person switches.
// A person is emailed only when their company is ON, they are ON, their account
// is active, and they have an email address. Muting a company skips its devices
// in the alert scan entirely, so nothing is sent and nothing is logged.
// ============================================================================

import React, { useState, useEffect, useCallback } from "react";

const GREEN  = "#22c55e";
const BORDER = "#e2e8f0";
const MUTED  = "#94a3b8";

interface NotifUser {
  id: string;
  customer_id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  role: string;
  status: string;
  notifications_enabled: boolean;
  receives: boolean;
}

interface NotifCustomer {
  id: string;
  name: string;
  company_name: string | null;
  status: string;
  notifications_enabled: boolean;
  alertable_devices: number;
  users: NotifUser[];
  user_count: number;
  recipient_count: number;
  recipients: string[];
}

interface Summary {
  companies: number;
  companies_subscribed: number;
  companies_unsubscribed: number;
  total_recipients: number;
}

type Filter = "all" | "subscribed" | "unsubscribed";

export function NotificationSettings() {
  const [customers, setCustomers] = useState<NotifCustomer[]>([]);
  const [summary, setSummary]     = useState<Summary | null>(null);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState<Filter>("all");
  const [expanded, setExpanded]   = useState<Set<string>>(new Set());
  // Ids currently mid-request, so a row can show progress and reject double clicks.
  const [busy, setBusy]           = useState<Set<string>>(new Set());
  const [error, setError]         = useState("");

  const load = useCallback(async () => {
    try {
      const res  = await fetch("/api/notifications");
      const json = await res.json();
      if (json.success) {
        setCustomers(json.data);
        setSummary(json.summary);
        setError("");
      } else {
        setError(json.error || "Failed to load notification settings");
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggle(scope: "customer" | "user", id: string, enabled: boolean) {
    if (busy.has(id)) return;
    setBusy((prev) => new Set(prev).add(id));
    setError("");

    // Optimistic: flip locally, roll back if the server disagrees.
    const rollback = customers;
    setCustomers((prev) =>
      prev.map((c) => {
        if (scope === "customer" && c.id === id) {
          return { ...c, notifications_enabled: enabled };
        }
        if (scope === "user" && c.users.some((u) => u.id === id)) {
          return {
            ...c,
            users: c.users.map((u) =>
              u.id === id ? { ...u, notifications_enabled: enabled } : u
            ),
          };
        }
        return c;
      })
    );

    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, id, enabled }),
      });
      const json = await res.json();
      if (!json.success) {
        setCustomers(rollback);
        setError(json.error || "Update failed");
      } else {
        // Refetch so recipient counts and the summary stay truthful.
        await load();
      }
    } catch (e: any) {
      setCustomers(rollback);
      setError(e.message);
    }

    setBusy((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const term = search.trim().toLowerCase();
  const filtered = customers.filter((c) => {
    const matchesSearch =
      !term ||
      c.name.toLowerCase().includes(term) ||
      (c.company_name || "").toLowerCase().includes(term) ||
      c.users.some(
        (u) =>
          (u.email || "").toLowerCase().includes(term) ||
          (u.full_name || u.username).toLowerCase().includes(term)
      );
    const matchesFilter =
      filter === "all" ||
      (filter === "subscribed"   &&  c.notifications_enabled) ||
      (filter === "unsubscribed" && !c.notifications_enabled);
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: MUTED }}>
        Loading notification settings...
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: "#f8fafc", minHeight: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
          Alert Notifications
        </div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 4, lineHeight: 1.6 }}>
          Turn alert emails on or off per company, or per person within a company.
          Muting a company stops every email for it — its devices are skipped by the
          alert scan entirely.
        </div>
      </div>

      {/* Summary tiles */}
      {summary && (
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <Tile label="Companies"    value={summary.companies}              color="#6366f1" />
          <Tile label="Subscribed"   value={summary.companies_subscribed}   color={GREEN} />
          <Tile label="Unsubscribed" value={summary.companies_unsubscribed} color="#ef4444" />
          <Tile label="Recipients"   value={summary.total_recipients}       color="#f59e0b" />
        </div>
      )}

      {error && (
        <div style={{
          marginBottom: 16, padding: "10px 14px", borderRadius: 8,
          background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: 12,
        }}>
          {error}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search companies or people..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 200, padding: "10px 14px", background: "#fff",
            border: `2px solid ${BORDER}`, borderRadius: 8, fontSize: 13,
            color: "#0f172a", outline: "none", fontFamily: "inherit",
          }}
        />
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "subscribed", "unsubscribed"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "10px 16px",
                background: filter === f ? GREEN : "#fff",
                color: filter === f ? "#fff" : "#64748b",
                border: `2px solid ${filter === f ? GREEN : BORDER}`,
                borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Company rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((c) => {
          const isOpen = expanded.has(c.id);
          const on     = c.notifications_enabled;

          return (
            <div
              key={c.id}
              style={{
                background: "#fff",
                border: `1px solid ${on ? BORDER : "#fecaca"}`,
                borderRadius: 12,
                overflow: "hidden",
                opacity: on ? 1 : 0.85,
              }}
            >
              {/* Company row */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px" }}>
                <button
                  onClick={() => toggleExpand(c.id)}
                  title={isOpen ? "Hide people" : "Show people"}
                  style={{
                    width: 26, height: 26, flexShrink: 0, background: "transparent",
                    border: `1px solid ${BORDER}`, borderRadius: 6, cursor: "pointer",
                    color: "#64748b", fontSize: 11, lineHeight: 1, fontFamily: "inherit",
                  }}
                >
                  {isOpen ? "▾" : "▸"}
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                    {c.name}
                    {c.company_name && c.company_name !== c.name && (
                      <span style={{ fontSize: 12, fontWeight: 500, color: MUTED, marginLeft: 8 }}>
                        {c.company_name}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>
                    {on ? (
                      <>
                        {c.recipient_count} of {c.user_count} {c.user_count === 1 ? "person" : "people"} receiving
                        {c.recipient_count === 0 && c.user_count > 0 && (
                          <span style={{ color: "#d97706" }}> — everyone muted individually</span>
                        )}
                        {c.user_count === 0 && (
                          <span style={{ color: "#d97706" }}> — no users linked to this company</span>
                        )}
                      </>
                    ) : (
                      <span style={{ color: "#ef4444", fontWeight: 600 }}>
                        Unsubscribed — no alert emails sent
                      </span>
                    )}
                    <span style={{ marginLeft: 10 }}>
                      · {c.alertable_devices} alertable {c.alertable_devices === 1 ? "device" : "devices"}
                    </span>
                  </div>
                </div>

                <Switch
                  on={on}
                  busy={busy.has(c.id)}
                  onChange={(next) => toggle("customer", c.id, next)}
                  label={on ? "On" : "Off"}
                />
              </div>

              {/* People */}
              {isOpen && (
                <div style={{ borderTop: `1px solid ${BORDER}`, background: "#fafbfc", padding: "8px 18px 12px 58px" }}>
                  {!on && (
                    <div style={{
                      margin: "8px 0", padding: "8px 12px", borderRadius: 8, fontSize: 11,
                      background: "rgba(239,68,68,0.08)", color: "#b91c1c",
                    }}>
                      This company is unsubscribed, so none of these people are emailed
                      regardless of their individual switch.
                    </div>
                  )}

                  {c.users.length === 0 && (
                    <div style={{ padding: "12px 0", fontSize: 12, color: MUTED }}>
                      No users are linked to this company yet. Alert emails go to the users
                      attached to a company, so add one under Users first.
                    </div>
                  )}

                  {c.users.map((u) => {
                    const blockedReason =
                      !u.email             ? "no email address"
                      : u.status !== "active" ? `account ${u.status}`
                      : null;

                    return (
                      <div
                        key={u.id}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "10px 0", borderBottom: `1px solid ${BORDER}`,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                            {u.full_name || u.username}
                            <span style={{ fontSize: 11, color: MUTED, fontWeight: 400, marginLeft: 8 }}>
                              {u.role.replace(/_/g, " ")}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                            {u.email || <span style={{ color: "#d97706" }}>No email address</span>}
                            {blockedReason && u.email && (
                              <span style={{ color: "#d97706", marginLeft: 8 }}>· {blockedReason}</span>
                            )}
                          </div>
                        </div>

                        <Switch
                          on={u.notifications_enabled}
                          busy={busy.has(u.id)}
                          disabled={!!blockedReason}
                          onChange={(next) => toggle("user", u.id, next)}
                          label={
                            blockedReason
                              ? "N/A"
                              : u.notifications_enabled ? "On" : "Off"
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{
          padding: 60, textAlign: "center", color: MUTED,
          background: "#fff", borderRadius: 12, border: `2px dashed ${BORDER}`,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
          <div style={{ fontWeight: 600, color: "#cbd5e1" }}>No companies match</div>
        </div>
      )}
    </div>
  );
}

function Tile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12,
      padding: "14px 20px", minWidth: 110,
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 5 }}>
        {label}
      </div>
    </div>
  );
}

function Switch({
  on,
  busy,
  disabled,
  onChange,
  label,
}: {
  on: boolean;
  busy?: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  const inactive = disabled || busy;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
      <span style={{
        fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
        color: disabled ? MUTED : on ? GREEN : "#ef4444", minWidth: 26, textAlign: "right",
      }}>
        {label}
      </span>
      <button
        role="switch"
        aria-checked={on}
        disabled={inactive}
        onClick={() => onChange(!on)}
        title={disabled ? "Cannot receive email" : on ? "Unsubscribe" : "Subscribe"}
        style={{
          width: 44, height: 24, borderRadius: 12, border: "none", padding: 3,
          background: disabled ? "#e2e8f0" : on ? GREEN : "#cbd5e1",
          cursor: inactive ? "not-allowed" : "pointer",
          opacity: busy ? 0.5 : 1,
          display: "flex", justifyContent: on ? "flex-end" : "flex-start",
          transition: "background 0.15s",
        }}
      >
        <span style={{
          width: 18, height: 18, borderRadius: "50%", background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "all 0.15s",
        }} />
      </button>
    </div>
  );
}
