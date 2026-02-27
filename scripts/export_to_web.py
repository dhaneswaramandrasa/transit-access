"""Export scored GeoJSON to the web app's public data directory.

Copies jakarta_h3_scores.geojson from data/processed/isochrones/
to web/public/data/ for serving as a static asset.
"""

import logging
import shutil
from pathlib import Path

import yaml

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config" / "settings.yaml"


def load_config() -> dict:
    """Load project settings from YAML config."""
    with open(CONFIG) as f:
        return yaml.safe_load(f)


def main() -> None:
    """Copy scored GeoJSON to web public directory."""
    config = load_config()
    city = config["project"]["active_city"]

    source = ROOT / config["paths"]["data_processed"] / "isochrones" / f"{city}_h3_scores.geojson"
    dest_dir = ROOT / config["paths"]["web_data"]
    dest = dest_dir / f"{city}_h3_scores.geojson"

    if not source.exists():
        logger.error("Source not found: %s", source)
        logger.error("Run score_accessibility.py first.")
        return

    dest_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, dest)

    size_mb = dest.stat().st_size / 1e6
    logger.info("Exported %s → %s (%.1f MB)", source.name, dest, size_mb)


if __name__ == "__main__":
    main()
