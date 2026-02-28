/**
 * Generate sample jakarta_pois.geojson with ~400 POIs across 12 categories.
 *
 * POIs are distributed more densely in central Jakarta and sparser at the periphery.
 * Each POI gets its containing H3 index computed.
 *
 * Usage: node scripts/generate-sample-pois.mjs
 */

import h3 from "h3-js";
const { latLngToCell } = h3;
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const H3_RESOLUTION = 8;

// Jakarta bounding box
const BBOX = {
  min_lat: -6.3701,
  min_lng: 106.6889,
  max_lat: -6.0873,
  max_lng: 107.0024,
};

// Central Jakarta cluster center (denser POI distribution)
const CENTER = { lat: -6.195, lng: 106.845 };

// ----- POI Name Pools (12 categories) -----

const HOSPITALS = [
  "RS Fatmawati", "RSUD Pasar Minggu", "RS Persahabatan", "RS Cipto Mangunkusumo",
  "RS Harapan Kita", "RS Dharmais", "RSPAD Gatot Soebroto", "RS PIK",
  "RS Hermina Kemayoran", "RSUD Koja", "RS Tarakan", "RSCM Kencana",
  "RS Metropolitan Medical Centre", "RS Pondok Indah", "RS Medistra",
  "RS Siloam Kebon Jeruk", "RS Premier Jatinegara", "RS St. Carolus",
  "RS Islam Jakarta", "RS Mitra Keluarga Kelapa Gading",
  "RS Pelni", "RSUD Cengkareng", "RS Mayapada Kuningan",
];

const CLINICS = [
  "Puskesmas Kecamatan Menteng", "Klinik Kimia Farma Sudirman",
  "Puskesmas Tebet", "Puskesmas Kebayoran Baru", "Klinik Pratama Sehat Jaya",
  "Puskesmas Jatinegara", "Puskesmas Cempaka Putih", "Klinik Prodia Kramat",
  "Puskesmas Gambir", "Puskesmas Taman Sari", "Klinik Medika Plaza",
  "Puskesmas Matraman", "Puskesmas Johar Baru", "Klinik Cipto Annex",
  "Puskesmas Pasar Rebo", "Puskesmas Ciracas", "Klinik Raya Bogor",
  "Puskesmas Koja", "Puskesmas Penjaringan", "Klinik Sunter Medika",
  "Puskesmas Kemayoran", "Puskesmas Tanah Abang", "Klinik Halim Medical",
  "Puskesmas Cipayung", "Puskesmas Duren Sawit", "Klinik Kalimalang Sehat",
  "Puskesmas Kramat Jati", "Puskesmas Mampang Prapatan", "Klinik Senopati Medical",
  "Puskesmas Cilandak", "Puskesmas Pesanggrahan", "Klinik Bintaro Sehat",
  "Puskesmas Grogol Petamburan", "Puskesmas Cengkareng", "Klinik Meruya Medika",
  "Puskesmas Kebon Jeruk", "Puskesmas Kembangan", "Klinik Srengseng Medika",
  "Puskesmas Pademangan", "Puskesmas Kelapa Gading",
];

const PHARMACIES = [
  "Apotek Kimia Farma Sudirman", "Apotek K-24 Menteng", "Apotek Century Kuningan",
  "Apotek Guardian Senayan City", "Apotek Viva Generik Tebet", "Apotek Roxy Mas",
  "Apotek K-24 Kelapa Gading", "Apotek Kimia Farma Mangga Dua",
  "Apotek Century Pondok Indah", "Apotek Guardian Grand Indonesia",
  "Apotek Viva Health Cikini", "Apotek K-24 Rawamangun",
  "Apotek Kimia Farma Fatmawati", "Apotek Century Kemang",
  "Apotek K-24 Cengkareng", "Apotek Kimia Farma Pasar Minggu",
  "Apotek Guardian Kota Kasablanka", "Apotek K-24 Jatinegara",
  "Apotek Century Pluit", "Apotek Kimia Farma Tanah Abang",
  "Apotek K-24 Cipulir", "Apotek Viva Generik Kebon Jeruk",
  "Apotek Kimia Farma Kramat Jati", "Apotek Century Sunter",
  "Apotek K-24 Duren Sawit", "Apotek Guardian Pacific Place",
  "Apotek Kimia Farma Cawang", "Apotek K-24 Koja",
  "Apotek Century Cipete", "Apotek Viva Generik Palmerah",
];

