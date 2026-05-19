# QC Pulse — React Frontend

React 19 + TypeScript + Vite 7 + Tailwind CSS 4

---

## Overview

This is the frontend for the QC Pulse laboratory quality control monitoring system. It runs inside Docker as part of the full-stack setup, or standalone for frontend-only development.

---

## Running with Docker (Full Stack)

All commands are run from the **parent directory** (`lab-qc-workspace/`):

```bash
# Start everything (frontend + backend + database)
docker compose up -d

# Rebuild after package.json changes
docker compose up --build frontend
```

The frontend is accessible at:
- **http://localhost:5173** (direct Vite dev server)
- **http://localhost** (via Nginx reverse proxy)

Hot module replacement (HMR) works automatically — edit a file and see changes in the browser.

---

## Running Standalone (Without Docker)

```bash
cd lab-qc-dashboard

# Install dependencies
npm install

# Start dev server
npm run dev

# Type check
npx tsc --noEmit

# Build for production
npm run build

# Preview production build
npm run preview
```

The dev server starts at **http://localhost:5173**.

---

## Environment Variables

Create a `.env` file from the template:

```bash
cp .env.example .env
```

| Variable             | Purpose                                              |
| -------------------- | ---------------------------------------------------- |
| `VITE_API_URL`       | Laravel API base URL (default: `http://localhost/api`) |
| `VITE_FIREBASE_*`    | Firebase config (existing integration)               |

Use in code:
```ts
const API_URL = import.meta.env.VITE_API_URL;
const response = await fetch(`${API_URL}/health`);
```

---

## Key Commands (Docker)

```bash
# Shell into the container
docker compose exec frontend sh

# Install a new package
docker compose exec frontend npm install package-name

# After adding new packages, rebuild the container
docker compose up --build frontend
```

---

## Project Structure

```
lab-qc-dashboard/
├── src/
│   ├── pages/           ← Route-level page components
│   ├── components/
│   │   ├── chart/       ← Levey-Jennings chart
│   │   ├── dashboard/   ← Main QC dashboard
│   │   ├── layout/      ← Shell, sidebar, header
│   │   ├── panels/      ← Input, stats, rules panels
│   │   └── ui/          ← shadcn/ui components
│   ├── hooks/           ← Custom React hooks
│   ├── lib/             ← Pure business logic (storage, stats, westgard)
│   ├── constants/       ← Disease/control config, QC rules
│   ├── types/           ← TypeScript type definitions
│   ├── utils/           ← Chart config, exports
│   ├── router.tsx       ← Route definitions
│   ├── App.tsx          ← Root component
│   └── main.tsx         ← Entry point
├── Dockerfile           ← Node 22 Alpine container
├── vite.config.ts       ← Vite config (Docker-ready)
├── .env.example         ← Environment template
└── package.json
```

---

## Routes

| Path                          | Page              |
| ----------------------------- | ----------------- |
| `/monitor`                    | Disease selector  |
| `/monitor/:disease`           | Disease overview  |
| `/monitor/:disease/:control`  | Control monitor   |
| `/violations`                 | Violation inbox   |
| `/history`                    | Historical data   |
| `/settings`                   | App settings      |

---

## Collaborator Setup

```bash
# From the parent directory (lab-qc-workspace/)
docker compose up --build
# Frontend is live at http://localhost:5173

# Or standalone:
cd lab-qc-dashboard
npm install
npm run dev
```
