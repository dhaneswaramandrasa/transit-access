# Transit Accessibility Index

**How equitably does Jabodetabek's public transit serve its residents?**

An open research tool scoring every H3 hexagon (~0.74 km²) across Greater Jakarta on two axes: **how much the population needs transit** and **how accessible that transit actually is**. The gap between them identifies where investment is most urgent.

Click any point on the map to get a quadrant classification, equity scores, POI reachability counts, and an AI-generated assessment grounded in Jabodetabek's transit context.

Built as part of a Smart Society master's thesis, Hiroshima University (2025–2026). Phase 2 will add Hiroshima for cross-city comparison.

→ **Full methodology**: [methodology.md](./methodology.md)

---

## What it shows

Each hex is scored on two independent dimensions and classified into one of four policy quadrants:

| Quadrant | Need | Access | Implication |
|---|---|---|---|
| **Transit Desert** | High | Low | Priority investment — expand routes, fix first-mile |
| **Transit Ideal** | High | High | Maintain subsidies and frequency |
| **Car Suburb** | Low | Low | Monitor; car-dependent, may change with densification |
| **Over-Served** | Low | High | Consider TOD, parking pricing, land value capture |

Three spatial views are available in the UI: H3 hexagons (resolution 7 or 8), kelurahan, and kecamatan.

---

## Project Structure

```
transit-accessibility-index/
│
├── CLAUDE.md                         ← Instructions for Claude Code
├── README.md                         ← This file
├── methodology.md                    ← Full scoring + data methodology
├── .gitignore
├── vercel.json
├── environment.yml                   ← Conda (Python pipeline)
├── requirements.txt
│
├── config/
│   └── settings.yaml                 ← Single source of truth: H3 res, weights, paths, GTFS
│
├── docs/
│   └── data_sources.md
│
├── data/                             ← Gitignored; .gitkeep holds directory structure
│   ├── raw/
│   │   ├── gtfs/                     ← transjakarta.zip, krl_commuterline.zip, mrt_jakarta.zip
│   │   ├── osm/                      ← jakarta_indonesia.osm.pbf (Geofabrik Java extract)
│   │   ├── census/                   ← BPS population .xlsx
│   │   └── poi/                      ← jakarta_poi.geojson (Overpass API)
│   ├── processed/
│   │   ├── networks/                 ← r5py graph + jakarta_h3_centroids.geojson
│   │   ├── isochrones/               ← jakarta_h3_isochrones.parquet + jakarta_h3_scores.geojson
│   │   └── demographics/
│   └── external/
│
├── notebooks/                        ← Jupyter (numbered execution order)
│
├── src/                              ← Python analysis pipeline
│   ├── ingestion/
│   │   ├── download_gtfs.py
│   │   ├── download_osm.py
│   │   └── download_poi.py
│   ├── processing/
│   │   ├── validate_gtfs.py
│   │   ├── prepare_network.py        ← Builds r5py TransportNetwork
│   │   └── compute_isochrones.py     ← H3 grid + batch routing → parquet
│   ├── analysis/
│   │   └── score_accessibility.py    ← Weighted scoring + percentile ranks → GeoJSON
│   └── visualization/
│       └── generate_maps.py
│
├── scripts/
│   └── export_to_web.py              ← Copies final GeoJSON to web/public/data/
│
└── web/                              ← Next.js 14 app → Vercel
    ├── package.json
    ├── next.config.mjs
    ├── tailwind.config.js
    ├── .env.local.example
    │
    ├── scripts/                      ← Node.js data-generation (current data source)
    │   ├── generate-sample-data.mjs         ← H3 grid + synthetic equity scores
    │   ├── generate-demographics.mjs        ← Kelurahan demographics from BPS profiles
    │   ├── generate-kelurahan-boundaries.mjs
    │   ├── generate-kecamatan-boundaries.mjs
    │   ├── generate-transit-stops.mjs
    │   ├── generate-transit-routes.mjs
    │   └── generate-res7-data.mjs
    │
    ├── public/data/                  ← Static files served at /data/*
    │   ├── jakarta_h3_scores.geojson            ← ~9,000 scored H3 res-8 hexes
    │   ├── jakarta_h3_scores_res7.geojson        ← Aggregated res-7 overview
    │   ├── jakarta_kelurahan_boundaries.geojson
    │   ├── jakarta_kecamatan_boundaries.geojson
    │   ├── jakarta_transit_stops.geojson
    │   ├── jakarta_transit_routes.geojson
    │   ├── jakarta_pois.geojson
    │   └── jakarta_demographics.json
    │
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx
        │   ├── globals.css
        │   ├── methodology/page.tsx         ← In-app methodology page
        │   └── api/
        │       ├── analyze/route.ts         ← POST → OpenRouter → equity analysis text
        │       ├── geocode/route.ts
        │       └── pois/route.ts            ← OSRM walking routes
        ├── components/
        │   ├── AccessibilityMap.tsx          ← deck.gl + MapLibre, all layer management
        │   ├── MapLegend.tsx
        │   ├── ResultsLayout.tsx
        │   ├── landing/
        │   │   ├── LandingOverlay.tsx
        │   │   └── SearchBar.tsx
        │   ├── loading/
        │   │   └── LoadingSequence.tsx
        │   └── results/
        │       ├── AIAnalysisCard.tsx
        │       ├── CardGrid.tsx
        │       ├── DemographicsCard.tsx
        │       ├── POIAccessCard.tsx
        │       ├── ScoreCircle.tsx
        │       ├── TransitLinesCard.tsx
        │       └── TransitScoreCard.tsx
        ├── hooks/
        │   ├── useAISummary.ts              ← Watches selectedHex, POSTs to /api/analyze
        │   ├── useDemographics.ts           ← Kelurahan spatial lookup
        │   ├── useReachablePOIs.ts
        │   └── useTransitStops.ts
        └── lib/
            ├── store.ts                     ← Zustand: all global state
            ├── colorScale.ts                ← Quadrant → RGBA
            ├── osrmRoute.ts
            └── poiUtils.ts
```