const RESTAURANTS = [
  "RM Padang Sederhana Sudirman", "Sate Khas Senayan", "Bakmi GM Menteng",
  "Nasi Goreng Kebon Sirih", "RM Sunda Sambara", "Soto Betawi H. Ma'ruf",
  "Bakso Pak Kumis Tebet", "Nasi Uduk Gondangdia", "Ayam Goreng Suharti",
  "RM Padang Garuda Falatehan", "Sate Taichan Senayan", "Warung Tekko Cikini",
  "RM Sari Ratu Menteng", "Bakmi Golek Kelapa Gading", "Nasi Goreng Kambing Kebon Sirih",
  "Soto Mie Bogor Rawamangun", "Bakso Solo Samrat", "Ayam Bakar Wong Solo",
  "RM Sederhana Bintaro", "Sate Padang Ajo Ramon", "Warung Nasi Ampera",
  "Bakmi Effata Kelapa Gading", "Nasi Kebuli Arab Tanah Abang",
  "RM Dapur Sunda Kemang", "Soto Kudus Blok M", "Bakso Boedjangan Senopati",
  "Nasi Goreng Mafia Tebet", "RM Betawi H. Naim Condet", "Ayam Geprek Bensu",
  "Sate Madura Cak Eko", "Warung Bu Kris Menteng", "Bakmi Naga Mangga Besar",
  "RM Ikan Bakar Cianjur Mampang", "Soto Lamongan Cak Har",
  "Nasi Padang Pagi Sore Blok M", "Bakso Malang Karapitan",
  "Ayam Presto Bu Mulyani", "Sate Kambing Pak Bari",
  "RM Sari Bundo Gambir", "Warung Tegal Bahari",
];

const CAFES = [
  "Starbucks Sudirman", "Kopi Kenangan Menteng", "Fore Coffee Kuningan",
  "Janji Jiwa Tebet", "Anomali Coffee Kemang", "Djournal Coffee Senayan",
  "Kopi Tuku Fatmawati", "Common Grounds Senopati", "Harvest Kemang",
  "Tanamera Coffee Cipete", "Starbucks Grand Indonesia", "Kopi Kenangan Kelapa Gading",
  "Fore Coffee Cikini", "Janji Jiwa Rawamangun", "Anomali Coffee Setiabudi",
  "Djournal Coffee Pacific Place", "Kopi Tuku Blok M", "Flash Coffee Sudirman",
  "Kopi Kenangan Mangga Dua", "Starbucks Pondok Indah",
  "Fore Coffee Tanah Abang", "Janji Jiwa Cengkareng",
  "Anomali Coffee Blok M", "Kopi Kenangan Pasar Minggu",
  "Starbucks Kota Kasablanka", "Fore Coffee Jatinegara",
  "Janji Jiwa Sunter", "Kopi Kenangan Cipulir",
  "Flash Coffee Kebayoran", "Tanamera Coffee Menteng",
];

const MARKETS = [
  "Pasar Tanah Abang", "Pasar Senen", "Pasar Mayestik", "Pasar Santa",
  "Pasar Kebayoran Lama", "Pasar Jatinegara", "Pasar Palmerah", "Pasar Cipulir",
  "Pasar Tebet", "Pasar Minggu", "Pasar Kramat Jati", "Pasar Cempaka Putih",
  "Pasar Koja", "Pasar Pramuka", "Pasar Rawabadak", "Pasar Grogol",
  "Pasar Cengkareng", "Pasar Glodok", "Pasar Baru", "Pasar Manggis",
  "Pasar Bendungan Hilir", "Pasar Pondok Labu", "Pasar Lenteng Agung",
  "Pasar Kelapa Gading", "Pasar Sunter", "Pasar Pluit", "Pasar Muara Karang",
  "Pasar Tomang", "Pasar Kebon Kacang", "Pasar Petojo",
  "Pasar Rawa Belong", "Pasar Mampang", "Pasar Blok A",
  "Pasar Asemka", "Pasar Cideng", "Pasar Kalibata",
  "Pasar Cakung", "Pasar Klender", "Pasar Pulogadung",
];

