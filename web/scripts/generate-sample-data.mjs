/**
 * Generate sample jakarta_h3_scores.geojson with equity scoring framework.
 *
 * Covers Jabodetabek (Jakarta + Bogor + Depok + Tangerang + Bekasi).
 * Two-pass scoring:
 *   Pass 1: Generate raw variables (demand, supply, socioeconomic)
 *   Pass 2: Min-max normalize → compute Need/Accessibility/Gap → classify quadrant
 *
 * Usage: node scripts/generate-sample-data.mjs
 */

import h3 from "h3-js";
const { polygonToCells, cellToLatLng, cellToBoundary } = h3;
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const H3_RESOLUTION = 8;

// Jabodetabek bounding box
const BBOX = {
  min_lat: -6.65,
  min_lng: 106.48,
  max_lat: -6.08,
  max_lng: 107.15,
};

// Major transit hubs with capacity weights
const TRANSIT_HUBS = [
  // MRT Jakarta
  { lat: -6.1921, lng: 106.8228, weight: 1.0, capacity: 0.95 },  // Bundaran HI
  { lat: -6.2443, lng: 106.7981, weight: 0.95, capacity: 0.9 },  // Blok M
  { lat: -6.2005, lng: 106.8230, weight: 0.9, capacity: 0.85 },  // Dukuh Atas
  { lat: -6.2893, lng: 106.7743, weight: 0.8, capacity: 0.85 },  // Lebak Bulus
  // KRL major hubs
  { lat: -6.2099, lng: 106.8501, weight: 0.85, capacity: 0.8 },  // Manggarai
  { lat: -6.1375, lng: 106.8126, weight: 0.8, capacity: 0.75 },  // Jakarta Kota
  { lat: -6.1860, lng: 106.8108, weight: 0.75, capacity: 0.7 },  // Tanah Abang
  { lat: -6.1749, lng: 106.8445, weight: 0.7, capacity: 0.65 },  // Pasar Senen
  { lat: -6.2150, lng: 106.8703, weight: 0.7, capacity: 0.65 },  // Jatinegara
  // Suburban KRL
  { lat: -6.3928, lng: 106.8178, weight: 0.5, capacity: 0.55 },  // Depok
  { lat: -6.2362, lng: 106.9984, weight: 0.5, capacity: 0.55 },  // Bekasi
  { lat: -6.1770, lng: 106.6310, weight: 0.45, capacity: 0.5 },  // Tangerang
  { lat: -6.3203, lng: 106.6677, weight: 0.4, capacity: 0.45 },  // Serpong/BSD
  { lat: -6.5950, lng: 106.7870, weight: 0.35, capacity: 0.4 },  // Bogor
  // LRT Jabodebek
  { lat: -6.2454, lng: 106.8616, weight: 0.65, capacity: 0.7 },  // Cawang LRT
  { lat: -6.2350, lng: 106.9700, weight: 0.55, capacity: 0.6 },  // Bekasi LRT
  // TransJakarta major corridors
  { lat: -6.1665, lng: 106.8158, weight: 0.6, capacity: 0.5 },   // Harmoni
  { lat: -6.1573, lng: 106.7052, weight: 0.4, capacity: 0.4 },   // Kalideres
  { lat: -6.1250, lng: 106.7962, weight: 0.4, capacity: 0.35 },  // Pluit
  // Secondary centers
  { lat: -6.17, lng: 106.79, weight: 0.55, capacity: 0.5 },      // Grogol
  { lat: -6.23, lng: 106.93, weight: 0.45, capacity: 0.4 },      // East Jakarta
  { lat: -6.30, lng: 106.85, weight: 0.35, capacity: 0.3 },      // South periphery
  { lat: -6.16, lng: 106.89, weight: 0.5, capacity: 0.45 },      // Kelapa Gading
];

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Seeded random from h3 index for reproducibility
function seededRandom(h3Index) {
  let hash = 0;
  for (let i = 0; i < h3Index.length; i++) {
    hash = ((hash << 5) - hash) + h3Index.charCodeAt(i);
    hash |= 0;
  }
  return () => {
    hash = (hash * 1664525 + 1013904223) | 0;
    return (hash >>> 0) / 4294967296;
  };
}

