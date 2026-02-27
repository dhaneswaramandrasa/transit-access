"""Compute weighted accessibility scores per H3 hex.

Reads isochrone POI counts, applies category weights, normalises
to 0–100 scale, computes percentile ranks, and outputs the final
scored GeoJSON with H3 polygon geometries.
"""

import json
import logging
from pathlib import Path

import geopandas as gpd
import h3
import numpy as np
import pandas as pd
import yaml
from shapely.geometry import Polygon

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "config" / "settings.yaml"


def load_config() -> dict:
    """Load project settings from YAML config."""
    with open(CONFIG) as f:
        return yaml.safe_load(f)


def h3_to_polygon(h3_index: str) -> Polygon:
    """Convert an H3 index to a Shapely polygon."""
    boundary = h3.h3_to_geo_boundary(h3_index, geo_json=True)
    return Polygon(boundary)


def compute_weighted_score(
    row: pd.Series, threshold: int, poi_categories: dict
) -> float:
    """Compute the weighted POI score for a hex at a given threshold."""
    score = 0.0
    for category, info in poi_categories.items():
        col = f"{category}_{threshold}min"
        count = row.get(col, 0)
        score += count * info["weight"]
    return score


def minmax_normalize(series: pd.Series, out_min: float = 0, out_max: float = 100) -> pd.Series:
    """Min-max normalise a series to [out_min, out_max]."""
    s_min, s_max = series.min(), series.max()
    if s_max == s_min:
        return pd.Series(out_min, index=series.index)
    return (series - s_min) / (s_max - s_min) * (out_max - out_min) + out_min


def main() -> None:
    """Score all hexes and produce final GeoJSON."""
    config = load_config()
    city = config["project"]["active_city"]
    thresholds = config["analysis"]["isochrone_thresholds_minutes"]
    poi_categories = config["poi_categories"]
    out_scale = config["scoring"]["output_scale"]

    # Load isochrone results
    iso_dir = ROOT / config["paths"]["data_processed"] / "isochrones"
    parquet_path = iso_dir / f"{city}_h3_isochrones.parquet"

    if not parquet_path.exists():
        logger.error("Isochrone file not found: %s — run compute_isochrones.py first", parquet_path)
        return

    df = pd.read_parquet(parquet_path)
    logger.info("Loaded %d hex records from %s", len(df), parquet_path.name)

    # Compute weighted scores for each threshold
    for threshold in thresholds:
        col = f"score_{threshold}min"
        raw_scores = df.apply(
            lambda row: compute_weighted_score(row, threshold, poi_categories), axis=1
        )
        df[col] = minmax_normalize(raw_scores, out_scale[0], out_scale[1]).round(1)

    # Composite score: average of threshold scores
    score_cols = [f"score_{t}min" for t in thresholds]
    df["composite_score"] = df[score_cols].mean(axis=1).round(1)

    # Percentile rank
    df["percentile_rank"] = df["composite_score"].rank(pct=True).mul(100).round(1)

    # Build GeoJSON with H3 polygon geometries
    logger.info("Building polygon geometries for %d hexes...", len(df))
    df["geometry"] = df["h3_index"].apply(h3_to_polygon)
    gdf = gpd.GeoDataFrame(df, geometry="geometry", crs="EPSG:4326")

    # Assemble POI count fields for the web app
    for category in poi_categories:
        for threshold in thresholds:
            col = f"{category}_{threshold}min"
            if col not in gdf.columns:
                gdf[col] = 0

    # Save scored GeoJSON
    output_path = iso_dir / f"{city}_h3_scores.geojson"
    gdf.to_file(output_path, driver="GeoJSON")
    logger.info("Saved scored GeoJSON: %s (%d features)", output_path, len(gdf))

    # Log summary stats
    avg = df["composite_score"].mean()
    median = df["composite_score"].median()
    logger.info("Jakarta scores — mean: %.1f, median: %.1f", avg, median)


if __name__ == "__main__":
    main()
