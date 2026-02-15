# Component Architecture - SGT Hydroedge Admin

## Component Hierarchy

```
App (page.tsx)
│
├── Sidebar
│   └── Uses: Icons, Customer data
│
├── TopBar
│   └── Uses: Icons, Device count, Customer filter
│
└── Main Content (Conditional Rendering)
    │
    ├── DeviceList (when currentView === "devices" && !selectedDevice)
    │   ├── Uses: Icons, Device cards, Search bar
    │   └── Triggers: onDeviceSelect → shows DeviceDetail
    │
    ├── DeviceDetail (when selectedDevice exists)
    │   ├── Header: Device info, connection status
    │   ├── Tabs: Info, Edit, Telemetry, Commands, Logs, Settings
    │   └── Tab Components:
    │       ├── InfoTab - Device specifications
    │       ├── EditTab - Edit form with customer dropdown
    │       ├── TelemetryTab - 2-column parameter grid
    │       ├── CommandsTab - GPRS command interface
    │       └── Placeholder tabs (Logs, Settings)
    │
    └── CustomerList (when currentView === "customers")
        ├── Customer cards (hierarchical with indentation)
        ├── Metrics: device count, online count, sub-customers
        └── AddCustomerModal (when showModal === true)
```

---

## Data Flow

### State Management (in App/page.tsx)

```typescript
State Variables:
├── sidebarOpen: boolean
├── currentView: "devices" | "customers"
├── selectedDevice: Device | null
└── customerFilter: string ("all" or customer ID)

Data Sources:
├── MOCK_DEVICES (from mock-data.ts)
└── MOCK_CUSTOMERS (from mock-data.ts)

Computed Values:
└── filteredDevices (devices filtered by customerFilter)
```

### Props Flow

```
App
├─> Sidebar
│   ├─ isOpen: sidebarOpen
│   ├─ currentView: currentView
│   ├─ customerFilter: customerFilter
│   ├─ customers: MOCK_CUSTOMERS
│   ├─ onToggle: () => setSidebarOpen(!sidebarOpen)
│   ├─ onViewChange: (view) => setCurrentView(view)
│   └─ onCustomerFilterChange: (id) => setCustomerFilter(id)
│
├─> TopBar
│   ├─ sidebarOpen: sidebarOpen
│   ├─ currentView: currentView
│   ├─ selectedDevice: selectedDevice
│   ├─ filteredDevicesCount: filteredDevices.length
│   ├─ customerFilter: customerFilter
│   ├─ customers: MOCK_CUSTOMERS
│   ├─ onToggleSidebar: () => setSidebarOpen(!sidebarOpen)
│   └─ onCustomerFilterChange: (id) => setCustomerFilter(id)
│
├─> DeviceList
│   ├─ devices: filteredDevices
│   ├─ customers: MOCK_CUSTOMERS
│   └─ onDeviceSelect: (device) => setSelectedDevice(device)
│
├─> DeviceDetail
│   ├─ device: selectedDevice
│   ├─ customers: MOCK_CUSTOMERS
│   └─ onClose: () => setSelectedDevice(null)
│
└─> CustomerList
    ├─ customers: MOCK_CUSTOMERS
    ├─ devices: MOCK_DEVICES
    ├─ onCustomerFilterChange: (id) => setCustomerFilter(id)
    └─ onViewChange: (view) => setCurrentView(view)
```

---

## Component Responsibilities

### 1. **App (page.tsx)** - Main Container
- **Purpose**: Root component, state management
- **State**: View mode, selected device, filters
- **Renders**: Sidebar + TopBar + Content (conditional)

### 2. **Sidebar** - Navigation
- **Purpose**: App navigation and quick filters
- **Features**: 
  - Collapsible (56px ↔ 240px)
  - View switching (Devices/Customers)
  - Customer quick filters