// Compute distance to nearest transit hub
function distToNearestTransit(lat, lng) {
  let minDist = Infinity;
  for (const hub of TRANSIT_HUBS) {
    const dist = haversineKm(lat, lng, hub.lat, hub.lng);
    if (dist < minDist) minDist = dist;
  }
  return minDist;
}

// Compute transit capacity weight (weighted average of nearby hubs)
function transitCapacityWeight(lat, lng) {
  let totalWeight = 0;
  let totalCapacity = 0;
  for (const hub of TRANSIT_HUBS) {
    const dist = haversineKm(lat, lng, hub.lat, hub.lng);
    const influence = Math.exp(-dist / 4);
    totalWeight += influence;
    totalCapacity += hub.capacity * influence;
  }
  return totalWeight > 0.01 ? totalCapacity / totalWeight : 0;
}

// Compute base accessibility score (legacy, for composite_score)
function computeBaseScore(lat, lng) {
  let maxInfluence = 0;
  for (const hub of TRANSIT_HUBS) {
    const dist = haversineKm(lat, lng, hub.lat, hub.lng);
    const influence = hub.weight * Math.exp(-dist / 5);
    maxInfluence = Math.max(maxInfluence, influence);
  }
  return maxInfluence * 100;
}

function generatePOICounts(score, threshold) {
  const factor = threshold === 60 ? 1.8 : 1.0;
  const scaledScore = (score / 100) * factor;
  return {
    hospital: Math.round(scaledScore * (2 + Math.random() * 3)),
    clinic: Math.round(scaledScore * (3 + Math.random() * 5)),
    market: Math.round(scaledScore * (2 + Math.random() * 4)),
    supermarket: Math.round(scaledScore * (1 + Math.random() * 3)),
    school: Math.round(scaledScore * (4 + Math.random() * 8)),
    park: Math.round(scaledScore * (1 + Math.random() * 2)),
  };
}

// Min-max normalize an array to 0-100
function minMaxNormalize(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((v) => ((v - min) / range) * 100);
}

// ===== Generate H3 hexes =====
console.log("Generating H3 grid over Jabodetabek...");

const polygon = [
  [BBOX.min_lng, BBOX.min_lat],
  [BBOX.max_lng, BBOX.min_lat],
  [BBOX.max_lng, BBOX.max_lat],
  [BBOX.min_lng, BBOX.max_lat],
  [BBOX.min_lng, BBOX.min_lat],
];

const hexIds = polygonToCells([polygon], H3_RESOLUTION, true);
console.log(`Generated ${hexIds.length} hexes at resolution ${H3_RESOLUTION}`);

// ===== PASS 1: Generate raw variables =====
console.log("Pass 1: Generating raw variables...");

const rawFeatures = [];
for (const h3Index of hexIds) {
  const [lat, lng] = cellToLatLng(h3Index);
  const boundary = cellToBoundary(h3Index, true);
  const ring = [...boundary, boundary[0]];
  const rng = seededRandom(h3Index);

  // Distance to Jakarta CBD center (affects urbanization level)
  const distToCBD = haversineKm(lat, lng, -6.195, 106.845);
  const urbanFactor = Math.exp(-distToCBD / 12); // 0-1, higher = more urban

  // --- Demand-side variables ---
  // Population: denser near urban cores
  const basePop = 5000 + urbanFactor * 15000 + rng() * 3000;
  const pop_total = Math.round(basePop);

  // Dependent population (children 0-14 + elderly 65+): higher in suburban kampung
  const pct_dependent = 20 + (1 - urbanFactor) * 20 + (rng() - 0.5) * 10;

  // Zero-vehicle households: higher in dense urban kampung, lower in car suburbs
  const pct_zero_vehicle = urbanFactor > 0.5
    ? 30 + rng() * 25 // urban: more transit-dependent
    : 10 + rng() * 20; // suburban: more cars

  // --- Socioeconomic ---
  // NJOP (land value): higher near CBD and commercial corridors
  const baseNJOP = (500000 + urbanFactor * 4500000) * (0.7 + rng() * 0.6);
  const avg_njop = Math.round(baseNJOP);

  // Informal settlement: more likely in dense low-NJOP areas
  const is_informal_settlement = avg_njop < 1500000 && pop_total > 12000 && rng() > 0.6;

  // --- First-mile supply ---
  const dist_to_transit = distToNearestTransit(lat, lng);
  const is_walkable_transit = dist_to_transit <= 0.8;
  const transit_capacity = transitCapacityWeight(lat, lng);

  // --- Destination accessibility ---
  const baseScore = computeBaseScore(lat, lng);
  const local_poi_density = Math.round((baseScore / 100) * 30 + rng() * 10);
  const transit_shed_poi_count = Math.round((baseScore / 100) * 80 + rng() * 20);

  // Legacy scoring
  const noise = (rng() - 0.5) * 15;
  const score30 = Math.max(0, Math.min(100, baseScore + noise));
  const score60 = Math.min(100, score30 * (1.3 + rng() * 0.3));
  const composite = Math.round(((score30 + score60) / 2) * 10) / 10;

  const poi30 = generatePOICounts(score30, 30);
  const poi60 = generatePOICounts(score60, 60);

  rawFeatures.push({
    h3Index,
    ring,
    // Raw variables for normalization
    pop_total,
    pct_dependent: Math.max(5, Math.min(60, pct_dependent)),
    pct_zero_vehicle: Math.max(5, Math.min(70, pct_zero_vehicle)),
    avg_njop,
    is_informal_settlement,
    dist_to_transit: Math.round(dist_to_transit * 100) / 100,
    is_walkable_transit,
    transit_capacity_weight: Math.round(transit_capacity * 1000) / 1000,
    local_poi_density,
    transit_shed_poi_count,
    // Legacy
    composite_score: composite,
    score_30min: Math.round(score30 * 10) / 10,
    score_60min: Math.round(score60 * 10) / 10,
    poi30,
    poi60,
  });
}

