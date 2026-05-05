// "use client";

// import React, { useState, useEffect } from "react";
// import { Device } from "@/types";
// import { Icons } from "@/components/ui/Icons";

// interface TelemetryGraphTabProps {
//   device: Device;
// }

// interface TelemetryDataPoint {
//   timestamp: string;
//   value: number;
// }

// interface TelemetryHistory {
//   [key: string]: TelemetryDataPoint[];
// }

// export function TelemetryGraphTab({ device }: TelemetryGraphTabProps) {
//   const [telemetryHistory, setTelemetryHistory] = useState<TelemetryHistory>({});
//   const [selectedMetric, setSelectedMetric] = useState<string>("position.speed");
//   const [timeRange, setTimeRange] = useState<string>("24h");
//   const [loading, setLoading] = useState(true);

//   const metrics = [
//     { key: "position.speed", label: "Speed", unit: "km/h", color: "#00c853", transform: (v: number) => v },
//     { key: "external.powersource.voltage", label: "External Voltage", unit: "V", color: "#4caf50", transform: (v: number) => v / 1000 },
//     { key: "battery.voltage", label: "Battery Voltage", unit: "V", color: "#ffeb3b", transform: (v: number) => v / 1000 },
//     { key: "can.fuel.rate", label: "Fuel Rate", unit: "l/h", color: "#ff5722", transform: (v: number) => v / 10 },
//   ];

//   useEffect(() => {
//     fetchTelemetryHistory();
//     const interval = setInterval(fetchTelemetryHistory, 30000); // Refresh every 30s
//     return () => clearInterval(interval);
//   }, [device.id, timeRange]);

//   const fetchTelemetryHistory = async () => {
//     try {
//       setLoading(true);
//       const response = await fetch(
//         `/api/telemetry-history?device_id=${device.id}&range=${timeRange}`
//       );
//       const data = await response.json();

//       if (data.success) {
//         setTelemetryHistory(data.data);
//       }
//     } catch (error) {
//       console.error("Error fetching telemetry history:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

  
//   const renderGraph = () => {
//     const metric = metrics.find((m) => m.key === selectedMetric);
//     if (!metric) return null;

//     const transform = metric || ((v: number) => v);
    
//     const dataPoints = telemetryHistory[selectedMetric] || [];
    
//     if (dataPoints.length === 0) {
//       return (
//         <div style={{
//           height: 300,
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//           color: "#6b7280",
//           fontSize: 14,
//         }}>
//           No data available for this metric
//         </div>
//       );
//     }
//     const transformFn = (metric?.transform ?? ((v: number) => v)) as (v: number) => number;

//     // Calculate min/max for scaling
//     // const values = dataPoints.map((d) => d.value);
//     const values = dataPoints.map((d) => transformFn(d.value));
    
//     const minValue = Math.min(...values);
//     const maxValue = Math.max(...values);
//     const range = maxValue - minValue || 1;

//     // Graph dimensions
//     const width = 800;
//     const height = 250;
//     const padding = { top: 20, right: 20, bottom: 40, left: 60 };
//     const graphWidth = width - padding.left - padding.right;
//     const graphHeight = height - padding.top - padding.bottom;

//     // Create SVG path
//     const points = dataPoints.map((point, index) => {
//       const x = padding.left + (index / (dataPoints.length - 1)) * graphWidth;
//       const y = padding.top + graphHeight - ((point.value - minValue) / range) * graphHeight;
//       return `${x},${y}`;
//     });

//     const pathData = `M ${points.join(" L ")}`;

//     // Create area fill
//     const areaData = `${pathData} L ${padding.left + graphWidth},${padding.top + graphHeight} L ${padding.left},${padding.top + graphHeight} Z`;

//     return (
//       <div style={{ width: "100%", overflowX: "auto" }}>
//         <svg width={width} height={height} style={{ display: "block" }}>
//           {/* Grid lines */}
//           {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
//             const y = padding.top + graphHeight * (1 - fraction);
//             const value = minValue + range * fraction;
//             return (
//               <g key={fraction}>
//                 <line
//                   x1={padding.left}
//                   y1={y}
//                   x2={padding.left + graphWidth}
//                   y2={y}
//                   stroke="#333"
//                   strokeWidth={1}
//                   opacity={0.3}
//                 />
//                 <text
//                   x={padding.left - 10}
//                   y={y + 4}
//                   fill="#94a3b8"
//                   fontSize={11}
//                   textAnchor="end"
//                 >
//                   {value.toFixed(1)}
//                 </text>
//               </g>
//             );
//           })}

