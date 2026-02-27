"""Download OpenStreetMap PBF extract for Jakarta from Geofabrik.

Downloads the Java island extract (includes Jakarta). The file is ~600MB.
Paths and URLs read from config/settings.yaml.
"""

import logging
from pathlib import Path

import requests
import yaml

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "config" / "settings.yaml"


def load_config() -> dict:
    """Load project settings from YAML config."""
    with open(CONFIG) as f:
        return yaml.safe_load(f)


def download_file(url: str, dest: Path) -> None:
    """Download a large file with progress logging."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    logger.info("Downloading %s → %s", url, dest)
    response = requests.get(url, stream=True, timeout=600)
    response.raise_for_status()

    total = int(response.headers.get("content-length", 0))
    downloaded = 0
    with open(dest, "wb") as f:
        for chunk in response.iter_content(chunk_size=65536):
            f.write(chunk)
            downloaded += len(chunk)
            if total > 0 and downloaded % (50 * 1024 * 1024) < 65536:
                pct = downloaded / total * 100
                logger.info("  %.0f%% (%.0f MB)", pct, downloaded / 1e6)

    logger.info("Saved %s (%.1f MB)", dest.name, dest.stat().st_size / 1e6)


def main() -> None:
    """Download OSM PBF for the active city."""
    config = load_config()
    city = config["project"]["active_city"]

    osm_path = ROOT / config["osm"][city]
    url = config["osm"]["geofabrik"][city]

    if osm_path.exists():
        logger.info("Already exists: %s — skipping", osm_path)
        return

    download_file(url, osm_path)
    logger.info("OSM download complete for %s.", city)


if __name__ == "__main__":
    main()
