# Transit Accessibility Index

**How equitably does Jakarta's public transit serve its residents?**

An open research tool that scores every H3 hexagon (resolution 8, ~0.74 km²) in DKI Jakarta on transit accessibility to essential services — hospitals, clinics, markets, supermarkets, schools, and parks — reachable within 30 or 60 minutes by public transit and walking.

**Click anywhere on the map** to get an AI-generated analysis of that location: what services are reachable, how it compares to the rest of Jakarta, and what urban planning improvements would help.

Built as part of a Smart Society master's thesis, Hiroshima University (April 2026). Phase 2 will add Hiroshima for cross-city comparison.

**Live demo**: _coming soon_
**Data**: OpenStreetMap · TransJakarta/KRL/MRT GTFS · BPS Census 2020

---

## Project Structure

```
transit-accessibility-index/
│
├── CLAUDE.md                        ← Instructions for Claude Code (read first)
├── README.md                        ← This file
├── .gitignore
├── vercel.json                      ← Vercel deployment config
├── environment.yml                  ← Conda environment (Python pipeline)
├── requirements.txt                 ← pip alternative
│
├── config/
│   └── settings.yaml                ← All paths, H3 resolution, POI weights
│
├── docs/
│   └── data_sources.md              ← Where to download each dataset
│
├── data/                            ← Gitignored content, tracked via .gitkeep
│   ├── raw/
│   │   ├── gtfs/                    ← GTFS zips: transjakarta, krl, mrt
│   │   ├── osm/                     ← java-latest.osm.pbf (~600MB, Geofabrik)
│   │   ├── census/                  ← BPS population xlsx
│   │   └── poi/                     ← jakarta_poi.geojson (Overpass API)
│   ├── processed/
│   │   ├── networks/                ← r5py routing graph + H3 centroids
│   │   ├── isochrones/              ← jakarta_h3_isochrones.parquet + jakarta_h3_scores.geojson
│   │   └── demographics/            ← supplementary population data
│   └── external/                    ← Admin boundaries, reference data
│
├── notebooks/                       ← Jupyter exploration (run in order)
│   ├── 01_data_exploration.ipynb
│   ├── 02_gtfs_validation.ipynb
│   ├── 03_h3_grid_analysis.ipynb
│   ├── 04_accessibility_scoring.ipynb
│   └── 05_visualization.ipynb
│
├── src/                             ← Python analysis pipeline
│   ├── ingestion/
│   │   ├── download_gtfs.py         ← Download GTFS feeds
│   │   ├── download_osm.py          ← Download OSM PBF from Geofabrik
│   │   └── download_poi.py          ← Fetch POIs from Overpass API
│   ├── processing/
│   │   ├── validate_gtfs.py         ← Validate GTFS feeds with gtfs-kit
│   │   ├── prepare_network.py       ← Build r5py multimodal routing graph
│   │   └── compute_isochrones.py    ← Generate H3 grid + batch isochrone routing
│   ├── analysis/
│   │   └── score_accessibility.py   ← Weighted POI scoring → 0–100 per hex
│   └── visualization/
│       └── generate_maps.py         ← Static map exports
│
├── scripts/
│   └── export_to_web.py             ← Copy jakarta_h3_scores.geojson → web/public/data/
│
├── outputs/                         ← Generated outputs (gitignored)
│   ├── maps/
│   ├── reports/
│   └── figures/
│
├── tests/
│
└── web/                             ← Next.js 14 frontend → Vercel
    ├── package.json                 ← Includes h3-js for client-side hex resolution
    ├── next.config.mjs
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── postcss.config.js
    ├── .env.local.example
    ├── public/
    │   └── data/
    │       └── jakarta_h3_scores.geojson  ← populated by export_to_web.py
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx
        │   ├── globals.css
        │   └── api/
        │       └── analyze/
        │           └── route.ts     ← Claude API streaming endpoint (POST)
        ├── components/
        │   ├── Header.tsx
        │   ├── AccessibilityMap.tsx  ← deck.gl H3 choropleth, click-anywhere
        │   ├── InfoPanel.tsx         ← Sidebar: hex details, POI counts, legend
        │   └── AISummaryPanel.tsx    ← Streaming AI analysis output
        ├── hooks/
        │   └── useAISummary.ts       ← Streaming fetch lifecycle
        └── lib/
            ├── store.ts              ← Zustand state (HexProperties, MapStats)
            └── colorScale.ts        ← d3 RdYlGn score → RGBA
```

