// "use client";

// import React, { useState, useEffect } from "react";
// import { Device } from "@/types";
// import { THEME } from "@/lib/theme";

// interface AnalyticsTabProps {
//   device: Device;
// }

// interface DailyData {
//   day: string;
//   distance_km: number;
//   fuel_litres: number;
//   fuel_average_kmpl: number | null;
// }

// interface Summary {
//   total_distance_km: number;
//   total_fuel_litres: number;
//   overall_fuel_average_kmpl: number | null;
//   days_with_data: number;
// }

// export function AnalyticsTab({ device }: AnalyticsTabProps) {
//   const [dailyData, setDailyData] = useState<DailyData[]>([]);
//   const [summary, setSummary] = useState<Summary | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [days, setDays] = useState(1);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     fetchAnalytics();
//   }, [device.id, days]);

//   const fetchAnalytics = async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const res = await fetch(`/api/analytics?device_id=${device.id}&days=${days}`);
//       const data = await res.json();
//       if (data.success) {
//         setDailyData(data.data);
//         setSummary(data.summary);
//       } else {
//         setError(data.error || "Failed to load analytics");
//       }
//     } catch (err) {
//       setError("Network error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const formatDay = (dayStr: string) => {
//     const date = new Date(dayStr);
//     return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
//   };

//   // Bar chart renderer
//   const renderBar = (value: number, max: number, color: string) => {
//     const pct = max > 0 ? (value / max) * 100 : 0;
//     return (
//       <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
//         <div style={{
//           flex: 1, height: 8, background: THEME.neutral[100],
//           borderRadius: 4, overflow: "hidden",
//         }}>
//           <div style={{
//             width: `${pct}%`, height: "100%",
//             background: color, borderRadius: 4,
//             transition: "width 0.4s ease",
//           }} />
//         </div>
//       </div>
//     );
//   };

//   const maxDistance = Math.max(...dailyData.map((d) => d.distance_km), 1);
//   const maxFuel = Math.max(...dailyData.map((d) => d.fuel_litres), 1);

//   return (
//     <div style={{ padding: 24, background: THEME.background.secondary, minHeight: "100%" }}>
//       {/* Header */}
//       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
//         <div>
//           <div style={{ fontSize: 20, fontWeight: 700, color: THEME.text.primary }}>
//             📊 Analytics
//           </div>
//           <div style={{ fontSize: 13, color: THEME.text.secondary, marginTop: 4 }}>
//             Daily distance, fuel consumption & efficiency
//           </div>
//         </div>

//         {/* Day range selector */}
//         <div style={{ display: "flex", gap: 6 }}>
//           {[1, 7, 14].map((d) => (
//             <button key={d} onClick={() => setDays(d)} style={{
//               padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
//               cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
//               background: days === d ? THEME.primary[500] : "white",
//               color: days === d ? "white" : THEME.text.secondary,
//               border: `2px solid ${days === d ? THEME.primary[500] : THEME.border.light}`,
//             }}>
//               {d}D
//             </button>
//           ))}
//         </div>
//       </div>

//       {/* Summary Cards */}
//       {summary && (
//         <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
//           {[
//             {
//               label: "Total Distance",
//               value: `${summary.total_distance_km.toLocaleString()} km`,
//               icon: "🛣️",
//               color: THEME.primary[500],
//               bg: THEME.primary[50],
//             },
//             {
//               label: "Total Fuel Used",
//               value: `${summary.total_fuel_litres.toLocaleString()} L`,
//               icon: "⛽",
//               color: "#f59e0b",
//               bg: "#fffbeb",
//             },
//             {
//               label: "Overall Efficiency",
//               value: summary.overall_fuel_average_kmpl
//                 ? `${summary.overall_fuel_average_kmpl} km/L`
//                 : "N/A",
//               icon: "📈",
//               color: "#3b82f6",
//               bg: "#eff6ff",
//             },
//           ].map((card) => (
//             <div key={card.label} style={{
//               background: card.bg,
//               border: `2px solid ${card.color}30`,
//               borderRadius: 14, padding: 20,
//               boxShadow: THEME.shadow.sm,
//             }}>
//               <div style={{ fontSize: 28, marginBottom: 8 }}>{card.icon}</div>
//               <div style={{ fontSize: 22, fontWeight: 800, color: card.color, marginBottom: 4 }}>
//                 {card.value}
//               </div>
//               <div style={{ fontSize: 12, color: THEME.text.tertiary, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
//                 {card.label}
//               </div>
//               <div style={{ fontSize: 11, color: THEME.text.tertiary, marginTop: 4 }}>
//                 Last {days} days · {summary.days_with_data} days with data
//               </div>
//             </div>
//           ))}
//         </div>
//       )}

