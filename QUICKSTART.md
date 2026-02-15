# Quick Start Guide - SGT Hydroedge Admin Panel

## 🚀 Get Running in 5 Minutes

### Step 1: Install Dependencies
```bash
cd sgt-hydroedge-admin
npm install
```

### Step 2: Run Development Server
```bash
npm run dev
```

### Step 3: Open Browser
Navigate to [http://localhost:3000](http://localhost:3000)

**That's it! The app is now running with mock data.**

---

## 📁 Project Structure Overview

```
src/
├── app/                      # Next.js pages
│   ├── page.tsx             # ⭐ Main app entry point
│   └── layout.tsx           # Root layout
├── components/              # UI Components
│   ├── Sidebar.tsx          # Left navigation
│   ├── TopBar.tsx           # Top header
│   ├── DeviceList.tsx       # Device grid view
│   ├── DeviceDetail.tsx     # Device detail view
│   ├── CustomerList.tsx     # Customer management
│   └── device-detail/       # Detail tabs
├── data/
│   └── mock-data.ts         # 🔄 Replace with API calls
├── lib/
│   └── utils.ts             # Helper functions
└── types/
    └── index.ts             # TypeScript types
```

---

## 🔌 Connecting to Your Backend

### Option 1: Direct API Integration

1. **Create API Service** (`src/lib/api.ts`):
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api', // Your FastAPI server
});

export const deviceApi = {
  getAll: () => api.get('/devices'),
  getTelemetry: (deviceId: string) => api.get(`/devices/${deviceId}/telemetry`),
  sendCommand: (deviceId: string, cmd: string) => 
    api.post(`/devices/${deviceId}/commands`, { command: cmd }),
};

export const customerApi = {
  getAll: () => api.get('/customers'),
};
```

2. **Update Main Page** (`src/app/page.tsx`):
```typescript
// Replace this:
import { MOCK_CUSTOMERS, MOCK_DEVICES } from "@/data/mock-data";

// With this:
import { useState, useEffect } from "react";
import { deviceApi, customerApi } from "@/lib/api";

// Inside component:
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

### Option 2: WebSocket for Real-Time Updates

Add to `src/app/page.tsx`:

```typescript
useEffect(() => {
  const ws = new WebSocket('ws://localhost:1883');
  
  ws.onmessage = (event) => {
    const telemetryUpdate = JSON.parse(event.data);
    // Update device state
    setDevices(prev => prev.map(d => 
      d.id === telemetryUpdate.device_id 
        ? { ...d, ...telemetryUpdate } 
        : d
    ));
  };
  
  return () => ws.close();
}, []);
```

---

## 🎨 Key Features Locations

| Feature | File | Description |
|---------|------|-------------|
| Device Cards | `DeviceList.tsx` | Flespi-style device grid |
| Live Telemetry | `device-detail/TelemetryTab.tsx` | 2-column parameter grid |
| Send Commands | `device-detail/CommandsTab.tsx` | GPRS command interface |
| Customer Hierarchy | `CustomerList.tsx` | Nested customer display |
| Real-time Status | `DeviceList.tsx` line 38 | Online/offline indicators |

---

## 🔧 Common Modifications

### Change Brand Colors
Edit inline styles in components:
- Primary: `#7c3aed` → Your color
- Success: `#00c853` → Your color
- Background: `#1a1a1a` → Your color

### Add New Device Tab
1. Create `src/components/device-detail/MyNewTab.tsx`
2. Add to `DeviceDetail.tsx` tabs array
3. Add case in tab content render

### Modify Telemetry Display
Edit `src/components/device-detail/TelemetryTab.tsx`
- Change grid columns: `gridTemplateColumns: "1fr 1fr"` → `"1fr 1fr 1fr"`
- Modify card colors, fonts, sizes

---

## 📊 Mock Data vs Real Data

**Current Setup (Mock):**
- Data: `src/data/mock-data.ts`
- Updates: Simulated with `setInterval`
- Commands: Fake responses

**Production Setup:**
- Data: API calls to your PostgreSQL backend
- Updates: WebSocket connection to GPS server
- Commands: Real GPRS commands via server

---

## 🐛 Troubleshooting

**Port 3000 already in use?**
```bash
PORT=3001 npm run dev
```

**TypeScript errors?**
```bash
npm run build  # Check for type errors
```

**API not connecting?**
- Check `.env.local` has correct `NEXT_PUBLIC_API_URL`
- Verify backend is running
- Check CORS settings on backend

**Styles not loading?**
- Clear `.next` folder: `rm -rf .next`
- Restart dev server

---

## 📦 Production Build

```bash
# Build
npm run build

# Test production build locally
npm start

# Deploy (example for Vercel)
vercel deploy
```

---

## 🎯 Next Steps

1. ✅ Run the app locally
2. ⚙️ Create your backend API endpoints
3. 🔌 Connect API service layer
4. 🗺️ Add map visualization (optional)
5. 🔐 Implement authentication
6. 🚀 Deploy to production

---

## 💡 Pro Tips

- **Development**: Use mock data while building features
- **Staging**: Point to test database with real structure
- **Production**: Full WebSocket + PostgreSQL integration

- **Performance**: Real-time updates are throttled to 5s intervals
- **Scaling**: Consider Redis for caching device status
- **Security**: Add JWT authentication before production

---

## 📞 Need Help?

Check the full README.md for:
- Detailed component documentation
- API endpoint requirements
- Docker deployment guide
- Advanced customization

**Ready to build? Run `npm run dev` and start coding! 🚀**
