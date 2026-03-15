"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Device } from "@/types";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CommandLogEntry {
  id: string;
  command: string;
  status: string;
  response: string | null;
  error_message: string | null;
  sent_at: string;
}

interface SelectOption {
  v: number;
  l: string;
}

interface BaseParam {
  id: string;
  name: string;
  description?: string;
}

interface CommandParam extends BaseParam {
  type: "command";
  command: string;
  dangerous?: boolean;
}

interface SectionParam extends BaseParam {
  type: "section";
}

interface SelectParam extends BaseParam {
  type: "select";
  default: number | string;
  options: SelectOption[];
  unit?: string;
}

interface NumberParam extends BaseParam {
  type: "number";
  default: number;
  min: number;
  max: number;
  unit?: string;
}

interface TextParam extends BaseParam {
  type: "text";
  default: string;
  unit?: string;
}

type TeltonikaParam = CommandParam | SectionParam | SelectParam | NumberParam | TextParam;

interface ParameterCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  params: TeltonikaParam[];
}

// ============================================================================
// PARAMETER DATABASE
// ============================================================================

const PARAMETER_CATEGORIES: ParameterCategory[] = [
  {
    id: "quick",
    name: "Quick Commands",
    icon: "⚡",
    description: "Common GPRS commands",
    params: [
      { id: "_cmd_getinfo", name: "Get Device Info", command: "getinfo", type: "command", description: "Returns IMEI, firmware, model, battery info" },
      { id: "_cmd_getver", name: "Get Firmware Version", command: "getver", type: "command", description: "Returns firmware version, IMEI, modem info" },
      { id: "_cmd_getgps", name: "Get GPS Position", command: "getgps", type: "command", description: "Returns current GPS coordinates and status" },
      { id: "_cmd_getstatus", name: "Get Status", command: "getstatus", type: "command", description: "Returns device status summary" },
      { id: "_cmd_getio", name: "Get I/O Status", command: "getio", type: "command", description: "Returns current I/O element values" },
      { id: "_cmd_readio", name: "Read I/O", command: "readio", type: "command", description: "Read current IO values" },
      { id: "_cmd_allver", name: "All Versions", command: "allver", type: "command", description: "Returns all firmware/modem/BLE versions" },
      { id: "_cmd_cpureset", name: "Reboot Device", command: "cpureset", type: "command", description: "Restarts the device", dangerous: true },
      { id: "_cmd_fmbreset", name: "Factory Reset", command: "fmbreset", type: "command", description: "Resets to factory defaults", dangerous: true },
      { id: "_cmd_setdigout1", name: "Digital Output 1 ON", command: "setdigout 1", type: "command", description: "Turns on DOUT1" },
      { id: "_cmd_setdigout0", name: "Digital Output 1 OFF", command: "setdigout 0", type: "command", description: "Turns off DOUT1" },
      { id: "_cmd_web_connect", name: "FOTA Connect", command: "web_connect", type: "command", description: "Connects to FOTA WEB immediately" },
    ],
  },
  {
    id: "system",
    name: "System",
    icon: "⚙️",
    description: "Core device behavior settings",
    params: [
      { id: "138", name: "Movement Source", type: "select", default: 2, options: [{ v: 1, l: "Ignition" }, { v: 2, l: "Accelerometer" }, { v: 4, l: "GNSS" }, { v: 8, l: "CAN Speed" }] },
      { id: "133", name: "Speed Source", type: "select", default: 0, options: [{ v: 0, l: "GNSS" }, { v: 1, l: "OBD / CAN" }] },
      { id: "106", name: "Static Navigation", type: "select", default: 1, options: [{ v: 0, l: "Disable" }, { v: 1, l: "Enable" }] },
      { id: "112", name: "Static Nav Source", type: "select", default: 1, options: [{ v: 1, l: "Movement" }, { v: 2, l: "Ignition" }] },
      { id: "107", name: "Records without TS", type: "select", default: 2, options: [{ v: 0, l: "After Position Fix" }, { v: 1, l: "Always" }, { v: 2, l: "After Time Sync" }] },
      { id: "108", name: "LED Indication", type: "select", default: 1, options: [{ v: 0, l: "Disable" }, { v: 1, l: "Enable" }] },
      { id: "113", name: "Data Protocol", type: "select", default: 1, options: [{ v: 0, l: "Codec 8" }, { v: 1, l: "Codec 8 Extended" }, { v: 2, l: "Codec JSON" }], description: "FMB150 = Codec 8, FMC650 = Codec 8E" },
      { id: "109", name: "GNSS Source", type: "select", default: 10, options: [{ v: 8, l: "GPS only" }, { v: 10, l: "GPS + Glonass" }, { v: 12, l: "GPS + Galileo" }, { v: 14, l: "GPS + Galileo + Glonass" }, { v: 15, l: "All constellations" }] },
      { id: "110", name: "Battery Charge Mode", type: "select", default: 0, options: [{ v: 0, l: "On need" }, { v: 1, l: "After ignition ON" }, { v: 2, l: "Always" }] },
    ],
  },
  {
    id: "ignition",
    name: "Ignition",
    icon: "🔑",
    description: "Ignition detection settings",
    params: [
      { id: "101", name: "Ignition Source", type: "select", default: 4, options: [{ v: 1, l: "DIN 1" }, { v: 2, l: "Accelerometer" }, { v: 3, l: "DIN or Accel" }, { v: 4, l: "Power Voltage" }, { v: 5, l: "DIN or Voltage" }, { v: 6, l: "Accel or Voltage" }, { v: 8, l: "Engine RPM" }] },
      { id: "104", name: "High Voltage", type: "number", default: 30000, min: 0, max: 30000, unit: "mV", description: "Voltage above this = ignition ON" },
      { id: "105", name: "Low Voltage", type: "number", default: 13200, min: 0, max: 29999, unit: "mV", description: "Voltage below this = ignition OFF" },
    ],
  },
  {
    id: "sleep",
    name: "Sleep Mode",
    icon: "💤",
    description: "Power saving configuration",
    params: [
      { id: "102", name: "Sleep Mode", type: "select", default: 2, options: [{ v: 0, l: "Disable" }, { v: 1, l: "GPS Sleep" }, { v: 2, l: "Deep Sleep" }, { v: 3, l: "Online Deep Sleep" }, { v: 4, l: "Ultra Deep Sleep" }] },
      { id: "103", name: "Sleep Timeout", type: "number", default: 1, min: 1, max: 3000, unit: "min" },
    ],
  },
  {
    id: "gprs",
    name: "GPRS / Server",
    icon: "🌐",
    description: "Server connection settings",
    params: [
      { id: "2001", name: "APN", type: "text", default: "", description: "Mobile network APN" },
      { id: "2002", name: "APN Username", type: "text", default: "" },
      { id: "2003", name: "APN Password", type: "text", default: "" },
      { id: "2004", name: "Server Domain", type: "text", default: "", description: "Your GPS server IP/domain" },
      { id: "2005", name: "Server Port", type: "number", default: 0, min: 0, max: 65535, unit: "port" },
      { id: "2006", name: "Protocol", type: "select", default: 0, options: [{ v: 0, l: "TCP" }, { v: 1, l: "UDP" }, { v: 3, l: "MQTT" }] },
      { id: "2020", name: "TLS Encryption", type: "select", default: 0, options: [{ v: 0, l: "None" }, { v: 1, l: "TLS/DTLS" }] },
      { id: "1000", name: "Open Link Timeout", type: "number", default: 300, min: 30, max: 259200, unit: "sec" },
      { id: "1001", name: "Response Timeout", type: "number", default: 30, min: 5, max: 300, unit: "sec" },
      { id: "1003", name: "Network Ping", type: "number", default: 0, min: 0, max: 300, unit: "sec", description: "Keep-alive ping. Set 300 for commands." },
      { id: "2025", name: "Auto APN Search", type: "select", default: 1, options: [{ v: 0, l: "Disable" }, { v: 1, l: "Enable" }] },
    ],
  },
  {
    id: "data_acq",
    name: "Data Acquisition",
    icon: "📡",
    description: "Recording and sending intervals",
    params: [
      { id: "_s1", name: "── Home: Vehicle STOPPED ──", type: "section" },
      { id: "10000", name: "Min Period", type: "number", default: 3600, min: 0, max: 2592000, unit: "sec" },
      { id: "10004", name: "Min Saved Records", type: "number", default: 1, min: 1, max: 255 },
      { id: "10005", name: "Send Period", type: "number", default: 120, min: 0, max: 2592000, unit: "sec" },
      { id: "_s2", name: "── Home: Vehicle MOVING ──", type: "section" },
      { id: "10050", name: "Min Period", type: "number", default: 300, min: 0, max: 2592000, unit: "sec" },
      { id: "10051", name: "Min Distance", type: "number", default: 100, min: 0, max: 65535, unit: "m" },
      { id: "10052", name: "Min Angle", type: "number", default: 10, min: 0, max: 180, unit: "°" },
      { id: "10053", name: "Min Speed Delta", type: "number", default: 10, min: 0, max: 100, unit: "km/h" },
      { id: "10054", name: "Min Saved Records", type: "number", default: 1, min: 1, max: 255 },
      { id: "10055", name: "Send Period", type: "number", default: 120, min: 0, max: 2592000, unit: "sec" },
      { id: "_s3", name: "── Roaming: Vehicle STOPPED ──", type: "section" },
      { id: "10100", name: "Min Period", type: "number", default: 3600, min: 0, max: 2592000, unit: "sec" },
      { id: "10105", name: "Send Period", type: "number", default: 0, min: 0, max: 2592000, unit: "sec" },
      { id: "_s4", name: "── Roaming: Vehicle MOVING ──", type: "section" },
      { id: "10150", name: "Min Period", type: "number", default: 300, min: 0, max: 2592000, unit: "sec" },
      { id: "10151", name: "Min Distance", type: "number", default: 100, min: 0, max: 65535, unit: "m" },
      { id: "10155", name: "Send Period", type: "number", default: 0, min: 0, max: 2592000, unit: "sec" },
    ],
  },
  {
    id: "io",
    name: "I/O Parameters",
    icon: "📊",
    description: "I/O element reporting config",
    params: [
      { id: "_io_info", name: "Configure priority & operand for each IO element", type: "section" },
      { id: "10660", name: "Ext Voltage Priority", type: "select", default: 1, options: [{ v: 0, l: "Disabled" }, { v: 1, l: "Low" }, { v: 2, l: "High" }, { v: 3, l: "Panic" }], description: "IO 66 - External Voltage" },
      { id: "10661", name: "Ext Voltage Operand", type: "select", default: 3, options: [{ v: 0, l: "On Exit" }, { v: 1, l: "On Enter" }, { v: 2, l: "Both" }, { v: 3, l: "Monitoring" }, { v: 5, l: "On Change" }, { v: 6, l: "On Delta" }] },
      { id: "10662", name: "Ext Voltage High", type: "number", default: 0, min: 0, max: 65535, unit: "mV" },
      { id: "10663", name: "Ext Voltage Low", type: "number", default: 0, min: 0, max: 65535, unit: "mV" },
      { id: "10665", name: "Ext Voltage Average", type: "number", default: 10, min: 0, max: 255 },
      { id: "_io_bat", name: "── Battery ──", type: "section" },
      { id: "10670", name: "Bat Voltage Priority", type: "select", default: 1, options: [{ v: 0, l: "Disabled" }, { v: 1, l: "Low" }, { v: 2, l: "High" }, { v: 3, l: "Panic" }], description: "IO 67" },
      { id: "10680", name: "Bat Current Priority", type: "select", default: 0, options: [{ v: 0, l: "Disabled" }, { v: 1, l: "Low" }, { v: 2, l: "High" }, { v: 3, l: "Panic" }], description: "IO 68" },
      { id: "_io_ign", name: "── Ignition / Movement ──", type: "section" },
      { id: "12390", name: "Ignition Priority", type: "select", default: 1, options: [{ v: 0, l: "Disabled" }, { v: 1, l: "Low" }, { v: 2, l: "High" }, { v: 3, l: "Panic" }], description: "IO 239" },
      { id: "12400", name: "Movement Priority", type: "select", default: 0, options: [{ v: 0, l: "Disabled" }, { v: 1, l: "Low" }, { v: 2, l: "High" }, { v: 3, l: "Panic" }], description: "IO 240" },
      { id: "10160", name: "Odometer Priority", type: "select", default: 1, options: [{ v: 0, l: "Disabled" }, { v: 1, l: "Low" }, { v: 2, l: "High" }, { v: 3, l: "Panic" }], description: "IO 16" },
    ],
  },
  {
    id: "features",
    name: "Features",
    icon: "🛡️",
    description: "Driving behavior & detection",
    params: [
      { id: "_f_green", name: "── Green Driving ──", type: "section" },
      { id: "11000", name: "Green Driving", type: "select", default: 0, options: [{ v: 0, l: "Disable" }, { v: 1, l: "Low" }, { v: 2, l: "High" }, { v: 3, l: "Panic" }] },
      { id: "11004", name: "Max Acceleration", type: "number", default: 25, min: 5, max: 100, unit: "×0.1 m/s²" },
      { id: "11005", name: "Max Braking", type: "number", default: 27, min: 5, max: 100, unit: "×0.1 m/s²" },
      { id: "11006", name: "Max Cornering", type: "number", default: 34, min: 5, max: 100, unit: "×0.1 m/s²" },
      { id: "_f_speed", name: "── Overspeeding ──", type: "section" },
      { id: "11100", name: "Overspeeding", type: "select", default: 0, options: [{ v: 0, l: "Disable" }, { v: 1, l: "Low" }, { v: 2, l: "High" }, { v: 3, l: "Panic" }] },
      { id: "11104", name: "Max Speed", type: "number", default: 90, min: 0, max: 260, unit: "km/h" },
      { id: "_f_jam", name: "── Jamming Detection ──", type: "section" },
      { id: "11300", name: "Jamming Detection", type: "select", default: 0, options: [{ v: 0, l: "Disable" }, { v: 1, l: "Low" }, { v: 2, l: "High" }, { v: 3, l: "Panic" }] },
      { id: "11305", name: "Jamming Timeout", type: "number", default: 60, min: 0, max: 65535, unit: "sec" },
    ],
  },
  {
    id: "accel",
    name: "Accelerometer",
    icon: "📐",
    description: "Unplug, towing, crash detection",
    params: [
      { id: "169", name: "Auto Calibration", type: "select", default: 1, options: [{ v: 0, l: "Disable" }, { v: 1, l: "Enable" }] },
      { id: "170", name: "Gravity Filter", type: "select", default: 1, options: [{ v: 0, l: "Disable" }, { v: 1, l: "Enable" }] },
      { id: "_a_unplug", name: "── Unplug Detection ──", type: "section" },
      { id: "11200", name: "Unplug Detection", type: "select", default: 0, options: [{ v: 0, l: "Disable" }, { v: 1, l: "Enable" }] },
      { id: "_a_tow", name: "── Towing Detection ──", type: "section" },
      { id: "11800", name: "Towing Detection", type: "select", default: 0, options: [{ v: 0, l: "Disable" }, { v: 1, l: "Enable" }] },
      { id: "_a_crash", name: "── Crash Detection ──", type: "section" },
      { id: "11900", name: "Crash Detection", type: "select", default: 0, options: [{ v: 0, l: "Disable" }, { v: 1, l: "Low" }, { v: 2, l: "High" }, { v: 3, l: "Panic" }] },
      { id: "11905", name: "Crash Threshold", type: "number", default: 4000, min: 50, max: 32000, unit: "mg" },
      { id: "11906", name: "Crash Duration", type: "number", default: 50, min: 2, max: 250, unit: "ms" },
    ],
  },
  {
    id: "trip",
    name: "Trip / Odometer",
    icon: "🛣️",
    description: "Trip detection settings",
    params: [
      { id: "11600", name: "Trip Detection", type: "select", default: 0, options: [{ v: 0, l: "Disable" }, { v: 1, l: "Enable" }] },
      { id: "11604", name: "Start Speed", type: "number", default: 5, min: 0, max: 255, unit: "km/h" },
      { id: "11605", name: "Ignition OFF Timeout", type: "number", default: 60, min: 0, max: 65535, unit: "sec" },
      { id: "11700", name: "Continuous Odometer", type: "select", default: 0, options: [{ v: 0, l: "Disable" }, { v: 1, l: "Enable" }] },
    ],
  },
  {
    id: "sms",
    name: "SMS / Calls",
    icon: "📱",
    description: "SMS and call settings",
    params: [
      { id: "3003", name: "SMS Login", type: "text", default: "" },
      { id: "3004", name: "SMS Password", type: "text", default: "" },
      { id: "3005", name: "Incoming Call Action", type: "select", default: 0, options: [{ v: 0, l: "Do nothing" }, { v: 1, l: "Hangup" }, { v: 2, l: "Report position" }, { v: 4, l: "Auto answer" }] },
    ],
  },
  {
    id: "fota",
    name: "FOTA WEB",
    icon: "☁️",
    description: "Firmware Over The Air",
    params: [
      { id: "13003", name: "FOTA Status", type: "select", default: 1, options: [{ v: 0, l: "Disable" }, { v: 1, l: "Enable" }] },
      { id: "13000", name: "FOTA Domain", type: "text", default: "fm.teltonika.lt" },
      { id: "13001", name: "FOTA Port", type: "number", default: 5000, min: 0, max: 65535 },
      { id: "13002", name: "FOTA Period", type: "number", default: 720, min: 30, max: 65535, unit: "min" },
    ],
  },
  {
    id: "movement",
    name: "Movement",
    icon: "🏃",
    description: "Movement detection delays",
    params: [
      { id: "19001", name: "Start Delay", type: "number", default: 2, min: 1, max: 60, unit: "sec" },
      { id: "19002", name: "Stop Delay", type: "number", default: 60, min: 5, max: 300, unit: "sec" },
    ],
  },
  {
    id: "geofence",
    name: "Geofencing",
    icon: "📍",
    description: "Auto-geofence settings",
    params: [
      { id: "11500", name: "Auto Geofence", type: "select", default: 0, options: [{ v: 0, l: "Disable" }, { v: 1, l: "Enable" }] },
      { id: "11504", name: "Radius", type: "number", default: 50, min: 1, max: 65535, unit: "m" },
    ],
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

interface TeltonikaConfiguratorProps {
  device: Device;
}

export function TeltonikaConfigurator({ device }: TeltonikaConfiguratorProps) {
  const [selectedCategory, setSelectedCategory] = useState("quick");
  const [paramValues, setParamValues] = useState<Record<string, string | number>>({});
  const [changedParams, setChangedParams] = useState<Set<string>>(new Set());
  const [commandLog, setCommandLog] = useState<CommandLogEntry[]>([]);
  const [customCommand, setCustomCommand] = useState("");
  const [isSending, setIsSending] = useState<string | null>(null);
  const [readingAll, setReadingAll] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const category = PARAMETER_CATEGORIES.find((c) => c.id === selectedCategory);

  // Fetch real command history from API — polls every 3 seconds
  const fetchCommandHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/commands?device_id=${device.id}`);
      const data = await res.json();
      if (data.success) {
        setCommandLog(data.data);
      }
    } catch (err) {
      console.error("Error fetching commands:", err);
    }
  }, [device.id]);

  useEffect(() => {
    fetchCommandHistory();
    const interval = setInterval(fetchCommandHistory, 3000);
    return () => clearInterval(interval);
  }, [fetchCommandHistory]);

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [commandLog]);

  // Send command via your existing /api/commands endpoint
  const sendCommand = useCallback(
    async (command: string) => {
      setIsSending(command);

      try {
        const response = await fetch("/api/commands", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            device_id: device.id,
            command: command,
          }),
        });

        const data = await response.json();

        if (!data.success) {
          alert("Failed to queue command: " + (data.error || "Unknown error"));
        }

        // Immediately refresh to show the new command
        await fetchCommandHistory();
      } catch (error) {
        console.error("Error sending command:", error);
        alert("Error sending command");
      }

      setIsSending(null);
    },
    [device.id, fetchCommandHistory]
  );

  const readParam = useCallback(
    async (paramId: string) => {
      await sendCommand(`getparam ${paramId}`);
    },
    [sendCommand]
  );

  const writeParam = useCallback(
    async (paramId: string, value: string | number) => {
      await sendCommand(`setparam ${paramId}:${value}`);
      setChangedParams((prev) => {
        const n = new Set(prev);
        n.delete(paramId);
        return n;
      });
    },
    [sendCommand]
  );

  const writeAllChanged = useCallback(async () => {
    if (changedParams.size === 0) return;
    const parts = [...changedParams].map((pid) => `${pid}:${paramValues[pid] ?? ""}`);
    await sendCommand(`setparam ${parts.join(";")}`);
    setChangedParams(new Set());
  }, [changedParams, paramValues, sendCommand]);

  const readAllInCategory = useCallback(async () => {
    if (!category) return;
    setReadingAll(true);
    const paramIds = category.params
      .filter((p): p is SelectParam | NumberParam | TextParam =>
        p.type !== "command" && p.type !== "section" && !p.id.startsWith("_")
      )
      .map((p) => p.id);
    if (paramIds.length > 0) {
      await sendCommand(`getparam ${paramIds.join(";")}`);
    }
    setReadingAll(false);
  }, [category, sendCommand]);

  const handleParamChange = (paramId: string, value: string | number) => {
    setParamValues((prev) => ({ ...prev, [paramId]: value }));
    setChangedParams((prev) => new Set(prev).add(paramId));
  };

  // Helper to check if param has optional properties
  const getParamProp = <T,>(param: TeltonikaParam, key: string): T | undefined => {
    return (param as unknown as Record<string, unknown>)[key] as T | undefined;
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 200px)", minHeight: 500 }}>
      {/* ==== LEFT: Category Sidebar ==== */}
      <div
        style={{
          width: 200,
          minWidth: 200,
          background: "#151515",
          borderRight: "1px solid #2a2a2a",
          overflow: "auto",
          flexShrink: 0,
        }}
      >
        <div style={{ padding: "12px 8px" }}>
          {PARAMETER_CATEGORIES.map((cat) => {
            const changeCount = cat.params.filter((p) => changedParams.has(p.id)).length;
            return (
              <div
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  marginBottom: 2,
                  borderRadius: 6,
                  cursor: "pointer",
                  background: selectedCategory === cat.id ? "rgba(124, 58, 237, 0.15)" : "transparent",
                  color: selectedCategory === cat.id ? "#c4b5fd" : "#6b7280",
                  transition: "all 0.15s",
                  fontSize: 12,
                }}
              >
                <span style={{ fontSize: 14 }}>{cat.icon}</span>
                <span style={{ fontWeight: 500, flex: 1 }}>{cat.name}</span>
                {changeCount > 0 && (
                  <span
                    style={{
                      fontSize: 9,
                      background: "rgba(251,191,36,0.15)",
                      color: "#fbbf24",
                      padding: "1px 6px",
                      borderRadius: 8,
                      fontWeight: 700,
                    }}
                  >
                    {changeCount}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ==== CENTER: Parameter Editor ==== */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Toolbar */}
        <div
          style={{
            height: 44,
            background: "#1a1a1a",
            borderBottom: "1px solid #2a2a2a",
            display: "flex",
            alignItems: "center",
            padding: "0 14px",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 14 }}>{category?.icon}</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: "#f1f5f9" }}>{category?.name}</span>
          <span style={{ fontSize: 10, color: "#6b7280" }}>{category?.description}</span>
          <div style={{ flex: 1 }} />
          {selectedCategory !== "quick" && (
            <>
              <button
                onClick={readAllInCategory}
                disabled={readingAll}
                style={{
                  background: "rgba(124,58,237,0.15)",
                  border: "1px solid rgba(124,58,237,0.3)",
                  borderRadius: 6,
                  padding: "5px 12px",
                  color: "#c4b5fd",
                  fontSize: 10,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: 600,
                  opacity: readingAll ? 0.5 : 1,
                }}
              >
                {readingAll ? "Reading..." : "📖 Read All"}
              </button>
              {changedParams.size > 0 && (
                <button
                  onClick={writeAllChanged}
                  style={{
                    background: "#00c853",
                    border: "none",
                    borderRadius: 6,
                    padding: "5px 12px",
                    color: "#000",
                    fontSize: 10,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontWeight: 700,
                  }}
                >
                  💾 Save {changedParams.size} Change{changedParams.size > 1 ? "s" : ""}
                </button>
              )}
            </>
          )}
        </div>

        {/* Parameters */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
          {category?.params.map((param) => {
            // Section headers
            if (param.type === "section") {
              return (
                <div
                  key={param.id}
                  style={{
                    padding: "10px 0 4px",
                    fontSize: 11,
                    color: "#6b7280",
                    fontWeight: 700,
                    borderBottom: "1px solid #2a2a2a",
                    marginBottom: 8,
                    marginTop: 8,
                  }}
                >
                  {param.name}
                </div>
              );
            }

            // Quick commands
            if (param.type === "command") {
              const cmdParam = param as CommandParam;
              return (
                <div
                  key={param.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    marginBottom: 4,
                    borderRadius: 6,
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 12, color: "#e2e8f0" }}>{cmdParam.name}</div>
                    <div style={{ fontSize: 10, color: "#6b7280", marginTop: 1 }}>
                      <code style={{ color: "#c4b5fd" }}>{cmdParam.command}</code>
                      {cmdParam.description && <span> — {cmdParam.description}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => sendCommand(cmdParam.command)}
                    disabled={isSending === cmdParam.command}
                    style={{
                      background: cmdParam.dangerous ? "rgba(239,68,68,0.15)" : "rgba(0,200,83,0.15)",
                      border: `1px solid ${cmdParam.dangerous ? "rgba(239,68,68,0.3)" : "rgba(0,200,83,0.3)"}`,
                      borderRadius: 6,
                      padding: "5px 14px",
                      color: cmdParam.dangerous ? "#fca5a5" : "#00c853",
                      fontSize: 10,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontWeight: 600,
                      opacity: isSending === cmdParam.command ? 0.5 : 1,
                    }}
                  >
                    {isSending === cmdParam.command ? "Sending..." : cmdParam.dangerous ? "⚠ Send" : "▶ Send"}
                  </button>
                </div>
              );
            }

            // Parameter fields (select, number, text)
            const isChanged = changedParams.has(param.id);
            const value = paramValues[param.id] ?? getParamProp<number | string>(param, "default") ?? "";
            const unit = getParamProp<string>(param, "unit");
            const description = getParamProp<string>(param, "description");

            return (
              <div
                key={param.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  marginBottom: 3,
                  borderRadius: 6,
                  background: isChanged ? "rgba(251,191,36,0.08)" : "#1a1a1a",
                  border: `1px solid ${isChanged ? "rgba(251,191,36,0.3)" : "#2a2a2a"}`,
                }}
              >
                {/* Label */}
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 11, color: "#e2e8f0" }}>{param.name}</span>
                    <span
                      style={{
                        fontSize: 8,
                        padding: "1px 5px",
                        borderRadius: 3,
                        background: "rgba(59,130,246,0.12)",
                        color: "#93c5fd",
                        fontFamily: "monospace",
                      }}
                    >
                      {param.id}
                    </span>
                    {unit && <span style={{ fontSize: 9, color: "#525252" }}>{unit}</span>}
                  </div>
                  {description && (
                    <div style={{ fontSize: 9, color: "#525252", marginTop: 1 }}>{description}</div>
                  )}
                </div>

                {/* Input */}
                <div style={{ width: 180 }}>
                  {param.type === "select" ? (
                    <select
                      value={value}
                      onChange={(e) => handleParamChange(param.id, e.target.value)}
                      style={{
                        width: "100%",
                        background: "#111",
                        border: "1px solid #2a2a2a",
                        borderRadius: 5,
                        padding: "6px 8px",
                        color: "#e2e8f0",
                        fontSize: 11,
                        fontFamily: "inherit",
                        outline: "none",
                      }}
                    >
                      {(param as SelectParam).options.map((o) => (
                        <option key={o.v} value={o.v}>
                          {o.l}
                        </option>
                      ))}
                    </select>
                  ) : param.type === "number" ? (
                    <input
                      type="number"
                      value={value}
                      min={(param as NumberParam).min}
                      max={(param as NumberParam).max}
                      onChange={(e) => handleParamChange(param.id, e.target.value)}
                      style={{
                        width: "100%",
                        background: "#111",
                        border: "1px solid #2a2a2a",
                        borderRadius: 5,
                        padding: "6px 8px",
                        color: "#e2e8f0",
                        fontSize: 11,
                        fontFamily: "inherit",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleParamChange(param.id, e.target.value)}
                      style={{
                        width: "100%",
                        background: "#111",
                        border: "1px solid #2a2a2a",
                        borderRadius: 5,
                        padding: "6px 8px",
                        color: "#e2e8f0",
                        fontSize: 11,
                        fontFamily: "inherit",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  )}
                </div>

                {/* Read / Write buttons */}
                <button
                  onClick={() => readParam(param.id)}
                  title="Read from device"
                  style={{
                    background: "none",
                    border: "1px solid #2a2a2a",
                    borderRadius: 4,
                    padding: "3px 6px",
                    color: "#6b7280",
                    fontSize: 10,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  📖
                </button>
                <button
                  onClick={() => writeParam(param.id, value)}
                  title="Write to device"
                  disabled={!isChanged}
                  style={{
                    background: isChanged ? "rgba(0,200,83,0.15)" : "none",
                    border: `1px solid ${isChanged ? "rgba(0,200,83,0.3)" : "#2a2a2a"}`,
                    borderRadius: 4,
                    padding: "3px 6px",
                    color: isChanged ? "#00c853" : "#525252",
                    fontSize: 10,
                    cursor: isChanged ? "pointer" : "default",
                    fontFamily: "inherit",
                    opacity: isChanged ? 1 : 0.4,
                  }}
                >
                  💾
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==== RIGHT: Command Log ==== */}
      <div
        style={{
          width: 280,
          minWidth: 280,
          background: "#151515",
          borderLeft: "1px solid #2a2a2a",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: "10px 12px",
            borderBottom: "1px solid #2a2a2a",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 12, color: "#f1f5f9" }}>Command Log</span>
          <button
            onClick={() => setCommandLog([])}
            style={{
              background: "none",
              border: "none",
              color: "#6b7280",
              fontSize: 10,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Clear
          </button>
        </div>

        <div ref={logRef} style={{ flex: 1, overflow: "auto", padding: 6 }}>
          {commandLog.length === 0 && (
            <div style={{ textAlign: "center", padding: 30, color: "#525252", fontSize: 10 }}>
              No commands sent yet.
            </div>
          )}
          {commandLog.map((entry) => (
            <div
              key={entry.id}
              style={{
                marginBottom: 4,
                padding: "6px 8px",
                borderRadius: 5,
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                <span
                  style={{
                    fontSize: 8,
                    padding: "1px 5px",
                    borderRadius: 3,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    background:
                      entry.status === "executed"
                        ? "rgba(0,200,83,0.2)"
                        : entry.status === "delivered"
                        ? "rgba(0,200,83,0.15)"
                        : entry.status === "sent"
                        ? "rgba(59,130,246,0.15)"
                        : entry.status === "pending"
                        ? "rgba(251,191,36,0.15)"
                        : "rgba(239,68,68,0.15)",
                    color:
                      entry.status === "executed"
                        ? "#4ade80"
                        : entry.status === "delivered"
                        ? "#00c853"
                        : entry.status === "sent"
                        ? "#60a5fa"
                        : entry.status === "pending"
                        ? "#fbbf24"
                        : "#f87171",
                  }}
                >
                  {entry.status}
                </span>
                <code style={{ fontSize: 10, color: "#c4b5fd", fontWeight: 600 }}>{entry.command}</code>
                <span style={{ fontSize: 8, color: "#525252", marginLeft: "auto" }}>
                  {entry.sent_at ? new Date(entry.sent_at).toLocaleTimeString() : ""}
                </span>
              </div>
              {entry.response && (
                <div
                  style={{
                    marginTop: 3,
                    padding: "4px 6px",
                    borderRadius: 3,
                    background: "rgba(0,200,83,0.06)",
                    fontSize: 9,
                    color: "#4ade80",
                    fontFamily: "monospace",
                    wordBreak: "break-all",
                  }}
                >
                  {entry.response}
                </div>
              )}
              {entry.error_message && (
                <div
                  style={{
                    marginTop: 3,
                    padding: "4px 6px",
                    borderRadius: 3,
                    background: "rgba(239,68,68,0.06)",
                    fontSize: 9,
                    color: "#f87171",
                    fontFamily: "monospace",
                    wordBreak: "break-all",
                  }}
                >
                  {entry.error_message}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Custom command */}
        <div style={{ padding: 8, borderTop: "1px solid #2a2a2a" }}>
          <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 4 }}>Custom Command</div>
          <div style={{ display: "flex", gap: 4 }}>
            <input
              value={customCommand}
              onChange={(e) => setCustomCommand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && customCommand.trim()) {
                  sendCommand(customCommand.trim());
                  setCustomCommand("");
                }
              }}
              placeholder="e.g. setparam 2001:internet"
              style={{
                flex: 1,
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
                borderRadius: 5,
                padding: "6px 8px",
                color: "#e2e8f0",
                fontSize: 10,
                fontFamily: "inherit",
                outline: "none",
              }}
            />
            <button
              onClick={() => {
                if (customCommand.trim()) {
                  sendCommand(customCommand.trim());
                  setCustomCommand("");
                }
              }}
              style={{
                background: "#7c3aed",
                border: "none",
                borderRadius: 5,
                padding: "6px 10px",
                color: "#fff",
                fontSize: 10,
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 700,
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}