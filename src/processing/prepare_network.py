"""Build r5py multimodal transport network.

Combines OSM road/pedestrian network with GTFS transit feeds
to create an r5py TransportNetwork for routing.
"""

import logging
from pathlib import Path

import r5py
import yaml

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "config" / "settings.yaml"


def load_config() -> dict:
    """Load project settings from YAML config."""
    with open(CONFIG) as f:
        return yaml.safe_load(f)


def main() -> None:
    """Build the transport network for the active city."""
    config = load_config()
    city = config["project"]["active_city"]

    osm_path = ROOT / config["osm"][city]
    gtfs_paths = [ROOT / p for p in config["gtfs"][city].values()]

    # Verify files exist
    if not osm_path.exists():
        logger.error("OSM file not found: %s", osm_path)
        logger.error("Run download_osm.py first.")
        return

    missing_gtfs = [p for p in gtfs_paths if not p.exists()]
    if missing_gtfs:
        logger.error("Missing GTFS files: %s", missing_gtfs)
        logger.error("Run download_gtfs.py first.")
        return

    logger.info("Building transport network for %s", city)
    logger.info("  OSM: %s", osm_path)
    for p in gtfs_paths:
        logger.info("  GTFS: %s", p.name)

    transport_network = r5py.TransportNetwork(
        osm_pbf=str(osm_path),
        gtfs=[str(p) for p in gtfs_paths],
    )

    output_dir = ROOT / config["paths"]["data_processed"] / "networks"
    output_dir.mkdir(parents=True, exist_ok=True)

    logger.info("Transport network built successfully.")
    logger.info("Network is cached by r5py in the OSM file directory.")
    logger.info("Ready for isochrone computation.")

    return transport_network


if __name__ == "__main__":
    main()
