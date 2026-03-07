# Transit Accessibility Index

**How equitably does Jabodetabek's public transit serve its residents?**

An open research tool that scores every H3 hexagon (resolution 8, ~0.74 km²) across Greater Jakarta (DKI Jakarta, Bogor, Depok, Tangerang, Bekasi) on transit accessibility to essential services — hospitals, clinics, markets, supermarkets, schools, and parks — reachable within 30 or 60 minutes by public transit and walking.

**Click anywhere on the map** to get an AI-generated equity analysis of that location: what services are reachable, how it compares to the Jabodetabek average, which equity quadrant the area falls into, and what planning interventions would help.


**Live demo**: _coming soon_
**Data**: OpenStreetMap · TransJakarta/KRL/MRT/LRT GTFS · BPS Census 2020

---

## Project Structure

```
transit-accessibility-index/
│
├── CLAUDE.md                        ← Instructions for Claude Code
├── README.md
├── .gitignore
├── vercel.json                      ← Vercel deployment config (root → web/)
├── environment.yml                  ← Conda environment (Python pipeline)
├── requirements.txt
│
├── config/
│   └── settings.yaml                ← All paths, H3 resolution, POI weights
│
├── docs/
│   └── data_sources.md
│
├── data/                            ← Gitignored; tracked via .gitkeep
│   ├── raw/
│   │   ├── gtfs/                    ← GTFS zips: transjakarta, krl, mrt, lrt
│   │   ├── osm/                     ← java-latest.osm.pbf (~600 MB, Geofabrik)
│   │   ├── census/                  ← BPS population xlsx
│   │   └── poi/                     ← jakarta_poi.geojson (Overpass API)
│   ├── processed/
│   │   ├── networks/                ← r5py routing graph + H3 centroids GeoJSON
│   │   ├── isochrones/              ← jakarta_h3_isochrones.parquet + jakarta_h3_scores.geojson
│   │   └── demographics/
│   └── external/
│
├── notebooks/                       ← Jupyter (run in order)
│
├── src/                             ← Python analysis pipeline
│   ├── ingestion/
│   │   ├── download_gtfs.py
│   │   ├── download_osm.py
│   │   └── download_poi.py
│   ├── processing/
│   │   ├── validate_gtfs.py
│   │   ├── prepare_network.py       ← Builds r5py TransportNetwork
│   │   └── compute_isochrones.py    ← H3 grid generation + batch routing
│   ├── analysis/
│   │   └── score_accessibility.py   ← Weighted scoring, normalisation, equity metrics
│   └── visualization/
│       └── generate_maps.py
│
├── scripts/
│   └── export_to_web.py             ← Copies jakarta_h3_scores.geojson → web/public/data/
│
└── web/                             ← Next.js 14 frontend → Vercel
    ├── package.json
    ├── next.config.mjs
    ├── tailwind.config.js
    ├── .env.local.example
    │
    ├── scripts/                     ← Node.js data-generation scripts
    │   ├── generate-sample-data.mjs
    │   ├── generate-sample-pois.mjs
    │   ├── generate-transit-stops.mjs
    │   ├── generate-transit-routes.mjs
    │   ├── generate-demographics.mjs
    │   ├── generate-kelurahan-boundaries.mjs  ← Spatial join with H3 vertex check
    │   ├── generate-kecamatan-boundaries.mjs
    │   ├── generate-res7-data.mjs
    │   └── patch-luma.mjs
    │
    ├── public/data/                 ← Static GeoJSON/JSON served by Next.js
    │   ├── jakarta_h3_scores.geojson          ← ~9,000 scored hexes (res 8)
    │   ├── jakarta_h3_scores_res7.geojson     ← Aggregated res 7 for overview
    │   ├── jakarta_kelurahan_boundaries.geojson  ← 1,237 kelurahan with scores
    │   ├── jakarta_kecamatan_boundaries.geojson  ← 167 kecamatan with scores
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
        │   ├── methodology/
        │   │   └── page.tsx         ← Methodology explainer page
        │   └── api/
        │       ├── analyze/
        │       │   └── route.ts     ← POST → OpenRouter → plain-text response
        │       ├── geocode/
        │       │   └── route.ts
        │       └── pois/
        │           └── route.ts
        ├── components/
        │   ├── AccessibilityMap.tsx  ← deck.gl H3 choropleth, click-anywhere UX
        │   ├── MapLegend.tsx
        │   ├── ResultsLayout.tsx
        │   ├── landing/
        │   │   ├── LandingOverlay.tsx
        │   │   └── SearchBar.tsx
        │   ├── loading/
        │   │   └── LoadingSequence.tsx
        │   ├── results/
        │   │   ├── AIAnalysisCard.tsx    ← Displays equity analysis text
        │   │   ├── CardGrid.tsx
        │   │   ├── DemographicsCard.tsx
        │   │   ├── POIAccessCard.tsx
        │   │   ├── ScoreCircle.tsx
        │   │   ├── TransitLinesCard.tsx
        │   │   └── TransitScoreCard.tsx
        │   └── ui/
        │       └── GlassPanel.tsx
        ├── hooks/
        │   ├── useAISummary.ts       ← POSTs to /api/analyze, updates store
        │   ├── useDemographics.ts    ← Spatial lookup for kelurahan demographics
        │   ├── useReachablePOIs.ts
        │   └── useTransitStops.ts
        └── lib/
            ├── store.ts              ← Zustand: HexProperties, MapStats, AI state
            ├── colorScale.ts         ← d3 RdYlGn score → RGBA
            ├── osrmRoute.ts
            └── poiUtils.ts
```

