/**
 * Generate sample jakarta_pois.geojson with ~650-700 POIs across 12 categories.
 *
 * Covers Jabodetabek: Jakarta + Bogor + Depok + Tangerang + Bekasi.
 * POIs are distributed ~50% in Jakarta (central cluster bias) and ~50% across
 * satellite cities, each with its own urban-core cluster.
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

// Jabodetabek bounding box
const BBOX = {
  min_lat: -6.65,
  min_lng: 106.48,
  max_lat: -6.08,
  max_lng: 107.15,
};

// ----- Cluster centers -----

const CENTERS = {
  jakarta: { lat: -6.195, lng: 106.845 },
  bogor: { lat: -6.595, lng: 106.797 },
  depok: { lat: -6.392, lng: 106.822 },
  tangerang: { lat: -6.178, lng: 106.630 },
  tangerang_selatan: { lat: -6.300, lng: 106.660 },
  bekasi: { lat: -6.248, lng: 107.000 },
};

// ----- POI Name Pools (12 categories) -----
// Jakarta names come first; satellite-city names are appended after the existing lists.

const HOSPITALS = [
  // Jakarta (existing)
  "RS Fatmawati", "RSUD Pasar Minggu", "RS Persahabatan", "RS Cipto Mangunkusumo",
  "RS Harapan Kita", "RS Dharmais", "RSPAD Gatot Soebroto", "RS PIK",
  "RS Hermina Kemayoran", "RSUD Koja", "RS Tarakan", "RSCM Kencana",
  "RS Metropolitan Medical Centre", "RS Pondok Indah", "RS Medistra",
  "RS Siloam Kebon Jeruk", "RS Premier Jatinegara", "RS St. Carolus",
  "RS Islam Jakarta", "RS Mitra Keluarga Kelapa Gading",
  "RS Pelni", "RSUD Cengkareng", "RS Mayapada Kuningan",
  // Bogor
  "RS PMI Bogor", "RSUD Kota Bogor", "RS Hermina Bogor", "RS Azra Bogor",
  "RS Salak Bogor", "RSB Bogor Medical Center",
  // Depok
  "RS UI Depok", "RSUD Kota Depok", "RS Hermina Depok", "RS Hasanah Graha Afiah",
  "RS Melia Cibubur",
  // Tangerang
  "RS Siloam Lippo Village", "RSUD Tangerang", "RS Hermina Tangerang",
  "RS Awal Bros Tangerang", "RS Eka Hospital BSD",
  "RS Bethsaida Gading Serpong",
  // Bekasi
  "RS Mitra Keluarga Bekasi", "RSUD Kota Bekasi", "RS Hermina Bekasi",
  "RS Anna Bekasi", "RS Permata Bekasi", "RS Hosana Medica Bekasi",
  "RS Kartika Husada Jatiasih", "RS Mekar Sari Bekasi",
];

const CLINICS = [
  // Jakarta (existing)
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
  // Bogor
  "Puskesmas Bogor Tengah", "Puskesmas Tanah Sareal", "Klinik Kimia Farma Bogor",
  "Puskesmas Bogor Utara", "Klinik Pratama Bogor Sehat",
  // Depok
  "Puskesmas Cimanggis", "Puskesmas Beji Depok", "Klinik Kimia Farma Depok",
  "Puskesmas Pancoran Mas", "Klinik Margonda Sehat",
  // Tangerang
  "Puskesmas Ciputat", "Puskesmas Ciledug", "Klinik Kimia Farma BSD",
  "Puskesmas Pondok Aren", "Klinik Pratama Serpong", "Puskesmas Karawaci",
  // Bekasi
  "Puskesmas Bekasi Barat", "Puskesmas Jatiasih", "Klinik Kimia Farma Bekasi",
  "Puskesmas Pondok Gede", "Klinik Galaxy Sehat Bekasi",
  "Puskesmas Bekasi Timur", "Klinik Harapan Indah Sehat",
  // More Tangerang
  "Puskesmas Serpong", "Puskesmas Gading Serpong", "Klinik Medika BSD",
  // More Bogor
  "Puskesmas Bogor Selatan", "Klinik Sehat Sentosa Bogor",
  // More Depok
  "Puskesmas Sawangan Depok", "Klinik Pratama Cinere Depok",
];

const PHARMACIES = [
  // Jakarta (existing)
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
  // Bogor
  "Apotek Kimia Farma Bogor", "Apotek K-24 Pajajaran Bogor",
  "Apotek Century Botani Square", "Apotek Guardian Bogor Trade Mall",
  // Depok
  "Apotek Kimia Farma Margonda", "Apotek K-24 Depok",
  "Apotek Century Margo City", "Apotek Guardian ITC Depok",
  // Tangerang
  "Apotek Kimia Farma BSD", "Apotek K-24 Gading Serpong",
  "Apotek Century AEON BSD", "Apotek Guardian Living World Alam Sutera",
  "Apotek K-24 Ciputat",
  // Bekasi
  "Apotek Kimia Farma Bekasi", "Apotek K-24 Summarecon Bekasi",
  "Apotek Century Metropolitan Mall", "Apotek Guardian Grand Galaxy",
  "Apotek K-24 Jatiasih",
  // More Bogor
  "Apotek Viva Generik Bogor", "Apotek K-24 Bogor Kota",
  // More Depok
  "Apotek Viva Generik Depok", "Apotek K-24 Sawangan Depok",
  // More Tangerang
  "Apotek Viva Generik Serpong", "Apotek K-24 Karawaci",
];

const RESTAURANTS = [
  // Jakarta (existing)
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
  // Bogor
  "Soto Kuning Pak Yusup Bogor", "RM Sunda Cibiuk Bogor", "Macaroni Panggang Bogor",
  "Bakso Pak Djo Bogor", "RM Padang Simpang Raya Bogor", "Ayam Goreng Fatmawati Bogor",
  "Sate Maranggi Sari Asih Bogor", "Warung Nasi Timbel Bogor",
  // Depok
  "RM Padang Sederhana Margonda", "Bakso Benhil Depok", "Soto Betawi H. Husein Depok",
  "Ayam Bakar Mas Mono Depok", "Warung Steak Depok", "Nasi Uduk Bang Udin Depok",
  // Tangerang
  "RM Sunda Sambara BSD", "Sate Taichan Goreng Tangerang", "Bakmi GM Alam Sutera",
  "Nasi Goreng Gila Serpong", "RM Padang Sari Ratu BSD", "Ayam Bakar Mas Mono BSD",
  "Warung Leko Gading Serpong", "Bakso Boedjangan Bintaro",
  // Bekasi
  "RM Padang Sederhana Bekasi", "Soto Tangkar Bekasi", "Bakso Malang Bekasi",
  "Ayam Goreng Ny. Suharti Bekasi", "Nasi Goreng Kambing Bekasi",
  "Warung Tegal Jatiasih", "Sate Padang Bekasi", "RM Betawi Kalimalang",
  // More Tangerang
  "Warung Nasi Timbel BSD", "Nasi Goreng Kambing Ciputat", "Soto Tangkar Tangerang",
  "Bakmi GM Gading Serpong", "Ayam Bakar Taliwang Serpong",
  // More Bogor
  "Nasi Liwet Asli Bogor", "Laksa Bogor Pak H. Odo", "RM Batagor Kingsley Bogor",
  // More Depok
  "Soto Betawi Margonda", "Bakso President Depok", "Ayam Geprek Depok",
  // More Bekasi
  "Nasi Uduk Betawi Bekasi", "RM Sunda Hegar Bekasi", "Warung Tegal Tambun",
];

const CAFES = [
  // Jakarta (existing)
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
  // Bogor
  "Kopi Kenangan Botani Square", "Starbucks Bogor Trade Mall",
  "Fore Coffee Pajajaran Bogor", "Janji Jiwa Bogor", "Ngopi Doeloe Bogor",
  "Coffee Toffee Bogor",
  // Depok
  "Kopi Kenangan Margonda", "Starbucks Margo City", "Fore Coffee Depok",
  "Janji Jiwa ITC Depok", "Flash Coffee Depok",
  // Tangerang
  "Starbucks AEON Mall BSD", "Kopi Kenangan Living World", "Fore Coffee Alam Sutera",
  "Janji Jiwa Gading Serpong", "Anomali Coffee BSD", "Flash Coffee Bintaro",
  // Bekasi
  "Starbucks Summarecon Bekasi", "Kopi Kenangan Metropolitan Mall",
  "Fore Coffee Grand Galaxy", "Janji Jiwa Bekasi Square",
  "Flash Coffee Harapan Indah",
  // More Bogor
  "Kopi Nako Bogor", "Starbucks Pajajaran Bogor", "Janji Jiwa Bogor Kota",
  // More Depok
  "Kopi Nako Margonda", "Anomali Coffee Depok",
  // More Tangerang
  "Kopi Kenangan Bintaro", "Starbucks Gading Serpong", "Tanamera Coffee BSD",
  // More Bekasi
  "Kopi Kenangan Bekasi Square", "Anomali Coffee Summarecon Bekasi",
];

const MARKETS = [
  // Jakarta (existing)
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
  // Bogor
  "Pasar Bogor", "Pasar Anyar Bogor", "Pasar Kebon Kembang Bogor",
  "Pasar Gunung Batu Bogor", "Pasar Jambu Dua Bogor",
  // Depok
  "Pasar Kemiri Muka Depok", "Pasar Palapa Depok", "Pasar Cisalak Depok",
  "Pasar Agung Depok",
  // Tangerang
  "Pasar Serpong", "Pasar Ciputat", "Pasar Ciledug", "Pasar BSD",
  "Pasar Modern Intermoda BSD", "Pasar Tangerang Kota",
  // Bekasi
  "Pasar Bekasi", "Pasar Pondok Gede", "Pasar Kranji Bekasi",
  "Pasar Bantar Gebang", "Pasar Tambun",
  // More Bogor
  "Pasar Bogor Baru", "Pasar Tanah Baru Bogor",
  // More Depok
  "Pasar Depok Jaya", "Pasar Sukmajaya Depok",
  // More Tangerang
  "Pasar Jatiuwung Tangerang", "Pasar Bintaro Sektor 2",
  // More Bekasi
  "Pasar Harapan Indah Bekasi", "Pasar Jatiasih",
];

const SUPERMARKETS = [
  // Jakarta (existing)
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
  // Bogor
  "Giant Botani Square", "Superindo Pajajaran Bogor", "Transmart Bogor",
  "Yogya Bogor Trade Mall",
  // Depok
  "Giant Margo City", "Superindo Margonda", "Transmart Depok",
  "Hypermart ITC Depok",
  // Tangerang
  "Giant AEON Mall BSD", "Superindo Gading Serpong", "Transmart Alam Sutera",
  "Hypermart Living World BSD", "Lotte Mart Bintaro", "Ranch Market BSD",
  // Bekasi
  "Giant Summarecon Bekasi", "Superindo Grand Galaxy", "Transmart Bekasi",
  "Hypermart Metropolitan Mall", "Lotte Mart Jatiasih",
];

const SCHOOLS = [
  // Jakarta (existing)
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
  // Bogor
  "SMAN 1 Bogor", "SMPN 1 Bogor", "SDN Polisi 1 Bogor",
  "SMA Budi Mulia Bogor", "SMPN 5 Bogor", "SDN Pengadilan 5 Bogor",
  "SMAN 3 Bogor", "SMA Regina Pacis Bogor",
  // Depok
  "SMAN 1 Depok", "SMPN 1 Depok", "SDN Depok 01",
  "SMA Yasporbi Depok", "SMPN 3 Depok", "SDN Beji 01 Depok",
  "SMAN 2 Depok", "SMA Al-Hasra Depok",
  // Tangerang
  "SMAN 1 Tangerang", "SMPN 1 Tangerang Selatan", "SDN Serpong 01",
  "SMA Pahoa Gading Serpong", "SMPN 1 BSD", "SDN Ciputat 01",
  "SMAN 1 Tangerang Selatan", "SMA Stella Maris BSD",
  "SDN Pondok Aren 01", "SMA Citra Berkat BSD",
  // Bekasi
  "SMAN 1 Bekasi", "SMPN 1 Bekasi", "SDN Bekasi Jaya 01",
  "SMA Marsudirini Bekasi", "SMPN 3 Bekasi", "SDN Jatiasih 01",
  "SMAN 2 Bekasi", "SMA Al-Azhar Bekasi", "SDN Pondok Gede 01",
  // More Bogor
  "SDN Bogor Tengah 01", "SMPN 4 Bogor", "SDN Tanah Sareal 03",
  // More Depok
  "SDN Margonda 01", "SMPN 7 Depok", "SDN Sawangan 02 Depok",
  // More Tangerang
  "SDN BSD 01", "SMPN 2 Serpong", "SDN Bintaro 03",
  // More Bekasi
  "SDN Harapan Indah 01", "SMPN 5 Bekasi", "SDN Tambun 04",
];

const UNIVERSITIES = [
  // Jakarta (existing)
  "Universitas Indonesia (UI)", "Universitas Trisakti", "Universitas Bina Nusantara (BINUS)",
  "Universitas Tarumanagara", "Universitas Atma Jaya", "Universitas Pelita Harapan",
  "UIN Syarif Hidayatullah", "Universitas Nasional (UNAS)", "Universitas Mercu Buana",
  "Universitas Muhammadiyah Jakarta", "STIE Jakarta", "Universitas Jayabaya",
  "Universitas Pancasila", "Universitas Gunadarma Depok", "Institut Teknologi PLN",
  // Bogor
  "Institut Pertanian Bogor (IPB)", "Universitas Pakuan Bogor",
  "Universitas Djuanda Bogor", "Universitas Nusa Bangsa Bogor",
  // Depok
  "Universitas Indonesia Kampus Depok", "Universitas Gunadarma Kampus D",
  "Politeknik Negeri Jakarta Depok", "BSI Universitas Depok",
  // Tangerang
  "Universitas Pelita Harapan Karawaci", "Universitas Multimedia Nusantara",
  "Swiss German University BSD", "Universitas Bina Nusantara Alam Sutera",
  "Universitas Islam Syekh Yusuf Tangerang",
  // Bekasi
  "Universitas Islam 45 Bekasi", "Presiden University Cikarang",
  "STIE Muhammadiyah Bekasi", "Universitas Bhayangkara Jakarta Raya",
];

const PARKS = [
  // Jakarta (existing)
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
  // Bogor
  "Kebun Raya Bogor", "Taman Kencana Bogor", "Taman Sempur Bogor",
  "Taman Ekspresi Bogor", "Hutan Kota Bogor",
  // Depok
  "Taman Lembah Gurame Depok", "Alun-Alun Depok", "Hutan Kota UI Depok",
  "Taman Pramuka Depok",
  // Tangerang
  "Taman Kota BSD", "Taman Potret Tangerang", "Scientia Square Park Serpong",
  "Taman Jaletreng Tangerang", "Ocean Park BSD",
  // Bekasi
  "Taman Alun-Alun Bekasi", "Taman Hutan Kota Bekasi",
  "Taman Galaxy Bekasi", "Taman Patriot Bekasi",
];

const WORSHIP = [
  // Jakarta (existing)
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
  // Bogor
  "Masjid Raya Bogor", "Gereja Katedral Bogor", "Vihara Dhanagun Bogor",
  "Masjid Agung Bogor",
  // Depok
  "Masjid Raya At-Taqwa Depok", "Gereja HKBP Depok", "Masjid UI Depok",
  // Tangerang
  "Masjid Raya Al-Azhom Tangerang", "Gereja Bethel BSD", "Masjid Agung BSD",
  "Gereja Santo Laurensius Alam Sutera",
  // Bekasi
  "Masjid Agung Al-Barkah Bekasi", "Gereja Santa Bernadette Bekasi",
  "Masjid Raya Bekasi", "Masjid Al-Azhar Grand Galaxy",
];

const BANKS = [
  // Jakarta (existing)
  "Bank BCA KCP Sudirman", "Bank Mandiri Cabang Menteng", "Bank BRI Unit Tebet",
  "Bank BNI Cabang Kuningan", "Bank BCA KCP Kelapa Gading", "Bank Mandiri Cabang Kemang",
  "Bank BRI Unit Cengkareng", "Bank BNI Cabang Mangga Dua",
  "Bank BCA KCP Pondok Indah", "Bank Mandiri Cabang Fatmawati",
  "Bank BRI Unit Jatinegara", "Bank BNI Cabang Pluit",
  "Bank BCA KCP Senayan", "Bank Mandiri Cabang Tanah Abang",
  "Bank BRI Unit Rawamangun", "Bank BNI Cabang Kebon Jeruk",
  "Bank BCA KCP Cikini", "Bank Mandiri Cabang Kramat Jati",
  "Bank BRI Unit Sunter", "Bank BNI Cabang Pasar Minggu",
  // Bogor
  "Bank BCA KCP Bogor", "Bank Mandiri Cabang Pajajaran Bogor",
  "Bank BRI Unit Bogor Kota", "Bank BNI Cabang Bogor",
  // Depok
  "Bank BCA KCP Margonda", "Bank Mandiri Cabang Depok",
  "Bank BRI Unit Depok", "Bank BNI Cabang Depok",
  // Tangerang
  "Bank BCA KCP BSD", "Bank Mandiri Cabang Alam Sutera",
  "Bank BRI Unit Serpong", "Bank BNI Cabang Tangerang",
  "Bank BCA KCP Bintaro",
  // Bekasi
  "Bank BCA KCP Bekasi", "Bank Mandiri Cabang Summarecon Bekasi",
  "Bank BRI Unit Bekasi Barat", "Bank BNI Cabang Bekasi",
  "Bank BCA KCP Harapan Indah",
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

// ----- City assignment for each POI name -----
// We infer which cluster a POI belongs to based on keywords in its name.
// If no satellite-city keyword matches, it defaults to "jakarta".

function inferCity(name) {
  const lower = name.toLowerCase();
  // Bogor
  if (
    lower.includes("bogor") || lower.includes("ipb") ||
    lower.includes("pajajaran") || lower.includes("pakuan") ||
    lower.includes("djuanda") || lower.includes("nusa bangsa") ||
    lower.includes("kebun raya") || lower.includes("sempur") ||
    lower.includes("kencana bogor") || lower.includes("anyar") ||
    lower.includes("gunung batu") || lower.includes("jambu dua") ||
    lower.includes("tanah sareal") || lower.includes("dhanagun") ||
    lower.includes("sari asih bogor") || lower.includes("macaroni panggang") ||
    lower.includes("cibiuk bogor") || lower.includes("ngopi doeloe") ||
    lower.includes("coffee toffee bogor") || lower.includes("yogya bogor")
  ) return "bogor";
  // Depok
  if (
    lower.includes("depok") || lower.includes("margonda") ||
    lower.includes("margo city") || lower.includes("itc depok") ||
    lower.includes("cimanggis") || lower.includes("beji") ||
    lower.includes("pancoran mas") || lower.includes("cisalak") ||
    lower.includes("kemiri muka") || lower.includes("palapa depok") ||
    lower.includes("gunadarma kampus") || lower.includes("politeknik negeri jakarta") ||
    lower.includes("bsi universitas") || lower.includes("lembah gurame") ||
    lower.includes("alun-alun depok") || lower.includes("hutan kota ui") ||
    lower.includes("pramuka depok") || lower.includes("hasanah graha") ||
    lower.includes("melia cibubur") || lower.includes("agung depok")
  ) return "depok";
  // Tangerang / Tangerang Selatan / BSD
  if (
    lower.includes("tangerang") || lower.includes("bsd") ||
    lower.includes("serpong") || lower.includes("gading serpong") ||
    lower.includes("alam sutera") || lower.includes("lippo village") ||
    lower.includes("ciputat") || lower.includes("ciledug") ||
    lower.includes("pondok aren") || lower.includes("karawaci") ||
    lower.includes("bintaro") || lower.includes("living world") ||
    lower.includes("aeon") || lower.includes("ice bsd") ||
    lower.includes("scientia") || lower.includes("ocean park") ||
    lower.includes("multimedia nusantara") || lower.includes("swiss german") ||
    lower.includes("pelita harapan karawaci") ||
    lower.includes("binus alam sutera") || lower.includes("syekh yusuf") ||
    lower.includes("pahoa") || lower.includes("stella maris") ||
    lower.includes("citra berkat") || lower.includes("potret") ||
    lower.includes("jaletreng") || lower.includes("intermoda") ||
    lower.includes("laurensius") || lower.includes("bethsaida") ||
    lower.includes("leko gading serpong") || lower.includes("bethel bsd")
  ) {
    // Spread between tangerang and tangerang_selatan
    // BSD/Serpong/Bintaro -> tangerang_selatan; others -> tangerang
    if (
      lower.includes("bsd") || lower.includes("serpong") ||
      lower.includes("bintaro") || lower.includes("ciputat") ||
      lower.includes("pondok aren") || lower.includes("scientia") ||
      lower.includes("ocean park") || lower.includes("intermoda") ||
      lower.includes("stella maris") || lower.includes("citra berkat") ||
      lower.includes("swiss german") || lower.includes("bethel bsd")
    ) return "tangerang_selatan";
    return "tangerang";
  }
  // Bekasi
  if (
    lower.includes("bekasi") || lower.includes("jatiasih") ||
    lower.includes("pondok gede") || lower.includes("summarecon") ||
    lower.includes("grand galaxy") || lower.includes("metropolitan mall") ||
    lower.includes("harapan indah") || lower.includes("kalimalang") ||
    lower.includes("bantar gebang") || lower.includes("tambun") ||
    lower.includes("kranji") || lower.includes("cikarang") ||
    lower.includes("presiden university") || lower.includes("bhayangkara") ||
    lower.includes("galaxy bekasi") || lower.includes("patriot") ||
    lower.includes("al-azhar grand galaxy") || lower.includes("marsudirini bekasi") ||
    lower.includes("hosana medica") || lower.includes("al-barkah") ||
    lower.includes("bernadette bekasi") || lower.includes("bekasi square")
  ) return "bekasi";

  return "jakarta";
}

// ----- Coordinate generation -----

/**
 * Generate a coordinate clustered around a given center within the BBOX.
 * @param {{ lat: number, lng: number }} center  - cluster center
 * @param {number} spread - how far (in degrees) POIs may scatter from center
 */