const SUPERMARKETS = [
  "Giant Pondok Indah", "Transmart Cempaka Putih", "Superindo Menteng",
  "Ranch Market Kemang", "Farmers Market Kuningan", "Hypermart Kelapa Gading",
  "Lotte Mart Fatmawati", "Giant Mampang", "Superindo Tebet",
  "Transmart Cilandak", "Giant Bintaro", "Superindo Cikini",
  "Ranch Market Pesanggrahan", "Hypermart Puri", "Lotte Mart Gandaria",
  "Giant Kramat Jati", "Superindo Rawamangun", "Transmart Cengkareng",
  "Hypermart Sunter", "Giant Pluit", "Superindo Jatinegara",
  "Farmers Market Pondok Indah", "Ranch Market PIK",
  "Lotte Mart Mangga Dua", "Giant Pasar Minggu", "Superindo Grogol",
  "Transmart Duren Sawit", "Hypermart Cakung", "Giant Ciracas",
  "Superindo Kemayoran", "Ranch Market Senayan", "Transmart Tanjung Priok",
  "Giant Kalideres", "Superindo Cipete", "Lotte Mart Kuningan",
  "Transmart Kebayoran",
];

const SCHOOLS = [
  "SDN Menteng 01", "SMAN 8 Jakarta", "SMP Labschool Rawamangun",
  "SDN Gondangdia 01", "SMAN 68 Jakarta", "SMA Kolese Gonzaga",
  "SDN Cikini 02", "SMPN 19 Jakarta", "SMAN 4 Jakarta",
  "SDN Pegangsaan 01", "SMPN 1 Jakarta", "SMAN 1 Jakarta",
  "SDN Kenari 07", "SMPN 216 Jakarta", "SMAN 6 Jakarta",
  "SDN Cideng 18", "SMPN 49 Jakarta", "SMA Tarakanita",
  "SDN Pejompongan 01", "SMPN 30 Jakarta", "SMAN 70 Jakarta",
  "SDN Bendungan Hilir 01", "SMPN 7 Jakarta", "SMA Don Bosco",
  "SDN Kebon Sirih 01", "SMPN 115 Jakarta", "SMAN 35 Jakarta",
  "SDN Mangga Besar 03", "SMPN 5 Jakarta", "SMAN 78 Jakarta",
  "SDN Kampung Melayu 01", "SMPN 103 Jakarta", "SMAN 14 Jakarta",
  "SDN Tebet Barat 01", "SMPN 73 Jakarta", "SMAN 26 Jakarta",
  "SDN Mampang 09", "SMPN 68 Jakarta", "SMAN 46 Jakarta",
  "SDN Kebayoran Baru 12", "SMPN 29 Jakarta", "SMAN 82 Jakarta",
  "SDN Cipete Utara 03", "SMPN 161 Jakarta", "SMAN 34 Jakarta",
  "SDN Cilandak Barat 04", "SMPN 177 Jakarta", "SMAN 47 Jakarta",
  "SDN Kelapa Gading 01", "SMPN 123 Jakarta", "SMAN 13 Jakarta",
  "SDN Sunter Jaya 08", "SMPN 92 Jakarta", "SMAN 52 Jakarta",
  "SDN Koja 05", "SMPN 145 Jakarta", "SMAN 15 Jakarta",
  "SDN Grogol 06", "SMPN 41 Jakarta", "SMAN 112 Jakarta",
];

const UNIVERSITIES = [
  "Universitas Indonesia (UI)", "Universitas Trisakti", "Universitas Bina Nusantara (BINUS)",
  "Universitas Tarumanagara", "Universitas Atma Jaya", "Universitas Pelita Harapan",
  "UIN Syarif Hidayatullah", "Universitas Nasional (UNAS)", "Universitas Mercu Buana",
  "Universitas Muhammadiyah Jakarta", "STIE Jakarta", "Universitas Jayabaya",
  "Universitas Pancasila", "Universitas Gunadarma Depok", "Institut Teknologi PLN",
];

const PARKS = [
  "Taman Suropati", "Taman Menteng", "Taman Lapangan Banteng",
  "Hutan Kota Srengseng", "Taman Cattleya", "Taman Langsat",
  "Taman Situ Lembang", "Taman Ayodia", "Taman Honda Tebet",
  "Taman Monas", "Taman Waduk Pluit", "Taman BMW",
  "Taman Interaksi Cibubur", "Taman Hutan Kota Penjaringan",
  "Taman Tomang", "Taman Fatahillah", "Taman Ismail Marzuki",
  "Taman Proklamasi", "Taman Mataram", "Taman Puring",
  "Kebun Binatang Ragunan", "Taman Mini Indonesia Indah",
  "Taman Semanggi", "Taman Cempaka", "Taman Kodok Menteng",
  "Taman Dukuh Atas", "Taman Kalijodo", "Taman Literasi Martha Tiahahu",
  "Taman Margasatwa Ragunan", "Taman Spathodea",
];

