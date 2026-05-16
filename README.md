# Auckland Rainfall Dashboard

A council-style monitoring dashboard for hourly rainfall telemetry from four Auckland rain-gauge stations (Auckland Central, Waitakere, Takapuna, Manukau). Surfaces 24h/7d/30d totals, hour-of-day heatmaps, threshold-based alerts with AI briefing, a regional map view, and per-station drill-in with line and bar charts.

Built for Auckland Libraries · Conservation Monitoring operations staff to spot heavy-rain events and surface-runoff risk fast.

## Views

| View | Description |
|---|---|
| **Dashboard** | Grid of four station cards with bar charts, KPI metrics, and severity badges |
| **Map** | Regional SVG silhouettes tinted by 24h rainfall intensity |
| **Heatmap** | Hour-of-day mean intensity grid across all stations |
| **Alerts** | Threshold-based warning cards + optional AI conservation briefing |
| **Drill-in** | Per-station line chart, hourly bar chart, stats, and metadata |

## Tech Stack

- **Framework** — Next.js 15 (App Router, React 19)
- **Language** — TypeScript
- **Fonts** — Geist + Geist Mono (via `geist` package)
- **Charts** — Custom SVG (inline React, no external chart library)
- **Styling** — CSS custom properties (design-token driven, light/dark, compact/comfy)
- **AI** — Anthropic API via Next.js API route (`/api/ai-briefing`)
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

Every push to `main` triggers a production deployment on **Vercel**.

### Environment Variables

| Variable | Description | Required |
|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key for the AI conservation briefing | No (feature degrades gracefully) |

Set this in your Vercel project → Settings → Environment Variables, or locally in `.env.local`.

## Data

Mock data is generated deterministically from real station metadata (actual `ts_id`s and coordinates from Auckland Council hydrotel/KiWIS). In production, replace `lib/data.ts` with a live fetch to the KiWIS telemetry endpoint using `Rainfall.HOURTOT` parameter.

### Stations

| Station | Site | ts_id | Elevation |
|---|---|---|---|
| Auckland Central | Albert Park | 648719 | 75 m |
| Waitakere | Keeling Road | 647722 | 210 m |
| Takapuna | Wairau Testing Station | 648612 | 18 m |
| Manukau | Manukau Sports Bowl | 649940 | 32 m |

## Features

- Light/dark theme toggle (persisted)
- Six accent colour presets (teal, sky, green, plum, orange, magenta)
- Compact/comfy density toggle
- 24h/7d/30d range and mm/h vs cumulative unit switch
- Per-station location filter on the dashboard
- Refresh button (re-seeds mock data; in production triggers a telemetry refetch)
- Click-through station drill-in with trend vs prior 24h
- Threshold-configurable alert generation (MetService 50 mm/24h heavy-rain standard)
- Optional AI briefing paragraph on the Alerts view

## Project Structure

```
rainfall-dashboard/
├── app/
│   ├── api/ai-briefing/route.ts   # Anthropic API proxy
│   ├── globals.css                # Design tokens + all component CSS
│   ├── layout.tsx
│   └── page.tsx                   # App shell (all state lives here)
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
    ├── data.ts           # Mock data generator (replace with live API)
    ├── region-shapes.ts  # SVG path data for four Auckland region silhouettes
    ├── types.ts
    └── utils.ts
```

## License

MIT