// ===== PASS 2: Normalize and compute scores =====
console.log("Pass 2: Normalizing and computing equity scores...");

// Collect raw arrays
const popArr = rawFeatures.map((f) => f.pop_total);
const depArr = rawFeatures.map((f) => f.pct_dependent);
const zeroVehArr = rawFeatures.map((f) => f.pct_zero_vehicle);
const njopArr = rawFeatures.map((f) => f.avg_njop);
const distArr = rawFeatures.map((f) => f.dist_to_transit);
const capArr = rawFeatures.map((f) => f.transit_capacity_weight);
const poiDensArr = rawFeatures.map((f) => f.local_poi_density);
const shedArr = rawFeatures.map((f) => f.transit_shed_poi_count);

// Normalize each to 0-100
const normPop = minMaxNormalize(popArr);
const normDep = minMaxNormalize(depArr);
const normZeroVeh = minMaxNormalize(zeroVehArr);
// Inverse NJOP (lower value = higher need)
const maxNJOP = Math.max(...njopArr);
const normNJOPinv = njopArr.map((v) => ((maxNJOP - v) / maxNJOP) * 100);
// Inverse distance (closer = better access)
const maxDist = Math.max(...distArr);
const normDistInv = distArr.map((v) => ((maxDist - v) / maxDist) * 100);
const normCap = minMaxNormalize(capArr);
const normPOIDens = minMaxNormalize(poiDensArr);
const normShed = minMaxNormalize(shedArr);

// Compute Transit Need Score and Transit Accessibility Score
const needScores = [];
const accessScores = [];

for (let i = 0; i < rawFeatures.length; i++) {
  // Transit Need Score (demand + vulnerability + socioeconomic)
  // Weights: pop 0.25, dependent 0.25, zero_vehicle 0.25, inverse_njop 0.25
  const need =
    normPop[i] * 0.25 +
    normDep[i] * 0.25 +
    normZeroVeh[i] * 0.25 +
    normNJOPinv[i] * 0.25;

  // Transit Accessibility Score (supply + destination)
  // walkable_transit boolean contributes, dist inverse, capacity, POI density, shed count
  const walkBonus = rawFeatures[i].is_walkable_transit ? 20 : 0;
  const access =
    walkBonus * 0.15 +
    normDistInv[i] * 0.25 +
    normCap[i] * 0.25 +
    normPOIDens[i] * 0.2 +
    normShed[i] * 0.15;

  needScores.push(Math.round(need * 10) / 10);
  accessScores.push(Math.round(access * 10) / 10);
}

// Compute median for quadrant classification
const sortedNeed = [...needScores].sort((a, b) => a - b);
const sortedAccess = [...accessScores].sort((a, b) => a - b);
const medianNeed = sortedNeed[Math.floor(sortedNeed.length / 2)];
const medianAccess = sortedAccess[Math.floor(sortedAccess.length / 2)];