const WORSHIP = [
  "Masjid Istiqlal", "Gereja Katedral Jakarta", "Vihara Dharma Bhakti",
  "Pura Adhitya Jaya Rawamangun", "Masjid Sunda Kelapa", "Gereja GPIB Immanuel",
  "Masjid Al-Azhar Kebayoran", "Gereja Bethel Indonesia Petamburan",
  "Masjid Cut Meutia Menteng", "Kelenteng Jin De Yuan Glodok",
  "Masjid Agung At-Tin TMII", "Gereja Santa Theresia Menteng",
  "Masjid Raya Pondok Indah", "Gereja Kristus Yesus Mangga Besar",
  "Masjid Al-Ihsan Cipete", "Masjid Jamie Luar Batang",
  "Gereja HKBP Sudirman", "Masjid An-Nur Koja",
  "Gereja GBI Fatmawati", "Masjid Al-Ikhlas Cipulir",
  "Kelenteng Tien Kok Sie Pasar Baru", "Masjid Baiturrahman Senen",
  "Gereja GPIB Paulus Menteng", "Masjid Jami Al-Makmur Cikini",
  "Masjid Al-Furqon Duren Sawit",
];

const BANKS = [
  "Bank BCA KCP Sudirman", "Bank Mandiri Cabang Menteng", "Bank BRI Unit Tebet",
  "Bank BNI Cabang Kuningan", "Bank BCA KCP Kelapa Gading", "Bank Mandiri Cabang Kemang",
  "Bank BRI Unit Cengkareng", "Bank BNI Cabang Mangga Dua",
  "Bank BCA KCP Pondok Indah", "Bank Mandiri Cabang Fatmawati",
  "Bank BRI Unit Jatinegara", "Bank BNI Cabang Pluit",
  "Bank BCA KCP Senayan", "Bank Mandiri Cabang Tanah Abang",
  "Bank BRI Unit Rawamangun", "Bank BNI Cabang Kebon Jeruk",
  "Bank BCA KCP Cikini", "Bank Mandiri Cabang Kramat Jati",
  "Bank BRI Unit Sunter", "Bank BNI Cabang Pasar Minggu",
];

const POI_POOLS = {
  hospital: HOSPITALS,
  clinic: CLINICS,
  pharmacy: PHARMACIES,
  restaurant: RESTAURANTS,
  cafe: CAFES,
  market: MARKETS,
  supermarket: SUPERMARKETS,
  school: SCHOOLS,
  university: UNIVERSITIES,
  park: PARKS,
  worship: WORSHIP,
  bank: BANKS,
};

// Generate a random coordinate, biased towards center Jakarta
function randomCoord() {
  // 60% chance of central cluster, 40% spread across bbox
  const central = Math.random() < 0.6;

  if (central) {
    // Gaussian-ish around center
    const lat = CENTER.lat + (Math.random() - 0.5) * 0.08 + (Math.random() - 0.5) * 0.04;
    const lng = CENTER.lng + (Math.random() - 0.5) * 0.1 + (Math.random() - 0.5) * 0.05;
    return {
      lat: Math.max(BBOX.min_lat, Math.min(BBOX.max_lat, lat)),
      lng: Math.max(BBOX.min_lng, Math.min(BBOX.max_lng, lng)),
    };
  }

  return {
    lat: BBOX.min_lat + Math.random() * (BBOX.max_lat - BBOX.min_lat),
    lng: BBOX.min_lng + Math.random() * (BBOX.max_lng - BBOX.min_lng),
  };
}

// Build features
console.log("Generating sample POIs for Jakarta (12 categories)...");

const features = [];
let poiId = 0;

for (const [category, names] of Object.entries(POI_POOLS)) {
  for (const name of names) {
    const { lat, lng } = randomCoord();
    const h3Index = latLngToCell(lat, lng, H3_RESOLUTION);

    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [Math.round(lng * 100000) / 100000, Math.round(lat * 100000) / 100000],
      },
      properties: {
        id: `poi_${String(poiId++).padStart(3, "0")}`,
        name,
        category,
        h3_index: h3Index,
      },
    });
  }
}

const geojson = { type: "FeatureCollection", features };

// Write output
const outputDir = join(__dirname, "..", "public", "data");
mkdirSync(outputDir, { recursive: true });
const outputPath = join(outputDir, "jakarta_pois.geojson");
writeFileSync(outputPath, JSON.stringify(geojson));

// Stats
const categoryCounts = {};
for (const f of features) {
  const cat = f.properties.category;
  categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
}

console.log(`Saved ${features.length} POIs to ${outputPath}`);
console.log("Category breakdown:", categoryCounts);