---

## Methodology

### Spatial Unit: H3 Hexagons (not administrative boundaries)

Jakarta is divided into ~9,000 H3 hexagons at resolution 8 (~0.74 km² each, ~461m edge length). Hexagons are uniform and topology-agnostic — they don't follow kelurahan or kecamatan boundaries, which means the score reflects actual transit access geography, not administrative convenience.

**H3 resolution tradeoffs**:
| Resolution | Avg area | Edge length | Jakarta hexes | Use case |
|---|---|---|---|---|
| 7 | 5.16 km² | 1.22 km | ~1,300 | District-level, too coarse |
| **8** | **0.74 km²** | **461 m** | **~9,000** | **← Default: neighborhood level** |
| 9 | 0.10 km² | 174 m | ~63,000 | Block-level, expensive to compute |

### UX: Click-anywhere scoring

The user clicks any coordinate on the map. The browser uses `h3-js` to resolve that coordinate to the corresponding H3 index (client-side, instant). The app looks up the pre-computed score for that hex and triggers the AI analysis.

### Routing

r5py (multimodal routing) with TransJakarta BRT + KRL Commuterline + MRT Jakarta GTFS feeds, walking at 4.8 km/h. Departure time: Tuesday 08:00 AM (AM peak). Each hex centroid is the trip origin.

### Scoring

For each hex, count POIs reachable within 30 and 60 minutes. Apply weights: hospitals ×3, clinics ×2, traditional markets ×2, supermarkets ×2, schools ×1, parks ×1. Min-max normalise weighted sums to 0–100 across all ~9,000 hexes.

### AI Analysis

When a hex is selected, the app POSTs score data to `/api/analyze`, which calls Claude claude-sonnet with a structured prompt. Claude returns a 3-paragraph plain-English analysis: access summary → Jakarta comparison → planning recommendations. Streamed in real-time.

### Known Limitations

- Angkot/mikrolet (informal transit) not in GTFS — areas dependent on informal modes are underscored
- GTFS schedules may not match real headways
- OSM pedestrian coverage incomplete in some kampung areas

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
python src/processing/compute_isochrones.py   # generates H3 grid + routing
python src/analysis/score_accessibility.py    # outputs jakarta_h3_scores.geojson

python scripts/export_to_web.py               # copies GeoJSON to web/public/data/
```

### Web app (local)

```bash
cd web
cp .env.local.example .env.local   # add ANTHROPIC_API_KEY
npm install
npm run dev                         # → http://localhost:3000
```

### Deploy to Vercel

1. Push repo to GitHub
2. Connect to [Vercel](https://vercel.com) — reads `vercel.json` automatically
3. Project settings → Environment Variables → add `ANTHROPIC_API_KEY`
4. Every push to `main` auto-deploys

---

## Data Sources

| Dataset | Source | Format |
|---|---|---|
| TransJakarta GTFS | [Mobility Database](https://database.mobilitydata.org) | GTFS zip |
| KRL Commuterline GTFS | [Mobility Database](https://database.mobilitydata.org) | GTFS zip |
| MRT Jakarta GTFS | [Mobility Database](https://database.mobilitydata.org) | GTFS zip |
| OSM road network | [Geofabrik Java](https://download.geofabrik.de/asia/indonesia/java-latest.osm.pbf) | PBF |
| POI | [Overpass API](https://overpass-api.de) | GeoJSON |
| Population | [BPS Jakarta](https://jakarta.bps.go.id) | Excel |

---

## Tech Stack

**Python**: geopandas · r5py · h3 · h3pandas · gtfs-kit · overpy · shapely · pandas
**Web**: Next.js 14 · TypeScript · Tailwind · deck.gl · MapLibre GL · h3-js · Zustand
**AI**: Anthropic Claude API (streaming via `/api/analyze`)
**Deployment**: Vercel (free tier)

---

## Academic Context

Smart Society master's thesis, Hiroshima University. Research question: *how equitably does Jakarta's formal public transit provide spatial access to essential services, and where are the mobility gaps most acute?* Phase 2 applies the same H3 methodology to Hiroshima for cross-city comparison.

---

## License

MIT. Data sources retain original licenses (OSM: ODbL, BPS: open government data).
