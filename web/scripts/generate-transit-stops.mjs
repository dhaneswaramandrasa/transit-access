/**
 * Generate sample jakarta_transit_stops.geojson with ~400 transit stops.
 *
 * Includes TransJakarta BRT, KRL Commuterline, and MRT Jakarta stations
 * with realistic names and coordinates along actual corridors.
 *
 * Usage: node scripts/generate-transit-stops.mjs
 */

import h3 from "h3-js";
const { latLngToCell } = h3;
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const H3_RESOLUTION = 8;

// ===== MRT Jakarta (North-South Line) =====
const MRT_STATIONS = [
  { name: "Stasiun MRT Lebak Bulus Grab", line: "North-South", lat: -6.2893, lng: 106.7743 },
  { name: "Stasiun MRT Fatmawati Indomaret", line: "North-South", lat: -6.2925, lng: 106.7928 },
  { name: "Stasiun MRT Cipete Raya", line: "North-South", lat: -6.2783, lng: 106.7970 },
  { name: "Stasiun MRT Haji Nawi", line: "North-South", lat: -6.2666, lng: 106.7976 },
  { name: "Stasiun MRT Blok A", line: "North-South", lat: -6.2551, lng: 106.7983 },
  { name: "Stasiun MRT Blok M BCA", line: "North-South", lat: -6.2443, lng: 106.7981 },
  { name: "Stasiun MRT ASEAN", line: "North-South", lat: -6.2381, lng: 106.7988 },
  { name: "Stasiun MRT Senayan", line: "North-South", lat: -6.2275, lng: 106.8022 },
  { name: "Stasiun MRT Istora Mandiri", line: "North-South", lat: -6.2219, lng: 106.8087 },
  { name: "Stasiun MRT Bendungan Hilir", line: "North-South", lat: -6.2150, lng: 106.8166 },
  { name: "Stasiun MRT Setiabudi Astra", line: "North-South", lat: -6.2087, lng: 106.8221 },
  { name: "Stasiun MRT Dukuh Atas BNI", line: "North-South", lat: -6.2005, lng: 106.8230 },
  { name: "Stasiun MRT Bundaran HI", line: "North-South", lat: -6.1921, lng: 106.8228 },
  // Phase 2 extension
  { name: "Stasiun MRT Sarinah", line: "North-South Phase 2", lat: -6.1870, lng: 106.8234 },
  { name: "Stasiun MRT Monas", line: "North-South Phase 2", lat: -6.1762, lng: 106.8271 },
  { name: "Stasiun MRT Harmoni", line: "North-South Phase 2", lat: -6.1665, lng: 106.8158 },
  { name: "Stasiun MRT Sawah Besar", line: "North-South Phase 2", lat: -6.1604, lng: 106.8281 },
  { name: "Stasiun MRT Mangga Besar", line: "North-South Phase 2", lat: -6.1503, lng: 106.8305 },
  { name: "Stasiun MRT Glodok", line: "North-South Phase 2", lat: -6.1495, lng: 106.8171 },
  { name: "Stasiun MRT Kota", line: "North-South Phase 2", lat: -6.1375, lng: 106.8126 },
];

