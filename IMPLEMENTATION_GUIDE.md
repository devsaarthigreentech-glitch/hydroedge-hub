# SGT Hydroedge Admin Panel - Implementation Guide

## 🎯 Current Status

### ✅ Completed Files
1. `/src/types/index.ts` - All TypeScript type definitions
2. `/src/lib/utils.ts` - Utility functions (timeAgo, formatting, filters)
3. `/src/lib/constants.ts` - App constants (colors, configs, presets)
4. `/src/data/mock-data.ts` - Mock data for customers & devices
5. `/src/components/ui/Icons.tsx` - Complete SVG icon library

### 📂 Directory Structure Created
- ✅ `src/components/layout/`
- ✅ `src/components/devices/`
- ✅ `src/components/device-detail/`
- ✅ `src/components/customers/`
- ✅ `src/components/telemetry/`
- ✅ `src/components/ui/`
- ✅ `src/app/api/devices/`
- ✅ `src/app/api/customers/`
- ✅ `src/app/api/telemetry/`
- ✅ `src/hooks/`

## 🔨 Next Implementation Steps

### Step 1: Create Core Layout Components

**Priority: HIGH**

Create these three files first - they form the shell of your app:

1. **`src/components/layout/Sidebar.tsx`**
   - Collapsible sidebar (240px expanded, 56px collapsed)
   - Brand logo + version
   - User info section
   - Navigation items (Devices, Customers)
   - Customer filter quick links
   - Props: `isOpen: boolean`, `onToggle: () => void`, `currentView: string`, `onViewChange: (view) => void`

2. **`src/components/layout/TopBar.tsx`**
   - Device name / breadcrumb
   - Menu toggle button
   - Current device info (if selected)
   - Customer filter dropdown
   - Props: `selectedDevice?: Device`, `customerFilter: string`, `onFilterChange: (id) => void`

3. **`src/components/layout/MainLayout.tsx`**
   - Wrapper component combining Sidebar + TopBar + children
   - Manages sidebar state
   - Props: `children: ReactNode`

### Step 2: Create Device Components

**Priority: HIGH**

4. **`src/components/devices/DeviceCard.tsx`**
   - Single device row/card
   - Shows: icon, name, IMEI, status, connection, metrics
   - Click handler to open detail view
   - Props: `device: Device`, `onClick: () => void`, `customer?: Customer`

5. **`src/components/devices/DeviceSearchBar.tsx`**
   - Bottom search bar (Flespi style)
   - Search input + clear button
   - Props: `searchQuery: string`, `onSearchChange: (query) => void`

6. **`src/components/devices/DeviceList.tsx`**
   - Maps over filtered devices
   - Renders DeviceCard for each
   - Includes DeviceSearchBar at bottom
   - Props: `devices: Device[]`, `onDeviceSelect: (device) => void`, `searchQuery`, `onSearchChange`

### Step 3: Create Device Detail Tabs

**Priority: MEDIUM**

7. **`src/components/device-detail/InfoTab.tsx`**
   - Read-only device information display
   - Props: `device: Device`, `customer?: Customer`

8. **`src/components/device-detail/TelemetryTab.tsx`**
   - Two-column grid of telemetry parameters
   - System params (gray) vs Sensor params (yellow/green)
   - Props: `telemetry: TelemetryParameter[]`

9. **`src/components/device-detail/CommandsTab.tsx`**
   - Command input + preset buttons
   - Command history list
   - Props: `device: Device`, `commands: Command[]`, `onSendCommand: (cmd) => void`

10. **`src/components/device-detail/EditTab.tsx`**
    - Form to edit device properties
    - Props: `device: Device`, `customers: Customer[]`, `onSave: (data) => void`

11. **`src/components/device-detail/LogsTab.tsx`**
    - Placeholder for now
    - Will show AVL message logs
    - Props: `device: Device`

12. **`src/components/device-detail/SettingsTab.tsx`**
    - Placeholder for now
    - Will have device config options
    - Props: `device: Device`

13. **`src/components/devices/DeviceDetail.tsx`**
    - Container with tabs (Info, Edit, Telemetry, Commands, Logs, Settings)
    - Device header bar
    - Tab navigation
    - Renders active tab content
    - Props: `device: Device`, `onClose: () => void`

### Step 4: Create Customer Components

**Priority: MEDIUM**

14. **`src/components/customers/CustomerCard.tsx`**
    - Single customer card with hierarchy indent
    - Shows metrics, device count, status
    - Props: `customer: Customer`, `deviceCount: number`, `onlineCount: number`, `childCount: number`

15. **`src/components/customers/CustomerList.tsx`**
    - Maps over customers
    - Renders CustomerCard for each
    - Props: `customers: Customer[]`, `devices: Device[]`, `onSelectCustomer: (id) => void`

