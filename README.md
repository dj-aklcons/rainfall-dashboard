# Rainfall Dashboard

A real-time rainfall monitoring and visualization dashboard that aggregates precipitation data, displays trends, and provides interactive charts for weather analysis.

## Features

- **Live Rainfall Data** — Real-time precipitation readings displayed with auto-refresh
- **Interactive Charts** — Time-series graphs for hourly, daily, and monthly rainfall totals
- **Station Map** — Geospatial view of monitoring stations with current status indicators
- **KPI Cards** — At-a-glance summary of total rainfall, peak intensity, and dry/wet day counts
- **Threshold Alerts** — Visual warnings when rainfall exceeds configurable thresholds
- **Historical Comparison** — Side-by-side comparison of current vs. historical averages
- **CSV Export** — Download filtered data for offline analysis

## Tech Stack

- **Framework** — Next.js (React)
- **Styling** — Tailwind CSS
- **Charts** — Recharts
- **Deployment** — Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
git clone https://github.com/dj-aklcons/rainfall-dashboard.git
cd rainfall-dashboard
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Deployment

This project is configured for automatic deployment via **Vercel**. Every push to the `main` branch triggers a production deployment.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/dj-aklcons/rainfall-dashboard)

### Environment Variables

Set the following in your Vercel project settings or a local `.env.local` file:

| Variable | Description | Required |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL for the rainfall data API | Yes |
| `NEXT_PUBLIC_REFRESH_INTERVAL` | Data refresh interval in milliseconds (default: `60000`) | No |
| `API_KEY` | Server-side API key for authenticated data sources | No |

## Project Structure

```
rainfall-dashboard/
├── app/                  # Next.js App Router pages and layouts
│   ├── layout.tsx
│   └── page.tsx
├── components/           # Reusable UI components
│   ├── charts/           # Chart components (time-series, bar, heatmap)
│   ├── map/              # Station map component
│   └── kpi/              # KPI card components
├── lib/                  # Data fetching utilities and helpers
├── public/               # Static assets
└── README.md
```

## License

MIT
