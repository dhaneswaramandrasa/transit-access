"""Download GTFS feeds for Jakarta transit agencies.

Downloads TransJakarta BRT, KRL Commuterline, and MRT Jakarta GTFS zips
from the Mobility Database. Paths read from config/settings.yaml.
"""

import logging
from pathlib import Path

import requests
import yaml

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "config" / "settings.yaml"

# Mobility Database direct download URLs (updated periodically)
GTFS_URLS = {
    "transjakarta": "https://github.com/nicholasgasior/transjakarta-gtfs/releases/latest/download/transjakarta.zip",
    "krl": "https://github.com/nicholasgasior/krl-gtfs/releases/latest/download/krl_commuterline.zip",
    "mrt": "https://github.com/nicholasgasior/mrt-jakarta-gtfs/releases/latest/download/mrt_jakarta.zip",
}


def load_config() -> dict:
    """Load project settings from YAML config."""
    with open(CONFIG) as f:
        return yaml.safe_load(f)


def download_file(url: str, dest: Path) -> None:
    """Download a file from URL to destination path."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    logger.info("Downloading %s → %s", url, dest)
    response = requests.get(url, stream=True, timeout=120)
    response.raise_for_status()
    with open(dest, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    logger.info("Saved %s (%.1f MB)", dest.name, dest.stat().st_size / 1e6)


def main() -> None:
    """Download all Jakarta GTFS feeds."""
    config = load_config()
    gtfs_paths = config["gtfs"]["jakarta"]

    for agency, rel_path in gtfs_paths.items():
        dest = ROOT / rel_path
        if dest.exists():
            logger.info("Already exists: %s — skipping", dest)
            continue

        url = GTFS_URLS.get(agency)
        if not url:
            logger.warning("No download URL configured for %s — skip", agency)
            continue

        download_file(url, dest)

    logger.info("GTFS download complete.")


if __name__ == "__main__":
    main()
