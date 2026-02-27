# CLAUDE.md — Instructions for Claude Code

Read this entire file before writing any code or modifying any file.

## Project Summary

**Transit Accessibility Index** — an open research tool mapping transit equity in Jakarta. Users click any point on the map; the app resolves it to a H3 hexagon (resolution 8), returns a 0–100 transit accessibility score, and streams an AI-generated analysis via the Claude API.

Academic context: Smart Society master's program, Hiroshima University. Phase 2 adds Hiroshima.

---

## Full Project Structure

```
transit-accessibility-index/
├── CLAUDE.md                        ← You are here
├── README.md
├── .gitignore
├── vercel.json
├── environment.yml                  ← Conda (Python pipeline)
├── requirements.txt
│
├── config/
│   └── settings.yaml                ← Single source of truth for all parameters
│
├── docs/
│   └── data_sources.md
│
├── data/
│   ├── raw/
│   │   ├── gtfs/                    ← GTFS zips
│   │   ├── osm/                     ← java-latest.osm.pbf
│   │   ├── census/                  ← BPS xlsx
│   │   └── poi/                     ← jakarta_poi.geojson
│   ├── processed/
│   │   ├── networks/                ← r5py graph + jakarta_h3_centroids.geojson
│   │   ├── isochrones/              ← jakarta_h3_isochrones.parquet (routing output)
│   │   │                               jakarta_h3_scores.geojson  (final scored hexes)
│   │   └── demographics/
│   └── external/
│
├── notebooks/                       ← Jupyter (numbered order)
├── src/
│   ├── ingestion/
│   │   ├── download_gtfs.py
│   │   ├── download_osm.py
│   │   └── download_poi.py
│   ├── processing/
│   │   ├── validate_gtfs.py
│   │   ├── prepare_network.py       ← builds r5py TransportNetwork
│   │   └── compute_isochrones.py    ← H3 grid generation + batch routing
│   ├── analysis/
│   │   └── score_accessibility.py   ← weighted scoring, normalisation, percentile rank
│   └── visualization/
│       └── generate_maps.py
│
├── scripts/
│   └── export_to_web.py             ← copies jakarta_h3_scores.geojson → web/public/data/
│
├── outputs/{maps,reports,figures}/
├── tests/
│
└── web/
    ├── package.json                 ← includes h3-js, @anthropic-ai/sdk, deck.gl
    ├── next.config.mjs
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── postcss.config.js
    ├── .env.local.example
    ├── public/data/                 ← jakarta_h3_scores.geojson (served as static file)
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx
        │   ├── globals.css
        │   └── api/analyze/route.ts ← POST → Claude API → streaming response
        ├── components/
        │   ├── Header.tsx
        │   ├── AccessibilityMap.tsx ← deck.gl GeoJsonLayer, click-any-coord logic
        │   ├── InfoPanel.tsx        ← sidebar: threshold toggle, hex scores, POI counts
        │   └── AISummaryPanel.tsx   ← streaming AI text output
        ├── hooks/
        │   └── useAISummary.ts      ← watches selectedHex, POSTs to /api/analyze, streams
        └── lib/
            ├── store.ts             ← Zustand: HexProperties, MapStats, AI state
            └── colorScale.ts        ← d3 RdYlGn score → [R,G,B,A]
```

---

## Tech Stack

### Python Pipeline
- **Python 3.11**, Conda (`environment.yml`)
- **h3** + **h3pandas** — Uber H3 hexagonal indexing
- **r5py** — multimodal transit routing (wraps R5 engine)
- **geopandas**, **shapely**, **pyproj** — geospatial processing
- **gtfs-kit** — GTFS validation
- **overpy** — Overpass API (OSM POI download)
- **pandas**, **numpy**, **matplotlib**

### Web App
- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS**
- **deck.gl** (GeoJsonLayer) + **MapLibre GL** (dark basemap)
- **h3-js** — client-side lat/lng → H3 index resolution (no server round-trip)
- **Zustand** — global state
- **@anthropic-ai/sdk** — streaming Claude API calls
- **d3-scale** + **d3-scale-chromatic** — RdYlGn color scale

---

## H3 Spatial Unit

The core design decision is to use **H3 hexagons at resolution 8** instead of administrative kelurahan boundaries.

- Resolution 8: ~0.74 km² avg area, ~461m edge length, ~9,000 hexes over Jakarta
- Configured in `config/settings.yaml` under `analysis.h3_resolution`
- The constant `H3_RESOLUTION = 8` must be **identical** in three places:
  1. `config/settings.yaml` → `analysis.h3_resolution`
  2. `web/src/components/AccessibilityMap.tsx` → `const H3_RESOLUTION = 8`
  3. `web/src/hooks/useAISummary.ts` → `const H3_RESOLUTION = 8`
- If you change resolution, update all three locations.

