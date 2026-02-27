"""Generate H3 hexagonal grid over Jakarta and compute transit isochrones.

1. Creates H3 res-8 hexes covering the Jakarta bounding box
2. Extracts centroids as trip origins
3. Loads POIs as destinations
4. Uses r5py TravelTimeMatrixComputer for batch routing
5. Counts POIs reachable within 30 and 60 minutes per hex
6. Outputs isochrone results as parquet + centroid GeoJSON
"""

import json
import logging
from datetime import datetime
from pathlib import Path

import geopandas as gpd
import h3
import numpy as np
import pandas as pd
import r5py
import yaml
from shapely.geometry import Point

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "config" / "settings.yaml"


def load_config() -> dict:
    """Load project settings from YAML config."""
    with open(CONFIG) as f:
        return yaml.safe_load(f)


def generate_h3_grid(bbox: dict, resolution: int) -> gpd.GeoDataFrame:
    """Generate H3 hexagons covering a bounding box."""
    logger.info("Generating H3 res-%d grid over bbox...", resolution)

    # Get all hexes that intersect the bbox using h3.polyfill
    polygon = [
        (bbox["min_lat"], bbox["min_lng"]),
        (bbox["min_lat"], bbox["max_lng"]),
        (bbox["max_lat"], bbox["max_lng"]),
        (bbox["max_lat"], bbox["min_lng"]),
    ]
    hex_ids = h3.polyfill_geojson(
        {"type": "Polygon", "coordinates": [[
            [bbox["min_lng"], bbox["min_lat"]],
            [bbox["max_lng"], bbox["min_lat"]],
            [bbox["max_lng"], bbox["max_lat"]],
            [bbox["min_lng"], bbox["max_lat"]],
            [bbox["min_lng"], bbox["min_lat"]],
        ]]},
        resolution,
    )
    logger.info("  Generated %d hexes", len(hex_ids))

    # Build GeoDataFrame with centroids
    records = []
    for h3_id in hex_ids:
        lat, lng = h3.h3_to_geo(h3_id)
        records.append({"h3_index": h3_id, "geometry": Point(lng, lat)})

    gdf = gpd.GeoDataFrame(records, crs="EPSG:4326")
    return gdf


def load_pois(config: dict) -> gpd.GeoDataFrame:
    """Load POI GeoJSON into a GeoDataFrame."""
    city = config["project"]["active_city"]
    poi_path = ROOT / config["paths"]["data_raw"] / "poi" / f"{city}_poi.geojson"

    if not poi_path.exists():
        logger.error("POI file not found: %s — run download_poi.py first", poi_path)
        raise FileNotFoundError(poi_path)

    pois = gpd.read_file(poi_path)
    logger.info("Loaded %d POIs from %s", len(pois), poi_path.name)
    return pois


def compute_travel_times(
    transport_network: r5py.TransportNetwork,
    origins: gpd.GeoDataFrame,
    destinations: gpd.GeoDataFrame,
    config: dict,
) -> pd.DataFrame:
    """Compute travel time matrix from hex centroids to all POIs."""
    departure = datetime.fromisoformat(config["analysis"]["departure_time"])
    walk_speed = config["analysis"]["walk_speed_kmh"]
    modes = config["analysis"]["transit_modes"]

    logger.info(
        "Computing travel times: %d origins × %d destinations",
        len(origins), len(destinations),
    )

    ttm = r5py.TravelTimeMatrixComputer(
        transport_network,
        origins=origins,
        destinations=destinations,
        departure=departure,
        transport_modes=[r5py.TransportMode[m] for m in modes],
        walk_speed=walk_speed,
        max_time=pd.Timedelta(minutes=max(config["analysis"]["isochrone_thresholds_minutes"])),
    )
    travel_times = ttm.compute_travel_times()
    logger.info("  Travel time matrix: %d rows", len(travel_times))
    return travel_times


def count_pois_per_hex(
    travel_times: pd.DataFrame,
    pois: gpd.GeoDataFrame,
    hex_grid: gpd.GeoDataFrame,
    thresholds: list[int],
    poi_categories: dict,
) -> pd.DataFrame:
    """Count reachable POIs per hex for each threshold and category."""
    results = []

    for h3_idx, h3_row in hex_grid.iterrows():
        h3_id = h3_row["h3_index"]
        hex_times = travel_times[travel_times["from_id"] == h3_id]

        record = {"h3_index": h3_id}
        for threshold in thresholds:
            reachable = hex_times[hex_times["travel_time"] <= threshold]
            reachable_poi_ids = reachable["to_id"].values

            reachable_pois = pois[pois.index.isin(reachable_poi_ids)]

            for category in poi_categories:
                count = len(reachable_pois[reachable_pois["category"] == category])
                record[f"{category}_{threshold}min"] = count

            record[f"total_pois_{threshold}min"] = len(reachable_pois)

        results.append(record)

    return pd.DataFrame(results)


def main() -> None:
    """Run the full isochrone computation pipeline."""
    config = load_config()
    city = config["project"]["active_city"]
    bbox = config["analysis"][f"{city}_bbox"]
    resolution = config["analysis"]["h3_resolution"]
    thresholds = config["analysis"]["isochrone_thresholds_minutes"]

    # Generate H3 grid
    hex_grid = generate_h3_grid(bbox, resolution)

    # Save centroids GeoJSON
    output_dir = ROOT / config["paths"]["data_processed"] / "networks"
    output_dir.mkdir(parents=True, exist_ok=True)
    centroids_path = output_dir / f"{city}_h3_centroids.geojson"
    hex_grid.to_file(centroids_path, driver="GeoJSON")
    logger.info("Saved centroids: %s", centroids_path)

    # Load POIs
    pois = load_pois(config)

    # Build transport network
    osm_path = ROOT / config["osm"][city]
    gtfs_paths = [ROOT / p for p in config["gtfs"][city].values()]

    transport_network = r5py.TransportNetwork(
        osm_pbf=str(osm_path),
        gtfs=[str(p) for p in gtfs_paths],
    )

    # Compute travel times
    travel_times = compute_travel_times(
        transport_network, hex_grid, pois, config,
    )

    # Count POIs per hex
    poi_counts = count_pois_per_hex(
        travel_times, pois, hex_grid, thresholds, config["poi_categories"],
    )

    # Save as parquet
    iso_dir = ROOT / config["paths"]["data_processed"] / "isochrones"
    iso_dir.mkdir(parents=True, exist_ok=True)
    parquet_path = iso_dir / f"{city}_h3_isochrones.parquet"
    poi_counts.to_parquet(parquet_path, index=False)
    logger.info("Saved isochrone results: %s", parquet_path)


if __name__ == "__main__":
    main()