---

## Methodology

### Spatial Unit: H3 Hexagons

Jabodetabek is divided into H3 hexagons at resolution 8 (~0.74 km² each, ~461m edge length). Hexagons are uniform and topology-agnostic — they don't follow administrative boundaries, so the score reflects actual transit access geography rather than administrative convenience.

| Resolution | Avg area | Edge length | Jabodetabek hexes | Use case |
|---|---|---|---|---|
| 7 | 5.16 km² | 1.22 km | ~1,300 | District-level, too coarse |
| **8** | **0.74 km²** | **461 m** | **~9,000** | **← Default: neighbourhood level** |
| 9 | 0.10 km² | 174 m | ~63,000 | Block-level, expensive to compute |

### Click-anywhere UX

The user clicks any map coordinate. The browser uses `h3-js` to resolve that coordinate to an H3 index instantly (no server round-trip). The app looks up the pre-computed score from the in-memory GeoJSON feature map (`Map<h3_index, HexProperties>`, built once on load) and triggers the AI analysis.

### Routing

r5py (multimodal routing) with TransJakarta BRT + KRL Commuterline + MRT Jakarta + LRT GTFS feeds, walking at 4.8 km/h. Departure: Tuesday 08:00 AM (AM peak). Each H3 centroid is the trip origin.

### Scoring

For each hex, count POIs reachable within 30 and 60 minutes. Apply weights:

| POI type | Weight |
|---|---|
| Hospital | ×3 |
| Clinic, traditional market, supermarket | ×2 |
| School, park | ×1 |

Min-max normalise weighted sums to 0–100 across all hexes → `composite_score`.

### Equity Framework

Each hex is classified into one of four equity quadrants based on its **Transit Need Score** (population vulnerability: % dependent, % zero-vehicle, density) and **Transit Accessibility Score** (composite score):

| Quadrant | Need | Access | Interpretation |
|---|---|---|---|
| **Transit Desert** | High | Low | Priority investment area |
| **Transit Ideal** | High | High | Transit serves those who need it most |
| **Over-Served** | Low | High | Resources could be redirected |
| **Car Suburb** | Low | Low | Car-dependent, monitor only |

The **equity gap** is the difference between need and access scores. `percentile_rank` shows where a hex sits relative to all Jabodetabek hexes.

### Administrative Overlays

