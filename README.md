# NetShield

NetShield is a full-stack small-office network security gateway that provides DNS-based website blocking, live network activity monitoring, device tracking, alerts, reports, and an admin dashboard.

The project is built for a realistic small-office use case: one machine runs NetShield, office devices use it as their DNS server, and the admin can monitor or block websites from the dashboard.

## Features

- DNS-based website blocking
- Live website activity feed
- Device tracking by DNS client IP
- Block/unblock website rules
- Realtime dashboard updates with Socket.IO
- MySQL persistence for rules, devices, logs, events, alerts, and analytics
- Basic suspicious-activity alerts
- Reports for top visited websites
- System health page for API, database, and DNS status
- JWT-based admin login
- Responsive light-theme React dashboard

## Screenshots

Add screenshots before pushing to GitHub:

```text
screenshots/Alert-page.png
screenshots/live-traffic.png
screenshots/website-blocking.png
screenshots/reports.png
```

Recommended screenshots:

- Dashboard overview
- Website Blocking page
- Live Traffic page
- Devices page
- Reports page

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, Tailwind CSS, Recharts |
| Backend | Node.js, Express |
| Realtime | Socket.IO |
| DNS Server | dns2 |
| Database | MySQL |
| ORM | Prisma |
| Auth | JWT, bcryptjs |

## Architecture

```text
Browser / Device
      |
      | DNS query
      v
NetShield DNS Server
      |
      v
Rule Engine
   |         |
Allowed   Blocked
   |         |
Upstream   0.0.0.0 / ::
DNS

DNS Log -> MySQL -> Event Bus -> Socket.IO -> React Dashboard
```

## How Blocking Works

NetShield works at the DNS layer.

When a device opens a website, it first asks:

```text
What IP address is youtube.com?
```

If the domain is allowed, NetShield returns the real IP address.

If the domain is blocked, NetShield returns:

```text
0.0.0.0
```

For IPv6, it returns:

```text
::
```

The browser cannot connect to the real website because it never receives the real destination IP.

## Local Setup

Requirements:

- Node.js
- MySQL
- Windows PowerShell

Create a MySQL database:

```sql
CREATE DATABASE netshield;
```

Install dependencies:

```powershell
npm install
```

Create backend environment:

```powershell
Copy-Item backend\.env.example backend\.env
```

Update `backend/.env`:

```text
DATABASE_URL="mysql://root:YOUR_PASSWORD@127.0.0.1:3306/netshield"
HTTP_PORT=8080
DNS_PORT=53
DNS_HOST=0.0.0.0
```

Create database tables:

```powershell
npm run db:generate
npm run db:push
```

Start backend:

```powershell
npm run dev:backend
```

Start frontend in another terminal:

```powershell
npm run dev:frontend
```

Open:

```text
http://127.0.0.1:5173
```

Default login:

```text
admin@netshield.local
ChangeMe123!
```

## DNS Test

From the backend folder:

```powershell
cd backend
npm run test:dns -- 127.0.0.1 youtube.com 53
```

After blocking `youtube.com`, expected result:

```text
youtube.com -> 0.0.0.0
```

## Demo Flow

1. Start backend and frontend.
2. Login to the dashboard.
3. Open Live Traffic.
4. Browse a website.
5. Confirm it appears in the live feed.
6. Go to Website Blocking.
7. Block `youtube.com`.
8. Run the DNS test.
9. Confirm `youtube.com -> 0.0.0.0`.
10. Open Reports to view top websites.

## Important Limitation

NetShield v1 is a DNS-based security gateway, not a full firewall.

DNS filtering can be bypassed by:

- Secure DNS / DNS-over-HTTPS
- VPNs
- proxy extensions
- Tor
- cached browser connections
- devices manually using another DNS server

For a reliable demo, turn off Secure DNS in the browser and flush DNS cache:

```powershell
ipconfig /flushdns
```

## Resume Bullet

```text
Built NetShield, a full-stack small-office DNS security gateway using React, Node.js, Socket.IO, MySQL, Prisma, and dns2. Implemented DNS-based website blocking, live traffic monitoring, device tracking, alerts, reports, and a responsive admin dashboard.
```