- **Styling**: Purple gradient (#2d1b4e background)

### 3. **TopBar** - Header
- **Purpose**: Context-aware top navigation
- **Dynamic Content**:
  - Shows device name when device selected
  - Shows device count + filter when in list view
  - Shows customer count in customer view

### 4. **DeviceList** - Device Grid
- **Purpose**: Display all devices with search
- **Features**:
  - Device cards (Flespi-style)
  - Online/offline status indicators
  - Bottom search bar
  - Click to open DeviceDetail
- **Layout**: Alternating row colors (#1e1e1e / #222)

### 5. **DeviceDetail** - Device Management
- **Purpose**: Device detail view with tabs
- **Sub-components**:
  - **InfoTab**: Read-only device info
  - **EditTab**: Edit device properties
  - **TelemetryTab**: Live parameter grid (updates every 5s)
  - **CommandsTab**: Send GPRS commands
- **State**: selectedTab, telemetryData, commandHistory

### 6. **CustomerList** - Customer Management
- **Purpose**: Hierarchical customer display
- **Features**:
  - Indent based on hierarchy_level (×32px per level)
  - Metrics display (devices, online, sub-customers)
  - Progress bar (device usage vs limit)
  - "Add Customer" modal trigger

### 7. **AddCustomerModal** - Customer Creation
- **Purpose**: Modal form for new customers
- **Fields**: Name, Company, Email, Phone, Location, Parent, Type
- **Styling**: Centered overlay with backdrop blur

---

## Utility Files

### types/index.ts
Defines all TypeScript interfaces:
- Customer, Device, TelemetryParameter, Command
- Enums: CustomerType, DeviceStatus, ConnectionStatus, etc.

### lib/utils.ts
Helper functions:
- `timeAgo(dateStr)`: Convert timestamp to "2 hours ago"
- `formatTimestamp(ts)`: Format as "DD/MM/YYYY HH:mm:ss"
- `generateTelemetry(deviceId)`: Generate mock telemetry data

### data/mock-data.ts
Mock data arrays:
- MOCK_CUSTOMERS: 4 customers (hierarchical)
- MOCK_DEVICES: 6 devices (various states)

### components/Icons.tsx
SVG icon components:
- Devices, Customers, Telemetry, Commands, etc.
- All icons are inline SVG for styling flexibility

---

## Styling Strategy

### Inline Styles (Flespi Approach)
- **Why**: Dynamic styling, no CSS class naming conflicts
- **Colors**: Dark theme (#1a1a1a background, #242424 cards)
- **Typography**: JetBrains Mono (monospace for technical feel)
- **Hover Effects**: Implemented with onMouseEnter/onMouseLeave

### Key Color Palette
```
Primary Purple: #7c3aed
Success Green: #00c853
Online Green:   #4ade80
Offline Gray:   #424242
Background:     #1a1a1a
Card Dark:      #242424
Border:         #333
Text Primary:   #f1f5f9
Text Secondary: #6b7280
```

---

## Real-time Updates

### Current (Mock) Implementation
```typescript
// In DeviceDetail.tsx TelemetryTab
useEffect(() => {
  setTelemetryData(generateTelemetry(device.id));
  const interval = setInterval(() => {
    setTelemetryData(generateTelemetry(device.id));
  }, 5000); // Update every 5 seconds
  return () => clearInterval(interval);
}, [device, selectedTab]);
```

### Future (WebSocket) Implementation
```typescript
// In App page.tsx
useEffect(() => {
  const ws = new WebSocket(process.env.NEXT_PUBLIC_GPS_SERVER_URL);
  
  ws.onmessage = (event) => {
    const update = JSON.parse(event.data);
    // Update device state in real-time
    setDevices(prev => prev.map(d => 
      d.imei === update.imei ? { ...d, ...update } : d
    ));
  };
  
  return () => ws.close();
}, []);
```

---

## Key User Flows

### 1. View Device Telemetry
```
User clicks device in DeviceList
  → App sets selectedDevice
  → DeviceDetail renders
  → TelemetryTab auto-selected
  → Telemetry updates every 5s
```

### 2. Send Command to Device
```
User selects device → Commands tab
  → User types command or clicks preset
  → handleSendCommand() called
  → Command added to history as "sent"
  → After 2s, status changes to "executed" (mock)
```

### 3. Filter Devices by Customer
```
User clicks customer in Sidebar
  → customerFilter state updated
  → filteredDevices recomputed
  → DeviceList re-renders with filtered data
```

### 4. Add New Customer
```
User clicks "Add Customer" in CustomerList
  → showModal set to true
  → AddCustomerModal renders
  → User fills form and clicks "Create"
  → (Future: API call to create customer)
```

---

## Integration Points

### Replace with Real API

**File**: `src/app/page.tsx`

**Current**:
```typescript
import { MOCK_CUSTOMERS, MOCK_DEVICES } from "@/data/mock-data";
```

**Future**:
```typescript
import { useEffect, useState } from "react";
import { deviceApi, customerApi } from "@/lib/api";

const [devices, setDevices] = useState([]);
const [customers, setCustomers] = useState([]);

useEffect(() => {
  async function fetchData() {
    const [devicesRes, customersRes] = await Promise.all([
      deviceApi.getAll(),
      customerApi.getAll(),
    ]);
    setDevices(devicesRes.data);
    setCustomers(customersRes.data);
  }
  fetchData();
}, []);
```

---

## Performance Considerations

1. **Device List Rendering**: Uses React keys on device.id
2. **Telemetry Updates**: Throttled to 5s intervals
3. **Search Filtering**: Client-side (fine for <1000 devices)
4. **Future**: Add pagination for large device lists

---

## Testing Strategy

### Unit Tests (Future)
- `utils.ts`: timeAgo, formatTimestamp
- Mock data generators
- Component prop handling

### Integration Tests (Future)
- User flows (view device, send command, filter)
- API integration
- WebSocket connection handling

---

## Deployment Checklist

- [ ] Replace mock data with API calls
- [ ] Add WebSocket connection
- [ ] Implement authentication
- [ ] Add error boundaries
- [ ] Set up logging (Sentry, LogRocket)
- [ ] Configure production environment variables
- [ ] Build and test production bundle
- [ ] Set up CI/CD pipeline
- [ ] Configure monitoring/analytics

---

**This architecture is designed for easy transition from mock data to real backend integration while maintaining the Flespi-inspired UI/UX.**
