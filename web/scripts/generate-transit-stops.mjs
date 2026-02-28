/**
 * Generate sample jakarta_transit_stops.geojson with ~450-500 transit stops
 * across the Jabodetabek metropolitan area.
 *
 * Includes TransJakarta BRT, KRL Commuterline, MRT Jakarta, and LRT Jabodebek
 * stations with realistic names and coordinates along actual corridors.
 *
 * Coverage: Jakarta, Bogor, Depok, Tangerang, Bekasi (Jabodetabek)
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

// ===== LRT Jabodebek =====
const LRT_STATIONS = [
  // Cawang – Bekasi Timur Line
  { name: "Stasiun LRT Cawang", line: "LRT Jabodebek Bekasi", lat: -6.2424, lng: 106.8639 },
  { name: "Stasiun LRT Ciliwung", line: "LRT Jabodebek Bekasi", lat: -6.2365, lng: 106.8720 },
  { name: "Stasiun LRT Cikoko", line: "LRT Jabodebek Bekasi", lat: -6.2340, lng: 106.8570 },
  { name: "Stasiun LRT Ciracas", line: "LRT Jabodebek Bekasi", lat: -6.2448, lng: 106.8892 },
  { name: "Stasiun LRT Harjamukti", line: "LRT Jabodebek Bekasi", lat: -6.2519, lng: 106.9048 },
  { name: "Stasiun LRT Cipinang Baru", line: "LRT Jabodebek Bekasi", lat: -6.2395, lng: 106.9183 },
  { name: "Stasiun LRT Bekasi Barat", line: "LRT Jabodebek Bekasi", lat: -6.2360, lng: 106.9900 },
  { name: "Stasiun LRT Bekasi Timur", line: "LRT Jabodebek Bekasi", lat: -6.2486, lng: 107.0190 },

  // Cawang – Dukuh Atas Line
  { name: "Stasiun LRT Dukuh Atas", line: "LRT Jabodebek Dukuh Atas", lat: -6.2005, lng: 106.8230 },
  { name: "Stasiun LRT Kuningan", line: "LRT Jabodebek Dukuh Atas", lat: -6.2180, lng: 106.8310 },
  { name: "Stasiun LRT Pancoran", line: "LRT Jabodebek Dukuh Atas", lat: -6.2340, lng: 106.8440 },

  // Cawang – Cibubur Line
  { name: "Stasiun LRT Halim", line: "LRT Jabodebek Cibubur", lat: -6.2670, lng: 106.8908 },
  { name: "Stasiun LRT Jatibening Baru", line: "LRT Jabodebek Cibubur", lat: -6.2781, lng: 106.9134 },
  { name: "Stasiun LRT Jatimulya", line: "LRT Jabodebek Cibubur", lat: -6.2921, lng: 106.9218 },
  { name: "Stasiun LRT TMII", line: "LRT Jabodebek Cibubur", lat: -6.2978, lng: 106.8940 },
  { name: "Stasiun LRT Kampung Rambutan", line: "LRT Jabodebek Cibubur", lat: -6.3107, lng: 106.8796 },
  { name: "Stasiun LRT Cibubur", line: "LRT Jabodebek Cibubur", lat: -6.3672, lng: 106.8880 },
];

// ===== KRL Commuterline =====
const KRL_STATIONS = [
  // Bogor Line (via Manggarai) — full line to Bogor
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
  { name: "Stasiun Pondok Cina", line: "Bogor Line", lat: -6.3683, lng: 106.8296 },
  { name: "Stasiun Depok Baru", line: "Bogor Line", lat: -6.3860, lng: 106.8183 },
  { name: "Stasiun Depok", line: "Bogor Line", lat: -6.3928, lng: 106.8178 },
  { name: "Stasiun Citayam", line: "Bogor Line", lat: -6.4514, lng: 106.8186 },
  // Extended Bogor Line — beyond Citayam
  { name: "Stasiun Bojong Gede", line: "Bogor Line", lat: -6.4801, lng: 106.7954 },
  { name: "Stasiun Cilebut", line: "Bogor Line", lat: -6.5087, lng: 106.7858 },
  { name: "Stasiun Bogor", line: "Bogor Line", lat: -6.5957, lng: 106.7904 },
  { name: "Stasiun Cianjur", line: "Bogor Line", lat: -6.5528, lng: 106.7890 },

  // Cikarang Line (via Jatinegara) — full line to Cikarang
  { name: "Stasiun Jatinegara", line: "Cikarang Line", lat: -6.2150, lng: 106.8703 },
  { name: "Stasiun Klender", line: "Cikarang Line", lat: -6.2173, lng: 106.8889 },
  { name: "Stasiun Buaran", line: "Cikarang Line", lat: -6.2180, lng: 106.9013 },
  { name: "Stasiun Klender Baru", line: "Cikarang Line", lat: -6.2175, lng: 106.9077 },
  { name: "Stasiun Cakung", line: "Cikarang Line", lat: -6.2182, lng: 106.9275 },
  { name: "Stasiun Kranji", line: "Cikarang Line", lat: -6.2178, lng: 106.9520 },
  { name: "Stasiun Bekasi", line: "Cikarang Line", lat: -6.2362, lng: 106.9984 },
  { name: "Stasiun Pondok Jati", line: "Cikarang Line", lat: -6.2134, lng: 106.8853 },
  // Extended Cikarang Line — beyond Bekasi
  { name: "Stasiun Tambun", line: "Cikarang Line", lat: -6.2443, lng: 107.0419 },
  { name: "Stasiun Cibitung", line: "Cikarang Line", lat: -6.2585, lng: 107.0720 },
  { name: "Stasiun Metland Telaga Murni", line: "Cikarang Line", lat: -6.2649, lng: 107.0920 },
  { name: "Stasiun Cikarang", line: "Cikarang Line", lat: -6.2568, lng: 107.1472 },
  { name: "Stasiun Lemahabang", line: "Cikarang Line", lat: -6.2710, lng: 107.1070 },

  // Tangerang Line — extended
  { name: "Stasiun Tanah Abang", line: "Tangerang Line", lat: -6.1860, lng: 106.8108 },
  { name: "Stasiun Palmerah", line: "Tangerang Line", lat: -6.2073, lng: 106.7976 },
  { name: "Stasiun Kebayoran", line: "Tangerang Line", lat: -6.2368, lng: 106.7823 },
  { name: "Stasiun Pondok Ranji", line: "Tangerang Line", lat: -6.2758, lng: 106.7434 },
  { name: "Stasiun Jurang Mangu", line: "Tangerang Line", lat: -6.2862, lng: 106.7285 },
  { name: "Stasiun Sudimara", line: "Tangerang Line", lat: -6.2977, lng: 106.7110 },
  // Extended Tangerang Line
  { name: "Stasiun Rawa Buntu", line: "Tangerang Line", lat: -6.3072, lng: 106.6923 },
  { name: "Stasiun Serpong", line: "Tangerang Line", lat: -6.3203, lng: 106.6677 },
  { name: "Stasiun Cisauk", line: "Tangerang Line", lat: -6.3278, lng: 106.6412 },
  { name: "Stasiun Cicayur", line: "Tangerang Line", lat: -6.3310, lng: 106.6260 },
  { name: "Stasiun Parung Panjang", line: "Tangerang Line", lat: -6.3438, lng: 106.5697 },
  { name: "Stasiun Cilejit", line: "Tangerang Line", lat: -6.3600, lng: 106.5350 },
  { name: "Stasiun Daru", line: "Tangerang Line", lat: -6.3445, lng: 106.5050 },
  { name: "Stasiun Tigaraksa", line: "Tangerang Line", lat: -6.3540, lng: 106.4735 },
  { name: "Stasiun Tenjo", line: "Tangerang Line", lat: -6.3630, lng: 106.4506 },
  { name: "Stasiun Rangkasbitung", line: "Tangerang Line", lat: -6.3540, lng: 106.2530 },

  // Tangerang Branch Line (from Duri)
  { name: "Stasiun Duri", line: "Tangerang Branch", lat: -6.1585, lng: 106.8008 },
  { name: "Stasiun Grogol", line: "Tangerang Branch", lat: -6.1626, lng: 106.7843 },
  { name: "Stasiun Pesing", line: "Tangerang Branch", lat: -6.1651, lng: 106.7640 },
  { name: "Stasiun Taman Kota", line: "Tangerang Branch", lat: -6.1685, lng: 106.7434 },
  { name: "Stasiun Bojong Indah", line: "Tangerang Branch", lat: -6.1695, lng: 106.7265 },
  { name: "Stasiun Rawa Buaya", line: "Tangerang Branch", lat: -6.1710, lng: 106.7165 },
  { name: "Stasiun Kalideres", line: "Tangerang Branch", lat: -6.1660, lng: 106.6980 },
  { name: "Stasiun Poris", line: "Tangerang Branch", lat: -6.1700, lng: 106.6800 },
  { name: "Stasiun Batu Ceper", line: "Tangerang Branch", lat: -6.1761, lng: 106.6530 },
  { name: "Stasiun Tangerang", line: "Tangerang Branch", lat: -6.1768, lng: 106.6317 },

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
  { name: "Stasiun Angke", line: "Loop Line", lat: -6.1444, lng: 106.7984 },

  // Nambo Line (branching from Citayam towards Nambo)
  { name: "Stasiun Nambo", line: "Nambo Line", lat: -6.4834, lng: 106.8523 },
  { name: "Stasiun Gunung Putri", line: "Nambo Line", lat: -6.4628, lng: 106.8641 },
  { name: "Stasiun Citeureup", line: "Nambo Line", lat: -6.4720, lng: 106.8580 },
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
  // Additional Jakarta corridors for fuller coverage
  {
    corridor: "Corridor 1F",
    name: "Kota – Muara Angke",
    stops: [
      { name: "Halte Kali Besar", lat: -6.1361, lng: 106.8148 },
      { name: "Halte Jembatan Merah", lat: -6.1300, lng: 106.8130 },
      { name: "Halte Luar Batang", lat: -6.1220, lng: 106.8100 },
      { name: "Halte Muara Angke", lat: -6.1080, lng: 106.7895 },
    ],
  },
  {
    corridor: "Corridor 1R",
    name: "Bundaran HI – Kelapa Gading",
    stops: [
      { name: "Halte Medan Merdeka Barat", lat: -6.1755, lng: 106.8220 },
      { name: "Halte Gambir", lat: -6.1710, lng: 106.8290 },
      { name: "Halte Kelapa Gading", lat: -6.1562, lng: 106.9075 },
    ],
  },
  {
    corridor: "Corridor 9D",
    name: "Pinang Ranti – Bekasi (Summarecon)",
    stops: [
      { name: "Halte Cililitan", lat: -6.2635, lng: 106.8710 },
      { name: "Halte Kalimalang", lat: -6.2375, lng: 106.9050 },
      { name: "Halte Harapan Indah", lat: -6.2120, lng: 106.9720 },
      { name: "Halte Summarecon Bekasi", lat: -6.2250, lng: 106.9900 },
    ],
  },
  {
    corridor: "Corridor 12B",
    name: "Penjaringan – Pantai Indah Kapuk",
    stops: [
      { name: "Halte PIK Avenue", lat: -6.1090, lng: 106.7450 },
      { name: "Halte Golf Island PIK", lat: -6.1030, lng: 106.7380 },
      { name: "Halte Pantai Indah Kapuk 2", lat: -6.1010, lng: 106.7260 },
    ],
  },
  // TransJakarta feeder / extension in Tangerang area
  {
    corridor: "T-Tangerang",
    name: "Trans Tangerang (Ciledug – Ciputat – BSD)",
    stops: [
      { name: "Halte Ciledug Tangerang", lat: -6.2550, lng: 106.7050 },
      { name: "Halte Pondok Aren", lat: -6.2660, lng: 106.7010 },
      { name: "Halte Bintaro Jaya", lat: -6.2740, lng: 106.7180 },
      { name: "Halte Ciputat", lat: -6.3185, lng: 106.7380 },
      { name: "Halte Pamulang", lat: -6.3428, lng: 106.7340 },
      { name: "Halte BSD Junction", lat: -6.3020, lng: 106.6585 },
      { name: "Halte Alam Sutera", lat: -6.2405, lng: 106.6480 },
      { name: "Halte Gading Serpong", lat: -6.2280, lng: 106.6310 },
    ],
  },
  {
    corridor: "T-Tangerang Kota",
    name: "Trans Tangerang Kota",
    stops: [
      { name: "Halte Terminal Poris Plawad", lat: -6.1710, lng: 106.6410 },
      { name: "Halte Tangerang City Mall", lat: -6.1785, lng: 106.6290 },
      { name: "Halte Cikokol", lat: -6.1920, lng: 106.6230 },
      { name: "Halte Modernland Tangerang", lat: -6.2040, lng: 106.6295 },
      { name: "Halte Karawaci", lat: -6.2185, lng: 106.6170 },
      { name: "Halte Lippo Karawaci", lat: -6.2280, lng: 106.6115 },
    ],
  },
  // Tangerang Selatan / BSD feeder
  {
    corridor: "T-BSD",
    name: "Trans BSD Feeder",
    stops: [
      { name: "Halte Intermoda BSD", lat: -6.3050, lng: 106.6540 },
      { name: "Halte The Breeze BSD", lat: -6.3010, lng: 106.6430 },
      { name: "Halte AEON Mall BSD", lat: -6.3090, lng: 106.6470 },
      { name: "Halte ICE BSD", lat: -6.3135, lng: 106.6380 },
    ],
  },
  // Bekasi area TransJakarta-integrated routes
  {
    corridor: "T-Bekasi",
    name: "Trans Bekasi Feeder",
    stops: [
      { name: "Halte Terminal Bekasi", lat: -6.2350, lng: 106.9960 },
      { name: "Halte Bekasi Junction", lat: -6.2400, lng: 107.0030 },
      { name: "Halte Grand Galaxy Bekasi", lat: -6.2780, lng: 106.9710 },
      { name: "Halte Jababeka Cikarang", lat: -6.2740, lng: 107.1530 },
      { name: "Halte Mega Bekasi Hypermall", lat: -6.2330, lng: 107.0010 },
    ],
  },
  // Depok area TransJakarta-integrated route
  {
    corridor: "T-Depok",
    name: "Trans Depok Feeder",
    stops: [
      { name: "Halte Terminal Depok", lat: -6.3920, lng: 106.8190 },
      { name: "Halte Margonda Depok", lat: -6.3750, lng: 106.8280 },
      { name: "Halte Depok Town Square", lat: -6.3875, lng: 106.8215 },
      { name: "Halte UI Salemba Depok", lat: -6.3610, lng: 106.8305 },
    ],
  },
  // Jakarta additional corridors for gap filling
  {
    corridor: "Corridor 3F",
    name: "Kalideres – Tangerang",
    stops: [
      { name: "Halte Semanan", lat: -6.1570, lng: 106.7000 },
      { name: "Halte Cengkareng", lat: -6.1523, lng: 106.7210 },
      { name: "Halte Benda", lat: -6.1600, lng: 106.6890 },
    ],
  },
  {
    corridor: "Corridor 5C",
    name: "Ancol – Taman Impian Jaya",
    stops: [
      { name: "Halte Taman Impian Jaya Ancol", lat: -6.1230, lng: 106.8450 },
      { name: "Halte Dunia Fantasi", lat: -6.1210, lng: 106.8360 },
      { name: "Halte Atlantis Ancol", lat: -6.1200, lng: 106.8400 },
    ],
  },
  {
    corridor: "Corridor 6H",
    name: "Ragunan – Pondok Labu",
    stops: [
      { name: "Halte Pondok Labu", lat: -6.3280, lng: 106.7825 },
      { name: "Halte Cinere", lat: -6.3350, lng: 106.7710 },
      { name: "Halte Gandul", lat: -6.3480, lng: 106.7570 },
    ],
  },
  {
    corridor: "Corridor 8E",
    name: "Lebak Bulus – Ciputat",
    stops: [
      { name: "Halte Pondok Pinang", lat: -6.2950, lng: 106.7640 },
      { name: "Halte Ciputat Raya", lat: -6.3180, lng: 106.7400 },
      { name: "Halte Ciputat Timur", lat: -6.3250, lng: 106.7560 },
    ],
  },
  // Bogor area feeder
  {
    corridor: "T-Bogor",
    name: "Trans Bogor Feeder",
    stops: [
      { name: "Halte Terminal Baranangsiang Bogor", lat: -6.5970, lng: 106.7950 },
      { name: "Halte Kebun Raya Bogor", lat: -6.6008, lng: 106.7975 },
      { name: "Halte Pajajaran Bogor", lat: -6.5920, lng: 106.7870 },
      { name: "Halte Cibinong", lat: -6.4810, lng: 106.8500 },
    ],
  },
  // ===== Additional major TransJakarta corridors & cross-corridors =====
  {
    corridor: "Corridor 1A",
    name: "Blok M – Tanah Abang via Sudirman",
    stops: [
      { name: "Halte Senayan JCC", lat: -6.2302, lng: 106.8032 },
      { name: "Halte Semanggi", lat: -6.2196, lng: 106.8121 },
      { name: "Halte Karet Bivak", lat: -6.2060, lng: 106.8120 },
      { name: "Halte Sudirman", lat: -6.2024, lng: 106.8233 },
      { name: "Halte Thamrin GKBI", lat: -6.1955, lng: 106.8206 },
    ],
  },
  {
    corridor: "Corridor 4B",
    name: "Pulo Gadung – Pondok Gede",
    stops: [
      { name: "Halte Penggilingan", lat: -6.2010, lng: 106.9240 },
      { name: "Halte Ujung Menteng", lat: -6.2080, lng: 106.9400 },
      { name: "Halte Stasiun Cakung", lat: -6.2182, lng: 106.9275 },
      { name: "Halte Pondok Gede", lat: -6.2720, lng: 106.9125 },
    ],
  },
  {
    corridor: "Corridor 5D",
    name: "Kampung Melayu – Bekasi Barat",
    stops: [
      { name: "Halte Pondok Bambu", lat: -6.2130, lng: 106.8960 },
      { name: "Halte Duren Sawit", lat: -6.2160, lng: 106.9100 },
      { name: "Halte Klender 2", lat: -6.2175, lng: 106.9077 },
      { name: "Halte Pondok Kopi", lat: -6.2170, lng: 106.9200 },
      { name: "Halte Setu Bekasi", lat: -6.2180, lng: 106.9380 },
    ],
  },
  {
    corridor: "Corridor 7B",
    name: "Kampung Rambutan – Cibubur",
    stops: [
      { name: "Halte Kramat Jati", lat: -6.2850, lng: 106.8730 },
      { name: "Halte Dewi Sartika", lat: -6.2700, lng: 106.8705 },
      { name: "Halte Pondok Ranggon", lat: -6.3300, lng: 106.8830 },
      { name: "Halte Cibubur Junction", lat: -6.3670, lng: 106.8870 },
    ],
  },
  {
    corridor: "Corridor 8B",
    name: "Kebayoran Lama – Grogol",
    stops: [
      { name: "Halte Srengseng", lat: -6.2400, lng: 106.7640 },
      { name: "Halte Pos Pengumben", lat: -6.2240, lng: 106.7660 },
      { name: "Halte Kedoya", lat: -6.1870, lng: 106.7620 },
      { name: "Halte Tomang", lat: -6.1746, lng: 106.7830 },
      { name: "Halte Grogol 2", lat: -6.1626, lng: 106.7843 },
    ],
  },
  {
    corridor: "Corridor 9A",
    name: "Pinang Ranti – Cawang – Kuningan",
    stops: [
      { name: "Halte Buaran 2", lat: -6.2180, lng: 106.9013 },
      { name: "Halte Stasiun Klender", lat: -6.2173, lng: 106.8889 },
      { name: "Halte KPK Kuningan", lat: -6.2190, lng: 106.8280 },
      { name: "Halte Rasuna Said", lat: -6.2160, lng: 106.8340 },
    ],
  },
  {
    corridor: "Corridor 9B",
    name: "Pluit – PIK",
    stops: [
      { name: "Halte Muara Karang", lat: -6.1130, lng: 106.7780 },
      { name: "Halte Pantai Mutiara", lat: -6.1100, lng: 106.7670 },
      { name: "Halte Kapuk Muara", lat: -6.1070, lng: 106.7560 },
    ],
  },
  {
    corridor: "Corridor 10B",
    name: "Tanjung Priok – Cilincing",
    stops: [
      { name: "Halte Cilincing", lat: -6.1060, lng: 106.9340 },
      { name: "Halte Marunda", lat: -6.0980, lng: 106.9500 },
      { name: "Halte Rorotan", lat: -6.1120, lng: 106.9180 },
    ],
  },
  {
    corridor: "Corridor 11A",
    name: "Pulo Gebang – Bekasi",
    stops: [
      { name: "Halte Rawa Terate", lat: -6.2020, lng: 106.9280 },
      { name: "Halte Cakung Barat", lat: -6.2150, lng: 106.9380 },
      { name: "Halte Perumnas Bekasi", lat: -6.2190, lng: 106.9650 },
      { name: "Halte Harapan Baru Bekasi", lat: -6.2170, lng: 106.9800 },
    ],
  },
  {
    corridor: "Corridor 13C",
    name: "Ciledug – Blok M",
    stops: [
      { name: "Halte Pesanggrahan", lat: -6.2580, lng: 106.7420 },
      { name: "Halte Bintaro Sektor 9", lat: -6.2620, lng: 106.7310 },
      { name: "Halte Radio Dalam", lat: -6.2560, lng: 106.7870 },
      { name: "Halte Gandaria", lat: -6.2500, lng: 106.7940 },
      { name: "Halte Melawai", lat: -6.2460, lng: 106.7985 },
    ],
  },
  {
    corridor: "Corridor 13D",
    name: "Tendean – Manggarai",
    stops: [
      { name: "Halte Tegal Parang", lat: -6.2370, lng: 106.8180 },
      { name: "Halte Setiabudi Utara", lat: -6.2280, lng: 106.8280 },
      { name: "Halte Pasar Rumput", lat: -6.2200, lng: 106.8430 },
      { name: "Halte Manggarai 2", lat: -6.2099, lng: 106.8501 },
    ],
  },
  // Major cross-city routes
  {
    corridor: "Corridor T11",
    name: "Tanah Abang – Puri Kembangan",
    stops: [
      { name: "Halte Slipi Jaya", lat: -6.1765, lng: 106.7985 },
      { name: "Halte Kemanggisan", lat: -6.1850, lng: 106.7830 },
      { name: "Halte Kembangan", lat: -6.1810, lng: 106.7560 },
      { name: "Halte Meruya", lat: -6.2060, lng: 106.7410 },
      { name: "Halte Puri Kembangan", lat: -6.1900, lng: 106.7320 },
    ],
  },
  {
    corridor: "Corridor JAK10",
    name: "Tanjung Priok – Cikarang via Tol",
    stops: [
      { name: "Halte Cakung Cilincing", lat: -6.1630, lng: 106.9300 },
      { name: "Halte Marunda Makmur", lat: -6.1090, lng: 106.9420 },
      { name: "Halte Tarumajaya", lat: -6.1190, lng: 106.9680 },
    ],
  },
  {
    corridor: "Corridor JAK11",
    name: "Blok M – Cilandak – TB Simatupang",
    stops: [
      { name: "Halte Santa", lat: -6.2530, lng: 106.8020 },
      { name: "Halte Cilandak Town Square", lat: -6.2870, lng: 106.8020 },
      { name: "Halte Fatmawati 2", lat: -6.2950, lng: 106.7930 },
      { name: "Halte TB Simatupang Cilandak", lat: -6.2920, lng: 106.8100 },
      { name: "Halte Ragunan 2", lat: -6.3050, lng: 106.8210 },
    ],
  },
  {
    corridor: "Corridor JAK12",
    name: "Kemayoran – Sunter – Kelapa Gading",
    stops: [
      { name: "Halte Kemayoran Pasar", lat: -6.1520, lng: 106.8510 },
      { name: "Halte Sunter Agung", lat: -6.1430, lng: 106.8690 },
      { name: "Halte Sunter Podomoro", lat: -6.1390, lng: 106.8740 },
      { name: "Halte Mall Kelapa Gading", lat: -6.1560, lng: 106.9050 },
      { name: "Halte Boulevard Kelapa Gading", lat: -6.1580, lng: 106.9110 },
    ],
  },
  {
    corridor: "Corridor JAK13",
    name: "Senen – Kramat – Matraman",
    stops: [
      { name: "Halte Kramat Sentiong", lat: -6.1800, lng: 106.8450 },
      { name: "Halte Kramat Raya", lat: -6.1820, lng: 106.8480 },
      { name: "Halte Salemba Raya", lat: -6.1870, lng: 106.8440 },
      { name: "Halte Matraman Raya", lat: -6.1960, lng: 106.8520 },
    ],
  },
  {
    corridor: "Corridor JAK14",
    name: "Cempaka Putih – Sunter via Perintis",
    stops: [
      { name: "Halte Cempaka Putih", lat: -6.1710, lng: 106.8660 },
      { name: "Halte Perintis Kemerdekaan", lat: -6.1590, lng: 106.8700 },
      { name: "Halte Sunter Jaya", lat: -6.1380, lng: 106.8750 },
    ],
  },
  {
    corridor: "Corridor JAK15",
    name: "Tebet – Pancoran – Kalibata",
    stops: [
      { name: "Halte Tebet Utara", lat: -6.2290, lng: 106.8560 },
      { name: "Halte Tebet Barat", lat: -6.2330, lng: 106.8490 },
      { name: "Halte Pancoran Barat", lat: -6.2420, lng: 106.8440 },
      { name: "Halte Rawajati", lat: -6.2520, lng: 106.8510 },
    ],
  },
  {
    corridor: "Corridor JAK16",
    name: "Tanjung Barat – Jagakarsa – Lenteng",
    stops: [
      { name: "Halte Jagakarsa", lat: -6.3400, lng: 106.8250 },
      { name: "Halte Srengseng Sawah", lat: -6.3520, lng: 106.8280 },
      { name: "Halte Ciganjur", lat: -6.3350, lng: 106.8180 },
    ],
  },
  {
    corridor: "Corridor JAK17",
    name: "Cawang – Halim – Pondok Gede",
    stops: [
      { name: "Halte Halim PK", lat: -6.2660, lng: 106.8900 },
      { name: "Halte Pondok Gede Plaza", lat: -6.2810, lng: 106.9120 },
      { name: "Halte Jatiwaringin", lat: -6.2720, lng: 106.9090 },
      { name: "Halte Jatibening", lat: -6.2780, lng: 106.9150 },
    ],
  },
  // Extended TransJakarta suburban feeders
  {
    corridor: "T-Bekasi 2",
    name: "Trans Bekasi Timur",
    stops: [
      { name: "Halte Bekasi Timur Plaza", lat: -6.2490, lng: 107.0180 },
      { name: "Halte Tambun Selatan", lat: -6.2530, lng: 107.0410 },
      { name: "Halte Cibitung Bekasi", lat: -6.2580, lng: 107.0710 },
      { name: "Halte Lippo Cikarang", lat: -6.2540, lng: 107.1460 },
    ],
  },
  {
    corridor: "T-Depok 2",
    name: "Trans Depok Sawangan",
    stops: [
      { name: "Halte Sawangan", lat: -6.4200, lng: 106.7680 },
      { name: "Halte Cinangka Depok", lat: -6.4050, lng: 106.7750 },
      { name: "Halte Cipayung Depok", lat: -6.4120, lng: 106.8080 },
      { name: "Halte GDC Depok", lat: -6.3990, lng: 106.8250 },
    ],
  },
  {
    corridor: "T-Tangerang 2",
    name: "Trans Tangerang Selatan",
    stops: [
      { name: "Halte Serpong Utara", lat: -6.3080, lng: 106.6720 },
      { name: "Halte Rawa Buntu 2", lat: -6.3050, lng: 106.6900 },
      { name: "Halte Jelupang", lat: -6.3010, lng: 106.6630 },
      { name: "Halte Lengkong Gudang", lat: -6.3150, lng: 106.6620 },
    ],
  },
  {
    corridor: "T-Tangerang 3",
    name: "Trans Tangerang Airport Link",
    stops: [
      { name: "Halte Bandara Soekarno-Hatta T1", lat: -6.1256, lng: 106.6558 },
      { name: "Halte Bandara Soekarno-Hatta T2", lat: -6.1210, lng: 106.6518 },
      { name: "Halte Bandara Soekarno-Hatta T3", lat: -6.1280, lng: 106.6600 },
      { name: "Halte Neglasari", lat: -6.1430, lng: 106.6410 },
      { name: "Halte Batuceper 2", lat: -6.1740, lng: 106.6540 },
    ],
  },
  // Bogor-Depok connecting routes
  {
    corridor: "T-Bogor 2",
    name: "Trans Bogor Depok",
    stops: [
      { name: "Halte Cibinong City Mall", lat: -6.4790, lng: 106.8520 },
      { name: "Halte Sentul City", lat: -6.5570, lng: 106.8480 },
      { name: "Halte Pakansari Cibinong", lat: -6.4750, lng: 106.8430 },
      { name: "Halte Bojong Gede 2", lat: -6.4810, lng: 106.7960 },
    ],
  },
  // Ciputat - Parung cross-route
  {
    corridor: "T-Tangsel 2",
    name: "Trans Tangsel Ciputat Parung",
    stops: [
      { name: "Halte Ciputat Parung", lat: -6.3380, lng: 106.7310 },
      { name: "Halte Sawangan 2", lat: -6.4100, lng: 106.7660 },
      { name: "Halte Parung", lat: -6.4200, lng: 106.7320 },
      { name: "Halte Cimanggis", lat: -6.3700, lng: 106.8520 },
    ],
  },
  // Additional suburban Jakarta stops
  {
    corridor: "Corridor JAK18",
    name: "Manggarai – MT Haryono – Kalibata",
    stops: [
      { name: "Halte MT Haryono", lat: -6.2200, lng: 106.8560 },
      { name: "Halte Gatot Subroto Pancoran", lat: -6.2350, lng: 106.8460 },
      { name: "Halte Pancoran Timur", lat: -6.2440, lng: 106.8520 },
    ],
  },
  {
    corridor: "Corridor JAK19",
    name: "Cengkareng – Airport – Batu Ceper",
    stops: [
      { name: "Halte Cengkareng Barat", lat: -6.1510, lng: 106.7080 },
      { name: "Halte Kamal Muara", lat: -6.1310, lng: 106.7180 },
      { name: "Halte Dadap", lat: -6.1310, lng: 106.6920 },
    ],
  },
  {
    corridor: "Corridor JAK20",
    name: "Pasar Minggu – Jagakarsa – Depok",
    stops: [
      { name: "Halte Pasar Minggu 2", lat: -6.2850, lng: 106.8440 },
      { name: "Halte Pejaten Barat", lat: -6.2730, lng: 106.8300 },
      { name: "Halte Cilandak Barat", lat: -6.2800, lng: 106.7950 },
    ],
  },
  {
    corridor: "Corridor JAK21",
    name: "Kelapa Gading – Cakung – Bekasi",
    stops: [
      { name: "Halte Pegangsaan Dua", lat: -6.1570, lng: 106.9130 },
      { name: "Halte Cakung Timur", lat: -6.1850, lng: 106.9380 },
      { name: "Halte Pulogebang Terminal", lat: -6.2000, lng: 106.9400 },
      { name: "Halte Jatiasih Bekasi", lat: -6.2870, lng: 106.9560 },
    ],
  },
  {
    corridor: "Corridor JAK22",
    name: "Harmoni – Kota Tua – Sunda Kelapa",
    stops: [
      { name: "Halte Kota Tua", lat: -6.1350, lng: 106.8130 },
      { name: "Halte Sunda Kelapa", lat: -6.1210, lng: 106.8090 },
      { name: "Halte Fatahillah", lat: -6.1345, lng: 106.8135 },
    ],
  },
  {
    corridor: "Corridor JAK23",
    name: "Grogol – Cengkareng – Bandara",
    stops: [
      { name: "Halte Daan Mogot", lat: -6.1665, lng: 106.7750 },
      { name: "Halte Cengkareng Permai", lat: -6.1580, lng: 106.7300 },
      { name: "Halte Tangerang Kota 2", lat: -6.1780, lng: 106.6300 },
    ],
  },
];

// Build features
console.log("Generating transit stops for Jabodetabek...");
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

// LRT stations
for (const station of LRT_STATIONS) {
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
      type: "lrt",
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
const lineCounts = {};
for (const f of features) {
  const t = f.properties.type;
  const l = f.properties.line;
  typeCounts[t] = (typeCounts[t] || 0) + 1;
  lineCounts[l] = (lineCounts[l] || 0) + 1;
}

console.log(`\nSaved ${features.length} transit stops to ${outputPath}`);
console.log("\nType breakdown:", typeCounts);
console.log("\nLine breakdown:", lineCounts);
