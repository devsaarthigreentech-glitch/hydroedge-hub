"use client";

import React, { useState, useEffect } from "react";
import { Device } from "@/types";
import { THEME } from "@/lib/theme";

interface AnalyticsTabProps {
  device: Device;
}

interface DailyData {
  day: string;
  distance_km: number;
  fuel_litres: number;
  fuel_average_kmpl: number | null;
}

interface Summary {
  total_distance_km: number;
  total_fuel_litres: number;
  overall_fuel_average_kmpl: number | null;
  days_with_data: number;
}

export function AnalyticsTab({ device }: AnalyticsTabProps) {
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [device.id, days]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics?device_id=${device.id}&days=${days}`);
      const data = await res.json();
      if (data.success) {
        setDailyData(data.data);
        setSummary(data.summary);
      } else {
        setError(data.error || "Failed to load analytics");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const formatDay = (dayStr: string) => {
    const date = new Date(dayStr);
    return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  };

  // Bar chart renderer
  const renderBar = (value: number, max: number, color: string) => {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
        <div style={{
          flex: 1, height: 8, background: THEME.neutral[100],
          borderRadius: 4, overflow: "hidden",
        }}>
          <div style={{
            width: `${pct}%`, height: "100%",
            background: color, borderRadius: 4,
            transition: "width 0.4s ease",
          }} />
        </div>
      </div>
    );
  };

  const maxDistance = Math.max(...dailyData.map((d) => d.distance_km), 1);
  const maxFuel = Math.max(...dailyData.map((d) => d.fuel_litres), 1);

  return (
    <div style={{ padding: 24, background: THEME.background.secondary, minHeight: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: THEME.text.primary }}>
            📊 Analytics
          </div>
          <div style={{ fontSize: 13, color: THEME.text.secondary, marginTop: 4 }}>
            Daily distance, fuel consumption & efficiency
          </div>
        </div>

        {/* Day range selector */}
        <div style={{ display: "flex", gap: 6 }}>
          {[7, 14, 30].map((d) => (
            <button key={d} onClick={() => setDays(d)} style={{
              padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
              background: days === d ? THEME.primary[500] : "white",
              color: days === d ? "white" : THEME.text.secondary,
              border: `2px solid ${days === d ? THEME.primary[500] : THEME.border.light}`,
            }}>
              {d}D
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            {
              label: "Total Distance",
              value: `${summary.total_distance_km.toLocaleString()} km`,
              icon: "🛣️",
              color: THEME.primary[500],
              bg: THEME.primary[50],
            },
            {
              label: "Total Fuel Used",
              value: `${summary.total_fuel_litres.toLocaleString()} L`,
              icon: "⛽",
              color: "#f59e0b",
              bg: "#fffbeb",
            },
            {
              label: "Overall Efficiency",
              value: summary.overall_fuel_average_kmpl
                ? `${summary.overall_fuel_average_kmpl} km/L`
                : "N/A",
              icon: "📈",
              color: "#3b82f6",
              bg: "#eff6ff",
            },
          ].map((card) => (
            <div key={card.label} style={{
              background: card.bg,
              border: `2px solid ${card.color}30`,
              borderRadius: 14, padding: 20,
              boxShadow: THEME.shadow.sm,
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{card.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: card.color, marginBottom: 4 }}>
                {card.value}
              </div>
              <div style={{ fontSize: 12, color: THEME.text.tertiary, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {card.label}
              </div>
              <div style={{ fontSize: 11, color: THEME.text.tertiary, marginTop: 4 }}>
                Last {days} days · {summary.days_with_data} days with data
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            border: `3px solid ${THEME.border.light}`,
            borderTop: `3px solid ${THEME.primary[500]}`,
            animation: "spin 1s linear infinite",
          }} />
        </div>
      ) : error ? (
        <div style={{
          padding: 24, background: "#fef2f2", border: "2px solid #fca5a5",
          borderRadius: 12, color: "#dc2626", fontSize: 14,
        }}>
          ⚠️ {error}
        </div>
      ) : dailyData.length === 0 ? (
        <div style={{
          padding: 40, textAlign: "center", background: "white",
          borderRadius: 12, border: `2px solid ${THEME.border.light}`,
          color: THEME.text.tertiary, fontSize: 14,
        }}>
          No data available for this period. IO 105 (mileage) or fuel IO records may not be present yet.
        </div>
      ) : (
        <div style={{
          background: "white", borderRadius: 14,
          border: `2px solid ${THEME.border.light}`,
          overflow: "hidden", boxShadow: THEME.shadow.sm,
        }}>
          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "140px 1fr 1fr 1fr 120px",
            gap: 12, padding: "12px 20px",
            background: THEME.neutral[50],
            borderBottom: `2px solid ${THEME.border.light}`,
            fontSize: 11, fontWeight: 700, color: THEME.text.tertiary,
            textTransform: "uppercase", letterSpacing: 0.5,
          }}>
            <div>Date</div>
            <div>Distance (km)</div>
            <div>Fuel Used (L)</div>
            <div>Efficiency</div>
            <div style={{ textAlign: "right" }}>km/L</div>
          </div>

          {/* Table rows */}
          {dailyData.map((row, i) => (
            <div key={row.day} style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr 1fr 1fr 120px",
              gap: 12, padding: "16px 20px", alignItems: "center",
              borderBottom: i < dailyData.length - 1 ? `1px solid ${THEME.border.light}` : "none",
              background: i % 2 === 0 ? "white" : THEME.neutral[50],
            }}>
              {/* Date */}
              <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text.primary }}>
                {formatDay(row.day)}
              </div>

              {/* Distance bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {renderBar(row.distance_km, maxDistance, THEME.primary[400])}
                <span style={{ fontSize: 13, fontWeight: 700, color: THEME.primary[600], minWidth: 60, textAlign: "right" }}>
                  {row.distance_km} km
                </span>
              </div>

              {/* Fuel bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {renderBar(row.fuel_litres, maxFuel, "#f59e0b")}
                <span style={{ fontSize: 13, fontWeight: 700, color: "#d97706", minWidth: 50, textAlign: "right" }}>
                  {row.fuel_litres} L
                </span>
              </div>

              {/* Efficiency bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {row.fuel_average_kmpl ? (
                  <>
                    {renderBar(row.fuel_average_kmpl, 20, "#3b82f6")}
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#2563eb", minWidth: 60, textAlign: "right" }}>
                      {row.fuel_average_kmpl} km/L
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: 12, color: THEME.text.tertiary }}>No fuel data</span>
                )}
              </div>

              {/* Badge */}
              <div style={{ textAlign: "right" }}>
                {row.fuel_average_kmpl ? (
                  <span style={{
                    padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: row.fuel_average_kmpl >= 12 ? "#dcfce7" : row.fuel_average_kmpl >= 8 ? "#fef9c3" : "#fee2e2",
                    color: row.fuel_average_kmpl >= 12 ? "#16a34a" : row.fuel_average_kmpl >= 8 ? "#ca8a04" : "#dc2626",
                  }}>
                    {row.fuel_average_kmpl >= 12 ? "✓ Good" : row.fuel_average_kmpl >= 8 ? "~ Avg" : "↓ Low"}
                  </span>
                ) : "—"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}