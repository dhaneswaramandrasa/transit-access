/**
 * Generate jakarta_demographics.json with kelurahan-level demographic data.
 *
 * Covers Jabodetabek: DKI Jakarta + Kota Bogor, Depok, Tangerang, Bekasi, Tangsel.
 * Each kecamatan is split into kelurahan with varied demographic values.
 * Output includes both `kelurahan` and `kecamatan` fields.
 *
 * Usage: node scripts/generate-demographics.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ===== Kecamatan base data (inherited by kelurahan) =====
const BPS_KECAMATAN_DATA = {
  // Jakarta Pusat (3171)
  "Menteng":          { city_code: "3171", density_base: 19200, age_profile: "cbd", njop_base: 4500000, zero_veh_base: 35 },
  "Tanah Abang":      { city_code: "3171", density_base: 24100, age_profile: "cbd", njop_base: 3800000, zero_veh_base: 40 },
  "Gambir":           { city_code: "3171", density_base: 11800, age_profile: "cbd", njop_base: 5000000, zero_veh_base: 30 },
  "Sawah Besar":      { city_code: "3171", density_base: 22800, age_profile: "mixed", njop_base: 3200000, zero_veh_base: 42 },
  "Kemayoran":        { city_code: "3171", density_base: 28400, age_profile: "dense_residential", njop_base: 2800000, zero_veh_base: 45 },
  "Senen":            { city_code: "3171", density_base: 27300, age_profile: "mixed", njop_base: 3000000, zero_veh_base: 43 },
  "Cempaka Putih":    { city_code: "3171", density_base: 22600, age_profile: "mixed", njop_base: 2600000, zero_veh_base: 38 },
  "Johar Baru":       { city_code: "3171", density_base: 42100, age_profile: "dense_residential", njop_base: 2200000, zero_veh_base: 50 },
  // Jakarta Utara (3172)
  "Penjaringan":      { city_code: "3172", density_base: 12600, age_profile: "mixed", njop_base: 2000000, zero_veh_base: 38 },
  "Pademangan":       { city_code: "3172", density_base: 19500, age_profile: "residential", njop_base: 2400000, zero_veh_base: 40 },
  "Tanjung Priok":    { city_code: "3172", density_base: 13200, age_profile: "industrial", njop_base: 1800000, zero_veh_base: 42 },
  "Koja":             { city_code: "3172", density_base: 24800, age_profile: "dense_residential", njop_base: 1600000, zero_veh_base: 48 },
  "Kelapa Gading":    { city_code: "3172", density_base: 12100, age_profile: "affluent", njop_base: 3500000, zero_veh_base: 20 },
  "Cilincing":        { city_code: "3172", density_base: 15300, age_profile: "industrial", njop_base: 1200000, zero_veh_base: 45 },
  // Jakarta Barat (3173)
  "Cengkareng":       { city_code: "3173", density_base: 21500, age_profile: "suburban_family", njop_base: 1800000, zero_veh_base: 35 },
  "Grogol Petamburan":{ city_code: "3173", density_base: 24200, age_profile: "mixed", njop_base: 2800000, zero_veh_base: 38 },
  "Taman Sari":       { city_code: "3173", density_base: 33400, age_profile: "dense_residential", njop_base: 2200000, zero_veh_base: 50 },
  "Tambora":          { city_code: "3173", density_base: 50800, age_profile: "dense_residential", njop_base: 1800000, zero_veh_base: 55 },
  "Kebon Jeruk":      { city_code: "3173", density_base: 18700, age_profile: "suburban_family", njop_base: 2500000, zero_veh_base: 25 },
  "Kalideres":        { city_code: "3173", density_base: 14500, age_profile: "suburban_family", njop_base: 1500000, zero_veh_base: 30 },
  "Palmerah":         { city_code: "3173", density_base: 24900, age_profile: "mixed", njop_base: 2600000, zero_veh_base: 35 },
  "Kembangan":        { city_code: "3173", density_base: 13900, age_profile: "suburban_family", njop_base: 2000000, zero_veh_base: 25 },
  // Jakarta Selatan (3174)
  "Kebayoran Baru":   { city_code: "3174", density_base: 15800, age_profile: "affluent", njop_base: 4000000, zero_veh_base: 18 },
  "Kebayoran Lama":   { city_code: "3174", density_base: 22100, age_profile: "residential", njop_base: 2200000, zero_veh_base: 30 },
  "Mampang Prapatan": { city_code: "3174", density_base: 22800, age_profile: "mixed", njop_base: 3000000, zero_veh_base: 32 },
  "Pancoran":         { city_code: "3174", density_base: 19200, age_profile: "mixed", njop_base: 2800000, zero_veh_base: 30 },
  "Tebet":            { city_code: "3174", density_base: 22400, age_profile: "residential", njop_base: 2600000, zero_veh_base: 32 },
  "Setiabudi":        { city_code: "3174", density_base: 14100, age_profile: "cbd", njop_base: 4200000, zero_veh_base: 25 },
  "Pasar Minggu":     { city_code: "3174", density_base: 16800, age_profile: "residential", njop_base: 2000000, zero_veh_base: 28 },
  "Cilandak":         { city_code: "3174", density_base: 12200, age_profile: "affluent", njop_base: 3200000, zero_veh_base: 18 },
  "Pesanggrahan":     { city_code: "3174", density_base: 18100, age_profile: "suburban_family", njop_base: 1800000, zero_veh_base: 25 },
  "Jagakarsa":        { city_code: "3174", density_base: 15400, age_profile: "suburban_family", njop_base: 1600000, zero_veh_base: 22 },
  // Jakarta Timur (3175)
  "Matraman":         { city_code: "3175", density_base: 30200, age_profile: "dense_residential", njop_base: 2400000, zero_veh_base: 42 },
  "Jatinegara":       { city_code: "3175", density_base: 24500, age_profile: "residential", njop_base: 2000000, zero_veh_base: 38 },
  "Pulo Gadung":      { city_code: "3175", density_base: 16700, age_profile: "mixed", njop_base: 2200000, zero_veh_base: 35 },
  "Kramat Jati":      { city_code: "3175", density_base: 19800, age_profile: "residential", njop_base: 1800000, zero_veh_base: 30 },
  "Duren Sawit":      { city_code: "3175", density_base: 17400, age_profile: "suburban_family", njop_base: 1600000, zero_veh_base: 28 },
  "Makasar":          { city_code: "3175", density_base: 11900, age_profile: "suburban_family", njop_base: 1400000, zero_veh_base: 25 },
  "Cakung":           { city_code: "3175", density_base: 16100, age_profile: "industrial", njop_base: 1200000, zero_veh_base: 35 },
  "Cipayung":         { city_code: "3175", density_base: 10200, age_profile: "suburban_family", njop_base: 1200000, zero_veh_base: 22 },
  "Ciracas":          { city_code: "3175", density_base: 14900, age_profile: "suburban_family", njop_base: 1300000, zero_veh_base: 24 },
  "Pasar Rebo":       { city_code: "3175", density_base: 14400, age_profile: "suburban_family", njop_base: 1200000, zero_veh_base: 25 },
  // Depok (3276)
  "Beji":             { city_code: "3276", density_base: 12800, age_profile: "mixed", njop_base: 1800000, zero_veh_base: 28 },
  "Pancoran Mas":     { city_code: "3276", density_base: 14200, age_profile: "residential", njop_base: 1500000, zero_veh_base: 25 },
  "Cipayung Depok":   { city_code: "3276", density_base: 10500, age_profile: "suburban_family", njop_base: 1200000, zero_veh_base: 22 },
  "Sukmajaya":        { city_code: "3276", density_base: 15800, age_profile: "suburban_family", njop_base: 1400000, zero_veh_base: 25 },
  "Cilodong":         { city_code: "3276", density_base: 9800, age_profile: "suburban_family", njop_base: 1100000, zero_veh_base: 20 },
  "Limo":             { city_code: "3276", density_base: 8200, age_profile: "suburban_family", njop_base: 1300000, zero_veh_base: 18 },
  "Cinere":           { city_code: "3276", density_base: 11400, age_profile: "affluent", njop_base: 2200000, zero_veh_base: 15 },
  "Cimanggis":        { city_code: "3276", density_base: 12100, age_profile: "suburban_family", njop_base: 1200000, zero_veh_base: 22 },
  "Tapos":            { city_code: "3276", density_base: 8900, age_profile: "suburban_family", njop_base: 1000000, zero_veh_base: 20 },
  "Sawangan":         { city_code: "3276", density_base: 7500, age_profile: "suburban_family", njop_base: 900000, zero_veh_base: 18 },
  "Bojongsari":       { city_code: "3276", density_base: 7200, age_profile: "suburban_family", njop_base: 800000, zero_veh_base: 18 },
  // Bekasi (3275)
  "Bekasi Timur":     { city_code: "3275", density_base: 14500, age_profile: "suburban_family", njop_base: 1300000, zero_veh_base: 22 },
  "Bekasi Barat":     { city_code: "3275", density_base: 16200, age_profile: "suburban_family", njop_base: 1400000, zero_veh_base: 25 },
  "Bekasi Utara":     { city_code: "3275", density_base: 13800, age_profile: "suburban_family", njop_base: 1200000, zero_veh_base: 24 },
  "Bekasi Selatan":   { city_code: "3275", density_base: 15100, age_profile: "residential", njop_base: 1500000, zero_veh_base: 22 },
  "Rawalumbu":        { city_code: "3275", density_base: 14200, age_profile: "suburban_family", njop_base: 1400000, zero_veh_base: 20 },
  "Medan Satria":     { city_code: "3275", density_base: 12800, age_profile: "industrial", njop_base: 1100000, zero_veh_base: 28 },
  "Jatiasih":         { city_code: "3275", density_base: 11500, age_profile: "suburban_family", njop_base: 1200000, zero_veh_base: 20 },
  "Bantargebang":     { city_code: "3275", density_base: 6800, age_profile: "suburban_family", njop_base: 600000, zero_veh_base: 22 },
  "Mustika Jaya":     { city_code: "3275", density_base: 9200, age_profile: "suburban_family", njop_base: 800000, zero_veh_base: 20 },
  "Pondok Gede":      { city_code: "3275", density_base: 13500, age_profile: "suburban_family", njop_base: 1500000, zero_veh_base: 22 },
  "Jatisampurna":     { city_code: "3275", density_base: 10200, age_profile: "suburban_family", njop_base: 1300000, zero_veh_base: 18 },
  "Pondok Melati":    { city_code: "3275", density_base: 12000, age_profile: "suburban_family", njop_base: 1400000, zero_veh_base: 20 },
  // Tangerang (3671)
  "Tangerang":        { city_code: "3671", density_base: 15800, age_profile: "mixed", njop_base: 1400000, zero_veh_base: 28 },
  "Karawaci":         { city_code: "3671", density_base: 14200, age_profile: "mixed", njop_base: 1600000, zero_veh_base: 25 },
  "Cipondoh":         { city_code: "3671", density_base: 18500, age_profile: "suburban_family", njop_base: 1300000, zero_veh_base: 28 },
  "Ciledug":          { city_code: "3671", density_base: 20100, age_profile: "suburban_family", njop_base: 1500000, zero_veh_base: 30 },
  "Pinang":           { city_code: "3671", density_base: 13800, age_profile: "suburban_family", njop_base: 1200000, zero_veh_base: 25 },
  "Neglasari":        { city_code: "3671", density_base: 11200, age_profile: "industrial", njop_base: 1000000, zero_veh_base: 30 },
  "Batuceper":        { city_code: "3671", density_base: 12500, age_profile: "industrial", njop_base: 1100000, zero_veh_base: 28 },
  "Benda":            { city_code: "3671", density_base: 9800, age_profile: "industrial", njop_base: 900000, zero_veh_base: 25 },
  "Jatiuwung":        { city_code: "3671", density_base: 10500, age_profile: "industrial", njop_base: 800000, zero_veh_base: 30 },
  "Periuk":           { city_code: "3671", density_base: 13200, age_profile: "suburban_family", njop_base: 1000000, zero_veh_base: 28 },
  "Cibodas":          { city_code: "3671", density_base: 16800, age_profile: "suburban_family", njop_base: 1100000, zero_veh_base: 28 },
  "Larangan":         { city_code: "3671", density_base: 19200, age_profile: "suburban_family", njop_base: 1400000, zero_veh_base: 28 },
  "Karang Tengah":    { city_code: "3671", density_base: 17500, age_profile: "suburban_family", njop_base: 1300000, zero_veh_base: 25 },
  // Tangerang Selatan (3674)
  "Serpong":          { city_code: "3674", density_base: 10200, age_profile: "affluent", njop_base: 2500000, zero_veh_base: 15 },
  "Serpong Utara":    { city_code: "3674", density_base: 11800, age_profile: "affluent", njop_base: 2800000, zero_veh_base: 14 },
  "Pondok Aren":      { city_code: "3674", density_base: 14500, age_profile: "suburban_family", njop_base: 2000000, zero_veh_base: 20 },
  "Ciputat":          { city_code: "3674", density_base: 15200, age_profile: "residential", njop_base: 1800000, zero_veh_base: 22 },
  "Ciputat Timur":    { city_code: "3674", density_base: 16800, age_profile: "residential", njop_base: 1900000, zero_veh_base: 22 },
  "Pamulang":         { city_code: "3674", density_base: 13500, age_profile: "suburban_family", njop_base: 1500000, zero_veh_base: 20 },
  "Setu":             { city_code: "3674", density_base: 8500, age_profile: "suburban_family", njop_base: 1200000, zero_veh_base: 18 },
  // Bogor (3271)
  "Bogor Tengah":     { city_code: "3271", density_base: 12800, age_profile: "mixed", njop_base: 1500000, zero_veh_base: 30 },
  "Bogor Utara":      { city_code: "3271", density_base: 10200, age_profile: "suburban_family", njop_base: 1200000, zero_veh_base: 25 },
  "Bogor Selatan":    { city_code: "3271", density_base: 9800, age_profile: "suburban_family", njop_base: 1000000, zero_veh_base: 25 },
  "Bogor Timur":      { city_code: "3271", density_base: 9500, age_profile: "residential", njop_base: 1100000, zero_veh_base: 25 },
  "Bogor Barat":      { city_code: "3271", density_base: 11500, age_profile: "suburban_family", njop_base: 1000000, zero_veh_base: 28 },
  "Tanah Sareal":     { city_code: "3271", density_base: 13200, age_profile: "suburban_family", njop_base: 1100000, zero_veh_base: 25 },
};

// ===== Kelurahan names per kecamatan =====
// Each kecamatan is split into its real kelurahan.
const KELURAHAN_PER_KECAMATAN = {
  // Jakarta Pusat
  "Menteng": ["Menteng", "Pegangsaan", "Cikini", "Gondangdia", "Kebon Sirih"],
  "Tanah Abang": ["Bendungan Hilir", "Karet Tengsin", "Kebon Melati", "Petamburan", "Kebon Kacang", "Kampung Bali"],
  "Gambir": ["Gambir", "Cideng", "Petojo Selatan", "Petojo Utara", "Kebon Kelapa", "Duri Pulo"],
  "Sawah Besar": ["Pasar Baru", "Gunung Sahari Utara", "Mangga Dua Selatan", "Karang Anyar", "Kartini"],
  "Kemayoran": ["Kemayoran", "Kebon Kosong", "Harapan Mulia", "Serdang", "Cempaka Baru", "Utan Panjang", "Sumur Batu", "Gunung Sahari Selatan"],
  "Senen": ["Senen", "Kenari", "Paseban", "Kramat", "Kwitang", "Bungur"],
  "Cempaka Putih": ["Cempaka Putih Timur", "Cempaka Putih Barat", "Rawasari"],
  "Johar Baru": ["Johar Baru", "Kampung Rawa", "Galur", "Tanah Tinggi"],
  // Jakarta Utara
  "Penjaringan": ["Penjaringan", "Kamal Muara", "Kapuk Muara", "Pejagalan", "Pluit"],
  "Pademangan": ["Pademangan Barat", "Pademangan Timur", "Ancol"],
  "Tanjung Priok": ["Tanjung Priok", "Sunter Agung", "Sunter Jaya", "Papanggo", "Sungai Bambu", "Kebon Bawang", "Warakas"],
  "Koja": ["Koja", "Lagoa", "Rawa Badak Utara", "Rawa Badak Selatan", "Tugu Selatan", "Tugu Utara"],
  "Kelapa Gading": ["Kelapa Gading Timur", "Kelapa Gading Barat", "Pegangsaan Dua"],
  "Cilincing": ["Cilincing", "Semper Barat", "Semper Timur", "Sukapura", "Rorotan", "Marunda", "Kalibaru"],
  // Jakarta Barat
  "Cengkareng": ["Cengkareng Barat", "Cengkareng Timur", "Rawa Buaya", "Kedaung Kali Angke", "Kapuk", "Duri Kosambi"],
  "Grogol Petamburan": ["Grogol", "Jelambar", "Jelambar Baru", "Wijaya Kusuma", "Tanjung Duren Selatan", "Tanjung Duren Utara", "Tomang"],
  "Taman Sari": ["Taman Sari", "Krukut", "Maphar", "Tangki", "Mangga Besar", "Keagungan", "Glodok", "Pinangsia"],
  "Tambora": ["Tambora", "Krendang", "Duri Selatan", "Duri Utara", "Kalianyar", "Jembatan Besi", "Angke", "Jembatan Lima", "Pekojan", "Roa Malaka", "Tanah Sereal"],
  "Kebon Jeruk": ["Kebon Jeruk", "Sukabumi Selatan", "Sukabumi Utara", "Kelapa Dua", "Duri Kepa", "Kedoya Selatan", "Kedoya Utara"],
  "Kalideres": ["Kalideres", "Semanan", "Tegal Alur", "Kamal", "Pegadungan"],
  "Palmerah": ["Palmerah", "Slipi", "Kota Bambu Selatan", "Kota Bambu Utara", "Jati Pulo", "Kemanggisan"],
  "Kembangan": ["Kembangan Selatan", "Kembangan Utara", "Meruya Selatan", "Meruya Utara", "Srengseng", "Joglo"],
  // Jakarta Selatan
  "Kebayoran Baru": ["Kebayoran Baru", "Gunung", "Kramat Pela", "Selong", "Rawa Barat", "Senayan", "Pulo", "Petogogan", "Gandaria Utara", "Cipete Utara"],
  "Kebayoran Lama": ["Kebayoran Lama Selatan", "Kebayoran Lama Utara", "Pondok Pinang", "Cipulir", "Grogol Selatan", "Grogol Utara"],
  "Mampang Prapatan": ["Mampang Prapatan", "Bangka", "Pela Mampang", "Tegal Parang", "Kuningan Barat"],
  "Pancoran": ["Pancoran", "Kalibata", "Rawajati", "Duren Tiga", "Pengadegan", "Cikoko"],
  "Tebet": ["Tebet Barat", "Tebet Timur", "Kebon Baru", "Bukit Duri", "Manggarai", "Manggarai Selatan", "Menteng Dalam"],
  "Setiabudi": ["Setiabudi", "Karet", "Karet Semanggi", "Karet Kuningan", "Kuningan Timur", "Menteng Atas", "Pasar Manggis", "Guntur"],
  "Pasar Minggu": ["Pasar Minggu", "Jati Padang", "Cilandak Timur", "Ragunan", "Pejaten Barat", "Pejaten Timur", "Kebagusan"],
  "Cilandak": ["Cilandak Barat", "Lebak Bulus", "Pondok Labu", "Gandaria Selatan", "Cipete Selatan"],
  "Pesanggrahan": ["Pesanggrahan", "Bintaro", "Ulujami"],
  "Jagakarsa": ["Jagakarsa", "Srengseng Sawah", "Ciganjur", "Cipedak", "Lenteng Agung", "Tanjung Barat"],
  // Jakarta Timur
  "Matraman": ["Matraman", "Palmeriam", "Kebon Manggis", "Utan Kayu Selatan", "Utan Kayu Utara", "Kayu Manis"],
  "Jatinegara": ["Jatinegara", "Bali Mester", "Kampung Melayu", "Bidara Cina", "Cipinang Besar Selatan", "Cipinang Besar Utara", "Cipinang Cempedak", "Cipinang Muara", "Rawa Bunga"],
  "Pulo Gadung": ["Pulo Gadung", "Pisangan Timur", "Cipinang", "Jatinegara Kaum", "Rawamangun", "Kayu Putih", "Jati"],
  "Kramat Jati": ["Kramat Jati", "Batu Ampar", "Bale Kambang", "Dukuh", "Cawang", "Cililitan", "Tengah"],
  "Duren Sawit": ["Duren Sawit", "Pondok Bambu", "Pondok Kelapa", "Klender", "Malaka Sari", "Malaka Jaya", "Pondok Kopi"],
  "Makasar": ["Makasar", "Pinang Ranti", "Kebon Pala", "Halim Perdanakusuma", "Cipinang Melayu"],
  "Cakung": ["Cakung Barat", "Cakung Timur", "Rawa Terate", "Jatinegara Kaum Cakung", "Pulo Gebang", "Penggilingan", "Ujung Menteng"],
  "Cipayung": ["Cipayung", "Setu", "Bambu Apus", "Ceger", "Cilangkap", "Munjul", "Pondok Ranggon", "Lubang Buaya"],
  "Ciracas": ["Ciracas", "Kelapa Dua Wetan", "Cibubur", "Susukan", "Rambutan"],
  "Pasar Rebo": ["Pasar Rebo", "Gedong", "Baru", "Cijantung", "Kalisari"],
  // Depok
  "Beji": ["Beji", "Beji Timur", "Kemiri Muka", "Pondok Cina", "Kukusan", "Tanah Baru"],
  "Pancoran Mas": ["Pancoran Mas", "Depok", "Depok Jaya", "Rangkapan Jaya", "Rangkapan Jaya Baru", "Mampang"],
  "Cipayung Depok": ["Cipayung", "Cipayung Jaya", "Ratu Jaya", "Bojong Pondok Terong", "Pondok Jaya"],
  "Sukmajaya": ["Sukmajaya", "Mekarjaya", "Baktijaya", "Abadijaya", "Tirtajaya", "Cisalak"],
  "Cilodong": ["Cilodong", "Kalibaru", "Kalimulya", "Jatimulya", "Sukamaju"],
  "Limo": ["Limo", "Meruyung", "Grogol"],
  "Cinere": ["Cinere", "Gandul", "Pangkalan Jati", "Pangkalan Jati Baru"],
  "Cimanggis": ["Cimanggis", "Tugu", "Harjamukti", "Cisalak Pasar", "Mekarsari", "Curug"],
  "Tapos": ["Tapos", "Sukatani", "Cimpaeun", "Jatijajar", "Cilangkap Depok", "Leuwinanggung"],
  "Sawangan": ["Sawangan", "Sawangan Baru", "Cinangka", "Pengasinan", "Bedahan", "Kedaung"],
  "Bojongsari": ["Bojongsari", "Bojongsari Baru", "Serua", "Pondok Petir", "Curug", "Duren Mekar", "Duren Seribu"],
  // Bekasi
  "Bekasi Timur": ["Margahayu", "Bekasi Jaya", "Duren Jaya", "Aren Jaya"],
  "Bekasi Barat": ["Bintara", "Bintara Jaya", "Jakasampurna", "Kota Baru"],
  "Bekasi Utara": ["Harapan Jaya", "Kaliabang Tengah", "Perwira", "Harapan Baru", "Teluk Pucung", "Marga Mulya"],
  "Bekasi Selatan": ["Kayuringin Jaya", "Marga Jaya", "Pekayon Jaya", "Jaka Mulya", "Jaka Setia"],
  "Rawalumbu": ["Bojong Rawalumbu", "Bojong Menteng", "Pengasinan", "Sepanjang Jaya"],
  "Medan Satria": ["Medan Satria", "Harapan Mulya", "Pejuang", "Kali Baru"],
  "Jatiasih": ["Jatisari", "Jatiasih", "Jatikramat", "Jatimekar", "Jatiluhur", "Jatirasa"],
  "Bantargebang": ["Bantargebang", "Cikiwul", "Ciketing Udik", "Sumur Batu"],
  "Mustika Jaya": ["Mustika Jaya", "Mustika Sari", "Pedurenan", "Cimuning"],
  "Pondok Gede": ["Jati Bening", "Jati Bening Baru", "Jati Waringin", "Jati Makmur", "Jati Rahayu"],
  "Jatisampurna": ["Jatisampurna", "Jatirangga", "Jatikarya", "Jatiraden"],
  "Pondok Melati": ["Jati Murni", "Jati Warna", "Jati Melati", "Jati Rahayu PM"],
  // Tangerang
  "Tangerang": ["Tangerang", "Sukajadi", "Sukaasih", "Babakan", "Cikokol", "Kelapa Indah"],
  "Karawaci": ["Karawaci", "Karawaci Baru", "Nusa Jaya", "Cimone", "Cimone Jaya", "Pabuaran"],
  "Cipondoh": ["Cipondoh", "Cipondoh Indah", "Cipondoh Makmur", "Kenanga", "Gondrong", "Petir"],
  "Ciledug": ["Ciledug", "Sudimara Barat", "Sudimara Timur", "Tajur", "Paninggilan", "Paninggilan Utara"],
  "Pinang": ["Pinang", "Nerogtog", "Kunciran", "Kunciran Indah", "Cipete", "Kunciran Jaya"],
  "Neglasari": ["Neglasari", "Karang Sari", "Kedaung Wetan", "Selapajang Jaya"],
  "Batuceper": ["Batuceper", "Batujaya", "Kebon Besar", "Poris Gaga", "Poris Gaga Baru"],
  "Benda": ["Benda", "Belendung", "Jurumudi", "Jurumudi Baru"],
  "Jatiuwung": ["Jatiuwung", "Keroncong", "Pasir Jaya", "Gandasari", "Manis", "Alam Jaya"],
  "Periuk": ["Periuk", "Periuk Jaya", "Gembor", "Sangiang Jaya", "Gebang Raya"],
  "Cibodas": ["Cibodas", "Cibodas Baru", "Panunggangan", "Panunggangan Barat", "Uwung Jaya"],
  "Larangan": ["Larangan Indah", "Larangan Selatan", "Larangan Utara", "Cipadu", "Cipadu Jaya", "Gaga", "Kreo", "Kreo Selatan"],
  "Karang Tengah": ["Karang Tengah", "Karang Mulya", "Karang Timur", "Padurenan", "Pondok Pucung", "Parung Jaya"],
  // Tangerang Selatan
  "Serpong": ["Serpong", "Buaran", "Ciater", "Cilenggang", "Rawa Buntu", "Rawa Mekar Jaya", "Lengkong Gudang"],
  "Serpong Utara": ["Pakualam", "Pondok Jagung", "Pondok Jagung Timur", "Jelupang", "Lengkong Karya", "Lengkong Wetan", "Paku Jaya"],
  "Pondok Aren": ["Pondok Aren", "Pondok Jaya", "Pondok Karya", "Parigi", "Parigi Baru", "Jurang Mangu Barat", "Jurang Mangu Timur", "Pondok Kacang Barat", "Pondok Kacang Timur"],
  "Ciputat": ["Ciputat", "Cipayung", "Jombang", "Sawah Baru", "Sawah Lama", "Serua"],
  "Ciputat Timur": ["Ciputat Timur", "Cireundeu", "Pisangan", "Rempoa", "Rengas"],
  "Pamulang": ["Pamulang Barat", "Pamulang Timur", "Pondok Benda", "Benda Baru", "Kedaung", "Bambu Apus Pamulang"],
  "Setu": ["Setu", "Babakan", "Bakti Jaya", "Kranggan", "Muncul"],
  // Bogor
  "Bogor Tengah": ["Babakan", "Babakan Pasar", "Cibogor", "Gudang", "Kebon Kalapa", "Paledang", "Pabaton", "Panaragan", "Sempur", "Tegal Lega", "Ciwaringin"],
  "Bogor Utara": ["Bantarjati", "Ciluar", "Cimahpar", "Cibuluh", "Kedung Halang", "Tanah Baru BU", "Tegal Gundil"],
  "Bogor Selatan": ["Batutulis", "Bondongan", "Cikaret", "Cipaku", "Empang", "Harjasari", "Lawang Gintung", "Muarasari", "Pakuan", "Pamoyanan", "Ranggamekar"],
  "Bogor Timur": ["Baranangsiang", "Katulampa", "Sindangrasa", "Sindangsari", "Sukasari", "Tajur"],
  "Bogor Barat": ["Balungbangjaya", "Cilendek Barat", "Cilendek Timur", "Curug Mekar", "Curug", "Loji", "Margajaya", "Menteng BB", "Pasir Kuda", "Pasir Mulya", "Semplak", "Sindang Barang", "Situgede"],
  "Tanah Sareal": ["Cibadak", "Kedung Badak", "Kedung Jaya", "Kedung Waringin", "Kebon Pedes", "Kencana", "Mekarwangi", "Sukaresmi", "Sukadamai", "Tanah Sareal", "Kayu Manis TS"],
};

// ===== Kecamatan centroids (used to offset kelurahan positions) =====
const KECAMATAN_CENTROIDS = {
  "Menteng": { lat: -6.1950, lng: 106.8370 }, "Tanah Abang": { lat: -6.1860, lng: 106.8110 },
  "Gambir": { lat: -6.1710, lng: 106.8220 }, "Sawah Besar": { lat: -6.1550, lng: 106.8350 },
  "Kemayoran": { lat: -6.1580, lng: 106.8530 }, "Senen": { lat: -6.1750, lng: 106.8450 },
  "Cempaka Putih": { lat: -6.1730, lng: 106.8680 }, "Johar Baru": { lat: -6.1810, lng: 106.8510 },
  "Penjaringan": { lat: -6.1190, lng: 106.7970 }, "Pademangan": { lat: -6.1350, lng: 106.8420 },
  "Tanjung Priok": { lat: -6.1150, lng: 106.8750 }, "Koja": { lat: -6.1100, lng: 106.9050 },
  "Kelapa Gading": { lat: -6.1600, lng: 106.8950 }, "Cilincing": { lat: -6.1050, lng: 106.9350 },
  "Cengkareng": { lat: -6.1550, lng: 106.7350 }, "Grogol Petamburan": { lat: -6.1650, lng: 106.7850 },
  "Taman Sari": { lat: -6.1490, lng: 106.8130 }, "Tambora": { lat: -6.1500, lng: 106.8000 },
  "Kebon Jeruk": { lat: -6.1950, lng: 106.7650 }, "Kalideres": { lat: -6.1550, lng: 106.7050 },
  "Palmerah": { lat: -6.2050, lng: 106.7950 }, "Kembangan": { lat: -6.1900, lng: 106.7350 },
  "Kebayoran Baru": { lat: -6.2400, lng: 106.7920 }, "Kebayoran Lama": { lat: -6.2500, lng: 106.7700 },
  "Mampang Prapatan": { lat: -6.2400, lng: 106.8300 }, "Pancoran": { lat: -6.2450, lng: 106.8450 },
  "Tebet": { lat: -6.2300, lng: 106.8550 }, "Setiabudi": { lat: -6.2100, lng: 106.8280 },
  "Pasar Minggu": { lat: -6.2800, lng: 106.8400 }, "Cilandak": { lat: -6.2750, lng: 106.7900 },
  "Pesanggrahan": { lat: -6.2650, lng: 106.7550 }, "Jagakarsa": { lat: -6.3250, lng: 106.8250 },
  "Matraman": { lat: -6.2000, lng: 106.8550 }, "Jatinegara": { lat: -6.2150, lng: 106.8700 },
  "Pulo Gadung": { lat: -6.1850, lng: 106.8850 }, "Kramat Jati": { lat: -6.2700, lng: 106.8700 },
  "Duren Sawit": { lat: -6.2300, lng: 106.9100 }, "Makasar": { lat: -6.2650, lng: 106.8950 },
  "Cakung": { lat: -6.1950, lng: 106.9350 }, "Cipayung": { lat: -6.3100, lng: 106.8950 },
  "Ciracas": { lat: -6.3200, lng: 106.8700 }, "Pasar Rebo": { lat: -6.3150, lng: 106.8550 },
  "Beji": { lat: -6.3700, lng: 106.8280 }, "Pancoran Mas": { lat: -6.4000, lng: 106.8200 },
  "Cipayung Depok": { lat: -6.4200, lng: 106.8100 }, "Sukmajaya": { lat: -6.3900, lng: 106.8400 },
  "Cilodong": { lat: -6.4100, lng: 106.8500 }, "Limo": { lat: -6.3700, lng: 106.7900 },
  "Cinere": { lat: -6.3400, lng: 106.7700 }, "Cimanggis": { lat: -6.3700, lng: 106.8600 },
  "Tapos": { lat: -6.3900, lng: 106.8800 }, "Sawangan": { lat: -6.4300, lng: 106.7700 },
  "Bojongsari": { lat: -6.4100, lng: 106.7600 },
  "Bekasi Timur": { lat: -6.2500, lng: 107.0200 }, "Bekasi Barat": { lat: -6.2400, lng: 106.9800 },
  "Bekasi Utara": { lat: -6.2100, lng: 107.0000 }, "Bekasi Selatan": { lat: -6.2700, lng: 107.0000 },
  "Rawalumbu": { lat: -6.2800, lng: 107.0200 }, "Medan Satria": { lat: -6.2000, lng: 106.9700 },
  "Jatiasih": { lat: -6.2900, lng: 106.9600 }, "Bantargebang": { lat: -6.3300, lng: 107.0400 },
  "Mustika Jaya": { lat: -6.3100, lng: 107.0200 }, "Pondok Gede": { lat: -6.2800, lng: 106.9200 },
  "Jatisampurna": { lat: -6.3100, lng: 106.9400 }, "Pondok Melati": { lat: -6.2900, lng: 106.9100 },
  "Tangerang": { lat: -6.1780, lng: 106.6310 }, "Karawaci": { lat: -6.1650, lng: 106.6150 },
  "Cipondoh": { lat: -6.1800, lng: 106.6600 }, "Ciledug": { lat: -6.2300, lng: 106.7100 },
  "Pinang": { lat: -6.2200, lng: 106.6800 }, "Neglasari": { lat: -6.1550, lng: 106.6300 },
  "Batuceper": { lat: -6.1500, lng: 106.6600 }, "Benda": { lat: -6.1300, lng: 106.6500 },
  "Jatiuwung": { lat: -6.2000, lng: 106.5900 }, "Periuk": { lat: -6.1700, lng: 106.6000 },
  "Cibodas": { lat: -6.1900, lng: 106.6100 }, "Larangan": { lat: -6.2200, lng: 106.7300 },
  "Karang Tengah": { lat: -6.2300, lng: 106.7200 },
  "Serpong": { lat: -6.3200, lng: 106.6700 }, "Serpong Utara": { lat: -6.2900, lng: 106.6600 },
  "Pondok Aren": { lat: -6.2600, lng: 106.7300 }, "Ciputat": { lat: -6.2800, lng: 106.7500 },
  "Ciputat Timur": { lat: -6.2900, lng: 106.7600 }, "Pamulang": { lat: -6.3400, lng: 106.7400 },
  "Setu": { lat: -6.3500, lng: 106.6900 },
  "Bogor Tengah": { lat: -6.5950, lng: 106.7870 }, "Bogor Utara": { lat: -6.5700, lng: 106.7800 },
  "Bogor Selatan": { lat: -6.6200, lng: 106.7900 }, "Bogor Timur": { lat: -6.5900, lng: 106.8100 },
  "Bogor Barat": { lat: -6.6000, lng: 106.7600 }, "Tanah Sareal": { lat: -6.5600, lng: 106.7700 },
};

// ===== Build kelurahan centroids from kecamatan with small offsets =====
function buildKelurahanCentroids() {
  const kelCentroids = {};
  for (const [kecName, kelList] of Object.entries(KELURAHAN_PER_KECAMATAN)) {
    const kecCenter = KECAMATAN_CENTROIDS[kecName];
    if (!kecCenter) continue;
    const n = kelList.length;
    const radius = 0.008 + n * 0.001; // spread kelurahan around kecamatan center
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i) / n;
      const dist = radius * (0.4 + 0.6 * ((i % 3 + 1) / 3));
      kelCentroids[kelList[i]] = {
        lat: kecCenter.lat + dist * Math.sin(angle),
        lng: kecCenter.lng + dist * Math.cos(angle),
        kecamatan: kecName,
      };
    }
  }
  return kelCentroids;
}

const KELURAHAN_CENTROIDS = buildKelurahanCentroids();

const AGE_PROFILES = {
  cbd: { "0-14": 0.155, "15-24": 0.178, "25-44": 0.405, "45-64": 0.202, "65+": 0.060 },
  affluent: { "0-14": 0.195, "15-24": 0.145, "25-44": 0.305, "45-64": 0.255, "65+": 0.100 },
  dense_residential: { "0-14": 0.265, "15-24": 0.185, "25-44": 0.320, "45-64": 0.175, "65+": 0.055 },
  residential: { "0-14": 0.230, "15-24": 0.168, "25-44": 0.332, "45-64": 0.200, "65+": 0.070 },
  suburban_family: { "0-14": 0.275, "15-24": 0.170, "25-44": 0.335, "45-64": 0.170, "65+": 0.050 },
  industrial: { "0-14": 0.210, "15-24": 0.195, "25-44": 0.365, "45-64": 0.180, "65+": 0.050 },
  mixed: { "0-14": 0.225, "15-24": 0.168, "25-44": 0.332, "45-64": 0.208, "65+": 0.067 },
};

const H3_RES8_AREA_KM2 = 0.7373;

function findNearestKelurahan(lat, lng) {
  let minDist = Infinity;
  let nearest = null;
  for (const [name, data] of Object.entries(KELURAHAN_CENTROIDS)) {
    const dlat = lat - data.lat;
    const dlng = lng - data.lng;
    const dist = dlat * dlat + dlng * dlng;
    if (dist < minDist) {
      minDist = dist;
      nearest = name;
    }
  }
  return nearest;
}

function seededRandom(h3Index) {
  let hash = 0;
  for (let i = 0; i < h3Index.length; i++) {
    hash = ((hash << 5) - hash) + h3Index.charCodeAt(i);
    hash |= 0;
  }
  return () => { hash = (hash * 1664525 + 1013904223) | 0; return (hash >>> 0) / 4294967296; };
}

function varyAgeDistribution(profile, rng) {
  const varied = {};
  let total = 0;
  for (const [group, pct] of Object.entries(profile)) {
    const factor = 1 + (rng() - 0.5) * 0.15;
    varied[group] = Math.max(0.01, pct * factor);
    total += varied[group];
  }
  for (const group of Object.keys(varied)) {
    varied[group] = Math.round((varied[group] / total) * 1000) / 1000;
  }
  return varied;
}

function dominantAgeGroup(dist) {
  let max = 0, dominant = "25-44";
  for (const [group, pct] of Object.entries(dist)) {
    if (pct > max) { max = pct; dominant = group; }
  }
  return dominant;
}

// ===== Main =====
console.log("Generating kelurahan-level demographics for Jabodetabek H3 hexes...");
console.log(`Kelurahan entries: ${Object.keys(KELURAHAN_CENTROIDS).length}`);

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

  const coords = feature.geometry.coordinates[0];
  const lat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
  const lng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;

  const kelurahan = findNearestKelurahan(lat, lng);
  if (!kelurahan) continue;

  const kelData = KELURAHAN_CENTROIDS[kelurahan];
  const kecamatan = kelData.kecamatan;
  const kecData = BPS_KECAMATAN_DATA[kecamatan];
  if (!kecData) continue;

  const ageProfile = AGE_PROFILES[kecData.age_profile];
  const rng = seededRandom(h3Index);

  // Per-kelurahan variation: slightly different from kecamatan base
  const kelIndex = (KELURAHAN_PER_KECAMATAN[kecamatan] || []).indexOf(kelurahan);
  const kelVariation = 1 + ((kelIndex % 5) - 2) * 0.06; // -12% to +12% per kelurahan

  const densityVariation = kelVariation * (1 + (rng() - 0.5) * 0.3);
  const population_density = Math.round(kecData.density_base * densityVariation);
  const age_distribution = varyAgeDistribution(ageProfile, rng);
  const sex_ratio = Math.round((99 + rng() * 3) * 10) / 10;
  const total_population = Math.round(population_density * H3_RES8_AREA_KM2);

  const pct_dependent_raw = (age_distribution["0-14"] || 0) + (age_distribution["65+"] || 0);
  const pct_dependent = Math.round(pct_dependent_raw * 1000) / 10;

  const zero_veh_variation = kelVariation * (1 + (rng() - 0.5) * 0.25);
  const pct_zero_vehicle = Math.round(kecData.zero_veh_base * zero_veh_variation * 10) / 10;

  const njop_variation = kelVariation * (1 + (rng() - 0.5) * 0.35);
  const avg_njop = Math.round(kecData.njop_base * njop_variation);

  demographics[h3Index] = {
    h3_index: h3Index,
    kelurahan,
    kecamatan,
    city_code: kecData.city_code,
    population_density,
    total_population,
    age_distribution,
    dominant_age_group: dominantAgeGroup(age_distribution),
    sex_ratio,
    pct_dependent,
    pct_zero_vehicle,
    avg_njop,
    bps_source: `BPS ${kecData.city_code} 2023 (modeled)`,
  };
}

const outputDir = join(__dirname, "..", "public", "data");
mkdirSync(outputDir, { recursive: true });
const outputPath = join(outputDir, "jakarta_demographics.json");
writeFileSync(outputPath, JSON.stringify(demographics, null, 2));

const uniqueKelurahan = new Set(Object.values(demographics).map(d => d.kelurahan));
const uniqueKecamatan = new Set(Object.values(demographics).map(d => d.kecamatan));
const densities = Object.values(demographics).map(d => d.population_density);
const avgDensity = Math.round(densities.reduce((a, b) => a + b, 0) / densities.length);
const totalPop = Object.values(demographics).reduce((sum, d) => sum + d.total_population, 0);

console.log(`Saved demographics for ${Object.keys(demographics).length} hexes to ${outputPath}`);
console.log(`Unique kelurahan: ${uniqueKelurahan.size}, Unique kecamatan: ${uniqueKecamatan.size}`);
console.log(`Average density: ${avgDensity.toLocaleString()} persons/km²`);
console.log(`Total estimated population: ${totalPop.toLocaleString()}`);
console.log(`City codes: ${[...new Set(Object.values(demographics).map(d => d.city_code))].join(", ")}`);