16. **`src/components/customers/AddCustomerModal.tsx`**
    - Modal with form to add new customer
    - Props: `isOpen: boolean`, `onClose: () => void`, `customers: Customer[]`, `onSubmit: (data) => void`

### Step 5: Create Main Page

**Priority: HIGH**

17. **`src/app/page.tsx`**
    - Main dashboard component
    - State management (currentView, selectedDevice, searchQuery, customerFilter, etc.)
    - Conditional rendering (DeviceList vs DeviceDetail vs CustomerList)
    - Uses MainLayout wrapper
    - Implements all event handlers

18. **`src/app/layout.tsx`**
    - Root layout
    - HTML + body tags
    - Metadata
    - Font configuration

19. **`src/app/globals.css`**
    - Reset styles
    - Flespi dark theme variables
    - JetBrains Mono font import
    - Body styles

### Step 6: Create Hooks (Optional but Recommended)

**Priority: LOW (for now, use state in page.tsx)**

20. **`src/hooks/useDevices.ts`**
    - Fetch devices from API
    - Filter logic
    - Return `{ devices, loading, error, refetch }`

21. **`src/hooks/useCustomers.ts`**
    - Fetch customers from API
    - Return `{ customers, loading, error, refetch }`

22. **`src/hooks/useTelemetry.ts`**
    - Fetch telemetry for a device
    - Auto-refresh every 5 seconds
    - Return `{ telemetry, loading, error }`

### Step 7: Create API Routes (When ready for backend)

**Priority: FUTURE**

23. **`src/app/api/devices/route.ts`**
    - `GET /api/devices` - List all devices
    - `POST /api/devices` - Create device

24. **`src/app/api/customers/route.ts`**
    - `GET /api/customers` - List all customers
    - `POST /api/customers` - Create customer

25. **`src/app/api/telemetry/[deviceId]/route.ts`**
    - `GET /api/telemetry/:deviceId` - Get device telemetry

## 📝 Component Template Structure

Each component should follow this pattern:

```tsx
"use client"; // If using hooks/state

import React from "react";
import { Device } from "@/types";
import { Icons } from "@/components/ui/Icons";

interface ComponentNameProps {
  // Define props
}

export function ComponentName({ prop1, prop2 }: ComponentNameProps) {
  // State & hooks
  
  // Event handlers
  
  // Render
  return (
    <div style={{ /* Flespi-style inline styles */ }}>
      {/* Component content */}
    </div>
  );
}
```

## 🎨 Styling Guidelines

Keep the Flespi aesthetic:
- Dark backgrounds: #1a1a1a, #1e1e1e, #242424, #2a2a2a
- Purple sidebar: #2d1b4e
- Green accents: #00c853, #00e676, #4ade80
- Purple accents: #7c3aed, #c4b5fd
- Monospace font: 'JetBrains Mono', 'Fira Code', 'SF Mono'
- Border colors: #333, #444
- Text colors: #f1f5f9 (primary), #e0e0e0, #94a3b8 (muted), #6b7280 (disabled)

## 🚀 Development Workflow

1. **Start with layouts** (Sidebar, TopBar, MainLayout)
2. **Build device components** (DeviceCard, DeviceList, DeviceSearchBar)
3. **Create page.tsx** with state management
4. **Test device list view**
5. **Add device detail tabs** one by one
6. **Add customer components**
7. **Polish & refine**
8. **Connect to real backend API** (replace mock data)

## 🔗 File Import Paths

Use these import paths consistently:

```tsx
import { Device, Customer } from "@/types";
import { timeAgo, formatTimestamp } from "@/lib/utils";
import { COLORS, COMMAND_PRESETS } from "@/lib/constants";
import { MOCK_DEVICES, MOCK_CUSTOMERS } from "@/data/mock-data";
import { Icons } from "@/components/ui/Icons";
```

## 📦 Key Dependencies

Already in package.json:
- `react` & `react-dom` (v18)
- `next` (v15)
- `typescript` (v5)
- `axios` (for API calls)
- `date-fns` (date utilities)
- `framer-motion` (optional animations)

## 🎯 Immediate Action Items

**To get a working app ASAP:**

1. Create `src/app/globals.css` with Flespi theme
2. Create `src/app/layout.tsx` (basic root layout)
3. Create `src/components/layout/Sidebar.tsx`
4. Create `src/components/layout/TopBar.tsx`
5. Create `src/components/devices/DeviceCard.tsx`
6. Create `src/components/devices/DeviceList.tsx`
7. Create `src/app/page.tsx` (with basic state + DeviceList)
8. Test with `npm run dev`

Then iteratively add:
- DeviceDetail component
- Telemetry tab
- Commands tab
- Customer view

## 📚 Reference

Your original prototype is the gold standard for:
- Visual design (Flespi aesthetic)
- Component structure
- State management patterns
- Event handlers

Just split it into proper files with this structure!

---

**Need help with specific components?** Let me know which one to create first!