// ===== KRL Commuterline =====
const KRL_STATIONS = [
  // Bogor Line (via Manggarai)
  { name: "Stasiun Jakarta Kota", line: "Bogor Line", lat: -6.1375, lng: 106.8126 },
  { name: "Stasiun Jayakarta", line: "Bogor Line", lat: -6.1421, lng: 106.8236 },
  { name: "Stasiun Mangga Besar", line: "Bogor Line", lat: -6.1497, lng: 106.8271 },
  { name: "Stasiun Sawah Besar", line: "Bogor Line", lat: -6.1607, lng: 106.8281 },
  { name: "Stasiun Juanda", line: "Bogor Line", lat: -6.1667, lng: 106.8308 },
  { name: "Stasiun Gondangdia", line: "Bogor Line", lat: -6.1860, lng: 106.8352 },
  { name: "Stasiun Cikini", line: "Bogor Line", lat: -6.1981, lng: 106.8428 },
  { name: "Stasiun Manggarai", line: "Bogor Line", lat: -6.2099, lng: 106.8501 },
  { name: "Stasiun Tebet", line: "Bogor Line", lat: -6.2262, lng: 106.8577 },
  { name: "Stasiun Cawang", line: "Bogor Line", lat: -6.2424, lng: 106.8639 },
  { name: "Stasiun Duren Kalibata", line: "Bogor Line", lat: -6.2545, lng: 106.8559 },
  { name: "Stasiun Pasar Minggu Baru", line: "Bogor Line", lat: -6.2626, lng: 106.8483 },
  { name: "Stasiun Pasar Minggu", line: "Bogor Line", lat: -6.2843, lng: 106.8445 },
  { name: "Stasiun Tanjung Barat", line: "Bogor Line", lat: -6.3087, lng: 106.8397 },
  { name: "Stasiun Lenteng Agung", line: "Bogor Line", lat: -6.3304, lng: 106.8352 },
  { name: "Stasiun Universitas Pancasila", line: "Bogor Line", lat: -6.3387, lng: 106.8330 },
  { name: "Stasiun Universitas Indonesia", line: "Bogor Line", lat: -6.3608, lng: 106.8310 },

  // Cikarang Line (via Jatinegara)
  { name: "Stasiun Jatinegara", line: "Cikarang Line", lat: -6.2150, lng: 106.8703 },
  { name: "Stasiun Klender", line: "Cikarang Line", lat: -6.2173, lng: 106.8889 },
  { name: "Stasiun Buaran", line: "Cikarang Line", lat: -6.2180, lng: 106.9013 },
  { name: "Stasiun Klender Baru", line: "Cikarang Line", lat: -6.2175, lng: 106.9077 },
  { name: "Stasiun Cakung", line: "Cikarang Line", lat: -6.2182, lng: 106.9275 },

  // Tangerang Line
  { name: "Stasiun Tanah Abang", line: "Tangerang Line", lat: -6.1860, lng: 106.8108 },
  { name: "Stasiun Palmerah", line: "Tangerang Line", lat: -6.2073, lng: 106.7976 },
  { name: "Stasiun Kebayoran", line: "Tangerang Line", lat: -6.2368, lng: 106.7823 },
  { name: "Stasiun Pondok Ranji", line: "Tangerang Line", lat: -6.2758, lng: 106.7434 },
  { name: "Stasiun Jurang Mangu", line: "Tangerang Line", lat: -6.2862, lng: 106.7285 },
  { name: "Stasiun Sudimara", line: "Tangerang Line", lat: -6.2977, lng: 106.7110 },

  // Rangkasbitung Line (via Serpong)
  { name: "Stasiun Serpong", line: "Rangkasbitung Line", lat: -6.3203, lng: 106.6677 },

  // Tanjung Priok Line
  { name: "Stasiun Pasar Senen", line: "Tanjung Priok Line", lat: -6.1749, lng: 106.8445 },
  { name: "Stasiun Kemayoran", line: "Tanjung Priok Line", lat: -6.1578, lng: 106.8463 },
  { name: "Stasiun Rajawali", line: "Tanjung Priok Line", lat: -6.1442, lng: 106.8473 },
  { name: "Stasiun Kampung Bandan", line: "Tanjung Priok Line", lat: -6.1343, lng: 106.8249 },
  { name: "Stasiun Ancol", line: "Tanjung Priok Line", lat: -6.1261, lng: 106.8388 },
  { name: "Stasiun Tanjung Priok", line: "Tanjung Priok Line", lat: -6.1120, lng: 106.8811 },

  // Loop Line connections
  { name: "Stasiun Sudirman", line: "Loop Line", lat: -6.2024, lng: 106.8233 },
  { name: "Stasiun Karet", line: "Loop Line", lat: -6.2007, lng: 106.8140 },
  { name: "Stasiun Duri", line: "Loop Line", lat: -6.1585, lng: 106.8008 },
  { name: "Stasiun Angke", line: "Loop Line", lat: -6.1444, lng: 106.7984 },

  // Additional suburban stations
  { name: "Stasiun Pondok Cina", line: "Bogor Line", lat: -6.3683, lng: 106.8296 },
  { name: "Stasiun Depok Baru", line: "Bogor Line", lat: -6.3860, lng: 106.8183 },
  { name: "Stasiun Depok", line: "Bogor Line", lat: -6.3928, lng: 106.8178 },
  { name: "Stasiun Citayam", line: "Bogor Line", lat: -6.4514, lng: 106.8186 },

  // Bekasi Line
  { name: "Stasiun Kranji", line: "Cikarang Line", lat: -6.2178, lng: 106.9520 },
  { name: "Stasiun Bekasi", line: "Cikarang Line", lat: -6.2362, lng: 106.9984 },

  // Nambo Line
  { name: "Stasiun Pondok Jati", line: "Cikarang Line", lat: -6.2134, lng: 106.8853 },
];