---

## Data Acquisition

See [methodology.md §3](./methodology.md#3-data-sources) for full discussion including what didn't work.

**Summary of working sources:**

| Dataset | Source |
|---|---|
| TransJakarta, KRL, MRT GTFS | [Mobility Database](https://database.mobilitydata.org) |
| OSM network + POIs | [Geofabrik Java extract](https://download.geofabrik.de/asia/indonesia/java-latest.osm.pbf) + [Overpass API](https://overpass-api.de) |
| Administrative boundaries | [GADM](https://gadm.org) / Indonesia Geoportal |
| Demographics | [BPS Jakarta](https://jakarta.bps.go.id) (kecamatan-level census tables) |

**Key gaps:** LRT Jabodebek has no published GTFS. Angkot/informal transit has no GTFS at all — the largest coverage gap in lower-income areas.

**Current data state:** The deployed app uses synthetic data from `web/scripts/generate-sample-data.mjs` while the full Python r5py routing pipeline is being completed. Scores follow realistic spatial patterns but are modeled from transit hub proximity, not actual routing.

---

## Setup

### 1. Python pipeline (full routing methodology)

```bash
conda env create -f environment.yml
conda activate transit-access

python src/ingestion/download_gtfs.py
python src/ingestion/download_osm.py
python src/ingestion/download_poi.py
python src/processing/validate_gtfs.py
python src/processing/prepare_network.py
python src/processing/compute_isochrones.py
python src/analysis/score_accessibility.py
python scripts/export_to_web.py
```

### 2. Web app (local dev)

```bash
cd web
cp .env.local.example .env.local   # add OPENROUTER_API_KEY
npm install
npm run dev                         # → http://localhost:3000
```

### 3. Regenerate all static data files

```bash
cd web
npm run generate-all
```

Or individually:

```bash
npm run generate-data         # jakarta_h3_scores.geojson
npm run generate-kelurahan    # kelurahan boundaries
npm run generate-kecamatan    # kecamatan boundaries
npm run generate-demographics # demographics JSON
npm run generate-routes       # transit routes + stops
npm run generate-res7         # aggregated res-7 scores
```

### 4. Deploy to Vercel

1. Push to GitHub
2. Connect repo to [Vercel](https://vercel.com) — `vercel.json` points build to `web/`
3. Settings → Environment Variables → add `OPENROUTER_API_KEY`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Python pipeline | geopandas, r5py, h3, h3pandas, gtfs-kit, overpy, shapely, pandas, numpy |
| Web framework | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Map rendering | deck.gl (GeoJsonLayer, ScatterplotLayer, PathLayer) + MapLibre GL |
| Basemap | CartoDB Positron (light, supports quadrant colour scheme) |
| Spatial indexing | h3-js — client-side lat/lng → H3 index, O(1) lookup |
| State management | Zustand |
| AI analysis | OpenRouter API (`openai/gpt-oss-20b`) |
| Deployment | Vercel (free tier handles ~10 MB static GeoJSON fine) |

---

## Key Configuration

All parameters in `config/settings.yaml`. The H3 resolution constant must match in three places:

1. `config/settings.yaml` → `analysis.h3_resolution: 8`
2. `web/scripts/generate-sample-data.mjs` → `const H3_RESOLUTION = 8`
3. `web/src/lib/store.ts` → Zustand default `h3Resolution: 8`

If you change resolution, update all three and regenerate all data.

---

## Academic Context

Smart Society master's thesis, Hiroshima University. The equity framework adapts cumulative opportunities measures with vulnerability weighting, drawing on Martens (2012, *Transport Justice*) and Pereira et al. (2017, *Distributive Justice and Equity in Transportation*).

Phase 1: Jabodetabek — spatial mobility equity in Southeast Asia's largest metropolitan region.
Phase 2: Hiroshima — cross-city comparison.

---

## License

MIT. Data sources retain original licenses (OSM: ODbL, BPS: open government data).
