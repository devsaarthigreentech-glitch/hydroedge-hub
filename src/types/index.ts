// Replace the existing file with this updated version
// ============================================================================
// TYPE DEFINITIONS - SGT Hydroedge Admin Panel
// ============================================================================

export type ConnectionStatus = "online" | "offline";
export type DeviceStatus = "active" | "inactive" | "suspended" | "maintenance" | "stolen";
export type CustomerStatus = "active" | "trial" | "suspended" | "inactive";
export type CustomerType = "customer" | "vendor" | "partner" | "dealer";
export type CommandStatus = "pending" | "sent" | "executed" | "failed" | "timeout";
export type TelemetryType = "system" | "sensor";

export interface Customer {
  id: string; // UUID
  name: string;
  email: string;
  phone?: string;
  company_name?: string;
  customer_type: CustomerType;
  status: CustomerStatus;
  parent_customer_id: string | null; // UUID
  hierarchy_level: number;
  max_devices: number;
  city?: string;
  state?: string;
  country?: string;
  created_at: string;
  updated_at?: string;
}

export interface Device {
  id: string; // UUID
  imei: string;
  device_name?: string;
  device_type: string;
  manufacturer: string;
  status: DeviceStatus;
  connection_status: ConnectionStatus;
  customer_id: string; // UUID
  asset_name?: string;
  asset_type?: string;
  sim_number?: string;
  last_latitude?: number;
  last_longitude?: number;
  last_location_time?: string;
  firmware_version?: string;
  tags?: string[];
  created_at: string;
  updated_at?: string;
}

export interface TelemetryParameter {
  id: number;
  name: string;
  value: string;
  type: TelemetryType;
  timestamp: string;
}

export interface Command {
  id: number | string;
  command: string;
  status: CommandStatus;
  sent_at: string;
  executed_at?: string;
  response?: string;
  error?: string;
  error_message?: string;
}

export interface GPSRecord {
  id: number;
  device_id: string; // UUID
  timestamp: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  direction?: number;
  satellites?: number;
  hdop?: number;
}

export interface IORecord {
  id: number;
  device_id: string; // UUID
  timestamp: string;
  io_id: number;
  io_value: number;
  io_name?: string;
}

// UI State Types
export type ViewType = "devices" | "customers" | "telemetry" | "settings";
export type DeviceTab = "info" | "edit" | "telemetry" | "graphs" | "commands" | "logs" | "settings";

export interface AppState {
  currentView: ViewType;
  selectedDevice: Device | null;
  selectedTab: DeviceTab;
  searchQuery: string;
  customerFilter: string;
  sidebarOpen: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}