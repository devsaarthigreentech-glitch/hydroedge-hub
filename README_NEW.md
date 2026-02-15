# SGT Hydroedge Admin Panel

**Professional GPS Fleet Tracking Dashboard** - Flespi-inspired dark theme interface for managing Teltonika GPS devices with multi-tenant customer access control.

---

## 📁 Project Structure

```
sgt-hydroedge-admin/
├── src/
│   ├── types/index.ts              ✅ Type definitions
│   ├── lib/
│   │   ├── utils.ts                ✅ Utility functions
│   │   └── constants.ts            ✅ App constants
│   ├── data/mock-data.ts           ✅ Mock data
│   ├── components/
│   │   ├── ui/Icons.tsx            ✅ Icon library
│   │   ├── layout/                 🔨 Sidebar, TopBar, MainLayout
│   │   ├── devices/                🔨 DeviceList, DeviceCard, DeviceDetail
│   │   ├── device-detail/          🔨 Info, Edit, Telemetry, Commands tabs
│   │   └── customers/              🔨 CustomerList, CustomerCard, Modal
│   ├── app/
│   │   ├── layout.tsx              🔨 Root layout
│   │   ├── page.tsx                🔨 Main dashboard
│   │   └── globals.css             🔨 Flespi dark theme
│   └── hooks/                      ⏳ Custom hooks (future)
└── package.json
```

✅ = Completed | 🔨 = Next to build | ⏳ = Future enhancement

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## 📋 Implementation Checklist

### Phase 1: Core Structure (PRIORITY: HIGH)
- [ ] `src/app/globals.css` - Dark theme styles
- [ ] `src/app/layout.tsx` - Root layout
- [ ] `src/components/layout/Sidebar.tsx` - Navigation sidebar
- [ ] `src/components/layout/TopBar.tsx` - Top header bar
- [ ] `src/components/layout/MainLayout.tsx` - Layout wrapper

### Phase 2: Device Management (PRIORITY: HIGH)
- [ ] `src/components/devices/DeviceCard.tsx` - Device list item
- [ ] `src/components/devices/DeviceList.tsx` - Device list view
- [ ] `src/components/devices/DeviceSearchBar.tsx` - Search/filter bar
- [ ] `src/components/devices/DeviceDetail.tsx` - Detail container
- [ ] `src/app/page.tsx` - Main dashboard with state

### Phase 3: Device Details (PRIORITY: MEDIUM)
- [ ] `src/components/device-detail/InfoTab.tsx` - Device info
- [ ] `src/components/device-detail/TelemetryTab.tsx` - Live telemetry
- [ ] `src/components/device-detail/CommandsTab.tsx` - Command sending
- [ ] `src/components/device-detail/EditTab.tsx` - Edit device
- [ ] `src/components/device-detail/LogsTab.tsx` - Message logs
- [ ] `src/components/device-detail/SettingsTab.tsx` - Device settings

### Phase 4: Customer Management (PRIORITY: MEDIUM)
- [ ] `src/components/customers/CustomerCard.tsx` - Customer card
- [ ] `src/components/customers/CustomerList.tsx` - Customer view
- [ ] `src/components/customers/AddCustomerModal.tsx` - Add customer

### Phase 5: API Integration (PRIORITY: FUTURE)
- [ ] `src/app/api/devices/route.ts` - Device API
- [ ] `src/app/api/customers/route.ts` - Customer API
- [ ] `src/app/api/telemetry/[deviceId]/route.ts` - Telemetry API
- [ ] `src/hooks/useDevices.ts` - Device data hook
- [ ] `src/hooks/useCustomers.ts` - Customer data hook
- [ ] `src/hooks/useTelemetry.ts` - Telemetry data hook

---

## 🎨 Design System

### Colors (Flespi-inspired)
```
Background:  #1a1a1a, #1e1e1e, #242424, #2a2a2a
Sidebar:     #2d1b4e
Borders:     #333, #444
Primary:     #7c3aed (purple)
Success:     #00c853, #00e676, #4ade80 (green)
Warning:     #fbbf24 (yellow)
Danger:      #ef4444 (red)
Text:        #f1f5f9, #e0e0e0, #94a3b8, #6b7280
```

### Typography
- **Font**: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace
- **Base size**: 13px
- **Headers**: 14-16px, weight 600-700

---

## 📚 Documentation Files

- **`PROJECT_STRUCTURE.md`** - Complete file structure breakdown
- **`IMPLEMENTATION_GUIDE.md`** - Step-by-step implementation guide
- **`README_NEW.md`** - This file (project overview)

---

## 🔑 Key Features

- ✅ **Multi-tenant architecture** - Hierarchical customer management
- ✅ **Real-time telemetry** - Live GPS data with auto-refresh
- ✅ **Command control** - Send GPRS commands to devices
- ✅ **Device management** - CRUD operations on GPS devices
- ✅ **Flespi-style UI** - Professional dark theme interface
- ⏳ **Map integration** - Coming soon
- ⏳ **Geofencing** - Coming soon
- ⏳ **Alert management** - Coming soon

---

## 🛠 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5
- **Styling**: Inline styles (Flespi aesthetic)
- **State**: React hooks (useState, useEffect)
- **Data**: Mock data → PostgreSQL API (future)
- **Backend**: Python GPS server (separate)

---

## 📦 Project Status

### ✅ Completed
- TypeScript type system
- Utility functions
- Mock data layer
- Icon library
- Directory structure

### 🔨 In Progress
- Component creation (following IMPLEMENTATION_GUIDE.md)
- Layout system
- Device list view
- Device detail tabs

### ⏳ Planned
- API integration with PostgreSQL
- Real-time WebSocket updates
- Map view with device locations
- Advanced filtering & search
- User authentication
- Role-based access control

---

## 🎯 Next Steps

1. **Read** `IMPLEMENTATION_GUIDE.md` for detailed instructions
2. **Create** core layout components (Sidebar, TopBar, MainLayout)
3. **Build** device components (DeviceCard, DeviceList)
4. **Implement** main page.tsx with state management
5. **Test** with `npm run dev`
6. **Iterate** on device detail tabs
7. **Add** customer management
8. **Connect** to real PostgreSQL backend

---

## 📧 Support

For questions or issues, contact: **admin@sghydroedge.com**

---

**Built with ❤️ for SGT Hydroedge Fleet Management**
