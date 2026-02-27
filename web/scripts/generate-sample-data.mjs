/**
 * Generate sample jakarta_h3_scores.geojson with synthetic data.
 *
 * Uses h3-js to create all H3 res-8 hexes within the Jakarta bounding box,
 * assigns spatially coherent scores (higher near known transit corridors),
 * and generates realistic POI counts.
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

// Jakarta bounding box (from settings.yaml)
const BBOX = {
  min_lat: -6.3701,
  min_lng: 106.6889,
  max_lat: -6.0873,
  max_lng: 107.0024,
};

// Major transit corridor anchors (approximate lat/lng of key stations)
// Scores decay with distance from these points
const TRANSIT_HUBS = [
  { lat: -6.1754, lng: 106.827, weight: 1.0 },   // Bundaran HI / MRT central
  { lat: -6.2016, lng: 106.823, weight: 0.95 },   // Blok M
  { lat: -6.1853, lng: 106.843, weight: 0.9 },    // Sudirman / Thamrin
  { lat: -6.2115, lng: 106.845, weight: 0.85 },   // Manggarai KRL hub
  { lat: -6.1395, lng: 106.814, weight: 0.8 },    // Kota / Jakarta Kota station
  { lat: -6.2607, lng: 106.781, weight: 0.75 },   // Lebak Bulus MRT
  { lat: -6.1265, lng: 106.852, weight: 0.7 },    // Tanjung Priok
  { lat: -6.1864, lng: 106.729, weight: 0.65 },   // Tangerang corridor
  { lat: -6.2475, lng: 106.878, weight: 0.7 },    // Cawang BRT corridor
  { lat: -6.1875, lng: 106.9,   weight: 0.65 },   // Jatinegara
  { lat: -6.17,   lng: 106.79,  weight: 0.6 },    // Grogol
  { lat: -6.23,   lng: 106.93,  weight: 0.55 },   // East Jakarta
  { lat: -6.3,    lng: 106.85,  weight: 0.45 },   // South periphery
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

function computeBaseScore(lat, lng) {
  let maxInfluence = 0;
  for (const hub of TRANSIT_HUBS) {
    const dist = haversineKm(lat, lng, hub.lat, hub.lng);
    // Influence decays exponentially with distance
    const influence = hub.weight * Math.exp(-dist / 5);
    maxInfluence = Math.max(maxInfluence, influence);
  }
  // Scale to 0–100 with some noise
  const base = maxInfluence * 100;
  const noise = (Math.random() - 0.5) * 15;
  return Math.max(0, Math.min(100, base + noise));
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

// Generate H3 hexes
console.log("Generating H3 grid over Jakarta...");

const polygon = [
  [BBOX.min_lng, BBOX.min_lat],
  [BBOX.max_lng, BBOX.min_lat],
  [BBOX.max_lng, BBOX.max_lat],
  [BBOX.min_lng, BBOX.max_lat],
  [BBOX.min_lng, BBOX.min_lat],
];

const hexIds = polygonToCells(
  [polygon],
  H3_RESOLUTION,
  true // GeoJSON mode (lng, lat)
);

console.log(`Generated ${hexIds.length} hexes at resolution ${H3_RESOLUTION}`);

// Build features
const features = [];
for (const h3Index of hexIds) {
  const [lat, lng] = cellToLatLng(h3Index);
  const boundary = cellToBoundary(h3Index, true); // GeoJSON format [lng, lat]
  // Close the ring
  const ring = [...boundary, boundary[0]];

  const score30 = computeBaseScore(lat, lng);
  const score60 = Math.min(100, score30 * (1.3 + Math.random() * 0.3));
  const composite = Math.round(((score30 + score60) / 2) * 10) / 10;

  const poi30 = generatePOICounts(score30, 30);
  const poi60 = generatePOICounts(score60, 60);

  features.push({
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [ring],
    },
    properties: {
      h3_index: h3Index,
      composite_score: composite,
      score_30min: Math.round(score30 * 10) / 10,
      score_60min: Math.round(score60 * 10) / 10,
      percentile_rank: 0, // computed below
      hospital_30min: poi30.hospital,
      clinic_30min: poi30.clinic,
      market_30min: poi30.market,
      supermarket_30min: poi30.supermarket,
      school_30min: poi30.school,
      park_30min: poi30.park,
      hospital_60min: poi60.hospital,
      clinic_60min: poi60.clinic,
      market_60min: poi60.market,
      supermarket_60min: poi60.supermarket,
      school_60min: poi60.school,
      park_60min: poi60.park,
    },
  });
}

// Compute percentile ranks
const sorted = features
  .map((f, i) => ({ score: f.properties.composite_score, index: i }))
  .sort((a, b) => a.score - b.score);

sorted.forEach((item, rank) => {
  features[item.index].properties.percentile_rank =
    Math.round(((rank + 1) / features.length) * 1000) / 10;
});

const geojson = {
  type: "FeatureCollection",
  features,
};

// Write output
const outputDir = join(__dirname, "..", "public", "data");
mkdirSync(outputDir, { recursive: true });
const outputPath = join(outputDir, "jakarta_h3_scores.geojson");
writeFileSync(outputPath, JSON.stringify(geojson));

const sizeMB = (JSON.stringify(geojson).length / 1e6).toFixed(1);
console.log(`Saved ${features.length} features to ${outputPath} (${sizeMB} MB)`);

// Log stats
const scores = features.map((f) => f.properties.composite_score);
const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
const sorted2 = [...scores].sort((a, b) => a - b);
const median = sorted2[Math.floor(sorted2.length / 2)];
console.log(`Score stats — mean: ${avg.toFixed(1)}, median: ${median.toFixed(1)}`);
