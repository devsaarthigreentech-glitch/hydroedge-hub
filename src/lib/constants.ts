// ============================================================================
// CONSTANTS - SGT Hydroedge Admin Panel
// ============================================================================

export const APP_CONFIG = {
  name: "SGT Hydroedge",
  version: "1.0.0",
  adminEmail: "admin@sghydroedge.com",
};

export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
  timeout: 30000,
};

export const TELEMETRY_CONFIG = {
  updateInterval: 5000, // 5 seconds
  historyLimit: 100,
};

export const DEVICE_CONFIG = {
  defaultTimeout: 259200, // Active Data Link Timeout (3 days)
  onlineThreshold: 60000, // 1 minute - device considered active if data within this time
};

export const COLORS = {
  primary: "#7c3aed",
  success: "#00c853",
  warning: "#fbbf24",
  danger: "#ef4444",
  info: "#3b82f6",
  
  online: "#00c853",
  offline: "#424242",
  
  background: {
    dark: "#1a1a1a",
    darker: "#1e1e1e",
    darkest: "#242424",
    sidebar: "#2d1b4e",
  },
  
  border: {
    light: "#333",
    lighter: "#444",
    dark: "#2a2a2a",
  },
  
  text: {
    primary: "#f1f5f9",
    secondary: "#e0e0e0",
    muted: "#94a3b8",
    disabled: "#6b7280",
    faint: "#525252",
  },
};

export const COMMAND_PRESETS = [
  "getinfo",
  "getgps",
  "getver",
  "setdigout 1",
  "setdigout 0",
];

export const DEVICE_TYPES = [
  { value: "FMC650", label: "Teltonika FMC650" },
  { value: "FMB150", label: "Teltonika FMB150" },
  { value: "FMB920", label: "Teltonika FMB920" },
  { value: "FMB125", label: "Teltonika FMB125" },
];

export const CUSTOMER_TYPES = [
  { value: "customer", label: "Customer" },
  { value: "vendor", label: "Vendor" },
  { value: "partner", label: "Partner" },
  { value: "dealer", label: "Dealer" },
];

export const ASSET_TYPES = [
  { value: "truck", label: "Truck" },
  { value: "van", label: "Van" },
  { value: "car", label: "Car" },
  { value: "bus", label: "Bus" },
  { value: "container", label: "Container" },
  { value: "equipment", label: "Equipment" },
  { value: "other", label: "Other" },
];