**Click-anywhere UX**: User clicks any map coordinate → `h3-js` `latLngToCell(lat, lng, H3_RESOLUTION)` resolves it to an H3 index instantly in the browser → app looks up that index in the pre-loaded GeoJSON feature map → triggers AI analysis. No server round-trip for coordinate resolution.

---

## Python Conventions

- Raw data → `data/raw/` only. Never modify files here.
- All processing outputs → `data/processed/`
- All paths from `config/settings.yaml` — never hardcode
- CRS: store as `EPSG:4326`; spatial calculations for Jakarta use `EPSG:32748` (UTM 48S)
- Use `pathlib.Path`, `logging` (not print), docstrings on all functions

### Pipeline Order
```bash
python src/ingestion/download_gtfs.py
python src/ingestion/download_osm.py
python src/ingestion/download_poi.py
python src/processing/validate_gtfs.py
python src/processing/prepare_network.py
python src/processing/compute_isochrones.py   # H3 grid + r5py batch routing
python src/analysis/score_accessibility.py    # scoring + GeoJSON output
python scripts/export_to_web.py               # → web/public/data/
```

### Key Intermediate Files
| File | Location | Description |
|---|---|---|
| `jakarta_h3_centroids.geojson` | `data/processed/networks/` | H3 hex centroids (routing origins) |
| `jakarta_h3_isochrones.parquet` | `data/processed/isochrones/` | POI counts per hex per threshold |
| `jakarta_h3_scores.geojson` | `data/processed/isochrones/` | Final scored hexes with polygon geometry |

---

## Web App Conventions

### AI Analysis Endpoint (`POST /api/analyze`)

**Request body** (`AnalyzeRequest` in `route.ts`):
```typescript
{
  h3_index: string;          // e.g. "88218adda3fffff"
  h3_resolution: number;     // 8
  lat: number;
  lng: number;
  composite_score: number;   // 0–100
  score_30min: number;
  score_60min: number;
  jakarta_avg_score: number;
  jakarta_median_score: number;
  percentile_rank: number;   // 0–100, higher = better
  threshold: 30 | 60;
  poi_counts: {
    hospital: number; clinic: number; market: number;
    supermarket: number; school: number; park: number;
  };
}
```

**Response**: Server-Sent Events (streaming plain text)

**Prompt instructs Claude to write**:
1. POI access summary for that hex — what's reachable, what's missing
2. Jakarta comparison — score vs avg/median, percentile, inferred neighbourhood type
3. 2–3 concrete planning suggestions grounded in Jakarta's actual transit context

**Model**: `claude-sonnet-4-6`, max_tokens: 450

### State Flow
```
User clicks coordinate
  → AccessibilityMap: latLngToCell() → h3Index → hexLookup.get(h3Index)
  → store.setSelectedHex(hexProperties)
  → useAISummary hook: detects selectedHex change → POST /api/analyze
  → AISummaryPanel: renders streaming text
```

### GeoJSON Lookup Performance
`AccessibilityMap.tsx` builds a `Map<h3_index, HexProperties>` once on load (`buildHexLookup`). All click resolution is O(1). Do not iterate over features on every click.

### Environment Variable
`ANTHROPIC_API_KEY` — set in `.env.local` for local dev, in Vercel dashboard for deployment.

### Vercel Deployment
- `vercel.json` points build to `web/` directory
- Free tier handles static GeoJSON (~9,000 features, ~5–10MB) fine
- GeoJSON served with `Cache-Control: max-age=86400`
- Add `ANTHROPIC_API_KEY` in Vercel → Settings → Environment Variables

---

## Analysis Parameters

| Parameter | Value | Location |
|---|---|---|
| H3 resolution | 8 | `settings.yaml`, `AccessibilityMap.tsx`, `useAISummary.ts` |
| Thresholds | 30, 60 min | `settings.yaml` |
| Walk speed | 4.8 km/h | `settings.yaml` |
| Departure | Tue 08:00 AM | `settings.yaml` |
| Hospital weight | ×3 | `settings.yaml` |
| Clinic/market/supermarket weight | ×2 | `settings.yaml` |
| School/park weight | ×1 | `settings.yaml` |
| Normalisation | min-max → 0–100 | `score_accessibility.py` |

## Known Limitations

- Angkot (informal transit) NOT in GTFS — underestimates access in kampung areas
- GTFS schedules may not reflect real peak headways
- OSM pedestrian coverage incomplete in some areas
- AI analysis is generative — present as insight, not authoritative data
- H3 res 8 hexes straddle physical features (rivers, toll roads) — routing handles this but visual boundaries may feel arbitrary

## Research Context

- **Primary city**: Jakarta (Phase 1)
- **Comparison city**: Hiroshima, Japan (Phase 2)
- **Thesis angle**: spatial mobility equity — who has access, who doesn't, and why
- **Supervisor institution**: Hiroshima University, Smart Society program
