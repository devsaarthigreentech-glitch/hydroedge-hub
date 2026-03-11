"use client";

import { useState, useEffect } from "react";
import { Device } from "@/types";

interface Props {
  customerId: string;
  assetTypes: string[]; // pre-fetched from CustomerDetail
  onDeviceSelect: (device: Device) => void;
}

const GREEN = "#22c55e";
const BORDER = "#e2e8f0";

function timeAgo(ts?: string | null): string {
  if (!ts) return "Never";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function CustomerDevicesTab({ customerId, assetTypes, onDeviceSelect }: Props) {
  const [devices, setDevices]           = useState<Device[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<string>("all");
  const [search, setSearch]             = useState("");

  // Fetch devices whenever filter changes
  useEffect(() => {
    fetchDevices(selectedAsset === "all" ? null : selectedAsset);
  }, [customerId, selectedAsset]);

  async function fetchDevices(assetType: string | null) {
    setLoading(true);
    try {
      const url = `/api/customers/${customerId}/devices${assetType ? `?asset_type=${encodeURIComponent(assetType)}` : ""}`;
      const res  = await fetch(url);
      const json = await res.json();
      if (json.success) setDevices(json.data);
    } catch (e) {
      console.error("fetchDevices error:", e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = devices.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      d.device_name?.toLowerCase().includes(q) ||
      d.imei?.toLowerCase().includes(q) ||
      d.asset_name?.toLowerCase().includes(q)
    );
  });

  // Count per asset type (from full device list before filter)
  const allDevices = devices; // always re-fetches for selected asset
  // Show counts from assetTypes prop (derived from full set at CustomerDetail level)

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Asset type pill filter */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 20px",
          background: "#fff",
          borderBottom: `1px solid ${BORDER}`,
          flexWrap: "wrap",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginRight: 4 }}>
          ASSET TYPE
        </span>

        {/* "All" pill */}
        <Pill
          label="All"
          active={selectedAsset === "all"}
          onClick={() => setSelectedAsset("all")}
        />

        {/* Dynamic asset type pills */}
        {assetTypes.map((type) => (
          <Pill
            key={type}
            label={type}
            active={selectedAsset === type}
            onClick={() => setSelectedAsset(type)}
          />
        ))}

        {assetTypes.length === 0 && (
          <span style={{ fontSize: 11, color: "#cbd5e1" }}>
            No asset types assigned to devices yet
          </span>
        )}
      </div>

      {/* Search bar */}
      <div
        style={{
          padding: "10px 20px",
          background: "#f8fafc",
          borderBottom: `1px solid ${BORDER}`,
          flexShrink: 0,
        }}
      >
        <input
          type="text"
          placeholder="Search by name, IMEI or asset..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            fontSize: 12,
            outline: "none",
            background: "#fff",
            color: "#0f172a",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Device list */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
            Loading devices…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
            No devices found
            {selectedAsset !== "all" && ` for asset type "${selectedAsset}"`}
          </div>
        ) : (
          filtered.map((device, idx) => {
            const isOnline = device.connection_status === "online";
            return (
              <div
                key={device.id}
                onClick={() => onDeviceSelect(device)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "13px 20px",
                  borderBottom: `1px solid ${BORDER}`,
                  cursor: "pointer",
                  background: idx % 2 === 0 ? "#fff" : "#fafafa",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(34,197,94,0.04)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#fafafa")
                }
              >
                {/* Status dot */}
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: isOnline ? GREEN : "#e2e8f0",
                    flexShrink: 0,
                    boxShadow: isOnline ? `0 0 6px rgba(34,197,94,0.5)` : "none",
                  }}
                />

                {/* Name + IMEI */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", lineHeight: 1.3 }}>
                    {device.device_name || device.imei}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
                    {device.imei} · {device.manufacturer} {device.device_type}
                  </div>
                </div>

                {/* Asset info */}
                <div style={{ textAlign: "right", minWidth: 0 }}>
                  {device.asset_name && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
                      {device.asset_name}
                    </div>
                  )}
                  {device.asset_type && (
                    <div
                      style={{
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 10,
                        background: "rgba(99,102,241,0.08)",
                        color: "#6366f1",
                        fontWeight: 600,
                        display: "inline-block",
                        marginTop: 2,
                      }}
                    >
                      {device.asset_type}
                    </div>
                  )}
                </div>

                {/* Last seen */}
                <div style={{ textAlign: "right", fontSize: 11, color: "#94a3b8", flexShrink: 0, minWidth: 60 }}>
                  <div style={{ color: isOnline ? GREEN : "#94a3b8", fontWeight: isOnline ? 700 : 400 }}>
                    {isOnline ? "Online" : "Offline"}
                  </div>
                  <div>{timeAgo(device.last_location_time)}</div>
                </div>

                {/* Arrow */}
                <div style={{ color: "#cbd5e1", fontSize: 14 }}>›</div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer count */}
      {!loading && (
        <div
          style={{
            padding: "8px 20px",
            borderTop: `1px solid ${BORDER}`,
            background: "#fff",
            fontSize: 11,
            color: "#94a3b8",
            flexShrink: 0,
          }}
        >
          {filtered.length} device{filtered.length !== 1 ? "s" : ""}
          {selectedAsset !== "all" && ` · ${selectedAsset}`}
        </div>
      )}
    </div>
  );
}

// ─── Pill sub-component ───────────────────────────────────────────────────────
function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 14px",
        borderRadius: 20,
        border: active ? `1.5px solid ${GREEN}` : `1.5px solid #e2e8f0`,
        background: active ? `rgba(34,197,94,0.1)` : "#fff",
        color: active ? "#16a34a" : "#64748b",
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}