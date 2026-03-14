# Methodology — Transit Accessibility Index

This document explains the full analytical methodology behind the Transit Accessibility Index (TAI): how space is divided, what data is used, how scores are computed, and how the equity gap and quadrant framework are constructed.

---

## 1. Study Area

**Phase 1: Jabodetabek**
Greater Jakarta — DKI Jakarta plus the satellite cities of Bogor, Depok, Tangerang, and Bekasi. Bounding box: 6.65°S–6.08°S, 106.48°E–107.15°E.

**Phase 2: Hiroshima** _(planned)_
Hiroshima City and surrounding region for cross-city comparison.

The central research question is not just *how accessible is transit?* but *who needs transit and who actually has it?* — a two-sided equity framing rather than a pure supply-side index.

---

## 2. Spatial Unit: H3 Hexagons

### Why hexagons instead of administrative boundaries

Administrative units (kelurahan, kecamatan) are irregular, politically drawn, and vary enormously in area. Hexagons tile space uniformly, so every score is comparable — a high score in Menteng and a high score in Bekasi Timur represent the same spatial extent of good access.

The tool supports three spatial views, which can be toggled in the UI:
- **H3 resolution 8** — neighbourhood scale, ~0.74 km² per hex, ~9,000 hexes over Jabodetabek
- **H3 resolution 7** — district scale, ~5.16 km² per hex, ~1,300 hexes, useful for overview
- **Kelurahan** — village/kelurahan administrative unit, spatial data joined from H3 hex aggregates
- **Kecamatan** — sub-district administrative unit, aggregated from kelurahan

### H3 resolution guide

| Resolution | Avg area | Edge length | Jabodetabek hexes | Use |
|---|---|---|---|---|
| 7 | 5.16 km² | 1.22 km | ~1,300 | District overview |
| **8** | **0.74 km²** | **461 m** | **~9,000** | **Primary analysis** |
| 9 | 0.10 km² | 174 m | ~63,000 | Block level (routing cost prohibitive) |

Resolution 8 was chosen because the hex edge (~461 m) approximates a 5–6 minute walk — a meaningful walkable catchment unit in the Jakarta context. At resolution 7, hexes are too large to distinguish between a transit node and its surroundings. At resolution 9, the routing matrix (~63,000 × thousands of POIs) becomes computationally prohibitive for a single researcher.

### Spatial join: H3 hexes → kelurahan/kecamatan

Kelurahan and kecamatan scores are computed by aggregating H3 hex scores. The hex-to-kelurahan assignment uses a **vertex-based method**: a hex is assigned to a kelurahan if its centroid **or any of its six corner vertices** falls inside the kelurahan polygon. This prevents narrow administrative units (less than ~460 m wide) from missing hexes under a centroid-only test.

Aggregated values are simple averages across all assigned hexes for continuous variables (scores, demographics). The quadrant is the modal quadrant of contributing hexes.

---

## 3. Data Sources

### What worked

