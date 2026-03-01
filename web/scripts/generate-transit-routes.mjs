/**
 * Generate transit route LineStrings from transit stop data.
 * Groups stops by `line` field and connects them sequentially.
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

// Create LineString features for each line with 2+ stops
const features = [];
for (const [line, data] of Object.entries(lineGroups)) {
  if (data.stops.length < 2) continue;

  features.push({
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: data.stops,
    },
    properties: {
      line,
      type: data.type,
      stop_count: data.stops.length,
    },
  });
}

const geojson = { type: "FeatureCollection", features };
writeFileSync(outputPath, JSON.stringify(geojson));

console.log(
  `Generated ${features.length} transit route lines from ${stopsData.features.length} stops`
);

// Summary by type
const typeCounts = {};
for (const f of features) {
  const t = f.properties.type;
  typeCounts[t] = (typeCounts[t] || 0) + 1;
}
console.log("Routes by type:", typeCounts);
