// ============================================================================
// TAB PERMISSIONS - Controls which device detail tabs each customer type sees
// ============================================================================
// This is used in the customer portal (/portal) only.
// The admin panel always shows all tabs regardless.
// ============================================================================

export const ALL_DEVICE_TABS = [
    'info',
    'edit',
    'telemetry',
    'graphs',
    'analytics',
    'commands',
    'config',
    'logs',
    'settings',
    'map'
  ] as const;
  
  export type DeviceTab = (typeof ALL_DEVICE_TABS)[number];
  
  // Tab metadata for rendering
  export const TAB_META: Record<
    DeviceTab,
    { label: string; icon: string; description: string }
  > = {
    info: {
      label: 'Info',
      icon: 'ℹ️',
      description: 'Device information and status',
    },
    edit: {
      label: 'Edit',
      icon: '✏️',
      description: 'Edit device properties',
    },
    telemetry: {
      label: 'Telemetry',
      icon: '📡',
      description: 'Live telemetry data',
    },
    graphs: {
      label: 'Graphs',
      icon: '📈',
      description: 'Historical data charts',
    },
    analytics: {
      label: 'Analytics',
      icon: '📊',
      description: 'Trip and usage analytics',
    },
    commands: {
      label: 'Commands',
      icon: '⌨️',
      description: 'Send commands to device',
    },
    config: {
      label: 'Config',
      icon: '⚙️',
      description: 'Device configuration',
    },
    logs: {
      label: 'Logs & Messages',
      icon: '📋',
      description: 'Device logs and messages',
    },
    settings: {
      label: 'Settings',
      icon: '🔧',
      description: 'Device settings',
    },
    map: {
      label: 'Map',
      icon: '📍',
      description: 'Device Location',
    },
  };
  
  // ============================================================================
  // PERMISSION MAP: customer_type → allowed tabs
  // ============================================================================
  // Modify these arrays to change what each customer type can access.
  // The admin panel ignores this entirely — admins always see everything.
  // ============================================================================
  
  export const TAB_PERMISSIONS: Record<string, DeviceTab[]> = {
    // End customers — monitoring only (Info + Telemetry + Analytics + Graphs)
    customer: ['info', 'telemetry', 'analytics', 'graphs','map'],
  
    // Vendors — same as customer (they supply devices, don't need admin tabs)
    vendor: ['info', 'telemetry', 'analytics', 'graphs','map'],
  
    // Partners — operational access (can edit devices, see logs)
    partner: ['info', 'edit', 'telemetry', 'graphs', 'analytics', 'logs','map'],
  
    // Dealers — full access (they resell your platform, need everything)
    dealer: [
      'info',
      'edit',
      'telemetry',
      'graphs',
      'analytics',
      'commands',
      'config',
      'logs',
      'settings',
      'map'
    ],
  };
  
  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================
  
  /**
   * Get allowed tabs for a customer type.
   * Falls back to 'customer' (most restrictive) if type is unknown.
   */
  export function getAllowedTabs(customerType: string): DeviceTab[] {
    return TAB_PERMISSIONS[customerType] || TAB_PERMISSIONS.customer;
  }
  
  /**
   * Check if a specific tab is allowed for a customer type.
   */
  export function isTabAllowed(
    customerType: string,
    tab: DeviceTab
  ): boolean {
    const allowed = getAllowedTabs(customerType);
    return allowed.includes(tab);
  }
  
  /**
   * Get tab metadata only for allowed tabs (ready to render).
   */
  export function getVisibleTabs(
    customerType: string
  ): Array<{ key: DeviceTab; label: string; icon: string }> {
    const allowed = getAllowedTabs(customerType);
    return allowed.map((key) => ({
      key,
      label: TAB_META[key].label,
      icon: TAB_META[key].icon,
    }));
  }