//           {/* Area fill */}
//           <path
//             d={areaData}
//             fill={metric.color}
//             opacity={0.2}
//           />

//           {/* Line */}
//           <path
//             d={pathData}
//             fill="none"
//             stroke={metric.color}
//             strokeWidth={2}
//           />

//           {/* Data points */}
//           {dataPoints.map((point, index) => {
//             const x = padding.left + (index / (dataPoints.length - 1)) * graphWidth;
//             const y = padding.top + graphHeight - ((point.value - minValue) / range) * graphHeight;
//             return (
//               <circle
//                 key={index}
//                 cx={x}
//                 cy={y}
//                 r={3}
//                 fill={metric.color}
//                 style={{ cursor: "pointer" }}
//               >
//                 {/* <title>
//                   {new Date(point.timestamp).toLocaleString()}
//                   {"\n"}
//                   {point.value.toFixed(2)} {metric.unit}
//                 </title> */}
//                 <title>
//   {new Date(point.timestamp).toLocaleString()}
//   {"\n"}
//   {transformFn(point.value).toFixed(2)} {metric.unit}
// </title>
//               </circle>
//             );
//           })}

//           {/* X-axis labels */}
//           {[0, 0.33, 0.66, 1].map((fraction) => {
//             const index = Math.floor(fraction * (dataPoints.length - 1));
//             const point = dataPoints[index];
//             if (!point) return null;
//             const x = padding.left + fraction * graphWidth;
//             const time = new Date(point.timestamp);
//             return (
//               <text
//                 key={fraction}
//                 x={x}
//                 y={height - 10}
//                 fill="#94a3b8"
//                 fontSize={10}
//                 textAnchor="middle"
//               >
//                 {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
//               </text>
//             );
//           })}

//           {/* Y-axis label */}
//           <text
//             x={15}
//             y={height / 2}
//             fill="#e0e0e0"
//             fontSize={12}
//             textAnchor="middle"
//             transform={`rotate(-90, 15, ${height / 2})`}
//           >
//             {metric.label} ({metric.unit})
//           </text>
//         </svg>

