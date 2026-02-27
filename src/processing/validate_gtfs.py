"""Validate GTFS feeds using gtfs-kit.

Checks required files, field types, and date coverage.
Logs warnings/errors for each feed.
"""

import logging
from pathlib import Path

import gtfs_kit as gk
import yaml

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "config" / "settings.yaml"


def load_config() -> dict:
    """Load project settings from YAML config."""
    with open(CONFIG) as f:
        return yaml.safe_load(f)


def validate_feed(path: Path) -> bool:
    """Validate a single GTFS zip and return True if valid."""
    logger.info("Validating %s", path.name)

    if not path.exists():
        logger.error("  File not found: %s", path)
        return False

    feed = gk.read_feed(str(path), dist_units="km")
    problems = feed.validate()

    errors = problems[problems["type"] == "error"]
    warnings = problems[problems["type"] == "warning"]

    if len(errors) > 0:
        logger.error("  %d errors found:", len(errors))
        for _, row in errors.iterrows():
            logger.error("    [%s] %s", row.get("table", ""), row.get("message", ""))

    if len(warnings) > 0:
        logger.warning("  %d warnings:", len(warnings))
        for _, row in warnings.head(10).iterrows():
            logger.warning("    [%s] %s", row.get("table", ""), row.get("message", ""))

    # Log basic stats
    n_routes = len(feed.routes) if feed.routes is not None else 0
    n_stops = len(feed.stops) if feed.stops is not None else 0
    n_trips = len(feed.trips) if feed.trips is not None else 0
    logger.info("  Routes: %d | Stops: %d | Trips: %d", n_routes, n_stops, n_trips)

    return len(errors) == 0


def main() -> None:
    """Validate all GTFS feeds for the active city."""
    config = load_config()
    city = config["project"]["active_city"]
    gtfs_paths = config["gtfs"][city]

    all_valid = True
    for agency, rel_path in gtfs_paths.items():
        path = ROOT / rel_path
        valid = validate_feed(path)
        if not valid:
            all_valid = False

    if all_valid:
        logger.info("All GTFS feeds valid.")
    else:
        logger.error("Some feeds have errors — review before proceeding.")


if __name__ == "__main__":
    main()
