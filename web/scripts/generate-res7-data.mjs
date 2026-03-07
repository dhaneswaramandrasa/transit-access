/**
 * Generate res-7 aggregated hex data from res-8 scores.
 * Groups res-8 hexes by their parent res-7 cell.
 * Scoring is INDEPENDENTLY normalized across res-7 hexes
 * (different from res-8, kelurahan, or kecamatan normalization).
 *
 * Output: jakarta_h3_scores_res7.geojson
 *
 * Usage: node scripts/generate-res7-data.mjs
 */

import h3 from "h3-js";
const { cellToParent, cellToBoundary } = h3;
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const inputPath = join(__dirname, "..", "public", "data", "jakarta_h3_scores.geojson");
const outputPath = join(__dirname, "..", "public", "data", "jakarta_h3_scores_res7.geojson");

function minMaxNormalize(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 50);
  return values.map((v) => ((v - min) / (max - min)) * 100);
}

function median(arr) {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const res8Data = JSON.parse(readFileSync(inputPath, "utf-8"));
console.log(`Read ${res8Data.features.length} res-8 hexes`);

// Group by parent res-7 cell
const groups = {};
for (const feature of res8Data.features) {
  const h3_8 = feature.properties.h3_index;
  if (!h3_8) continue;

  const h3_7 = cellToParent(h3_8, 7);
  if (!groups[h3_7]) {
    groups[h3_7] = [];
  }
  groups[h3_7].push(feature.properties);
}

console.log(`Grouped into ${Object.keys(groups).length} res-7 hexes`);

// POI count fields to average
const POI_FIELDS = [
  "hospital_30min", "hospital_60min", "clinic_30min", "clinic_60min",
  "market_30min", "market_60min", "supermarket_30min", "supermarket_60min",
  "school_30min", "school_60min", "park_30min", "park_60min",
];

// ── Step 1: Aggregate raw values per res-7 hex ──
const rawValues = [];

for (const [h3_7, children] of Object.entries(groups)) {
  const n = children.length;

  const raw = {
    h3_7,
    // Sum population (res-7 covers ~7x area)
    pop_total: children.reduce((s, c) => s + (c.pop_total ?? 0), 0),
    // Average percentages/rates
    pct_dependent: children.reduce((s, c) => s + (c.pct_dependent ?? 0), 0) / n,
    pct_zero_vehicle: children.reduce((s, c) => s + (c.pct_zero_vehicle ?? 0), 0) / n,
    avg_njop: children.reduce((s, c) => s + (c.avg_njop ?? 0), 0) / n,
    dist_to_transit: children.reduce((s, c) => s + (c.dist_to_transit ?? 999), 0) / n,
    transit_capacity_weight: children.reduce((s, c) => s + (c.transit_capacity_weight ?? 0), 0) / n,
    local_poi_density: children.reduce((s, c) => s + (c.local_poi_density ?? 0), 0) / n,
    transit_shed_poi_count: children.reduce((s, c) => s + (c.transit_shed_poi_count ?? 0), 0) / n,
    is_walkable_transit: children.filter((c) => c.is_walkable_transit).length > n / 2,
    is_informal_settlement: children.filter((c) => c.is_informal_settlement).length > n / 2,
    // Keep legacy scores as averages for backwards compat
    composite_score_legacy: children.reduce((s, c) => s + (c.composite_score ?? 0), 0) / n,
    score_30min: children.reduce((s, c) => s + (c.score_30min ?? 0), 0) / n,
    score_60min: children.reduce((s, c) => s + (c.score_60min ?? 0), 0) / n,
    children_count: n,
  };

  // Average POI counts
  for (const field of POI_FIELDS) {
    raw[field] = Math.round(children.reduce((s, c) => s + (c[field] ?? 0), 0) / n);
  }

  rawValues.push(raw);
}

// ── Step 2: Independent min-max normalization across res-7 hexes ──
console.log("Normalizing scores independently across res-7 hexes...");

const normPop = minMaxNormalize(rawValues.map((r) => r.pop_total));
const normDependent = minMaxNormalize(rawValues.map((r) => r.pct_dependent));
const normZeroVeh = minMaxNormalize(rawValues.map((r) => r.pct_zero_vehicle));

const njopArr = rawValues.map((r) => r.avg_njop);
const maxNjop = Math.max(...njopArr);
const normInvNjop = minMaxNormalize(njopArr.map((v) => maxNjop - v));

const distArr = rawValues.map((r) => r.dist_to_transit);
const maxDist = Math.max(...distArr);
const normDistInv = minMaxNormalize(distArr.map((v) => maxDist - v));
const normWalkable = rawValues.map((r) => r.is_walkable_transit ? 100 : 0);
const normCapacity = minMaxNormalize(rawValues.map((r) => r.transit_capacity_weight));
const normPoiDensity = minMaxNormalize(rawValues.map((r) => r.local_poi_density));
const normShedPoi = minMaxNormalize(rawValues.map((r) => r.transit_shed_poi_count));

const needScores = [];
const accessScores = [];

for (let i = 0; i < rawValues.length; i++) {
  const need = 0.25 * normPop[i] + 0.25 * normDependent[i] + 0.25 * normZeroVeh[i] + 0.25 * normInvNjop[i];
  const access = 0.15 * normWalkable[i] + 0.25 * normDistInv[i] + 0.25 * normCapacity[i] + 0.20 * normPoiDensity[i] + 0.15 * normShedPoi[i];
  needScores.push(Math.round(need * 10) / 10);
  accessScores.push(Math.round(access * 10) / 10);
}

const medNeed = median(needScores);
const medAccess = median(accessScores);
console.log(`Median need: ${medNeed.toFixed(1)}, Median access: ${medAccess.toFixed(1)}`);

const sortedAccess = [...accessScores].sort((a, b) => a - b);

// ── Step 3: Build output features ──
const features = [];

for (let i = 0; i < rawValues.length; i++) {
  const raw = rawValues[i];
  const need = needScores[i];
  const access = accessScores[i];
  const gap = Math.round((need - access) * 10) / 10;

  let quadrant;
  if (need >= medNeed && access < medAccess) quadrant = "transit-desert";
  else if (need >= medNeed && access >= medAccess) quadrant = "transit-ideal";
  else if (need < medNeed && access >= medAccess) quadrant = "over-served";
  else quadrant = "car-suburb";

  const composite = Math.round((0.4 * need + 0.6 * access) * 10) / 10;
  const pctRank = Math.round(
    (sortedAccess.filter((s) => s <= access).length / sortedAccess.length) * 1000
  ) / 10;

  // Generate res-7 polygon boundary
  const boundary = cellToBoundary(raw.h3_7);
  const coordinates = [
    [...boundary.map(([lat, lng]) => [lng, lat]),
     [boundary[0][1], boundary[0][0]]], // close ring
  ];

  const props = {
    h3_index: raw.h3_7,
    pop_total: raw.pop_total,
    pct_dependent: Math.round(raw.pct_dependent * 10) / 10,
    pct_zero_vehicle: Math.round(raw.pct_zero_vehicle * 10) / 10,
    avg_njop: Math.round(raw.avg_njop),
    dist_to_transit: Math.round(raw.dist_to_transit * 100) / 100,
    is_walkable_transit: raw.is_walkable_transit,
    is_informal_settlement: raw.is_informal_settlement,
    transit_capacity_weight: Math.round(raw.transit_capacity_weight * 10) / 10,
    local_poi_density: Math.round(raw.local_poi_density * 10) / 10,
    transit_shed_poi_count: Math.round(raw.transit_shed_poi_count * 10) / 10,
    transit_need_score: need,
    transit_accessibility_score: access,
    equity_gap: gap,
    quadrant,
    composite_score: composite,
    percentile_rank: pctRank,
    score_30min: Math.round(raw.score_30min * 100) / 100,
    score_60min: Math.round(raw.score_60min * 100) / 100,
  };

  // POI counts
  for (const field of POI_FIELDS) {
    props[field] = raw[field];
  }

  features.push({
    type: "Feature",
    geometry: { type: "Polygon", coordinates },
    properties: props,
  });
}

const geojson = { type: "FeatureCollection", features };

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(geojson));

const byQuadrant = {};
for (const f of features) {
  const q = f.properties.quadrant;
  byQuadrant[q] = (byQuadrant[q] || 0) + 1;
}

console.log(`Generated ${features.length} res-7 hexes → ${outputPath}`);
console.log(`Average children per res-7 hex: ${(res8Data.features.length / features.length).toFixed(1)}`);
console.log("By quadrant:", byQuadrant);
