/**
 * Generate jakarta_demographics.json with BPS-compatible demographic data.
 *
 * Covers Jabodetabek: DKI Jakarta + Kota/Kab Bogor, Depok, Tangerang, Bekasi.
 * New fields: pct_dependent, pct_zero_vehicle, avg_njop
 *
 * Usage: node scripts/generate-demographics.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

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
  // Depok
  "Beji": { lat: -6.3700, lng: 106.8280 }, "Pancoran Mas": { lat: -6.4000, lng: 106.8200 },
  "Cipayung Depok": { lat: -6.4200, lng: 106.8100 }, "Sukmajaya": { lat: -6.3900, lng: 106.8400 },
  "Cilodong": { lat: -6.4100, lng: 106.8500 }, "Limo": { lat: -6.3700, lng: 106.7900 },
  "Cinere": { lat: -6.3400, lng: 106.7700 }, "Cimanggis": { lat: -6.3700, lng: 106.8600 },
  "Tapos": { lat: -6.3900, lng: 106.8800 }, "Sawangan": { lat: -6.4300, lng: 106.7700 },
  "Bojongsari": { lat: -6.4100, lng: 106.7600 },
  // Bekasi
  "Bekasi Timur": { lat: -6.2500, lng: 107.0200 }, "Bekasi Barat": { lat: -6.2400, lng: 106.9800 },
  "Bekasi Utara": { lat: -6.2100, lng: 107.0000 }, "Bekasi Selatan": { lat: -6.2700, lng: 107.0000 },
  "Rawalumbu": { lat: -6.2800, lng: 107.0200 }, "Medan Satria": { lat: -6.2000, lng: 106.9700 },
  "Jatiasih": { lat: -6.2900, lng: 106.9600 }, "Bantargebang": { lat: -6.3300, lng: 107.0400 },
  "Mustika Jaya": { lat: -6.3100, lng: 107.0200 }, "Pondok Gede": { lat: -6.2800, lng: 106.9200 },
  "Jatisampurna": { lat: -6.3100, lng: 106.9400 }, "Pondok Melati": { lat: -6.2900, lng: 106.9100 },
  // Tangerang
  "Tangerang": { lat: -6.1780, lng: 106.6310 }, "Karawaci": { lat: -6.1650, lng: 106.6150 },
  "Cipondoh": { lat: -6.1800, lng: 106.6600 }, "Ciledug": { lat: -6.2300, lng: 106.7100 },
  "Pinang": { lat: -6.2200, lng: 106.6800 }, "Neglasari": { lat: -6.1550, lng: 106.6300 },
  "Batuceper": { lat: -6.1500, lng: 106.6600 }, "Benda": { lat: -6.1300, lng: 106.6500 },
  "Jatiuwung": { lat: -6.2000, lng: 106.5900 }, "Periuk": { lat: -6.1700, lng: 106.6000 },
  "Cibodas": { lat: -6.1900, lng: 106.6100 }, "Larangan": { lat: -6.2200, lng: 106.7300 },
  "Karang Tengah": { lat: -6.2300, lng: 106.7200 },
  // Tangerang Selatan
  "Serpong": { lat: -6.3200, lng: 106.6700 }, "Serpong Utara": { lat: -6.2900, lng: 106.6600 },
  "Pondok Aren": { lat: -6.2600, lng: 106.7300 }, "Ciputat": { lat: -6.2800, lng: 106.7500 },
  "Ciputat Timur": { lat: -6.2900, lng: 106.7600 }, "Pamulang": { lat: -6.3400, lng: 106.7400 },
  "Setu": { lat: -6.3500, lng: 106.6900 },
  // Bogor
  "Bogor Tengah": { lat: -6.5950, lng: 106.7870 }, "Bogor Utara": { lat: -6.5700, lng: 106.7800 },
  "Bogor Selatan": { lat: -6.6200, lng: 106.7900 }, "Bogor Timur": { lat: -6.5900, lng: 106.8100 },
  "Bogor Barat": { lat: -6.6000, lng: 106.7600 }, "Tanah Sareal": { lat: -6.5600, lng: 106.7700 },
};

function findNearestKecamatan(lat, lng) {
  let minDist = Infinity;
  let nearest = "Menteng";
  for (const [name, centroid] of Object.entries(KECAMATAN_CENTROIDS)) {
    const dlat = lat - centroid.lat;
    const dlng = lng - centroid.lng;
    const dist = dlat * dlat + dlng * dlng;
    if (dist < minDist) { minDist = dist; nearest = name; }
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

console.log("Generating BPS-compatible demographics for Jabodetabek H3 hexes...");

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

  const kecamatan = findNearestKecamatan(lat, lng);
  const kecData = BPS_KECAMATAN_DATA[kecamatan];
  if (!kecData) continue;

  const ageProfile = AGE_PROFILES[kecData.age_profile];
  const rng = seededRandom(h3Index);

  const densityVariation = 1 + (rng() - 0.5) * 0.4;
  const population_density = Math.round(kecData.density_base * densityVariation);
  const age_distribution = varyAgeDistribution(ageProfile, rng);
  const sex_ratio = Math.round((99 + rng() * 3) * 10) / 10;
  const total_population = Math.round(population_density * H3_RES8_AREA_KM2);

  const pct_dependent_raw = (age_distribution["0-14"] || 0) + (age_distribution["65+"] || 0);
  const pct_dependent = Math.round(pct_dependent_raw * 1000) / 10;

  const zero_veh_variation = 1 + (rng() - 0.5) * 0.3;
  const pct_zero_vehicle = Math.round(kecData.zero_veh_base * zero_veh_variation * 10) / 10;

  const njop_variation = 1 + (rng() - 0.5) * 0.4;
  const avg_njop = Math.round(kecData.njop_base * njop_variation);

  demographics[h3Index] = {
    h3_index: h3Index, kecamatan, city_code: kecData.city_code,
    population_density, total_population, age_distribution,
    dominant_age_group: dominantAgeGroup(age_distribution),
    sex_ratio, pct_dependent, pct_zero_vehicle, avg_njop,
    bps_source: `BPS ${kecData.city_code} 2023 (modeled)`,
  };
}

const outputDir = join(__dirname, "..", "public", "data");
mkdirSync(outputDir, { recursive: true });
const outputPath = join(outputDir, "jakarta_demographics.json");
writeFileSync(outputPath, JSON.stringify(demographics, null, 2));

console.log(`Saved demographics for ${Object.keys(demographics).length} hexes to ${outputPath}`);
const densities = Object.values(demographics).map(d => d.population_density);
const avgDensity = Math.round(densities.reduce((a, b) => a + b, 0) / densities.length);
const totalPop = Object.values(demographics).reduce((sum, d) => sum + d.total_population, 0);
console.log(`Average density: ${avgDensity.toLocaleString()} persons/km²`);
console.log(`Total estimated population: ${totalPop.toLocaleString()}`);
console.log(`City codes: ${[...new Set(Object.values(demographics).map(d => d.city_code))].join(", ")}`);
