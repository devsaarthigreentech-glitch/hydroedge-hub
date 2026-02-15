# SGT Hydroedge Admin Panel

A modern, Flespi-inspired GPS device management admin panel for SGT Hydroedge fleet tracking system.

## Features

- 🎨 **Flespi-inspired UI** - Dark theme with professional design
- 📱 **Real-time Telemetry** - Live device data updates every 5 seconds
- 🏢 **Hierarchical Customer Management** - Unlimited depth organization structure
- 🚗 **Device Management** - Full CRUD operations for GPS devices
- 📊 **Connection Status Monitoring** - Real-time online/offline tracking
- 💬 **GPRS Command Interface** - Send commands directly to devices
- 🔍 **Advanced Filtering** - Search by device name, IMEI, or customer
- 🏷️ **Tag System** - Organize devices with custom tags

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Inline styles (Flespi-style)
- **Font**: JetBrains Mono (monospace for technical feel)
- **State**: React hooks

## Project Structure

```
sgt-hydroedge-admin/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── layout.tsx         # Root layout with font loading
│   │   ├── page.tsx           # Main application page
│   │   └── globals.css        # Global styles & scrollbar
│   ├── components/            # React components
│   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   ├── TopBar.tsx         # Top navigation bar
│   │   ├── DeviceList.tsx     # Device list with search
│   │   ├── DeviceDetail.tsx   # Device detail container
│   │   ├── CustomerList.tsx   # Customer management
│   │   ├── AddCustomerModal.tsx # Customer creation modal
│   │   ├── Icons.tsx          # SVG icon components
│   │   └── device-detail/     # Device detail tabs
│   │       ├── TelemetryTab.tsx
│   │       ├── InfoTab.tsx
│   │       ├── EditTab.tsx
│   │       └── CommandsTab.tsx
│   ├── data/
│   │   └── mock-data.ts       # Mock data (replace with API)
│   ├── lib/
│   │   └── utils.ts           # Utility functions
│   └── types/
│       └── index.ts           # TypeScript type definitions
├── package.json
├── tsconfig.json
├── next.config.js
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <your-repo>
cd sgt-hydroedge-admin
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Set up environment variables
```bash
cp .env.example .env.local
```

4. Run the development server
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Integration with Backend

Currently, the application uses mock data. To integrate with your PostgreSQL backend:

### 1. Create API Service Layer

Create `src/lib/api.ts`:

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

export const deviceApi = {
  getAll: () => api.get('/devices'),
  getById: (id: string) => api.get(`/devices/${id}`),
  update: (id: string, data: any) => api.put(`/devices/${id}`, data),
  delete: (id: string) => api.delete(`/devices/${id}`),
  sendCommand: (id: string, command: string) => 
    api.post(`/devices/${id}/commands`, { command }),
};

export const customerApi = {
  getAll: () => api.get('/customers'),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
};
```

### 2. Replace Mock Data

In `src/app/page.tsx`, replace mock data imports:

```typescript
// Before:
import { MOCK_CUSTOMERS, MOCK_DEVICES } from "@/data/mock-data";

// After:
import { useEffect } from 'react';
import { deviceApi, customerApi } from '@/lib/api';

// Inside component:
const [devices, setDevices] = useState([]);
const [customers, setCustomers] = useState([]);

useEffect(() => {
  const fetchData = async () => {
    const [devicesRes, customersRes] = await Promise.all([
      deviceApi.getAll(),
      customerApi.getAll(),
    ]);
    setDevices(devicesRes.data);
    setCustomers(customersRes.data);
  };
  fetchData();
}, []);
```

### 3. WebSocket for Real-time Updates

Add WebSocket connection for live telemetry:

```typescript
useEffect(() => {
  const ws = new WebSocket(process.env.NEXT_PUBLIC_GPS_SERVER_URL);
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // Update device state with new telemetry
    updateDeviceTelemetry(data);
  };
  
  return () => ws.close();
}, []);
```

## Key Components

### Sidebar (`src/components/Sidebar.tsx`)
- Collapsible navigation
- Quick customer filters
- Brand identity

### DeviceList (`src/components/DeviceList.tsx`)
- Flespi-style device cards
- Real-time connection status
- Bottom search bar
- Customer badges

### DeviceDetail (`src/components/DeviceDetail.tsx`)
- Tabbed interface (Info, Edit, Telemetry, Commands, Logs, Settings)
- Real-time telemetry grid
- Command sending interface
- Device editing form

### CustomerList (`src/components/CustomerList.tsx`)
- Hierarchical display with indentation
- Device count metrics
- Usage progress bars
- Quick device filtering

## Customization

### Colors

The color scheme is defined inline. Key colors:

- **Primary Purple**: `#7c3aed` (sidebar, accents)
- **Success Green**: `#00c853` (online status, brand)
- **Background Dark**: `#1a1a1a` (main bg)
- **Card Dark**: `#242424` (cards, modals)
- **Border**: `#333` (dividers)

### Fonts

Currently using JetBrains Mono. To change:

```typescript
// In src/app/layout.tsx, update the Google Fonts link
// In inline styles, update fontFamily
```

## Deployment

### Build for Production

```bash
npm run build
npm start
```

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t sgt-hydroedge-admin .
docker run -p 3000:3000 sgt-hydroedge-admin
```

## Backend API Requirements

Your Python/FastAPI backend should provide these endpoints:

### Devices
- `GET /api/devices` - List all devices
- `GET /api/devices/:id` - Get device details
- `PUT /api/devices/:id` - Update device
- `DELETE /api/devices/:id` - Delete device
- `POST /api/devices/:id/commands` - Send command
- `GET /api/devices/:id/telemetry` - Get latest telemetry

### Customers
- `GET /api/customers` - List all customers
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### WebSocket
- `ws://server/ws` - Real-time telemetry stream

## Future Enhancements

- [ ] User authentication (NextAuth.js)
- [ ] Role-based access control
- [ ] Map integration (Leaflet/MapBox)
- [ ] Historical data charts
- [ ] Geofencing management
- [ ] Alert notifications
- [ ] Export to CSV/Excel
- [ ] Multi-language support
- [ ] Mobile responsive design optimization

## License

Proprietary - SGT Hydroedge © 2025

## Support

For issues or questions, contact: admin@sghydroedge.com
