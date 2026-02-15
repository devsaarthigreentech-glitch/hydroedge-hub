// ============================================================================
// UTILITY FUNCTIONS - SGT Hydroedge Admin Panel
// ============================================================================

/**
 * Calculate time elapsed from a given date string
 */
export const timeAgo = (dateStr: string | undefined): string => {
  if (!dateStr) return "never";
  
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  
  if (sec < 10) return "a few seconds ago";
  if (sec < 60) return `${sec} seconds ago`;
  
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min > 1 ? "s" : ""} ago`;
  
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr > 1 ? "s" : ""} ago`;
  
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? "s" : ""} ago`;
};

/**
 * Format timestamp to readable date-time string
 */
export const formatTimestamp = (ts: string | undefined): string => {
  if (!ts) return "";
  
  const d = new Date(ts);
  return d.toLocaleString("en-IN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

/**
 * Check if device is actively transmitting (online + recent data)
 */
export const isDeviceActive = (
  connectionStatus: string,
  lastLocationTime?: string
): boolean => {
  if (connectionStatus !== "online") return false;
  if (!lastLocationTime) return false;
  
  const timeSinceLastData = Date.now() - new Date(lastLocationTime).getTime();
  return timeSinceLastData < 60000; // Active if data within last minute
};

/**
 * Get connection status color
 */
export const getConnectionColor = (status: string): string => {
  return status === "online" ? "#00c853" : "#424242";
};

/**
 * Get status badge color
 */
export const getStatusColor = (status: string): {
  background: string;
  color: string;
} => {
  const colors: Record<string, { background: string; color: string }> = {
    active: { background: "rgba(0, 200, 83, 0.15)", color: "#4ade80" },
    trial: { background: "rgba(251, 191, 36, 0.15)", color: "#fbbf24" },
    inactive: { background: "rgba(156, 163, 175, 0.1)", color: "#9ca3af" },
    suspended: { background: "rgba(239, 68, 68, 0.15)", color: "#f87171" },
  };
  
  return colors[status] || colors.inactive;
};

/**
 * Get hierarchy level color
 */
export const getHierarchyColor = (level: number): string => {
  const colors = ["#7c3aed", "#00c853", "#fbbf24", "#ef4444"];
  return colors[level] || colors[3];
};

/**
 * Filter devices by search query
 */
export const filterDevices = (
  devices: any[],
  searchQuery: string,
  customerFilter: string
): any[] => {
  return devices.filter((d) => {
    const matchesSearch =
      !searchQuery ||
      d.device_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.imei.includes(searchQuery);
    const matchesCustomer =
      customerFilter === "all" || d.customer_id === customerFilter;
    return matchesSearch && matchesCustomer;
  });
};

/**
 * Get customer name by ID
 */
export const getCustomerName = (
  customers: any[],
  customerId: string
): string => {
  return customers.find((c) => c.id === customerId)?.name || "Unassigned";
};

/**
 * Calculate device usage percentage
 */
export const calculateDeviceUsage = (used: number, max: number): number => {
  return Math.min((used / max) * 100, 100);
};

/**
 * Classify value based on thresholds
 */
export const classifyValue = (
  value: number,
  thresholds: { low: number; high: number }
): "low" | "normal" | "high" => {
  if (value < thresholds.low) return "low";
  if (value > thresholds.high) return "high";
  return "normal";
};
