/**
 * Generate jakarta_demographics.json with BPS national-compatible demographic data.
 *
 * Uses BPS (Badan Pusat Statistik) national indicator structure so the schema
 * is expandable to any kabupaten/kota in Indonesia.
 *
 * BPS National Indicators used:
 * - Kepadatan Penduduk (population density per km²)
 * - Piramida Penduduk (population pyramid by 5 age groups)
 * - Rasio Jenis Kelamin (sex ratio — males per 100 females)
 * - Total population estimates
 *
 * Seed data: BPS DKI Jakarta 2023
 * - DKI Jakarta total population: ~10.68 million
 * - Average density: ~15,900 persons/km²
 * - Age 0-14: 22.5%, 15-24: 16.8%, 25-44: 33.2%, 45-64: 20.8%, 65+: 6.7%
 * - Sex ratio: ~100.4
 *
 * BPS City Codes (DKI Jakarta):
 *   3171 = Jakarta Pusat    3174 = Jakarta Selatan
 *   3172 = Jakarta Utara    3175 = Jakarta Timur
 *   3173 = Jakarta Barat    3101 = Kepulauan Seribu
 *
 * Usage: node scripts/generate-demographics.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// BPS 2023 base demographics for DKI Jakarta kecamatan-level estimates
// Structure mirrors BPS Publikasi Statistik format
const BPS_KECAMATAN_DATA = {
  // Jakarta Pusat (3171) — high density CBD
  "Menteng":          { city_code: "3171", density_base: 19200, age_profile: "cbd" },
  "Tanah Abang":      { city_code: "3171", density_base: 24100, age_profile: "cbd" },
  "Gambir":           { city_code: "3171", density_base: 11800, age_profile: "cbd" },
  "Sawah Besar":      { city_code: "3171", density_base: 22800, age_profile: "mixed" },
  "Kemayoran":        { city_code: "3171", density_base: 28400, age_profile: "dense_residential" },
  "Senen":            { city_code: "3171", density_base: 27300, age_profile: "mixed" },
  "Cempaka Putih":    { city_code: "3171", density_base: 22600, age_profile: "mixed" },
  "Johar Baru":       { city_code: "3171", density_base: 42100, age_profile: "dense_residential" },

  // Jakarta Utara (3172)
  "Penjaringan":      { city_code: "3172", density_base: 12600, age_profile: "mixed" },
  "Pademangan":       { city_code: "3172", density_base: 19500, age_profile: "residential" },
  "Tanjung Priok":    { city_code: "3172", density_base: 13200, age_profile: "industrial" },
  "Koja":             { city_code: "3172", density_base: 24800, age_profile: "dense_residential" },
  "Kelapa Gading":    { city_code: "3172", density_base: 12100, age_profile: "affluent" },
  "Cilincing":        { city_code: "3172", density_base: 15300, age_profile: "industrial" },

  // Jakarta Barat (3173)
  "Cengkareng":       { city_code: "3173", density_base: 21500, age_profile: "suburban_family" },
  "Grogol Petamburan":{ city_code: "3173", density_base: 24200, age_profile: "mixed" },
  "Taman Sari":       { city_code: "3173", density_base: 33400, age_profile: "dense_residential" },
  "Tambora":          { city_code: "3173", density_base: 50800, age_profile: "dense_residential" },
  "Kebon Jeruk":      { city_code: "3173", density_base: 18700, age_profile: "suburban_family" },
  "Kalideres":        { city_code: "3173", density_base: 14500, age_profile: "suburban_family" },
  "Palmerah":         { city_code: "3173", density_base: 24900, age_profile: "mixed" },
  "Kembangan":        { city_code: "3173", density_base: 13900, age_profile: "suburban_family" },

  // Jakarta Selatan (3174)
  "Kebayoran Baru":   { city_code: "3174", density_base: 15800, age_profile: "affluent" },
  "Kebayoran Lama":   { city_code: "3174", density_base: 22100, age_profile: "residential" },
  "Mampang Prapatan": { city_code: "3174", density_base: 22800, age_profile: "mixed" },
  "Pancoran":         { city_code: "3174", density_base: 19200, age_profile: "mixed" },
  "Tebet":            { city_code: "3174", density_base: 22400, age_profile: "residential" },
  "Setiabudi":        { city_code: "3174", density_base: 14100, age_profile: "cbd" },
  "Pasar Minggu":     { city_code: "3174", density_base: 16800, age_profile: "residential" },
  "Cilandak":         { city_code: "3174", density_base: 12200, age_profile: "affluent" },
  "Pesanggrahan":     { city_code: "3174", density_base: 18100, age_profile: "suburban_family" },
  "Jagakarsa":        { city_code: "3174", density_base: 15400, age_profile: "suburban_family" },

  // Jakarta Timur (3175)
  "Matraman":         { city_code: "3175", density_base: 30200, age_profile: "dense_residential" },
  "Jatinegara":       { city_code: "3175", density_base: 24500, age_profile: "residential" },
  "Pulo Gadung":      { city_code: "3175", density_base: 16700, age_profile: "mixed" },
  "Kramat Jati":      { city_code: "3175", density_base: 19800, age_profile: "residential" },
  "Duren Sawit":      { city_code: "3175", density_base: 17400, age_profile: "suburban_family" },
  "Makasar":          { city_code: "3175", density_base: 11900, age_profile: "suburban_family" },
  "Cakung":           { city_code: "3175", density_base: 16100, age_profile: "industrial" },
  "Cipayung":         { city_code: "3175", density_base: 10200, age_profile: "suburban_family" },
  "Ciracas":          { city_code: "3175", density_base: 14900, age_profile: "suburban_family" },
  "Pasar Rebo":       { city_code: "3175", density_base: 14400, age_profile: "suburban_family" },
};

// BPS age distribution profiles (based on 2023 census data patterns)
const AGE_PROFILES = {
  cbd: {
    // Central business — high working-age, low children
    "0-14": 0.155, "15-24": 0.178, "25-44": 0.405, "45-64": 0.202, "65+": 0.060,
  },
  affluent: {
    // Affluent residential — moderate children, aging population
    "0-14": 0.195, "15-24": 0.145, "25-44": 0.305, "45-64": 0.255, "65+": 0.100,
  },
  dense_residential: {
    // Dense kampung — higher children, young families
    "0-14": 0.265, "15-24": 0.185, "25-44": 0.320, "45-64": 0.175, "65+": 0.055,
  },
  residential: {
    // Standard residential — balanced
    "0-14": 0.230, "15-24": 0.168, "25-44": 0.332, "45-64": 0.200, "65+": 0.070,
  },
  suburban_family: {
    // Suburban — many children, young families
    "0-14": 0.275, "15-24": 0.170, "25-44": 0.335, "45-64": 0.170, "65+": 0.050,
  },
  industrial: {
    // Industrial / port area — working age, migrant workers
    "0-14": 0.210, "15-24": 0.195, "25-44": 0.365, "45-64": 0.180, "65+": 0.050,
  },
  mixed: {
    // Mixed use — Jakarta average (BPS 2023)
    "0-14": 0.225, "15-24": 0.168, "25-44": 0.332, "45-64": 0.208, "65+": 0.067,
  },
};

// Average hex area at H3 resolution 8 in km²
const H3_RES8_AREA_KM2 = 0.7373;

// Kecamatan approximate bounding regions (lat/lng centroids)
const KECAMATAN_CENTROIDS = {
  // Jakarta Pusat
  "Menteng":          { lat: -6.1950, lng: 106.8370 },
  "Tanah Abang":      { lat: -6.1860, lng: 106.8110 },
  "Gambir":           { lat: -6.1710, lng: 106.8220 },
  "Sawah Besar":      { lat: -6.1550, lng: 106.8350 },
  "Kemayoran":        { lat: -6.1580, lng: 106.8530 },
  "Senen":            { lat: -6.1750, lng: 106.8450 },
  "Cempaka Putih":    { lat: -6.1730, lng: 106.8680 },
  "Johar Baru":       { lat: -6.1810, lng: 106.8510 },
  // Jakarta Utara
  "Penjaringan":      { lat: -6.1190, lng: 106.7970 },
  "Pademangan":       { lat: -6.1350, lng: 106.8420 },
  "Tanjung Priok":    { lat: -6.1150, lng: 106.8750 },
  "Koja":             { lat: -6.1100, lng: 106.9050 },
  "Kelapa Gading":    { lat: -6.1600, lng: 106.8950 },
  "Cilincing":        { lat: -6.1050, lng: 106.9350 },
  // Jakarta Barat
  "Cengkareng":       { lat: -6.1550, lng: 106.7350 },
  "Grogol Petamburan":{ lat: -6.1650, lng: 106.7850 },
  "Taman Sari":       { lat: -6.1490, lng: 106.8130 },
  "Tambora":          { lat: -6.1500, lng: 106.8000 },
  "Kebon Jeruk":      { lat: -6.1950, lng: 106.7650 },
  "Kalideres":        { lat: -6.1550, lng: 106.7050 },
  "Palmerah":         { lat: -6.2050, lng: 106.7950 },
  "Kembangan":        { lat: -6.1900, lng: 106.7350 },
  // Jakarta Selatan
  "Kebayoran Baru":   { lat: -6.2400, lng: 106.7920 },
  "Kebayoran Lama":   { lat: -6.2500, lng: 106.7700 },
  "Mampang Prapatan": { lat: -6.2400, lng: 106.8300 },
  "Pancoran":         { lat: -6.2450, lng: 106.8450 },
  "Tebet":            { lat: -6.2300, lng: 106.8550 },
  "Setiabudi":        { lat: -6.2100, lng: 106.8280 },
  "Pasar Minggu":     { lat: -6.2800, lng: 106.8400 },
  "Cilandak":         { lat: -6.2750, lng: 106.7900 },
  "Pesanggrahan":     { lat: -6.2650, lng: 106.7550 },
  "Jagakarsa":        { lat: -6.3250, lng: 106.8250 },
  // Jakarta Timur
  "Matraman":         { lat: -6.2000, lng: 106.8550 },
  "Jatinegara":       { lat: -6.2150, lng: 106.8700 },
  "Pulo Gadung":      { lat: -6.1850, lng: 106.8850 },
  "Kramat Jati":      { lat: -6.2700, lng: 106.8700 },
  "Duren Sawit":      { lat: -6.2300, lng: 106.9100 },
  "Makasar":          { lat: -6.2650, lng: 106.8950 },
  "Cakung":           { lat: -6.1950, lng: 106.9350 },
  "Cipayung":         { lat: -6.3100, lng: 106.8950 },
  "Ciracas":          { lat: -6.3200, lng: 106.8700 },
  "Pasar Rebo":       { lat: -6.3150, lng: 106.8550 },
};

// Find nearest kecamatan for a given coordinate
function findNearestKecamatan(lat, lng) {
  let minDist = Infinity;
  let nearest = "Menteng"; // default

  for (const [name, centroid] of Object.entries(KECAMATAN_CENTROIDS)) {
    const dlat = lat - centroid.lat;
    const dlng = lng - centroid.lng;
    const dist = dlat * dlat + dlng * dlng;
    if (dist < minDist) {
      minDist = dist;
      nearest = name;
    }
  }
  return nearest;
}

// Seed a pseudo-random number from h3 index string for reproducibility
function seededRandom(h3Index) {
  let hash = 0;
  for (let i = 0; i < h3Index.length; i++) {
    hash = ((hash << 5) - hash) + h3Index.charCodeAt(i);
    hash |= 0;
  }
  // Simple LCG
  const next = () => {
    hash = (hash * 1664525 + 1013904223) | 0;
    return (hash >>> 0) / 4294967296;
  };
  return next;
}

// Add variation to age distribution percentages
function varyAgeDistribution(profile, rng) {
  const varied = {};
  let total = 0;
  for (const [group, pct] of Object.entries(profile)) {
    const factor = 1 + (rng() - 0.5) * 0.15; // ±7.5% variation
    varied[group] = Math.max(0.01, pct * factor);
    total += varied[group];
  }
  // Normalize to sum to 1.0
  for (const group of Object.keys(varied)) {
    varied[group] = Math.round((varied[group] / total) * 1000) / 1000;
  }
  return varied;
}

// Determine dominant age group
function dominantAgeGroup(dist) {
  let max = 0;
  let dominant = "25-44";
  for (const [group, pct] of Object.entries(dist)) {
    if (pct > max) {
      max = pct;
      dominant = group;
    }
  }
  return dominant;
}

// Main
console.log("Generating BPS-compatible demographics for Jakarta H3 hexes...");

// Load existing hex data to get all h3_index values
const hexPath = join(__dirname, "..", "public", "data", "jakarta_h3_scores.geojson");
let hexData;
try {
  hexData = JSON.parse(readFileSync(hexPath, "utf-8"));
} catch {
  console.error(`Could not read ${hexPath}. Run generate-sample-data.mjs first.`);
  process.exit(1);
}

const demographics = {};

for (const feature of hexData.features) {
  const h3Index = feature.properties.h3_index;
  if (!h3Index) continue;

  // Get centroid from geometry (approximate from first coordinate of polygon)
  const coords = feature.geometry.coordinates[0]; // outer ring
  const lat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
  const lng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;

  // Find nearest kecamatan
  const kecamatan = findNearestKecamatan(lat, lng);
  const kecData = BPS_KECAMATAN_DATA[kecamatan];
  const ageProfile = AGE_PROFILES[kecData.age_profile];

  // Seeded RNG for this hex
  const rng = seededRandom(h3Index);

  // Population density with ±20% variation within kecamatan
  const densityVariation = 1 + (rng() - 0.5) * 0.4;
  const population_density = Math.round(kecData.density_base * densityVariation);

  // Age distribution with small random variation
  const age_distribution = varyAgeDistribution(ageProfile, rng);

  // Sex ratio (BPS DKI Jakarta 2023: ~100.4, varies slightly)
  const sex_ratio = Math.round((99 + rng() * 3) * 10) / 10;

  // Total population estimate
  const total_population = Math.round(population_density * H3_RES8_AREA_KM2);

  demographics[h3Index] = {
    h3_index: h3Index,
    kecamatan,
    city_code: kecData.city_code,
    population_density,
    total_population,
    age_distribution,
    dominant_age_group: dominantAgeGroup(age_distribution),
    sex_ratio,
    // BPS metadata
    bps_source: "BPS DKI Jakarta 2023 (modeled)",
    bps_indicator_ids: {
      density: "SP.POP.DNST",      // Kepadatan Penduduk
      age_pyramid: "SP.POP.AGE",     // Piramida Penduduk
      sex_ratio: "SP.POP.SEXR",      // Rasio Jenis Kelamin
    },
  };
}

// Write output
const outputDir = join(__dirname, "..", "public", "data");
mkdirSync(outputDir, { recursive: true });
const outputPath = join(outputDir, "jakarta_demographics.json");
writeFileSync(outputPath, JSON.stringify(demographics, null, 2));

console.log(`Saved demographics for ${Object.keys(demographics).length} hexes to ${outputPath}`);

// Summary stats
const densities = Object.values(demographics).map(d => d.population_density);
const avgDensity = Math.round(densities.reduce((a, b) => a + b, 0) / densities.length);
const totalPop = Object.values(demographics).reduce((sum, d) => sum + d.total_population, 0);

console.log(`Average density: ${avgDensity.toLocaleString()} persons/km²`);
console.log(`Total estimated population: ${totalPop.toLocaleString()}`);
console.log(`City codes used: ${[...new Set(Object.values(demographics).map(d => d.city_code))].join(", ")}`);