console.log(`Median Need: ${medianNeed}, Median Access: ${medianAccess}`);

// Build final features
const features = [];
for (let i = 0; i < rawFeatures.length; i++) {
  const f = rawFeatures[i];
  const need = needScores[i];
  const access = accessScores[i];
  const gap = Math.round((need - access) * 10) / 10;

  // Classify quadrant based on median splits
  let quadrant;
  if (need >= medianNeed && access < medianAccess) {
    quadrant = "transit-desert";  // high need, low access
  } else if (need >= medianNeed && access >= medianAccess) {
    quadrant = "transit-ideal";   // high need, high access
  } else if (need < medianNeed && access >= medianAccess) {
    quadrant = "over-served";     // low need, high access
  } else {
    quadrant = "car-suburb";      // low need, low access
  }

  features.push({
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [f.ring],
    },
    properties: {
      h3_index: f.h3Index,
      // Legacy scoring
      composite_score: f.composite_score,
      score_30min: f.score_30min,
      score_60min: f.score_60min,
      percentile_rank: 0, // computed below
      // POI counts
      hospital_30min: f.poi30.hospital,
      clinic_30min: f.poi30.clinic,
      market_30min: f.poi30.market,
      supermarket_30min: f.poi30.supermarket,
      school_30min: f.poi30.school,
      park_30min: f.poi30.park,
      hospital_60min: f.poi60.hospital,
      clinic_60min: f.poi60.clinic,
      market_60min: f.poi60.market,
      supermarket_60min: f.poi60.supermarket,
      school_60min: f.poi60.school,
      park_60min: f.poi60.park,
      // Demand-side
      pop_total: f.pop_total,
      pct_dependent: Math.round(f.pct_dependent * 10) / 10,
      pct_zero_vehicle: Math.round(f.pct_zero_vehicle * 10) / 10,
      // Socioeconomic
      avg_njop: f.avg_njop,
      is_informal_settlement: f.is_informal_settlement,
      // First-mile supply
      dist_to_transit: f.dist_to_transit,
      is_walkable_transit: f.is_walkable_transit,
      transit_capacity_weight: f.transit_capacity_weight,
      // Destination accessibility
      local_poi_density: f.local_poi_density,
      transit_shed_poi_count: f.transit_shed_poi_count,
      // Equity scores
      transit_need_score: need,
      transit_accessibility_score: access,
      equity_gap: gap,
      quadrant,
    },
  });
}

// Compute percentile ranks (based on composite_score)
const sorted = features
  .map((f, i) => ({ score: f.properties.composite_score, index: i }))
  .sort((a, b) => a.score - b.score);

sorted.forEach((item, rank) => {
  features[item.index].properties.percentile_rank =
    Math.round(((rank + 1) / features.length) * 1000) / 10;
});

const geojson = { type: "FeatureCollection", features };

// Write output
const outputDir = join(__dirname, "..", "public", "data");
mkdirSync(outputDir, { recursive: true });
const outputPath = join(outputDir, "jakarta_h3_scores.geojson");
writeFileSync(outputPath, JSON.stringify(geojson));

const sizeMB = (JSON.stringify(geojson).length / 1e6).toFixed(1);
console.log(`Saved ${features.length} features to ${outputPath} (${sizeMB} MB)`);

// Stats
const scores = features.map((f) => f.properties.composite_score);
const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
const sorted2 = [...scores].sort((a, b) => a - b);
const med = sorted2[Math.floor(sorted2.length / 2)];

const quadrantCounts = { "transit-desert": 0, "transit-ideal": 0, "over-served": 0, "car-suburb": 0 };
for (const f of features) quadrantCounts[f.properties.quadrant]++;

console.log(`Score stats — mean: ${avg.toFixed(1)}, median: ${med.toFixed(1)}`);
console.log("Quadrant distribution:", quadrantCounts);
console.log(`Need stats — mean: ${(needScores.reduce((a, b) => a + b, 0) / needScores.length).toFixed(1)}, median: ${medianNeed}`);
console.log(`Access stats — mean: ${(accessScores.reduce((a, b) => a + b, 0) / accessScores.length).toFixed(1)}, median: ${medianAccess}`);