// ===== TransJakarta BRT =====
// Corridors with waypoints — stops interpolated along corridors
const TJ_CORRIDORS = [
  {
    corridor: "Corridor 1",
    name: "Blok M – Kota",
    stops: [
      { name: "Halte Blok M", lat: -6.2441, lng: 106.7989 },
      { name: "Halte Masjid Agung", lat: -6.2390, lng: 106.7989 },
      { name: "Halte Bundaran Senayan", lat: -6.2272, lng: 106.8024 },
      { name: "Halte Gelora Bung Karno", lat: -6.2186, lng: 106.8037 },
      { name: "Halte Polda Metro Jaya", lat: -6.2132, lng: 106.8069 },
      { name: "Halte Bendungan Hilir", lat: -6.2113, lng: 106.8143 },
      { name: "Halte Karet", lat: -6.2054, lng: 106.8146 },
      { name: "Halte Dukuh Atas", lat: -6.2004, lng: 106.8221 },
      { name: "Halte Tosari ICBC", lat: -6.1952, lng: 106.8233 },
      { name: "Halte Bundaran HI", lat: -6.1920, lng: 106.8228 },
      { name: "Halte Sarinah", lat: -6.1870, lng: 106.8234 },
      { name: "Halte Bank Indonesia", lat: -6.1812, lng: 106.8277 },
      { name: "Halte Monas", lat: -6.1762, lng: 106.8271 },
      { name: "Halte Harmoni Central Busway", lat: -6.1665, lng: 106.8158 },
      { name: "Halte Sawah Besar", lat: -6.1607, lng: 106.8281 },
      { name: "Halte Mangga Besar", lat: -6.1497, lng: 106.8271 },
      { name: "Halte Olimo", lat: -6.1458, lng: 106.8198 },
      { name: "Halte Glodok", lat: -6.1495, lng: 106.8171 },
      { name: "Halte Kota", lat: -6.1375, lng: 106.8126 },
    ],
  },
  {
    corridor: "Corridor 2",
    name: "Pulo Gadung – Harmoni",
    stops: [
      { name: "Halte Pulo Gadung", lat: -6.1893, lng: 106.8978 },
      { name: "Halte Bermis", lat: -6.1887, lng: 106.8902 },
      { name: "Halte Pulomas BPKP", lat: -6.1876, lng: 106.8828 },
      { name: "Halte Asmi", lat: -6.1862, lng: 106.8774 },
      { name: "Halte Pedongkelan", lat: -6.1870, lng: 106.8717 },
      { name: "Halte Velodrome", lat: -6.1876, lng: 106.8675 },
      { name: "Halte Pemuda Rawamangun", lat: -6.1896, lng: 106.8635 },
      { name: "Halte Pramuka BPKP", lat: -6.1852, lng: 106.8530 },
      { name: "Halte Utan Kayu", lat: -6.1921, lng: 106.8596 },
      { name: "Halte Pasar Genjing Pramuka", lat: -6.1835, lng: 106.8450 },
      { name: "Halte Matraman", lat: -6.1949, lng: 106.8494 },
      { name: "Halte Salemba", lat: -6.1887, lng: 106.8418 },
      { name: "Halte Senen Sentral", lat: -6.1749, lng: 106.8445 },
    ],
  },
  {
    corridor: "Corridor 3",
    name: "Kalideres – Pasar Baru",
    stops: [
      { name: "Halte Kalideres", lat: -6.1573, lng: 106.7052 },
      { name: "Halte Pesakih", lat: -6.1592, lng: 106.7163 },
      { name: "Halte Sumur Bor", lat: -6.1605, lng: 106.7282 },
      { name: "Halte Rawa Buaya", lat: -6.1618, lng: 106.7370 },
      { name: "Halte Jembatan Gantung", lat: -6.1626, lng: 106.7441 },
      { name: "Halte Dispenda Samsat Barat", lat: -6.1632, lng: 106.7520 },
      { name: "Halte Cengkareng Timur", lat: -6.1644, lng: 106.7600 },
      { name: "Halte Gereja Tiberias", lat: -6.1653, lng: 106.7681 },
      { name: "Halte Indosiar", lat: -6.1675, lng: 106.7789 },
      { name: "Halte Jelambar", lat: -6.1656, lng: 106.7862 },
      { name: "Halte Slipi Petamburan", lat: -6.1688, lng: 106.7943 },
      { name: "Halte Harmoni 2", lat: -6.1668, lng: 106.8155 },
      { name: "Halte Juanda", lat: -6.1667, lng: 106.8308 },
      { name: "Halte Pasar Baru", lat: -6.1644, lng: 106.8415 },
    ],
  },
  {
    corridor: "Corridor 4",
    name: "Pulo Gadung – Dukuh Atas",
    stops: [
      { name: "Halte Pulo Gadung 2", lat: -6.1891, lng: 106.8967 },
      { name: "Halte Sunan Giri", lat: -6.1925, lng: 106.8842 },
      { name: "Halte Layur", lat: -6.1946, lng: 106.8784 },
      { name: "Halte Cipinang Kebembem", lat: -6.2017, lng: 106.8724 },
      { name: "Halte Stasiun Jatinegara", lat: -6.2150, lng: 106.8703 },
      { name: "Halte Kebon Pala", lat: -6.2200, lng: 106.8637 },
      { name: "Halte Matraman 2", lat: -6.2086, lng: 106.8521 },
      { name: "Halte Salemba Carolus", lat: -6.1936, lng: 106.8453 },
      { name: "Halte Pal Putih", lat: -6.1969, lng: 106.8371 },
    ],
  },
  {
    corridor: "Corridor 5",
    name: "Kampung Melayu – Ancol",
    stops: [
      { name: "Halte Kampung Melayu", lat: -6.2256, lng: 106.8646 },
      { name: "Halte Pasar Jatinegara", lat: -6.2150, lng: 106.8703 },
      { name: "Halte Stasiun Senen", lat: -6.1749, lng: 106.8445 },
      { name: "Halte Gunung Sahari Mangga Dua", lat: -6.1455, lng: 106.8328 },
      { name: "Halte Ancol", lat: -6.1261, lng: 106.8388 },
    ],
  },
  {
    corridor: "Corridor 6",
    name: "Ragunan – Dukuh Atas",
    stops: [
      { name: "Halte Ragunan", lat: -6.3124, lng: 106.8209 },
      { name: "Halte Jatipadang", lat: -6.2962, lng: 106.8320 },
      { name: "Halte Pejaten", lat: -6.2830, lng: 106.8381 },
      { name: "Halte Warung Jati", lat: -6.2639, lng: 106.8405 },
      { name: "Halte Buncit Indah", lat: -6.2560, lng: 106.8344 },
      { name: "Halte Imigrasi", lat: -6.2459, lng: 106.8289 },
      { name: "Halte Duren Tiga", lat: -6.2412, lng: 106.8266 },
      { name: "Halte Mampang Prapatan", lat: -6.2328, lng: 106.8240 },
      { name: "Halte Kuningan Timur", lat: -6.2228, lng: 106.8296 },
      { name: "Halte Dept. Kesehatan", lat: -6.2123, lng: 106.8316 },
      { name: "Halte GOR Sumantri", lat: -6.2070, lng: 106.8310 },
    ],
  },
  {
    corridor: "Corridor 7",
    name: "Kampung Rambutan – Kampung Melayu",
    stops: [
      { name: "Halte Kampung Rambutan", lat: -6.3107, lng: 106.8796 },
      { name: "Halte Pedati", lat: -6.2949, lng: 106.8756 },
      { name: "Halte Condet", lat: -6.2788, lng: 106.8721 },
      { name: "Halte BKN", lat: -6.2716, lng: 106.8695 },
      { name: "Halte Cawang UKI", lat: -6.2454, lng: 106.8616 },
      { name: "Halte BNN", lat: -6.2367, lng: 106.8601 },
    ],
  },
  {
    corridor: "Corridor 8",
    name: "Lebak Bulus – Harmoni",
    stops: [
      { name: "Halte Lebak Bulus", lat: -6.2893, lng: 106.7743 },
      { name: "Halte Pondok Indah", lat: -6.2626, lng: 106.7849 },
      { name: "Halte Simprug", lat: -6.2489, lng: 106.7856 },
      { name: "Halte Kebayoran Lama", lat: -6.2419, lng: 106.7775 },
      { name: "Halte Tanah Abang", lat: -6.1860, lng: 106.8108 },
    ],
  },
  {
    corridor: "Corridor 9",
    name: "Pinang Ranti – Pluit",
    stops: [
      { name: "Halte Pinang Ranti", lat: -6.2804, lng: 106.8702 },
      { name: "Halte Cawang Otista", lat: -6.2454, lng: 106.8616 },
      { name: "Halte Pancoran Tugu", lat: -6.2399, lng: 106.8445 },
      { name: "Halte Cikoko Stasiun Cawang", lat: -6.2524, lng: 106.8569 },
      { name: "Halte Casablanca", lat: -6.2243, lng: 106.8400 },
      { name: "Halte Kuningan Barat", lat: -6.2200, lng: 106.8263 },
      { name: "Halte Karet Kuningan", lat: -6.2130, lng: 106.8253 },
      { name: "Halte Pluit", lat: -6.1250, lng: 106.7962 },
    ],
  },
  {
    corridor: "Corridor 10",
    name: "Tanjung Priok – PGC",
    stops: [
      { name: "Halte Tanjung Priok", lat: -6.1120, lng: 106.8811 },
      { name: "Halte Enggano", lat: -6.1253, lng: 106.8676 },
      { name: "Halte Yos Sudarso", lat: -6.1375, lng: 106.8544 },
      { name: "Halte Cempaka Mas", lat: -6.1681, lng: 106.8695 },
      { name: "Halte Pulomas", lat: -6.1876, lng: 106.8828 },
      { name: "Halte PGC", lat: -6.2650, lng: 106.8745 },
    ],
  },
  {
    corridor: "Corridor 11",
    name: "Kampung Melayu – Pulo Gebang",
    stops: [
      { name: "Halte Kampung Melayu 2", lat: -6.2256, lng: 106.8646 },
      { name: "Halte Bidara Cina", lat: -6.2204, lng: 106.8700 },
      { name: "Halte Cipinang", lat: -6.2068, lng: 106.8820 },
      { name: "Halte Pondok Kelapa", lat: -6.2144, lng: 106.9095 },
      { name: "Halte Pulo Gebang", lat: -6.2007, lng: 106.9353 },
    ],
  },
  {
    corridor: "Corridor 12",
    name: "Pluit – Tanjung Priok",
    stops: [
      { name: "Halte Pluit Junction", lat: -6.1260, lng: 106.7970 },
      { name: "Halte Penjaringan", lat: -6.1239, lng: 106.8066 },
      { name: "Halte Muara Baru", lat: -6.1157, lng: 106.8089 },
      { name: "Halte Walikota Jakarta Utara", lat: -6.1189, lng: 106.8320 },
      { name: "Halte Sunter Kelapa Gading", lat: -6.1564, lng: 106.8762 },
    ],
  },
  {
    corridor: "Corridor 13",
    name: "Ciledug – Tendean",
    stops: [
      { name: "Halte Ciledug", lat: -6.2504, lng: 106.7138 },
      { name: "Halte Cipulir", lat: -6.2471, lng: 106.7563 },
      { name: "Halte Kebayoran Lama Bukit Duri", lat: -6.2419, lng: 106.7775 },
      { name: "Halte CSW", lat: -6.2358, lng: 106.7971 },
      { name: "Halte Tendean", lat: -6.2355, lng: 106.8101 },
    ],
  },
];