function clusterCoord(center, spread) {
  // Gaussian-ish: sum of two uniforms
  const lat = center.lat + (Math.random() - 0.5) * spread + (Math.random() - 0.5) * (spread * 0.5);
  const lng = center.lng + (Math.random() - 0.5) * spread + (Math.random() - 0.5) * (spread * 0.5);
  return {
    lat: Math.max(BBOX.min_lat, Math.min(BBOX.max_lat, lat)),
    lng: Math.max(BBOX.min_lng, Math.min(BBOX.max_lng, lng)),
  };
}

/**
 * Generate a coordinate for a POI given its city assignment.
 * Jakarta POIs: 60% central cluster, 40% spread across old Jakarta BBOX.
 * Satellite cities: clustered around their respective centers.
 */
function coordForCity(city) {
  if (city === "jakarta") {
    const central = Math.random() < 0.6;
    if (central) {
      return clusterCoord(CENTERS.jakarta, 0.08);
    }
    // Spread across Jakarta proper
    return {
      lat: -6.3701 + Math.random() * (-6.0873 - -6.3701),
      lng: 106.6889 + Math.random() * (107.0024 - 106.6889),
    };
  }

  const center = CENTERS[city];
  if (!center) {
    // Fallback: random in full BBOX
    return {
      lat: BBOX.min_lat + Math.random() * (BBOX.max_lat - BBOX.min_lat),
      lng: BBOX.min_lng + Math.random() * (BBOX.max_lng - BBOX.min_lng),
    };
  }

  // Satellite city spread varies
  const spreads = {
    bogor: 0.06,
    depok: 0.05,
    tangerang: 0.06,
    tangerang_selatan: 0.05,
    bekasi: 0.06,
  };
  return clusterCoord(center, spreads[city] || 0.05);
}

// ----- Build features -----

console.log("Generating sample POIs for Jabodetabek (12 categories)...");

const features = [];
let poiId = 0;

for (const [category, names] of Object.entries(POI_POOLS)) {
  for (const name of names) {
    const city = inferCity(name);
    const { lat, lng } = coordForCity(city);
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
const cityCounts = {};
for (const f of features) {
  const cat = f.properties.category;
  categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

  const city = inferCity(f.properties.name);
  cityCounts[city] = (cityCounts[city] || 0) + 1;
}

console.log(`\nSaved ${features.length} POIs to ${outputPath}`);
console.log("\nCategory breakdown:", categoryCounts);
console.log("\nCity breakdown:", cityCounts);

const jakartaCount = cityCounts.jakarta || 0;
const satelliteCount = features.length - jakartaCount;
console.log(
  `\nJakarta: ${jakartaCount} (${((jakartaCount / features.length) * 100).toFixed(1)}%)`,
  `| Satellite cities: ${satelliteCount} (${((satelliteCount / features.length) * 100).toFixed(1)}%)`
);
