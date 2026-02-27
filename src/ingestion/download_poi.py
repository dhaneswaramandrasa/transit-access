"""Download Points of Interest (POIs) for Jakarta via Overpass API.

Fetches hospitals, clinics, markets, supermarkets, schools, and parks
within the Jakarta bounding box. Outputs GeoJSON to data/raw/poi/.
"""

import json
import logging
from pathlib import Path

import overpy
import yaml

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "config" / "settings.yaml"


def load_config() -> dict:
    """Load project settings from YAML config."""
    with open(CONFIG) as f:
        return yaml.safe_load(f)


def build_overpass_query(bbox: dict, poi_categories: dict) -> str:
    """Build an Overpass QL query for all POI categories within a bounding box."""
    south, west = bbox["min_lat"], bbox["min_lng"]
    north, east = bbox["max_lat"], bbox["max_lng"]
    bbox_str = f"{south},{west},{north},{east}"

    statements = []
    for category, info in poi_categories.items():
        tags = info["osm_tags"]
        for key, value in tags.items():
            statements.append(f'  node["{key}"="{value}"]({bbox_str});')
            statements.append(f'  way["{key}"="{value}"]({bbox_str});')

    query = "[out:json][timeout:120];\n(\n"
    query += "\n".join(statements)
    query += "\n);\nout center;"
    return query


def parse_results(result: overpy.Result, poi_categories: dict) -> list[dict]:
    """Convert Overpass results to GeoJSON features."""
    features = []

    tag_to_category = {}
    for category, info in poi_categories.items():
        for key, value in info["osm_tags"].items():
            tag_to_category[(key, value)] = category

    for node in result.nodes:
        cat = classify_element(node.tags, tag_to_category)
        if cat:
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [float(node.lon), float(node.lat)]},
                "properties": {"name": node.tags.get("name", ""), "category": cat, "osm_id": node.id},
            })

    for way in result.ways:
        cat = classify_element(way.tags, tag_to_category)
        if cat and way.center_lat is not None:
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [float(way.center_lon), float(way.center_lat)]},
                "properties": {"name": way.tags.get("name", ""), "category": cat, "osm_id": way.id},
            })

    return features


def classify_element(tags: dict, tag_to_category: dict) -> str | None:
    """Match OSM tags to a POI category."""
    for (key, value), category in tag_to_category.items():
        if tags.get(key) == value:
            return category
    return None


def main() -> None:
    """Download POIs for Jakarta and save as GeoJSON."""
    config = load_config()
    city = config["project"]["active_city"]
    bbox = config["analysis"][f"{city}_bbox"]
    poi_categories = config["poi_categories"]

    output_dir = ROOT / config["paths"]["data_raw"] / "poi"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{city}_poi.geojson"

    if output_path.exists():
        logger.info("Already exists: %s — skipping", output_path)
        return

    query = build_overpass_query(bbox, poi_categories)
    logger.info("Querying Overpass API for %s POIs...", city)

    api = overpy.Overpass()
    result = api.query(query)

    features = parse_results(result, poi_categories)
    geojson = {"type": "FeatureCollection", "features": features}

    with open(output_path, "w") as f:
        json.dump(geojson, f)

    logger.info("Saved %d POIs to %s", len(features), output_path)


if __name__ == "__main__":
    main()
