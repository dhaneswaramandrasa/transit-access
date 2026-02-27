# Data Sources

## GTFS Transit Feeds

| Agency | Source | Notes |
|---|---|---|
| TransJakarta BRT | [Mobility Database](https://database.mobilitydata.org) | Search "TransJakarta" |
| KRL Commuterline | [Mobility Database](https://database.mobilitydata.org) | Search "KRL" or "KAI Commuter" |
| MRT Jakarta | [Mobility Database](https://database.mobilitydata.org) | Search "MRT Jakarta" |

Download GTFS zips and place in `data/raw/gtfs/`. Or run `python src/ingestion/download_gtfs.py`.

## OpenStreetMap Road Network

| Region | Source | File |
|---|---|---|
| Java (includes Jakarta) | [Geofabrik](https://download.geofabrik.de/asia/indonesia/java-latest.osm.pbf) | ~600 MB PBF |

Place in `data/raw/osm/`. Or run `python src/ingestion/download_osm.py`.

## Points of Interest (POIs)

Downloaded automatically from the [Overpass API](https://overpass-api.de/api/interpreter) using OSM tags defined in `config/settings.yaml`.

Run `python src/ingestion/download_poi.py` to fetch POIs for the active city.

### POI Categories

| Category | OSM Tag | Weight |
|---|---|---|
| Hospital | `amenity=hospital` | 3 |
| Clinic | `amenity=clinic` | 2 |
| Market | `amenity=marketplace` | 2 |
| Supermarket | `shop=supermarket` | 2 |
| School | `amenity=school` | 1 |
| Park | `leisure=park` | 1 |

## Census / Population Data

| Dataset | Source | Format |
|---|---|---|
| Jakarta population by kelurahan | [BPS Jakarta](https://jakarta.bps.go.id) | Excel (.xlsx) |

Download manually from BPS website. Place in `data/raw/census/`.

## Administrative Boundaries

Optional reference data for spatial context. Download GeoJSON boundaries from:
- [Indonesia Geoportal](https://tanahair.indonesia.go.id)
- [GADM](https://gadm.org/download_country.html) — select Indonesia

Place in `data/external/`.
