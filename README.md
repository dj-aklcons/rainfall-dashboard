# Auckland Rainfall Dashboard

A council-style monitoring dashboard for hourly rainfall telemetry from four Auckland rain-gauge stations (Auckland Central, Waitakere, Takapuna, Manukau). Surfaces 24h/7d/30d totals, hour-of-day heatmaps, threshold-based alerts, a regional map view, and per-station drill-in with line and bar charts.

Built for Auckland Libraries · Conservation Monitoring operations staff to spot heavy-rain events and surface-runoff risk fast.

## Views

| View | Description |
|---|---|
| **Dashboard** | Grid of four station cards with bar charts, KPI metrics, and severity badges |
| **Map** | Regional SVG silhouettes tinted by 24h rainfall intensity |
| **Heatmap** | Hour-of-day mean intensity grid across all stations |
| **Alerts** | Threshold-configurable warning cards (MetService 50 mm/24h standard) |
| **Drill-in** | Per-station line chart, hourly bar chart, stats, and metadata |

## Tech Stack

- **Framework** — Next.js 16 (App Router, React 19)
- **Language** — TypeScript
- **Fonts** — Ubuntu (body), Geist Mono (data), Georgia (headings)
- **Charts** — Custom SVG (inline React, no external chart library)
- **Styling** — Te Penapena design system (CSS custom properties, light/dark, compact/comfy)
- **Data** — Auckland Council KiWIS hydrotel API (live), with mock fallback
- **Deployment** — Vercel

## Getting Started

### Prerequisites

- Node.js 18+

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

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
npm start
```

## Deployment

Every push to `main` triggers a production deployment on **Vercel**. No environment variables are required — the dashboard connects directly to the public Auckland Council KiWIS API.

## Data Source

Live hourly rainfall data is fetched from the Auckland Council hydrotel KiWIS API:

```
http://aklc.hydrotel.co.nz:8080/KiWIS/KiWIS
  ?service=kisters&type=queryServices&request=getTimeseriesValues
  &ts_id={ts_id}~Rainfall.HOURTOT&period=P30D&format=dajson
  &returnfields=Timestamp,Value,Quality%20Code&timezone=Etc/GMT-12
```

The dashboard always fetches 30 days of data on load and slices it client-side for the 24h/7d/30d range views. Data is cached server-side for 5 minutes. If the KiWIS endpoint is unreachable, a mock data fallback is shown with a visible banner.

### Stations

| Station | Site | ts_id | Elevation |
|---|---|---|---|
| Auckland Central | Albert Park | 648719 | 75 m |
| Waitakere | Keeling Road | 647722 | 210 m |
| Takapuna | Wairau Testing Station | 648612 | 18 m |
| Manukau | Manukau Sports Bowl | 649940 | 32 m |

## Features

- Live telemetry from Auckland Council KiWIS hydrotel API
- Graceful mock-data fallback with banner if API is unreachable
- Light/dark theme toggle (persisted)
- Six Te Penapena accent colour presets
- Compact/comfy density toggle
- 24h/7d/30d range and mm/h vs cumulative unit switch
- Per-station location filter on the dashboard
- Refresh button re-fetches live data
- Click-through station drill-in with trend vs prior 24h
- Threshold-configurable alert generation

## Project Structure

```
rainfall-dashboard/
├── app/
│   ├── api/rainfall/route.ts      # KiWIS API proxy (server-side, 5 min cache)
│   ├── globals.css                # Te Penapena design tokens + component CSS
│   ├── layout.tsx
│   └── page.tsx                   # App shell — state, data fetching
├── components/
│   ├── charts/
│   │   ├── BarChart.tsx
│   │   ├── LineChart.tsx
│   │   └── HeatmapRow.tsx
│   ├── AlertsView.tsx
│   ├── ControlsBar.tsx
│   ├── DashboardView.tsx
│   ├── DrillView.tsx
│   ├── Header.tsx
│   ├── HeatmapView.tsx
│   ├── Icons.tsx
│   ├── MapView.tsx
│   ├── StationCard.tsx
│   └── Tabs.tsx
└── lib/
    ├── data.ts           # Mock fallback generator + station metadata constants
    ├── region-shapes.ts  # SVG path data for four Auckland region silhouettes
    ├── types.ts
    └── utils.ts
```

## License

MIT
