"use client";

import { Customer } from "@/types";

interface Props {
  subCustomers: Customer[];
  allCustomers: Customer[];
}

const BORDER = "#e2e8f0";
const GREEN  = "#22c55e";

export function CustomerSubTab({ subCustomers, allCustomers }: Props) {
  if (subCustomers.length === 0) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "#94a3b8" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🏢</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#cbd5e1" }}>No sub-organizations</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>
          This customer has no child organizations yet.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 12, fontSize: 12, color: "#94a3b8" }}>
        {subCustomers.length} sub-organization{subCustomers.length !== 1 ? "s" : ""}
      </div>
      {subCustomers.map((sub) => {
        const childCount = allCustomers.filter(
          (c) => c.parent_customer_id === sub.id
        ).length;

        return (
          <div
            key={sub.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 16px",
              background: "#fff",
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              marginBottom: 10,
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 800,
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              {(sub.company_name || sub.name || "?")[0].toUpperCase()}
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                {sub.company_name || sub.name}
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                {sub.email} · {sub.customer_type}
              </div>
            </div>

            {/* Status */}
            <div
              style={{
                padding: "3px 10px",
                borderRadius: 10,
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                background:
                  sub.status === "active"
                    ? "rgba(34,197,94,0.1)"
                    : "rgba(148,163,184,0.1)",
                color: sub.status === "active" ? GREEN : "#94a3b8",
              }}
            >
              {sub.status}
            </div>

            {/* Child count */}
            {childCount > 0 && (
              <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>
                +{childCount} sub
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}