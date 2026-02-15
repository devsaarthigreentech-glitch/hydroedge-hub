# SGT Hydroedge Admin Panel - File Structure

## Complete Directory Structure

```
sgt-hydroedge-admin/
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── layout.tsx                 # Root layout with providers
│   │   ├── page.tsx                   # Main dashboard (device list)
│   │   ├── globals.css                # Global styles & Flespi theme
│   │   └── api/                       # API routes for backend
│   │       ├── devices/
│   │       │   └── route.ts           # GET/POST/PUT /api/devices
│   │       ├── customers/
│   │       │   └── route.ts           # GET/POST /api/customers
│   │       └── telemetry/
│   │           └── [deviceId]/route.ts # GET /api/telemetry/:deviceId
│   │
│   ├── components/                    # React components
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx            # Left sidebar navigation
│   │   │   ├── TopBar.tsx             # Top header bar
│   │   │   └── MainLayout.tsx         # Overall layout wrapper
│   │   │
│   │   ├── devices/
│   │   │   ├── DeviceList.tsx         # Device list view
│   │   │   ├── DeviceCard.tsx         # Individual device card
│   │   │   ├── DeviceDetail.tsx       # Device detail container
│   │   │   └── DeviceSearchBar.tsx    # Search/filter bar
│   │   │
│   │   ├── device-detail/            # Device detail tabs
│   │   │   ├── InfoTab.tsx           # Device info display
│   │   │   ├── EditTab.tsx           # Device editing
│   │   │   ├── TelemetryTab.tsx      # Real-time telemetry grid
│   │   │   ├── CommandsTab.tsx       # Command sending
│   │   │   ├── LogsTab.tsx           # Message logs
│   │   │   └── SettingsTab.tsx       # Device settings
│   │   │
│   │   ├── customers/
│   │   │   ├── CustomerList.tsx       # Customer hierarchy view
│   │   │   ├── CustomerCard.tsx       # Customer card component
│   │   │   └── AddCustomerModal.tsx   # Add customer modal
│   │   │
│   │   ├── telemetry/
│   │   │   ├── TelemetryGrid.tsx      # Telemetry parameter grid
│   │   │   └── TelemetryCard.tsx      # Individual parameter card
│   │   │
│   │   └── ui/                        # Reusable UI components
│   │       ├── Icons.tsx              # SVG icon components
│   │       ├── Button.tsx             # Custom button
│   │       ├── Input.tsx              # Custom input
│   │       └── Modal.tsx              # Modal wrapper
│   │
│   ├── lib/                           # Utility libraries
│   │   ├── utils.ts                   # Helper functions
│   │   ├── constants.ts               # App constants
│   │   └── api.ts                     # API client functions
│   │
│   ├── types/                         # TypeScript types
│   │   └── index.ts                   # All type definitions
│   │
│   ├── hooks/                         # Custom React hooks
│   │   ├── useDevices.ts              # Device data hook
│   │   ├── useCustomers.ts            # Customer data hook
│   │   └── useTelemetry.ts            # Telemetry data hook
│   │
│   └── data/                          # Data layer
│       └── mock-data.ts               # Mock data (temp)
│
├── public/                            # Static assets
│
├── next.config.js                     # Next.js configuration
├── tailwind.config.js                 # Tailwind CSS config
├── tsconfig.json                      # TypeScript config
├── package.json                       # Dependencies
└── README.md                          # Project documentation
```

## Key Files Created

✅ `/src/types/index.ts` - All TypeScript interfaces
✅ `/src/lib/utils.ts` - Utility functions (timeAgo, formatting, etc.)
✅ `/src/lib/constants.ts` - App constants (colors, configs)
✅ `/src/data/mock-data.ts` - Mock customers & devices
✅ `/src/components/ui/Icons.tsx` - SVG icon library

## Next Steps

1. Create layout components (Sidebar, TopBar, MainLayout)
2. Create device components (DeviceList, DeviceCard, DeviceDetail)
3. Create device detail tabs (InfoTab, TelemetryTab, CommandsTab, etc.)
4. Create customer components
5. Create main page.tsx with state management
6. Add global styles (Flespi dark theme)
7. Create API routes (optional, for backend integration)

## Component Breakdown

### Layout Components
- **Sidebar.tsx**: Collapsible sidebar with navigation, user info, customer filters
- **TopBar.tsx**: Top header with breadcrumbs, device info, filters
- **MainLayout.tsx**: Combines sidebar + topbar + main content area

### Device Components
- **DeviceList.tsx**: Grid/list of all devices with filters
- **DeviceCard.tsx**: Individual device row/card with status
- **DeviceDetail.tsx**: Container for device detail view with tabs
- **DeviceSearchBar.tsx**: Bottom search bar (Flespi-style)

### Device Detail Tabs
- **InfoTab.tsx**: Read-only device information display
- **EditTab.tsx**: Edit device name, customer, asset, etc.
- **TelemetryTab.tsx**: Real-time telemetry grid (system/sensor params)
- **CommandsTab.tsx**: Send GPRS commands, view history
- **LogsTab.tsx**: Message logs, AVL data packets
- **SettingsTab.tsx**: Device configuration (intervals, geofence)

### Customer Components
- **CustomerList.tsx**: Hierarchical customer tree
- **CustomerCard.tsx**: Customer card with metrics
- **AddCustomerModal.tsx**: Modal to add new customer

## State Management Strategy

Using React Context + hooks for now:
- `useDevices()` - Fetch/filter devices
- `useCustomers()` - Fetch customers
- `useTelemetry()` - Real-time telemetry updates

Later: Consider Zustand or React Query for better caching.

## API Integration Points

Replace mock data with actual API calls:
1. `GET /api/devices` - List all devices
2. `GET /api/devices/:id` - Get device details
3. `POST /api/devices/:id/command` - Send command
4. `GET /api/telemetry/:deviceId` - Get telemetry
5. `GET /api/customers` - List customers
6. `POST /api/customers` - Create customer

## Styling Approach

- Inline styles for now (matching your prototype)
- Flespi-inspired dark theme
- Later: Extract to CSS modules or Tailwind classes