//       {loading ? (
//         <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
//           <div style={{
//             width: 40, height: 40, borderRadius: "50%",
//             border: `3px solid ${THEME.border.light}`,
//             borderTop: `3px solid ${THEME.primary[500]}`,
//             animation: "spin 1s linear infinite",
//           }} />
//         </div>
//       ) : error ? (
//         <div style={{
//           padding: 24, background: "#fef2f2", border: "2px solid #fca5a5",
//           borderRadius: 12, color: "#dc2626", fontSize: 14,
//         }}>
//           ⚠️ {error}
//         </div>
//       ) : dailyData.length === 0 ? (
//         <div style={{
//           padding: 40, textAlign: "center", background: "white",
//           borderRadius: 12, border: `2px solid ${THEME.border.light}`,
//           color: THEME.text.tertiary, fontSize: 14,
//         }}>
//           No data available for this period. IO 105 (mileage) or fuel IO records may not be present yet.
//         </div>
//       ) : (
//         <div style={{
//           background: "white", borderRadius: 14,
//           border: `2px solid ${THEME.border.light}`,
//           overflow: "hidden", boxShadow: THEME.shadow.sm,
//         }}>
//           {/* Table header */}
//           <div style={{
//             display: "grid",
//             gridTemplateColumns: "140px 1fr 1fr 1fr 120px",
//             gap: 12, padding: "12px 20px",
//             background: THEME.neutral[50],
//             borderBottom: `2px solid ${THEME.border.light}`,
//             fontSize: 11, fontWeight: 700, color: THEME.text.tertiary,
//             textTransform: "uppercase", letterSpacing: 0.5,
//           }}>
//             <div>Date</div>
//             <div>Distance (km)</div>
//             <div>Fuel Used (L)</div>
//             <div>Efficiency</div>
//             <div style={{ textAlign: "right" }}>km/L</div>
//           </div>

//           {/* Table rows */}
//           {dailyData.map((row, i) => (
//             <div key={row.day} style={{
//               display: "grid",
//               gridTemplateColumns: "140px 1fr 1fr 1fr 120px",
//               gap: 12, padding: "16px 20px", alignItems: "center",
//               borderBottom: i < dailyData.length - 1 ? `1px solid ${THEME.border.light}` : "none",
//               background: i % 2 === 0 ? "white" : THEME.neutral[50],
//             }}>
//               {/* Date */}
//               <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text.primary }}>
//                 {formatDay(row.day)}
//               </div>

//               {/* Distance bar */}
//               <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//                 {renderBar(row.distance_km, maxDistance, THEME.primary[400])}
//                 <span style={{ fontSize: 13, fontWeight: 700, color: THEME.primary[600], minWidth: 60, textAlign: "right" }}>
//                   {row.distance_km} km
//                 </span>
//               </div>

//               {/* Fuel bar */}
//               <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//                 {renderBar(row.fuel_litres, maxFuel, "#f59e0b")}
//                 <span style={{ fontSize: 13, fontWeight: 700, color: "#d97706", minWidth: 50, textAlign: "right" }}>
//                   {row.fuel_litres} L
//                 </span>
//               </div>

//               {/* Efficiency bar */}
//               <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//                 {row.fuel_average_kmpl ? (
//                   <>
//                     {renderBar(row.fuel_average_kmpl, 20, "#3b82f6")}
//                     <span style={{ fontSize: 13, fontWeight: 700, color: "#2563eb", minWidth: 60, textAlign: "right" }}>
//                       {row.fuel_average_kmpl} km/L
//                     </span>
//                   </>
//                 ) : (
//                   <span style={{ fontSize: 12, color: THEME.text.tertiary }}>No fuel data</span>
//                 )}
//               </div>