Kelurahan and kecamatan boundaries are spatially joined to H3 hexes using a **vertex-based spatial join**: a hex is assigned to a polygon if its centroid *or any of its 6 corner vertices* falls inside it. This catches narrow kelurahan (< ~460m wide) that would be missed by centroid-only methods.

### AI Analysis

When a hex is selected, the app POSTs score + equity + demographics data to `/api/analyze`. The endpoint calls **OpenRouter** (`openai/gpt-oss-20b`, `max_tokens: 400`) with a structured prompt. The model returns 2 paragraphs of plain-English analysis: equity assessment → one concrete policy recommendation. Non-streaming; full text returned as `text/plain`.

### Known Limitations

- Angkot/mikrolet (informal transit) not in GTFS — areas reliant on informal modes are underscored
- GTFS schedules may not match real headways
- OSM pedestrian coverage incomplete in some kampung areas
- H3 hex boundaries straddle physical features (rivers, toll roads); routing handles this but visual borders may feel arbitrary
- AI analysis is generative — present as insight, not authoritative data

---

## Setup

### Python pipeline

```bash
conda env create -f environment.yml
conda activate transit-access

python src/ingestion/download_gtfs.py
python src/ingestion/download_osm.py
python src/ingestion/download_poi.py
python src/processing/validate_gtfs.py
python src/processing/prepare_network.py
python src/processing/compute_isochrones.py   # H3 grid + batch routing
python src/analysis/score_accessibility.py    # outputs jakarta_h3_scores.geojson

python scripts/export_to_web.py               # copies GeoJSON → web/public/data/
```

### Web app (local)

```bash
cd web
cp .env.local.example .env.local   # add OPENROUTER_API_KEY
npm install
npm run dev                         # → http://localhost:3000
```

### Regenerate boundary/data files

```bash
cd web
npm run generate-kelurahan    # → public/data/jakarta_kelurahan_boundaries.geojson
npm run generate-kecamatan    # → public/data/jakarta_kecamatan_boundaries.geojson
npm run generate-demographics # → public/data/jakarta_demographics.json
npm run generate-routes       # → public/data/jakarta_transit_routes.geojson
npm run generate-res7         # → public/data/jakarta_h3_scores_res7.geojson
```

### Deploy to Vercel

1. Push repo to GitHub
2. Connect to [Vercel](https://vercel.com) — reads `vercel.json` automatically (root dir → `web/`)
3. Project settings → Environment Variables → add `OPENROUTER_API_KEY`
4. Every push to `main` auto-deploys

---

## Data Sources

| Dataset | Source | Format |
|---|---|---|
| TransJakarta GTFS | [Mobility Database](https://database.mobilitydata.org) | GTFS zip |
| KRL Commuterline GTFS | [Mobility Database](https://database.mobilitydata.org) | GTFS zip |
| MRT Jakarta GTFS | [Mobility Database](https://database.mobilitydata.org) | GTFS zip |
| LRT Jabodebek GTFS | [Mobility Database](https://database.mobilitydata.org) | GTFS zip |
| OSM road network | [Geofabrik Java](https://download.geofabrik.de/asia/indonesia/java-latest.osm.pbf) | PBF |
| POI | [Overpass API](https://overpass-api.de) | GeoJSON |
| Population | [BPS Jakarta](https://jakarta.bps.go.id) | Excel |

---

## Tech Stack

**Python**: geopandas · r5py · h3 · h3pandas · gtfs-kit · overpy · shapely · pandas
**Web**: Next.js 14 · TypeScript · Tailwind CSS · deck.gl · MapLibre GL · h3-js · Zustand · Framer Motion
**AI**: OpenRouter API (`openai/gpt-oss-20b`) via `/api/analyze`
**Deployment**: Vercel

---

## Academic Context

Smart Society master's thesis, Hiroshima University. Research question: *how equitably does Jabodetabek's formal public transit provide spatial access to essential services, and where are the mobility gaps most acute?* Phase 2 applies the same H3 methodology to Hiroshima for cross-city comparison.

---

## License

MIT. Data sources retain original licenses (OSM: ODbL, BPS: open government data).