//         {/* Stats */}
//         <div style={{
//           display: "flex",
//           gap: 20,
//           marginTop: 20,
//           padding: 16,
//           background: "#242424",
//           borderRadius: 8,
//         }}>
//           <div>
//             <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Current</div>
//             <div style={{ fontSize: 18, fontWeight: 700, color: metric.color }}>
//               {/* {dataPoints[dataPoints.length - 1]?.value.toFixed(2)} {metric.unit} */}
//               {transformFn(dataPoints[dataPoints.length - 1]?.value).toFixed(2)} {metric.unit}
//             </div>
//           </div>
//           <div>
//             <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Average</div>
//             <div style={{ fontSize: 18, fontWeight: 700, color: "#e0e0e0" }}>
//               {/* {(values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)} {metric.unit} */}
//               {(() => {
//   const nonZero = values.filter(v => v !== 0);
//   return nonZero.length > 0 
//     ? (nonZero.reduce((a, b) => a + b, 0) / nonZero.length).toFixed(2)
//     : "0.00";
// })()} {metric.unit}
//             </div>
//           </div>
//           <div>
//             <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Min</div>
//             <div style={{ fontSize: 18, fontWeight: 700, color: "#e0e0e0" }}>
//               {minValue.toFixed(2)} {metric.unit}
//             </div>
//           </div>
//           <div>
//             <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Max</div>
//             <div style={{ fontSize: 18, fontWeight: 700, color: "#e0e0e0" }}>
//               {maxValue.toFixed(2)} {metric.unit}
//             </div>
//           </div>
//           <div>
//             <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Data Points</div>
//             <div style={{ fontSize: 18, fontWeight: 700, color: "#e0e0e0" }}>
//               {dataPoints.length}
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   return (
//     <div style={{ padding: 24 }}>
//       {/* Header */}
//       <div style={{
//         display: "flex",
//         justifyContent: "space-between",
//         alignItems: "center",
//         marginBottom: 20,
//       }}>
//         <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>
//           Telemetry History
//         </div>
        
//         {/* Time range selector */}
//         <div style={{ display: "flex", gap: 8 }}>
//           {[
//             { value: "1h", label: "1 Hour" },
//             { value: "6h", label: "6 Hours" },
//             { value: "24h", label: "24 Hours" },
//             { value: "7d", label: "7 Days" },
//           ].map((range) => (
//             <button
//               key={range.value}
//               onClick={() => setTimeRange(range.value)}
//               style={{
//                 background: timeRange === range.value ? "#7c3aed" : "#2a2a2a",
//                 border: `1px solid ${timeRange === range.value ? "#7c3aed" : "#3a3a3a"}`,
//                 borderRadius: 6,
//                 padding: "6px 12px",
//                 color: timeRange === range.value ? "#fff" : "#94a3b8",
//                 fontSize: 11,
//                 fontWeight: timeRange === range.value ? 700 : 400,
//                 cursor: "pointer",
//                 fontFamily: "inherit",
//               }}
//             >
//               {range.label}
//             </button>
//           ))}
//         </div>
//       </div>

//       {/* Metric selector */}
//       <div style={{ marginBottom: 20 }}>
//         <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
//           Select Metric
//         </div>
//         <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
//           {metrics.map((metric) => (
//             <button
//               key={metric.key}
//               onClick={() => setSelectedMetric(metric.key)}
//               style={{
//                 background: selectedMetric === metric.key ? "#242424" : "#1e1e1e",
//                 border: `2px solid ${selectedMetric === metric.key ? metric.color : "#333"}`,
//                 borderRadius: 8,
//                 padding: "10px 16px",
//                 color: "#e0e0e0",
//                 fontSize: 12,
//                 fontWeight: 600,
//                 cursor: "pointer",
//                 fontFamily: "inherit",
//                 display: "flex",
//                 alignItems: "center",
//                 gap: 8,
//               }}
//             >
//               <div
//                 style={{
//                   width: 8,
//                   height: 8,
//                   borderRadius: "50%",
//                   background: metric.color,
//                 }}
//               />
//               {metric.label}
//             </button>
//           ))}
//         </div>
//       </div>

//       {/* Graph */}
//       <div style={{
//         background: "#1e1e1e",
//         border: "1px solid #333",
//         borderRadius: 12,
//         padding: 24,
//       }}>
//         {loading ? (
//           <div style={{
//             height: 300,
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             color: "#94a3b8",
//           }}>
//             <div style={{
//               border: "3px solid #333",
//               borderTop: "3px solid #7c3aed",
//               borderRadius: "50%",
//               width: 40,
//               height: 40,
//               animation: "spin 1s linear infinite",
//             }}></div>
//           </div>
//         ) : (
//           renderGraph()
//         )}
//       </div>
//     </div>
//   );
// }
"use client";

import React, { useState, useEffect } from "react";
import { Device } from "@/types";
import { Icons } from "@/components/ui/Icons";
import { THEME } from "@/lib/theme";
import { useIsMobile } from "@/hooks/useIsMobile";

interface TelemetryGraphTabProps {
  device: Device;
}

interface TelemetryDataPoint {
  timestamp: string;
  value: number;
}

interface TelemetryHistory {
  [key: string]: TelemetryDataPoint[];
}

export function TelemetryGraphTab({ device }: TelemetryGraphTabProps) {
  const isMobile = useIsMobile();
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryHistory>({});
  const [selectedMetric, setSelectedMetric] = useState<string>("position.speed");
  const [timeRange, setTimeRange] = useState<string>("24h");
  const [loading, setLoading] = useState(true);

  const metrics = [
    { key: "position.speed", label: "Speed", unit: "km/h", color: "#00c853", transform: (v: number) => v },
    { key: "external.powersource.voltage", label: "External Voltage", unit: "V", color: "#4caf50", transform: (v: number) => v / 1000 },
    { key: "battery.voltage", label: "Battery Voltage", unit: "V", color: "#ffeb3b", transform: (v: number) => v / 1000 },
    { key: "can.fuel.rate", label: "Fuel Rate", unit: "l/h", color: "#ff5722", transform: (v: number) => v / 10 },
  ];

  useEffect(() => {
    fetchTelemetryHistory();
    const interval = setInterval(fetchTelemetryHistory, 30000);
    return () => clearInterval(interval);
  }, [device.id, timeRange]);

  const fetchTelemetryHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/telemetry-history?device_id=${device.id}&range=${timeRange}`
      );
      const data = await response.json();
      if (data.success) {
        setTelemetryHistory(data.data);
      }
    } catch (error) {
      console.error("Error fetching telemetry history:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderGraph = () => {
    const metric = metrics.find((m) => m.key === selectedMetric);
    if (!metric) return null;

    const transformFn = metric.transform;
    const dataPoints = telemetryHistory[selectedMetric] || [];

    if (dataPoints.length === 0) {
      return (
        <div style={{
          height: 250, display: "flex", alignItems: "center", justifyContent: "center",
          color: THEME.text.tertiary, fontSize: 14,
        }}>
          No data available for this metric
        </div>
      );
    }

    // ── BUG FIX: transform ALL values first, then use transformed values everywhere ──
    const transformedPoints = dataPoints.map((d) => ({
      timestamp: d.timestamp,
      value: transformFn(d.value),
    }));

    const values = transformedPoints.map((d) => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;

    // Graph dimensions
    const width = isMobile ? 500 : 800;
    const height = 250;
    const padding = { top: 20, right: 20, bottom: 40, left: isMobile ? 50 : 60 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // Create SVG path — using TRANSFORMED values
    const points = transformedPoints.map((point, index) => {
      const x = padding.left + (index / Math.max(transformedPoints.length - 1, 1)) * graphWidth;
      const y = padding.top + graphHeight - ((point.value - minValue) / range) * graphHeight;
      return { x, y, value: point.value, timestamp: point.timestamp };
    });

    const pathData = `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;
    const areaData = `${pathData} L ${padding.left + graphWidth},${padding.top + graphHeight} L ${padding.left},${padding.top + graphHeight} Z`;

    return (
      <div style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" as any }}>
        <svg width={width} height={height} style={{ display: "block" }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
            const y = padding.top + graphHeight * (1 - fraction);
            const value = minValue + range * fraction;
            return (
              <g key={fraction}>
                <line
                  x1={padding.left} y1={y} x2={padding.left + graphWidth} y2={y}
                  stroke={THEME.border.light} strokeWidth={1} opacity={0.5}
                  strokeDasharray="4,4"
                />
                <text x={padding.left - 8} y={y + 4} fill={THEME.text.tertiary}
                  fontSize={isMobile ? 9 : 11} textAnchor="end">
                  {value.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaData} fill={metric.color} opacity={0.15} />

          {/* Line */}
          <path d={pathData} fill="none" stroke={metric.color} strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" />

          {/* Data points — skip some on mobile to reduce clutter */}
          {points.map((point, index) => {
            // On mobile with lots of points, only show every Nth dot
            const skip = isMobile ? Math.max(Math.floor(points.length / 30), 1) : 1;
            if (index % skip !== 0 && index !== points.length - 1) return null;
            return (
              <circle key={index} cx={point.x} cy={point.y} r={isMobile ? 2 : 3}
                fill={metric.color} style={{ cursor: "pointer" }}>
                <title>
                  {new Date(point.timestamp).toLocaleString()}
                  {"\n"}
                  {point.value.toFixed(2)} {metric.unit}
                </title>
              </circle>
            );
          })}

          {/* X-axis labels */}
          {[0, 0.5, 1].map((fraction) => {
            const index = Math.floor(fraction * (dataPoints.length - 1));
            const point = dataPoints[index];
            if (!point) return null;
            const x = padding.left + fraction * graphWidth;
            const time = new Date(point.timestamp);
            return (
              <text key={fraction} x={x} y={height - 10} fill={THEME.text.tertiary}
                fontSize={10} textAnchor="middle">
                {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </text>
            );
          })}

          {/* Y-axis label */}
          <text x={15} y={height / 2} fill={THEME.text.secondary} fontSize={11}
            textAnchor="middle" transform={`rotate(-90, 15, ${height / 2})`}>
            {metric.label} ({metric.unit})
          </text>
        </svg>

        {/* Stats bar */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(5, 1fr)",
          gap: isMobile ? 8 : 16,
          marginTop: 16,
          padding: isMobile ? 12 : 16,
          background: THEME.background.card,
          border: `1px solid ${THEME.border.light}`,
          borderRadius: 10,
        }}>
          <div>
            <div style={{ fontSize: 10, color: THEME.text.tertiary, marginBottom: 4 }}>Current</div>
            <div style={{ fontSize: isMobile ? 14 : 18, fontWeight: 700, color: metric.color }}>
              {transformedPoints[transformedPoints.length - 1]?.value.toFixed(2)}
            </div>
            <div style={{ fontSize: 10, color: THEME.text.tertiary }}>{metric.unit}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: THEME.text.tertiary, marginBottom: 4 }}>Average</div>
            <div style={{ fontSize: isMobile ? 14 : 18, fontWeight: 700, color: THEME.text.primary }}>
              {(() => {
                const nonZero = values.filter(v => v !== 0);
                return nonZero.length > 0
                  ? (nonZero.reduce((a, b) => a + b, 0) / nonZero.length).toFixed(2)
                  : "0.00";
              })()}
            </div>
            <div style={{ fontSize: 10, color: THEME.text.tertiary }}>{metric.unit}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: THEME.text.tertiary, marginBottom: 4 }}>Min</div>
            <div style={{ fontSize: isMobile ? 14 : 18, fontWeight: 700, color: THEME.text.primary }}>
              {minValue.toFixed(2)}
            </div>
            <div style={{ fontSize: 10, color: THEME.text.tertiary }}>{metric.unit}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: THEME.text.tertiary, marginBottom: 4 }}>Max</div>
            <div style={{ fontSize: isMobile ? 14 : 18, fontWeight: 700, color: THEME.text.primary }}>
              {maxValue.toFixed(2)}
            </div>
            <div style={{ fontSize: 10, color: THEME.text.tertiary }}>{metric.unit}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: THEME.text.tertiary, marginBottom: 4 }}>Points</div>
            <div style={{ fontSize: isMobile ? 14 : 18, fontWeight: 700, color: THEME.text.primary }}>
              {dataPoints.length}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: isMobile ? 14 : 24 }}>
      {/* Header + Time range */}
      <div style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        justifyContent: "space-between",
        alignItems: isMobile ? "flex-start" : "center",
        gap: isMobile ? 10 : 0,
        marginBottom: 20,
      }}>
        <div style={{ fontSize: isMobile ? 15 : 16, fontWeight: 700, color: THEME.text.primary }}>
          Telemetry History
        </div>

        <div style={{ display: "flex", gap: isMobile ? 4 : 8 }}>
          {[
            { value: "1h", label: isMobile ? "1H" : "1 Hour" },
            { value: "6h", label: isMobile ? "6H" : "6 Hours" },
            { value: "24h", label: isMobile ? "24H" : "24 Hours" },
            { value: "7d", label: isMobile ? "7D" : "7 Days" },
          ].map((r) => (
            <button
              key={r.value}
              onClick={() => setTimeRange(r.value)}
              style={{
                background: timeRange === r.value ? THEME.primary[500] : THEME.neutral[100],
                border: `1px solid ${timeRange === r.value ? THEME.primary[500] : THEME.border.light}`,
                borderRadius: 6,
                padding: isMobile ? "5px 10px" : "6px 12px",
                color: timeRange === r.value ? "#fff" : THEME.text.secondary,
                fontSize: isMobile ? 11 : 11,
                fontWeight: timeRange === r.value ? 700 : 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metric selector */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: THEME.text.tertiary, marginBottom: 8 }}>
          Select Metric
        </div>
        <div style={{ display: "flex", gap: isMobile ? 6 : 8, flexWrap: "wrap" }}>
          {metrics.map((metric) => (
            <button
              key={metric.key}
              onClick={() => setSelectedMetric(metric.key)}
              style={{
                background: selectedMetric === metric.key
                  ? THEME.background.card : THEME.background.secondary,
                border: `2px solid ${selectedMetric === metric.key ? metric.color : THEME.border.light}`,
                borderRadius: 8,
                padding: isMobile ? "8px 12px" : "10px 16px",
                color: THEME.text.primary,
                fontSize: isMobile ? 11 : 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: metric.color }} />
              {isMobile ? metric.label.replace("External ", "Ext. ") : metric.label}
            </button>
          ))}
        </div>
      </div>

      {/* Graph */}
      <div style={{
        background: THEME.background.card,
        border: `1px solid ${THEME.border.light}`,
        borderRadius: 12,
        padding: isMobile ? 12 : 24,
      }}>
        {loading ? (
          <div style={{
            height: 250, display: "flex", alignItems: "center", justifyContent: "center",
            color: THEME.text.tertiary,
          }}>
            <div style={{
              border: `3px solid ${THEME.border.light}`,
              borderTop: `3px solid ${THEME.primary[500]}`,
              borderRadius: "50%", width: 40, height: 40,
              animation: "spin 1s linear infinite",
            }} />
          </div>
        ) : (
          renderGraph()
        )}
      </div>
    </div>
  );
}