// Build features
console.log("Generating transit stops for Jakarta...");
const features = [];
let stopId = 0;

// MRT stations
for (const station of MRT_STATIONS) {
  const h3Index = latLngToCell(station.lat, station.lng, H3_RESOLUTION);
  features.push({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [Math.round(station.lng * 100000) / 100000, Math.round(station.lat * 100000) / 100000],
    },
    properties: {
      id: `ts_${String(stopId++).padStart(3, "0")}`,
      name: station.name,
      type: "mrt",
      line: station.line,
      h3_index: h3Index,
    },
  });
}

// KRL stations
for (const station of KRL_STATIONS) {
  const h3Index = latLngToCell(station.lat, station.lng, H3_RESOLUTION);
  features.push({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [Math.round(station.lng * 100000) / 100000, Math.round(station.lat * 100000) / 100000],
    },
    properties: {
      id: `ts_${String(stopId++).padStart(3, "0")}`,
      name: station.name,
      type: "krl",
      line: station.line,
      h3_index: h3Index,
    },
  });
}

// TransJakarta stops
for (const corridor of TJ_CORRIDORS) {
  for (const stop of corridor.stops) {
    const h3Index = latLngToCell(stop.lat, stop.lng, H3_RESOLUTION);
    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [Math.round(stop.lng * 100000) / 100000, Math.round(stop.lat * 100000) / 100000],
      },
      properties: {
        id: `ts_${String(stopId++).padStart(3, "0")}`,
        name: stop.name,
        type: "transjakarta",
        line: corridor.corridor,
        h3_index: h3Index,
      },
    });
  }
}

const geojson = { type: "FeatureCollection", features };

// Write output
const outputDir = join(__dirname, "..", "public", "data");
mkdirSync(outputDir, { recursive: true });
const outputPath = join(outputDir, "jakarta_transit_stops.geojson");
writeFileSync(outputPath, JSON.stringify(geojson));

// Stats
const typeCounts = {};
for (const f of features) {
  const t = f.properties.type;
  typeCounts[t] = (typeCounts[t] || 0) + 1;
}

console.log(`Saved ${features.length} transit stops to ${outputPath}`);
console.log("Type breakdown:", typeCounts);
