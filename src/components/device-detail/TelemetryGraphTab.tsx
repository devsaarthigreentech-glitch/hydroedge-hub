"use client";

import React, { useState, useEffect } from "react";
import { Device } from "@/types";
import { Icons } from "@/components/ui/Icons";

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
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryHistory>({});
  const [selectedMetric, setSelectedMetric] = useState<string>("position.speed");
  const [timeRange, setTimeRange] = useState<string>("24h");
  const [loading, setLoading] = useState(true);

  // Available metrics to graph
  const metrics = [
    { key: "position.speed", label: "Speed", unit: "km/h", color: "#00c853" },
    { key: "position.latitude", label: "Latitude", unit: "°", color: "#2196f3" },
    { key: "position.longitude", label: "Longitude", unit: "°", color: "#ff9800" },
    { key: "position.altitude", label: "Altitude", unit: "m", color: "#9c27b0" },
    { key: "gnss.satellites.count", label: "Satellites", unit: "", color: "#f44336" },
    { key: "external.powersource.voltage", label: "External Voltage", unit: "V", color: "#4caf50" },
    { key: "battery.voltage", label: "Battery Voltage", unit: "V", color: "#ffeb3b" },
    { key: "gsm.signal.level", label: "GSM Signal", unit: "%", color: "#00bcd4" },
  ];

  useEffect(() => {
    fetchTelemetryHistory();
    const interval = setInterval(fetchTelemetryHistory, 30000); // Refresh every 30s
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

    const dataPoints = telemetryHistory[selectedMetric] || [];
    
    if (dataPoints.length === 0) {
      return (
        <div style={{
          height: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6b7280",
          fontSize: 14,
        }}>
          No data available for this metric
        </div>
      );
    }

    // Calculate min/max for scaling
    const values = dataPoints.map((d) => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;

    // Graph dimensions
    const width = 800;
    const height = 250;
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // Create SVG path
    const points = dataPoints.map((point, index) => {
      const x = padding.left + (index / (dataPoints.length - 1)) * graphWidth;
      const y = padding.top + graphHeight - ((point.value - minValue) / range) * graphHeight;
      return `${x},${y}`;
    });

    const pathData = `M ${points.join(" L ")}`;

    // Create area fill
    const areaData = `${pathData} L ${padding.left + graphWidth},${padding.top + graphHeight} L ${padding.left},${padding.top + graphHeight} Z`;

    return (
      <div style={{ width: "100%", overflowX: "auto" }}>
        <svg width={width} height={height} style={{ display: "block" }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
            const y = padding.top + graphHeight * (1 - fraction);
            const value = minValue + range * fraction;
            return (
              <g key={fraction}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + graphWidth}
                  y2={y}
                  stroke="#333"
                  strokeWidth={1}
                  opacity={0.3}
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  fill="#94a3b8"
                  fontSize={11}
                  textAnchor="end"
                >
                  {value.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path
            d={areaData}
            fill={metric.color}
            opacity={0.2}
          />

          {/* Line */}
          <path
            d={pathData}
            fill="none"
            stroke={metric.color}
            strokeWidth={2}
          />

          {/* Data points */}
          {dataPoints.map((point, index) => {
            const x = padding.left + (index / (dataPoints.length - 1)) * graphWidth;
            const y = padding.top + graphHeight - ((point.value - minValue) / range) * graphHeight;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r={3}
                fill={metric.color}
                style={{ cursor: "pointer" }}
              >
                <title>
                  {new Date(point.timestamp).toLocaleString()}
                  {"\n"}
                  {point.value.toFixed(2)} {metric.unit}
                </title>
              </circle>
            );
          })}

          {/* X-axis labels */}
          {[0, 0.33, 0.66, 1].map((fraction) => {
            const index = Math.floor(fraction * (dataPoints.length - 1));
            const point = dataPoints[index];
            if (!point) return null;
            const x = padding.left + fraction * graphWidth;
            const time = new Date(point.timestamp);
            return (
              <text
                key={fraction}
                x={x}
                y={height - 10}
                fill="#94a3b8"
                fontSize={10}
                textAnchor="middle"
              >
                {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </text>
            );
          })}

          {/* Y-axis label */}
          <text
            x={15}
            y={height / 2}
            fill="#e0e0e0"
            fontSize={12}
            textAnchor="middle"
            transform={`rotate(-90, 15, ${height / 2})`}
          >
            {metric.label} ({metric.unit})
          </text>
        </svg>

        {/* Stats */}
        <div style={{
          display: "flex",
          gap: 20,
          marginTop: 20,
          padding: 16,
          background: "#242424",
          borderRadius: 8,
        }}>
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Current</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: metric.color }}>
              {dataPoints[dataPoints.length - 1]?.value.toFixed(2)} {metric.unit}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Average</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#e0e0e0" }}>
              {/* {(values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)} {metric.unit} */}
              {(() => {
  const nonZero = values.filter(v => v !== 0);
  return nonZero.length > 0 
    ? (nonZero.reduce((a, b) => a + b, 0) / nonZero.length).toFixed(2)
    : "0.00";
})()} {metric.unit}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Min</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#e0e0e0" }}>
              {minValue.toFixed(2)} {metric.unit}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Max</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#e0e0e0" }}>
              {maxValue.toFixed(2)} {metric.unit}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Data Points</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#e0e0e0" }}>
              {dataPoints.length}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>
          Telemetry History
        </div>
        
        {/* Time range selector */}
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { value: "1h", label: "1 Hour" },
            { value: "6h", label: "6 Hours" },
            { value: "24h", label: "24 Hours" },
            { value: "7d", label: "7 Days" },
          ].map((range) => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              style={{
                background: timeRange === range.value ? "#7c3aed" : "#2a2a2a",
                border: `1px solid ${timeRange === range.value ? "#7c3aed" : "#3a3a3a"}`,
                borderRadius: 6,
                padding: "6px 12px",
                color: timeRange === range.value ? "#fff" : "#94a3b8",
                fontSize: 11,
                fontWeight: timeRange === range.value ? 700 : 400,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metric selector */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
          Select Metric
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {metrics.map((metric) => (
            <button
              key={metric.key}
              onClick={() => setSelectedMetric(metric.key)}
              style={{
                background: selectedMetric === metric.key ? "#242424" : "#1e1e1e",
                border: `2px solid ${selectedMetric === metric.key ? metric.color : "#333"}`,
                borderRadius: 8,
                padding: "10px 16px",
                color: "#e0e0e0",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: metric.color,
                }}
              />
              {metric.label}
            </button>
          ))}
        </div>
      </div>

      {/* Graph */}
      <div style={{
        background: "#1e1e1e",
        border: "1px solid #333",
        borderRadius: 12,
        padding: 24,
      }}>
        {loading ? (
          <div style={{
            height: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#94a3b8",
          }}>
            <div style={{
              border: "3px solid #333",
              borderTop: "3px solid #7c3aed",
              borderRadius: "50%",
              width: 40,
              height: 40,
              animation: "spin 1s linear infinite",
            }}></div>
          </div>
        ) : (
          renderGraph()
        )}
      </div>
    </div>
  );
}