//               {/* Badge */}
//               <div style={{ textAlign: "right" }}>
//                 {row.fuel_average_kmpl ? (
//                   <span style={{
//                     padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
//                     background: row.fuel_average_kmpl >= 12 ? "#dcfce7" : row.fuel_average_kmpl >= 8 ? "#fef9c3" : "#fee2e2",
//                     color: row.fuel_average_kmpl >= 12 ? "#16a34a" : row.fuel_average_kmpl >= 8 ? "#ca8a04" : "#dc2626",
//                   }}>
//                     {row.fuel_average_kmpl >= 12 ? "✓ Good" : row.fuel_average_kmpl >= 8 ? "~ Avg" : "↓ Low"}
//                   </span>
//                 ) : "—"}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }
"use client";

import React, { useState, useEffect, useRef } from "react";
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

// CO2 emission factor: 1 litre diesel = 2.68 kg CO2
const CO2_PER_LITRE = 2.68;

export function AnalyticsTab({ device }: AnalyticsTabProps) {
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Baseline fuel average — editable by user, persisted in localStorage
  const [baselineKmpl, setBaselineKmpl] = useState<number>(10);
  const [editingBaseline, setEditingBaseline] = useState(false);
  const [baselineInput, setBaselineInput] = useState("10");
  const baselineRef = useRef<HTMLInputElement>(null);

  // Load saved baseline on mount
  useEffect(() => {
    const saved = localStorage.getItem(`baseline_kmpl_${device.id}`);
    if (saved) {
      const val = parseFloat(saved);
      if (!isNaN(val) && val > 0) {
        setBaselineKmpl(val);
        setBaselineInput(val.toString());
      }
    }
  }, [device.id]);

  useEffect(() => {
    fetchAnalytics();
  }, [device.id, days]);

  useEffect(() => {
    if (editingBaseline && baselineRef.current) {
      baselineRef.current.focus();
      baselineRef.current.select();
    }
  }, [editingBaseline]);

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
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleBaselineSave = () => {
    const val = parseFloat(baselineInput);
    if (!isNaN(val) && val > 0) {
      setBaselineKmpl(val);
      localStorage.setItem(`baseline_kmpl_${device.id}`, val.toString());
    }
    setEditingBaseline(false);
  };

  const formatDay = (dayStr: string) => {
    const date = new Date(dayStr);
    return date.toLocaleDateString("en-IN", {
      weekday: "short", day: "numeric", month: "short",
    });
  };

  // ── Derived metrics ────────────────────────────────────────────────────────

  // Days that have both distance and fuel
  const validDays = dailyData.filter(
    (d) => d.fuel_average_kmpl !== null && d.fuel_litres > 0
  );

  // Baseline fuel consumption per day (what would have been used at baseline efficiency)
  const baselineFuelTotal = validDays.reduce((sum, d) => {
    const baselineFuel = d.distance_km / baselineKmpl;
    return sum + baselineFuel;
  }, 0);

  const actualFuelTotal = validDays.reduce((sum, d) => sum + d.fuel_litres, 0);
  const fuelSaved = parseFloat((baselineFuelTotal - actualFuelTotal).toFixed(2));
  const co2Saved = parseFloat((Math.abs(fuelSaved) * CO2_PER_LITRE).toFixed(2));
  const isImprovedOverBaseline = fuelSaved > 0;

  // Max value for chart scaling
  const maxKmpl = Math.max(
    ...dailyData.map((d) => d.fuel_average_kmpl ?? 0),
    baselineKmpl,
    1
  );

  // ── SVG Line Chart ─────────────────────────────────────────────────────────

  const renderComparisonChart = () => {
    const chartData = [...dailyData].reverse(); // chronological order
    if (chartData.length === 0) return null;

    const W = 700;
    const H = 200;
    const PAD = { top: 20, right: 20, bottom: 36, left: 50 };
    const gW = W - PAD.left - PAD.right;
    const gH = H - PAD.top - PAD.bottom;
    const n = chartData.length;

    const xPos = (i: number) =>
      PAD.left + (n === 1 ? gW / 2 : (i / (n - 1)) * gW);
    const yPos = (v: number) =>
      PAD.top + gH - ((v / (maxKmpl * 1.15)) * gH);

    // Actual efficiency points (only valid ones)
    const actualPoints = chartData
      .map((d, i) =>
        d.fuel_average_kmpl !== null
          ? { x: xPos(i), y: yPos(d.fuel_average_kmpl), v: d.fuel_average_kmpl }
          : null
      )
      .filter(Boolean) as { x: number; y: number; v: number }[];

    const actualPath =
      actualPoints.length > 1
        ? `M ${actualPoints.map((p) => `${p.x},${p.y}`).join(" L ")}`
        : "";

    // Baseline — straight horizontal line
    const baseY = yPos(baselineKmpl);

    // Y-axis grid values
    const gridVals = [0, 0.25, 0.5, 0.75, 1].map(
      (f) => parseFloat((maxKmpl * 1.15 * f).toFixed(1))
    );

    return (
      <div style={{ width: "100%", overflowX: "auto" }}>
        <svg width={W} height={H} style={{ display: "block", overflow: "visible" }}>
          <defs>
            <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={THEME.primary[500]} stopOpacity={0.3} />
              <stop offset="100%" stopColor={THEME.primary[500]} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="baselineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {gridVals.map((v) => {
            const y = yPos(v);
            return (
              <g key={v}>
                <line
                  x1={PAD.left} y1={y} x2={PAD.left + gW} y2={y}
                  stroke={THEME.border.light} strokeWidth={1} strokeDasharray="4,4"
                />
                <text x={PAD.left - 8} y={y + 4} fill={THEME.text.tertiary}
                  fontSize={10} textAnchor="end">
                  {v}
                </text>
              </g>
            );
          })}

          {/* Baseline filled area */}
          <path
            d={`M ${PAD.left},${baseY} L ${PAD.left + gW},${baseY} L ${PAD.left + gW},${PAD.top + gH} L ${PAD.left},${PAD.top + gH} Z`}
            fill="url(#baselineGrad)"
          />

          {/* Baseline line */}
          <line
            x1={PAD.left} y1={baseY} x2={PAD.left + gW} y2={baseY}
            stroke="#f59e0b" strokeWidth={2} strokeDasharray="8,4"
          />
          <text x={PAD.left + gW + 6} y={baseY + 4}
            fill="#f59e0b" fontSize={10} fontWeight="700">
            Base {baselineKmpl}
          </text>

          {/* Actual area fill */}
          {actualPoints.length > 1 && (
            <path
              d={`${actualPath} L ${actualPoints[actualPoints.length - 1].x},${PAD.top + gH} L ${actualPoints[0].x},${PAD.top + gH} Z`}
              fill="url(#actualGrad)"
            />
          )}

          {/* Actual line */}
          {actualPath && (
            <path
              d={actualPath} fill="none"
              stroke={THEME.primary[500]} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
            />
          )}

          {/* Actual data points */}
          {actualPoints.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={5} fill="white"
                stroke={THEME.primary[500]} strokeWidth={2.5} />
              <title>{p.v.toFixed(2)} km/L</title>
            </g>
          ))}

          {/* X-axis labels */}
          {chartData.map((d, i) => (
            <text
              key={i}
              x={xPos(i)} y={H - 6}
              fill={THEME.text.tertiary} fontSize={10} textAnchor="middle"
            >
              {new Date(d.day).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </text>
          ))}

          {/* Y-axis label */}
          <text
            x={14} y={PAD.top + gH / 2}
            fill={THEME.text.secondary} fontSize={11} textAnchor="middle"
            transform={`rotate(-90, 14, ${PAD.top + gH / 2})`}
          >
            km/L
          </text>
        </svg>

        {/* Chart legend */}
        <div style={{ display: "flex", gap: 20, marginTop: 12, paddingLeft: PAD.left }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 20, height: 3, background: THEME.primary[500], borderRadius: 2 }} />
            <span style={{ fontSize: 12, color: THEME.text.secondary }}>Actual efficiency</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 20, height: 3, background: "#f59e0b", borderRadius: 2,
              backgroundImage: "repeating-linear-gradient(90deg, #f59e0b 0, #f59e0b 6px, transparent 6px, transparent 10px)",
            }} />
            <span style={{ fontSize: 12, color: THEME.text.secondary }}>Baseline ({baselineKmpl} km/L)</span>
          </div>
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 24, background: THEME.background.secondary, minHeight: "100%", overflowY: "auto" }}>

      {/* ── Header row ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: THEME.text.primary, letterSpacing: -0.5 }}>
            📊 Fleet Analytics
          </div>
          <div style={{ fontSize: 13, color: THEME.text.secondary, marginTop: 4 }}>
            {device.device_name} · Daily distance, fuel & efficiency
          </div>
        </div>

        {/* Day range pills */}
        <div style={{ display: "flex", gap: 6, background: THEME.neutral[100], padding: 4, borderRadius: 10 }}>
          {[1, 7, 14].map((d) => (
            <button key={d} onClick={() => setDays(d)} style={{
              padding: "7px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit", border: "none", transition: "all 0.2s",
              background: days === d ? THEME.primary[500] : "transparent",
              color: days === d ? "white" : THEME.text.secondary,
              boxShadow: days === d ? THEME.shadow.sm : "none",
            }}>
              {d}D
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            border: `3px solid ${THEME.border.light}`,
            borderTop: `3px solid ${THEME.primary[500]}`,
            animation: "spin 1s linear infinite",
          }} />
        </div>
      ) : error ? (
        <div style={{
          padding: 20, background: "#fef2f2", border: "2px solid #fca5a5",
          borderRadius: 12, color: "#dc2626", fontSize: 14,
        }}>⚠️ {error}</div>
      ) : (
        <>
          {/* ── Summary cards ── */}
          {summary && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
              {[
                {
                  icon: "🛣️", label: "Total Distance",
                  value: `${summary.total_distance_km.toLocaleString("en-IN")} km`,
                  color: THEME.primary[500], bg: THEME.primary[50],
                  sub: `${summary.days_with_data} days`,
                },
                {
                  icon: "⛽", label: "Fuel Consumed",
                  value: `${summary.total_fuel_litres.toLocaleString("en-IN")} L`,
                  color: "#f59e0b", bg: "#fffbeb",
                  sub: `${days}D window`,
                },
                {
                  icon: "📈", label: "Avg Efficiency",
                  value: summary.overall_fuel_average_kmpl
                    ? `${summary.overall_fuel_average_kmpl} km/L`
                    : "N/A",
                  color: "#3b82f6", bg: "#eff6ff",
                  sub: `Baseline: ${baselineKmpl} km/L`,
                },
                {
                  icon: isImprovedOverBaseline ? "🌱" : "⚡",
                  label: "CO₂ Impact",
                  value: validDays.length > 0
                    ? `${isImprovedOverBaseline ? "-" : "+"}${co2Saved} kg`
                    : "N/A",
                  color: isImprovedOverBaseline ? "#16a34a" : "#dc2626",
                  bg: isImprovedOverBaseline ? "#dcfce7" : "#fef2f2",
                  sub: isImprovedOverBaseline
                    ? `${Math.abs(fuelSaved)}L saved vs baseline`
                    : `${Math.abs(fuelSaved)}L extra vs baseline`,
                },
              ].map((card) => (
                <div key={card.label} style={{
                  background: card.bg, border: `2px solid ${card.color}25`,
                  borderRadius: 14, padding: "18px 20px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{card.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: card.color, letterSpacing: -0.5 }}>
                    {card.value}
                  </div>
                  <div style={{ fontSize: 11, color: THEME.text.tertiary, fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 }}>
                    {card.label}
                  </div>
                  <div style={{ fontSize: 11, color: THEME.text.tertiary, marginTop: 2 }}>
                    {card.sub}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Baseline vs Actual Chart ── */}
          <div style={{
            background: "white", borderRadius: 14,
            border: `2px solid ${THEME.border.light}`,
            padding: 24, marginBottom: 20,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}>
            {/* Chart header with editable baseline */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: THEME.text.primary }}>
                  Fuel Efficiency: Actual vs Baseline
                </div>
                <div style={{ fontSize: 12, color: THEME.text.tertiary, marginTop: 2 }}>
                  km per litre — higher is better
                </div>
              </div>

              {/* Editable baseline */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: THEME.text.secondary, fontWeight: 600 }}>
                  Baseline:
                </span>
                {editingBaseline ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      ref={baselineRef}
                      type="number"
                      value={baselineInput}
                      onChange={(e) => setBaselineInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleBaselineSave();
                        if (e.key === "Escape") setEditingBaseline(false);
                      }}
                      style={{
                        width: 70, padding: "6px 10px", borderRadius: 8, fontSize: 13,
                        fontWeight: 700, border: `2px solid ${THEME.primary[500]}`,
                        outline: "none", textAlign: "center", fontFamily: "inherit",
                        color: THEME.text.primary,
                      }}
                    />
                    <span style={{ fontSize: 12, color: THEME.text.tertiary }}>km/L</span>
                    <button onClick={handleBaselineSave} style={{
                      padding: "6px 14px", background: THEME.primary[500], color: "white",
                      border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700,
                      cursor: "pointer", fontFamily: "inherit",
                    }}>Set</button>
                    <button onClick={() => setEditingBaseline(false)} style={{
                      padding: "6px 10px", background: THEME.neutral[100], color: THEME.text.secondary,
                      border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                    }}>✕</button>
                  </div>
                ) : (
                  <button onClick={() => setEditingBaseline(true)} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 14px", background: "#fffbeb",
                    border: "2px solid #f59e0b", borderRadius: 8,
                    fontSize: 13, fontWeight: 700, color: "#92400e",
                    cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
                  }}>
                    ✏️ {baselineKmpl} km/L
                  </button>
                )}
              </div>
            </div>

            {dailyData.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: THEME.text.tertiary, fontSize: 14 }}>
                No data available for this period
              </div>
            ) : (
              renderComparisonChart()
            )}
          </div>

          {/* ── CO2 Savings card (only shown if we have valid days) ── */}
          {validDays.length > 0 && (
            <div style={{
              background: isImprovedOverBaseline
                ? "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)"
                : "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
              borderRadius: 14,
              border: `2px solid ${isImprovedOverBaseline ? "#86efac" : "#fca5a5"}`,
              padding: "20px 24px", marginBottom: 20,
              display: "flex", alignItems: "center", gap: 20,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              <div style={{ fontSize: 44 }}>
                {isImprovedOverBaseline ? "🌱" : "⚠️"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 16, fontWeight: 800,
                  color: isImprovedOverBaseline ? "#15803d" : "#b91c1c",
                  marginBottom: 4,
                }}>
                  {isImprovedOverBaseline
                    ? `${co2Saved} kg CO₂ saved vs baseline`
                    : `${co2Saved} kg extra CO₂ vs baseline`}
                </div>
                <div style={{ fontSize: 13, color: isImprovedOverBaseline ? "#166534" : "#991b1b" }}>
                  {isImprovedOverBaseline
                    ? `Vehicle used ${Math.abs(fuelSaved)}L less fuel than baseline (${baselineKmpl} km/L) — equivalent to ${(co2Saved / 0.12).toFixed(0)} km not driven`
                    : `Vehicle used ${Math.abs(fuelSaved)}L more fuel than baseline (${baselineKmpl} km/L)`}
                </div>
                <div style={{ fontSize: 11, color: THEME.text.tertiary, marginTop: 4 }}>
                  Based on {validDays.length} days with data · CO₂ factor: {CO2_PER_LITRE} kg/L diesel
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: THEME.text.tertiary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                  Fuel {isImprovedOverBaseline ? "saved" : "excess"}
                </div>
                <div style={{
                  fontSize: 24, fontWeight: 800,
                  color: isImprovedOverBaseline ? "#16a34a" : "#dc2626",
                }}>
                  {isImprovedOverBaseline ? "-" : "+"}{Math.abs(fuelSaved)} L
                </div>
              </div>
            </div>
          )}

          {/* ── Daily table ── */}
          {dailyData.length > 0 && (
            <div style={{
              background: "white", borderRadius: 14,
              border: `2px solid ${THEME.border.light}`,
              overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              {/* Table header */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "130px 1fr 1fr 1fr 110px",
                gap: 12, padding: "12px 20px",
                background: THEME.neutral[50],
                borderBottom: `2px solid ${THEME.border.light}`,
                fontSize: 11, fontWeight: 700, color: THEME.text.tertiary,
                textTransform: "uppercase", letterSpacing: 0.5,
              }}>
                <div>Date</div>
                <div>Distance</div>
                <div>Fuel Used</div>
                <div>Efficiency</div>
                <div style={{ textAlign: "right" }}>vs Baseline</div>
              </div>

              {dailyData.map((row, i) => {
                const diff = row.fuel_average_kmpl !== null
                  ? parseFloat((row.fuel_average_kmpl - baselineKmpl).toFixed(2))
                  : null;
                const maxDist = Math.max(...dailyData.map((d) => d.distance_km), 1);
                const maxFuel = Math.max(...dailyData.map((d) => d.fuel_litres), 1);

                return (
                  <div key={row.day} style={{
                    display: "grid",
                    gridTemplateColumns: "130px 1fr 1fr 1fr 110px",
                    gap: 12, padding: "14px 20px", alignItems: "center",
                    borderBottom: i < dailyData.length - 1 ? `1px solid ${THEME.border.light}` : "none",
                    background: i % 2 === 0 ? "white" : THEME.neutral[50],
                  }}>
                    {/* Date */}
                    <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text.primary }}>
                      {formatDay(row.day)}
                    </div>

                    {/* Distance bar */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: THEME.neutral[100], borderRadius: 3, overflow: "hidden" }}>
                        <div style={{
                          width: `${(row.distance_km / maxDist) * 100}%`,
                          height: "100%", background: THEME.primary[400], borderRadius: 3,
                        }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: THEME.primary[600], minWidth: 64, textAlign: "right" }}>
                        {row.distance_km} km
                      </span>
                    </div>

                    {/* Fuel bar */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: THEME.neutral[100], borderRadius: 3, overflow: "hidden" }}>
                        <div style={{
                          width: `${(row.fuel_litres / maxFuel) * 100}%`,
                          height: "100%", background: "#f59e0b", borderRadius: 3,
                        }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#d97706", minWidth: 48, textAlign: "right" }}>
                        {row.fuel_litres > 0 ? `${row.fuel_litres} L` : "—"}
                      </span>
                    </div>

                    {/* Efficiency bar */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {row.fuel_average_kmpl !== null ? (
                        <>
                          <div style={{ flex: 1, height: 6, background: THEME.neutral[100], borderRadius: 3, overflow: "hidden" }}>
                            <div style={{
                              width: `${(row.fuel_average_kmpl / (maxKmpl * 1.1)) * 100}%`,
                              height: "100%", background: "#3b82f6", borderRadius: 3,
                            }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", minWidth: 64, textAlign: "right" }}>
                            {row.fuel_average_kmpl} km/L
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: 12, color: THEME.text.tertiary }}>No fuel data</span>
                      )}
                    </div>

                    {/* vs Baseline badge */}
                    <div style={{ textAlign: "right" }}>
                      {diff !== null ? (
                        <span style={{
                          padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: diff >= 0 ? "#dcfce7" : "#fee2e2",
                          color: diff >= 0 ? "#16a34a" : "#dc2626",
                        }}>
                          {diff >= 0 ? "+" : ""}{diff} km/L
                        </span>
                      ) : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {dailyData.length === 0 && !loading && (
            <div style={{
              padding: 40, textAlign: "center", background: "white",
              borderRadius: 12, border: `2px solid ${THEME.border.light}`,
              color: THEME.text.tertiary, fontSize: 14,
            }}>
              No data available for this period. IO 16 (mileage) or IO 107 (fuel) records may not be present yet.
            </div>
          )}
        </>
      )}
    </div>
  );
}