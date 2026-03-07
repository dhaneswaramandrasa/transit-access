/**
 * Generate transit route LineStrings from transit stop data.
 * Groups stops by `line` field and connects them using principal-axis
 * sorting for smooth, non-looping geographic routes.
 * Routes with large gaps are split into separate segments.
 * Output: jakarta_transit_routes.geojson
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const stopsPath = join(
  __dirname,
  "..",
  "public",
  "data",
  "jakarta_transit_stops.geojson"
);
const outputPath = join(
  __dirname,
  "..",
  "public",
  "data",
  "jakarta_transit_routes.geojson"
);

// Read transit stops
const stopsData = JSON.parse(readFileSync(stopsPath, "utf-8"));

// Group stops by line
const lineGroups = {};
for (const feature of stopsData.features) {
  const { line, type } = feature.properties;
  if (!lineGroups[line]) {
    lineGroups[line] = { type, stops: [] };
  }
  lineGroups[line].stops.push(feature.geometry.coordinates);
}

/**
 * Sort stops by projecting onto their principal axis (PCA-like).
 * This avoids the looping/backtracking problem of nearest-neighbor.
 * For transit lines which follow corridors, sorting along the dominant
 * direction produces correct, monotonic ordering.
 */
function sortByPrincipalAxis(coords) {
  if (coords.length <= 2) return coords;

  // Compute centroid
  let cx = 0, cy = 0;
  for (const [x, y] of coords) { cx += x; cy += y; }
  cx /= coords.length;
  cy /= coords.length;

  // Compute covariance matrix elements
  let cxx = 0, cxy = 0, cyy = 0;
  for (const [x, y] of coords) {
    const dx = x - cx, dy = y - cy;
    cxx += dx * dx;
    cxy += dx * dy;
    cyy += dy * dy;
  }

  // Principal eigenvector via 2x2 symmetric eigendecomposition
  const diff = cxx - cyy;
  const angle = 0.5 * Math.atan2(2 * cxy, diff);
  const ax = Math.cos(angle);
  const ay = Math.sin(angle);

  // Project each point onto principal axis and sort
  const indexed = coords.map((c, i) => ({
    coord: c,
    proj: (c[0] - cx) * ax + (c[1] - cy) * ay,
    idx: i,
  }));
  indexed.sort((a, b) => a.proj - b.proj);

  return indexed.map((item) => item.coord);
}

/**
 * Split a sorted route into segments if consecutive stops are
 * too far apart (gap > 3× median spacing). This prevents lines
 * jumping across the map between unrelated stop clusters.
 */
function splitOnGaps(coords, gapMultiplier = 3.5) {
  if (coords.length <= 2) return [coords];

  // Compute distances between consecutive points
  const dists = [];
  for (let i = 1; i < coords.length; i++) {
    const dx = coords[i][0] - coords[i - 1][0];
    const dy = coords[i][1] - coords[i - 1][1];
    dists.push(Math.sqrt(dx * dx + dy * dy));
  }

  // Median distance
  const sorted = [...dists].sort((a, b) => a - b);
  const medianDist = sorted[Math.floor(sorted.length / 2)];
  const threshold = medianDist * gapMultiplier;

  // Split at gaps
  const segments = [];
  let current = [coords[0]];

  for (let i = 0; i < dists.length; i++) {
    if (dists[i] > threshold && current.length >= 2) {
      segments.push(current);
      current = [coords[i + 1]];
    } else {
      current.push(coords[i + 1]);
    }
  }

  if (current.length >= 2) {
    segments.push(current);
  }

  return segments;
}

// Create LineString features for each line with 2+ stops
const features = [];
for (const [line, data] of Object.entries(lineGroups)) {
  if (data.stops.length < 2) continue;

  // Sort stops along principal geographic axis
  const sortedStops = sortByPrincipalAxis(data.stops);

  // Split at large gaps to avoid discontinuous jumps
  const segments = splitOnGaps(sortedStops);

  for (let i = 0; i < segments.length; i++) {
    features.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: segments[i],
      },
      properties: {
        line: segments.length > 1 ? `${line} (${i + 1})` : line,
        type: data.type,
        stop_count: segments[i].length,
      },
    });
  }
}

const geojson = { type: "FeatureCollection", features };
writeFileSync(outputPath, JSON.stringify(geojson));

console.log(
  `Generated ${features.length} transit route segments from ${stopsData.features.length} stops`
);

// Summary by type
const typeCounts = {};
for (const f of features) {
  const t = f.properties.type;
  typeCounts[t] = (typeCounts[t] || 0) + 1;
}
console.log("Routes by type:", typeCounts);