| Dataset | Source | Coverage | Format |
|---|---|---|---|
| TransJakarta BRT GTFS | [Mobility Database](https://database.mobilitydata.org) | Full BRT network, 13 corridors + Mikrotrans | ZIP (stops, routes, trips, stop_times) |
| KRL Commuterline GTFS | [Mobility Database](https://database.mobilitydata.org) | Jabodetabek rail network | ZIP |
| MRT Jakarta GTFS | [Mobility Database](https://database.mobilitydata.org) | North–South MRT line | ZIP |
| OSM road + pedestrian network | [Geofabrik — Java extract](https://download.geofabrik.de/asia/indonesia/java-latest.osm.pbf) | All of Java | ~600 MB PBF |
| POIs (hospitals, schools etc.) | [Overpass API](https://overpass-api.de) | Jabodetabek bbox | GeoJSON nodes + way centroids |
| Administrative boundaries | [GADM](https://gadm.org) / Indonesia Geoportal | Kelurahan + kecamatan | GeoJSON polygon |
| BPS demographic data | [BPS Jakarta](https://jakarta.bps.go.id) | Kecamatan-level | Published census tables |

### What didn't work / known gaps

| Dataset | Issue | Impact |
|---|---|---|
| LRT Jabodebek GTFS | No validated GTFS published (service opened Aug 2023, feed not yet on Mobility Database as of 2026) | LRT stations are approximated in the transit hub proximity model; actual schedule-based routing not possible |
| Angkot / Mikrotrans informal routes | No GTFS exists for angkot networks; route data is unstructured and unstable | **Largest gap** — informal transit is the dominant mode in many kampung areas, so access is systematically underestimated in lower-income neighbourhoods |
| BPS vehicle-ownership microdata | Not publicly available at kelurahan level | Zero-vehicle household % is modeled from kecamatan estimates and urban density proxies |
| NJOP per-parcel open data | Full parcel dataset not publicly available | Kecamatan-level average NJOP used as socioeconomic proxy; within-kecamatan variation lost |
| Real-time headways / crowding | GTFS represents scheduled service; actual peak headways, bunching, and overcrowding not captured | Access is likely overestimated in practice, especially for TransJakarta |

### Current data status

The deployed application currently uses **synthetically modeled data** (`web/scripts/generate-sample-data.mjs`) while the full Python r5py routing pipeline is being completed. The synthetic data applies the same equity scoring framework to plausible variables derived from:
- Haversine distance to real transit hub locations (weighted by mode/capacity)
- Kecamatan-level BPS demographic profiles
- Urban density gradients from Jakarta CBD

Results follow realistic spatial patterns but **are not based on actual multimodal routing**. The Python pipeline section below describes the target full-routing methodology.

---

## 4. Data Pipeline

### 4.1 Python pipeline (full routing — target methodology)

```
┌─────────────────────────────────────────────────────────────────┐
│ INGESTION                                                        │
│   download_gtfs.py     → data/raw/gtfs/                         │
│   download_osm.py      → data/raw/osm/                          │
│   download_poi.py      → data/raw/poi/jakarta_poi.geojson        │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│ PROCESSING                                                       │
│   validate_gtfs.py       → log GTFS issues                      │
│   prepare_network.py     → r5py TransportNetwork                 │
│   compute_isochrones.py  → jakarta_h3_isochrones.parquet         │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│ SCORING                                                          │
│   score_accessibility.py → jakarta_h3_scores.geojson             │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│ EXPORT                                                           │
│   export_to_web.py → web/public/data/jakarta_h3_scores.geojson  │
└─────────────────────────────────────────────────────────────────┘
```

**Key routing parameters** (from `config/settings.yaml`):

| Parameter | Value | Rationale |
|---|---|---|
| H3 resolution | 8 | Neighbourhood scale, see §2 |
| Isochrone thresholds | 30 min, 60 min | Align with common transport planning standards |
| Transit modes | WALK + TRANSIT | Walk access + formal public transit |
| Walk speed | 4.8 km/h | Typical urban walk speed (WHO / GEH standard) |
| Departure time | Tuesday 08:00 | AM peak, mid-week — avoids anomalous Mon/Fri patterns |
| CRS (storage) | EPSG:4326 | WGS 84 for compatibility |
| CRS (Jakarta calculation) | EPSG:32748 | UTM zone 48S — metric distances |

### 4.2 r5py routing (compute_isochrones.py)

1. Generate H3 resolution-8 hex centroids over the Jabodetabek bounding box
2. Load POIs (hospitals, clinics, markets, supermarkets, schools, parks) from OSM via Overpass
3. Build `r5py.TransportNetwork` from OSM PBF + GTFS feeds
4. Run `r5py.TravelTimeMatrixComputer` from every hex centroid to every POI, capped at 60 minutes
5. For each hex × threshold combination, count reachable POIs per category
6. Save as Parquet: columns `h3_index`, `hospital_30min`, `clinic_30min`, …, `park_60min`

The TravelTimeMatrixComputer uses R5's multimodal router under the hood (same engine as Conveyal/Analysis). It models walking to stops, waiting for transit, riding, and walking to the destination.

### 4.3 POI categories and weights

POI weights reflect their relative importance to daily life and, implicitly, their scarcity. Healthcare is weighted highest because poor access to hospitals has direct life-outcome consequences.

| Category | OSM tag | Weight |
|---|---|---|
| Hospital | `amenity=hospital` | 3 |
| Clinic | `amenity=clinic` | 2 |
| Traditional market | `amenity=marketplace` | 2 |
| Supermarket | `shop=supermarket` | 2 |
| School | `amenity=school` | 1 |
| Park | `leisure=park` | 1 |

### 4.4 Node.js synthetic data pipeline (current deployment)

While the full routing pipeline is pending, `web/scripts/generate-sample-data.mjs` generates a plausible dataset by:

1. Covering the Jabodetabek bbox with H3 res-8 hexes via `h3-js`
2. For each hex centroid, computing:
   - Distance to each of ~23 named transit hubs (MRT, KRL, LRT, TransJakarta major termini)
   - A base accessibility score using exponential decay: `score = max(weight × exp(-dist / 5 km))`
   - Demand variables (population, % dependent, % zero-vehicle) modeled from BPS kecamatan profiles and urban density gradient from Jakarta CBD
   - Socioeconomic proxy (avg NJOP) from kecamatan base values
3. Running the same two-pass normalization and equity scoring as the Python pipeline (§5)
4. Outputting a GeoJSON file with identical schema to the routing-pipeline output

This means the web app, scoring logic, and AI prompt all work against real methodology — only the underlying POI counts and travel time estimates are modeled rather than routed.

---

## 5. Scoring Methodology

The scoring framework has two independent components — demand and supply — that are intentionally kept separate rather than combined into a single index. This reflects the thesis argument that an accessibility index alone is insufficient; you must also ask *who needs the access*.

### 5.1 Transit Need Score (demand side)

Measures population vulnerability and transit dependence. Higher = more urgent need for transit.

All input variables are **min-max normalised** to [0, 100] across all Jabodetabek hexes before weighting, so the score is relative to the regional distribution.

| Variable | Description | Direction | Weight |
|---|---|---|---|
| `pop_total` | Total population in the hex | Higher = more demand | 0.25 |
| `pct_dependent` | % of population aged <15 or >65 (cannot drive) | Higher = more vulnerable | 0.25 |
| `pct_zero_vehicle` | % of households owning no car or motorcycle | Higher = more transit-dependent | 0.25 |
| `avg_njop` (inverted) | Average land value (NJOP) — proxy for wealth | Lower value → higher score | 0.25 |

```
normX     = (X - min(X)) / (max(X) - min(X)) × 100
normNJOPinv = (max(NJOP) - NJOP) / max(NJOP) × 100

TransitNeedScore = 0.25 × normPop
                 + 0.25 × normDependent
                 + 0.25 × normZeroVehicle
                 + 0.25 × normNJOPinv
```

Equal weighting (0.25 each) is used as a deliberate baseline. All four variables are conceptually distinct dimensions of need; unequal weights would require empirical calibration that is beyond the scope of Phase 1. Sensitivity analysis with alternative weight schemes is planned.

### 5.2 Transit Accessibility Score (supply side)

Measures availability of transit services and reachability of essential destinations. Higher = better served.

| Variable | Description | Direction | Weight |
|---|---|---|---|
| `is_walkable_transit` | Binary: nearest stop ≤ 800 m (~15 min walk) | 1 if walkable | 0.15 |
| `dist_to_transit` (inverted) | Walking distance to nearest formal stop (KRL / MRT / LRT / TransJakarta) | Closer = higher | 0.25 |
| `transit_capacity_weight` | Capacity-quality weight of reachable transit. MRT/LRT scores higher than BRT, BRT higher than Mikrotrans | Higher = better | 0.25 |
| `local_poi_density` | Count of essential services reachable within ~15 min walk | More = better | 0.20 |
| `transit_shed_poi_count` | Count of essential services reachable in ~45 min total transit journey | More = better | 0.15 |

```
walkBonus  = 20 if dist_to_transit ≤ 0.8 km else 0
normDistInv = (max(dist) - dist) / max(dist) × 100

TransitAccessibilityScore = 0.15 × walkBonus
                          + 0.25 × normDistInv
                          + 0.25 × normCapacity
                          + 0.20 × normPOIDensity
                          + 0.15 × normShedPOI
```

Transit capacity weights reflect a reasonable hierarchy:
- MRT / LRT: highest capacity, most reliable, least affected by road congestion → 0.9–1.0
- KRL Commuterline: high capacity but older fleet/network → 0.75–0.85
- TransJakarta BRT: medium capacity, partially bus lane → 0.5–0.7
- Mikrotrans: smallest vehicles, informal routing → 0.35–0.5

In the routing pipeline (full methodology), `local_poi_density` and `transit_shed_poi_count` are replaced by actual counts from r5py travel time matrices.

### 5.3 Legacy composite score

An earlier version of the tool used a simpler **composite_score** — the average of `score_30min` and `score_60min`, where each is a min-max normalised weighted POI count across all hexes for that time threshold:

```
rawScore_t  = Σ (POI_count_category_t × weight_category)
score_t     = minmax(rawScore_t, 0, 100)
composite   = mean(score_30min, score_60min)
percentile  = rank(composite) / n × 100
```

This score is still included in the GeoJSON properties (`composite_score`, `score_30min`, `score_60min`, `percentile_rank`) for backward compatibility and is used in the AI analysis prompt as a secondary reference.

### 5.4 Equity Gap

```
EquityGap = TransitNeedScore − TransitAccessibilityScore
```

- **Positive gap**: area needs more transit than it currently receives → underserved
- **Negative gap**: transit supply exceeds local demand → potentially over-resourced

A gap of ±10 is considered noise (within model uncertainty). Gaps above +20 are flagged as high-priority.

### 5.5 Quadrant classification

Each hex is classified into one of four policy quadrants by comparing its Need and Accessibility scores against the **Jabodetabek-wide median** of each score. Median splits rather than absolute thresholds are used deliberately: they are robust to the synthetic data and can be recomputed when real routing data is available.

```
if Need ≥ median(Need) AND Access < median(Access) → "transit-desert"
if Need ≥ median(Need) AND Access ≥ median(Access) → "transit-ideal"
if Need < median(Need) AND Access < median(Access) → "car-suburb"
if Need < median(Need) AND Access ≥ median(Access) → "over-served"
```

| Quadrant | Color | Label | Planning implication |
|---|---|---|---|
| `transit-desert` | Red | High Need, Low Access | **Priority investment** — expand routes, pedestrian first-mile |
| `transit-ideal` | Green | High Need, High Access | **Maintain** — subsidies, frequency, crowding management |
| `car-suburb` | Amber | Low Need, Low Access | **Monitor** — car-dependent, may change with densification |
| `over-served` | Blue | Low Need, High Access | **Redirect** — TOD, parking pricing, land value capture |

Exactly 25% of hexes fall in each quadrant by construction of the median split. This is an intentional design choice: it prevents the classification from being trivially dominated by one category and ensures the action matrix has practical meaning for planners.

---

## 6. AI Analysis

When a user clicks a hex, kelurahan, or kecamatan, the app calls `POST /api/analyze` with the hex's equity scores, POI counts, demographics, and transit stop data. The endpoint calls **OpenRouter** (`openai/gpt-oss-20b`, max 400 tokens) with a structured prompt.

The model is asked to write **two short paragraphs**:
1. **Equity assessment** — what does this quadrant classification mean for residents? Who is affected and how? (references transit_need_score, transit_accessibility_score, equity_gap, quadrant)
2. **Policy recommendation** — one concrete, actionable suggestion grounded in Jabodetabek's real transit context (TransJakarta, KRL, MRT, LRT, angkot)

The AI output is labelled as generative insight, not authoritative planning data.

---

## 7. Web Application

### Click-anywhere UX

The core interaction is coordinate → score in <100 ms:

```
User clicks coordinate [lng, lat]
  → h3-js latLngToCell(lat, lng, resolution)  [browser, O(1)]
  → Map<h3_index, HexProperties>.get(h3Index) [browser, O(1)]
  → setSelectedHex(hexProperties)             [Zustand]
  → Loading sequence (1.8 s)
  → Results panel
```

No server round-trip is needed for coordinate resolution. The GeoJSON (~9,000 features) is loaded once on mount and stored in a `Map` keyed by `h3_index`.

### App phases

```
landing → (click) → loading → results
           (back)         ↙
```

- **landing**: full-screen map with transit corridors, search bar
- **loading**: 4-stage animated sequence (resolving → fetching-pois → fetching-transit → analyzing)
- **results**: side panel with ScoreCircle, TransitScoreCard, POIAccessCard, DemographicsCard, AIAnalysisCard

### Boundary modes

The layer toggle switches between three views:

| Mode | Layer | Data |
|---|---|---|
| `hex` | `h3-accessibility` GeoJsonLayer | `jakarta_h3_scores.geojson` or `_res7` |
| `kelurahan` | `kelurahan-boundaries` GeoJsonLayer | `jakarta_kelurahan_boundaries.geojson` |
| `kecamatan` | `kecamatan-boundaries` GeoJsonLayer | `jakarta_kecamatan_boundaries.geojson` |

Kelurahan and kecamatan features without any H3 data are filtered out on the client before rendering.

### Map layers (render order)

1. Transit corridor lines (PathLayer) — always visible
2. Boundary overlay (GeoJsonLayer) — hex / kelurahan / kecamatan depending on mode
3. Transit stop markers (ScatterplotLayer) — visible in results phase
4. POI markers (ScatterplotLayer) — visible in results phase
5. Walking route to POI (PathLayer) — visible when a POI is selected
6. Walking route to transit stop (PathLayer)
7. Click pin marker (ScatterplotLayer)

Walking routes are fetched from **OSRM** (foot profile) via `/api/pois`.

### Basemap

CartoDB Positron (`basemaps.cartocdn.com/gl/positron-gl-style`) — light grey with street labels. Chosen over dark map because the quadrant colour scheme (red/green/amber/blue) reads better on a light background.

### Transit stop colour scheme

| Mode | Colour |
|---|---|
| TransJakarta | Orange-500 (#F97316) |
| KRL Commuterline | Blue-500 (#3B82F6) |
| MRT Jakarta | Emerald-500 (#10B981) |
| LRT Jabodebek | Purple-500 (#A855F7) |

---

## 8. Known Limitations and Future Work

### Methodological limitations

| Limitation | Affected metric | Direction of bias | Mitigation |
|---|---|---|---|
| Angkot not in GTFS | Transit Accessibility Score | Underestimated in kampung areas | Phase 2 seeks informal transit GPS trace data |
| LRT GTFS missing | Accessibility Score (Bekasi/Cibubur corridors) | Underestimated | Use proximity model as fallback |
| GTFS ≠ actual operations | All scores | Overestimated (GTFS shows ideal schedule) | Cross-validate with commute survey data |
| OSM coverage gaps | POI counts, routing | Underestimated in suburban areas | Supplement with Google Places API |
| BPS 2020 census | Demographics | May not reflect 2024–26 conditions | — |
| H3 hexes straddle barriers | Score attribution | Minor — hexes straddle rivers, toll roads | Noted in output; routing handles internally |
| Equal weights | Need + Access scores | Unknown direction | Planned sensitivity analysis (AHP) |
| Synthetic data in deployment | All | Plausible but not routed | Full r5py pipeline to replace |

### Planned improvements

- Replace synthetic data with full r5py routing output
- Add angkot coverage layer (GPS trace data from Ureeka/Google)
- Sensitivity analysis: vary weights using Analytic Hierarchy Process (AHP)
- Add BPS 2020 kelurahan-level population grid (WorldPop as fallback)
- Phase 2: Hiroshima cross-city comparison

---

## 9. Reproducibility

All parameters are set in `config/settings.yaml`. All paths are relative to the project root. The H3 resolution constant (`H3_RESOLUTION = 8`) must be consistent across:
1. `config/settings.yaml` → `analysis.h3_resolution`
2. `web/scripts/generate-sample-data.mjs` → `const H3_RESOLUTION`
3. `web/src/components/AccessibilityMap.tsx` → Zustand store default (`h3Resolution: 8`)

Changing the resolution requires updating all three locations and regenerating all data files.

---

## Academic Context

Smart Society master's thesis, Hiroshima University (2025–2026). Research question: *how equitably does Jabodetabek's formal public transit network distribute spatial access to essential services, and where are the mobility gaps most severe?*

The thesis applies spatial equity frameworks from Martens (2012, *Transport Justice*) and Lucas (2012, *Transport and Social Exclusion*). The two-component Need / Access approach is adapted from the cumulative opportunities measure with an added vulnerability weighting, following Pereira et al. (2017, *Distributive Justice and Equity in Transportation*).
