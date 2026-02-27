"""Generate static choropleth maps of accessibility scores.

Produces PNG maps for reports and figures using matplotlib + geopandas.
"""

import logging
from pathlib import Path

import geopandas as gpd
import matplotlib.pyplot as plt
import numpy as np
import yaml
from matplotlib.colors import Normalize
from matplotlib.cm import ScalarMappable

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "config" / "settings.yaml"


def load_config() -> dict:
    """Load project settings from YAML config."""
    with open(CONFIG) as f:
        return yaml.safe_load(f)


def plot_score_map(
    gdf: gpd.GeoDataFrame,
    score_col: str,
    title: str,
    output_path: Path,
    cmap: str = "RdYlGn",
) -> None:
    """Plot a choropleth map of hex scores and save to file."""
    fig, ax = plt.subplots(1, 1, figsize=(12, 10), facecolor="#0f1117")
    ax.set_facecolor("#0f1117")

    norm = Normalize(vmin=0, vmax=100)
    gdf.plot(
        column=score_col,
        ax=ax,
        cmap=cmap,
        norm=norm,
        linewidth=0.1,
        edgecolor="white",
        alpha=0.8,
    )

    sm = ScalarMappable(cmap=cmap, norm=norm)
    sm.set_array([])
    cbar = fig.colorbar(sm, ax=ax, fraction=0.03, pad=0.02)
    cbar.set_label("Accessibility Score (0–100)", color="white", fontsize=10)
    cbar.ax.tick_params(colors="white")

    ax.set_title(title, color="white", fontsize=14, pad=15)
    ax.axis("off")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_path, dpi=200, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    logger.info("Saved map: %s", output_path)


def main() -> None:
    """Generate maps for each threshold and composite score."""
    config = load_config()
    city = config["project"]["active_city"]
    thresholds = config["analysis"]["isochrone_thresholds_minutes"]

    iso_dir = ROOT / config["paths"]["data_processed"] / "isochrones"
    geojson_path = iso_dir / f"{city}_h3_scores.geojson"

    if not geojson_path.exists():
        logger.error("Scored GeoJSON not found: %s — run score_accessibility.py first", geojson_path)
        return

    gdf = gpd.read_file(geojson_path)
    logger.info("Loaded %d features from %s", len(gdf), geojson_path.name)

    maps_dir = ROOT / config["paths"]["outputs"] / "maps"

    # Map for each threshold
    for threshold in thresholds:
        col = f"score_{threshold}min"
        plot_score_map(
            gdf, col,
            f"{city.title()} Transit Accessibility — {threshold}-minute isochrone",
            maps_dir / f"{city}_score_{threshold}min.png",
        )

    # Composite map
    plot_score_map(
        gdf, "composite_score",
        f"{city.title()} Transit Accessibility — Composite Score",
        maps_dir / f"{city}_composite_score.png",
    )


if __name__ == "__main__":
    main()
