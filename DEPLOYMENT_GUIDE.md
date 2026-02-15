# 🚀 SGT Hydroedge Admin Panel - Deployment Guide

## 📋 Overview

This guide will help you:
1. Upload your Next.js app to your DigitalOcean server
2. Connect it to your PostgreSQL database
3. Run it in production

---

## Option 1: Direct Upload to Server (Quick Start)

### Step 1: Upload Files

```bash
# On your LOCAL machine
scp sgt-hydroedge-complete.tar.gz root@your-server-ip:/root/

# SSH into your server
ssh root@your-server-ip

# Extract files
cd /root
tar -xzf sgt-hydroedge-complete.tar.gz
cd sgt-hydroedge-admin
```

### Step 2: Configure Database Connection

```bash
# Create environment file
cp .env.example .env.local

# Edit with your database credentials
nano .env.local
```

**Edit `.env.local`:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gps_tracking
DB_USER=postgres
DB_PASSWORD=YOUR_ACTUAL_PASSWORD

NEXT_PUBLIC_API_URL=http://your-server-ip:3000/api
```

### Step 3: Install Dependencies

```bash
# Install Node.js if not installed
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install project dependencies
npm install
```

### Step 4: Run Development Server

```bash
# Start the app
npm run dev -- --host 0.0.0.0

# Access at: http://your-server-ip:3000
```

---

## Option 2: Using GitHub (Recommended for Production)

### Step 1: Push to GitHub

```bash
# On your LOCAL machine
cd sgt-hydroedge-admin

# Initialize git
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/sgt-hydroedge-admin.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Server

```bash
# SSH into server
ssh root@your-server-ip

# Clone repository
cd /root
git clone https://github.com/YOUR_USERNAME/sgt-hydroedge-admin.git
cd sgt-hydroedge-admin

# Set up environment
cp .env.example .env.local
nano .env.local  # Add your database credentials

# Install dependencies
npm install

# Build for production
npm run build

# Start production server
npm start
```

---

## 🔧 Database Connection

Your app will connect to PostgreSQL using these API routes:

- **`GET /api/devices`** - Fetch all devices from your database
- **`GET /api/customers`** - Fetch all customers
- **`GET /api/telemetry/[deviceId]`** - Get real-time telemetry

### Test Database Connection

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U postgres -d gps_tracking -c "SELECT COUNT(*) FROM devices;"
```

---

## 🌐 Production Deployment with PM2

### Install PM2 (Process Manager)

```bash
sudo npm install -g pm2

# Start app with PM2
pm2 start npm --name "sgt-admin" -- start

# Save PM2 config
pm2 save

# Auto-start on boot
pm2 startup
```

### PM2 Commands

```bash
pm2 status          # Check status
pm2 logs sgt-admin  # View logs
pm2 restart sgt-admin  # Restart app
pm2 stop sgt-admin  # Stop app
```

---

## 🔒 Production Setup with Nginx (Optional)

### Install Nginx

```bash
sudo apt update
sudo apt install nginx
```

### Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/sgt-admin
```

**Add this configuration:**

```nginx
server {
    listen 80;
    server_name your-domain.com;  # or your server IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable site:**

```bash
sudo ln -s /etc/nginx/sites-available/sgt-admin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Now access at: `http://your-domain.com` (port 80)

---

## 📊 Verify Everything Works

### 1. Check if Next.js is running
```bash
curl http://localhost:3000
```

### 2. Test API endpoints
```bash
# Test devices API
curl http://localhost:3000/api/devices

# Test customers API
curl http://localhost:3000/api/customers
```

### 3. Check database connection
```bash
# View Next.js logs
pm2 logs sgt-admin

# Should see: "✅ Connected to PostgreSQL database"
```

---

## 🔄 Switching from Mock Data to Real Data

The app currently uses mock data from `/src/data/mock-data.ts`.

**To use real database data:**

1. **Update `src/app/page.tsx`** - Replace mock data imports with API calls
2. **Create a data fetching hook** (see below)

### Create Data Hook

Create `/src/hooks/useDevices.ts`:

```typescript
import { useState, useEffect } from 'react';
import { Device } from '@/types';

export function useDevices(customerFilter: string) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDevices() {
      try {
        const url = customerFilter === 'all' 
          ? '/api/devices'
          : `/api/devices?customer_id=${customerFilter}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
          setDevices(data.data);
        }
      } catch (error) {
        console.error('Error fetching devices:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDevices();
  }, [customerFilter]);

  return { devices, loading };
}
```

### Update page.tsx

Replace:
```typescript
import { MOCK_DEVICES } from "@/data/mock-data";
```

With:
```typescript
import { useDevices } from "@/hooks/useDevices";

// In component:
const { devices, loading } = useDevices(customerFilter);
```

---

## 🎯 Quick Troubleshooting

### Port 3000 already in use?
```bash
# Find process
lsof -i :3000

# Kill it
kill -9 PID

# Or use different port
npm run dev -- --port 3001
```

### Database connection error?
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check credentials in .env.local
cat .env.local

# Test connection manually
psql -U postgres -d gps_tracking
```

### Can't access from browser?
```bash
# Check firewall
sudo ufw allow 3000

# Or if using Nginx
sudo ufw allow 80
sudo ufw allow 443
```

---

## 📚 Next Steps

1. ✅ Deploy app to server
2. ✅ Connect to PostgreSQL
3. ✅ Replace mock data with real data
4. 🔨 Add authentication (JWT/sessions)
5. 🔨 Set up HTTPS with Let's Encrypt
6. 🔨 Add WebSocket for real-time updates
7. 🔨 Implement command sending to devices

---

## 📞 Support

For issues:
1. Check logs: `pm2 logs sgt-admin`
2. Check database: `psql -U postgres -d gps_tracking`
3. Check Next.js: `npm run dev`

**Happy tracking! 🚀**
