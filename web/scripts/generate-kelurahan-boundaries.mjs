/**
 * Generate kelurahan boundary GeoJSON with kelurahan-level scoring.
 *
 * Uses real administrative boundaries from BIG (Badan Informasi Geospasial).
 * Spatial join: for each BIG boundary polygon, find all H3 hexes that overlap
 * it by checking the hex centroid AND all 6 corner vertices. Checking vertices
 * fixes small/narrow kelurahan (< H3 centroid spacing ~777m) where no centroid
 * falls inside the polygon.
 *
 * Output: jakarta_kelurahan_boundaries.geojson
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { cellToLatLng, cellToBoundary } from "h3-js";

// H3 res 8 circumradius ~534m ≈ 0.0048°. Expand bbox by this to catch hexes
// whose centroid is outside but corners are inside the polygon.
const HEX_CIRCUMRADIUS_DEG = 0.005;

const __dirname = dirname(fileURLToPath(import.meta.url));

const hexPath = join(__dirname, "..", "public", "data", "jakarta_h3_scores.geojson");
const outputPath = join(__dirname, "..", "public", "data", "jakarta_kelurahan_boundaries.geojson");

const BIG_API = "https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/Administrasi_AR_KelDesa_10K/MapServer/0/query";

const JABODETABEK_AREAS = [
  { where: `WADMPR='DKI Jakarta'`, label: "DKI Jakarta" },
  { where: `WADMKK='Kota Tangerang'`, label: "Kota Tangerang" },
  { where: `WADMKK='Kota Tangerang Selatan'`, label: "Kota Tangsel" },
  { where: `WADMKK='Tangerang' AND WADMPR='Banten'`, label: "Kab. Tangerang" },
  { where: `WADMKK='Kota Bekasi'`, label: "Kota Bekasi" },
  { where: `WADMKK='Bekasi' AND WADMPR='Jawa Barat'`, label: "Kab. Bekasi" },
  { where: `WADMKK='Kota Depok'`, label: "Kota Depok" },
  { where: `WADMKK='Kota Bogor'`, label: "Kota Bogor" },
  { where: `WADMKK='Bogor' AND WADMPR='Jawa Barat'`, label: "Kab. Bogor" },
];

const CITY_CODE_MAP = {
  "Kota Adm. Jakarta Pusat": "3171", "Kota Adm. Jakarta Utara": "3172",
  "Kota Adm. Jakarta Barat": "3173", "Kota Adm. Jakarta Selatan": "3174",
  "Kota Adm. Jakarta Timur": "3175", "Adm. Kep. Seribu": "3101",
  "Kota Tangerang": "3671", "Kota Tangerang Selatan": "3674", "Tangerang": "3603",
  "Kota Bekasi": "3275", "Bekasi": "3216", "Kota Depok": "3276",
  "Kota Bogor": "3271", "Bogor": "3201",
};

// ─── Geometry helpers ────────────────────────────────────────────────

function titleCase(str) {
  return (str || "").toLowerCase().replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());
}

/** Ray-casting point-in-polygon. point = [lng, lat], ring = [[lng,lat], ...] */
function pointInRing(point, ring) {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Point in GeoJSON Polygon (respecting holes) or MultiPolygon */
function pointInGeometry(point, geometry) {
  if (geometry.type === "Polygon") {
    if (!pointInRing(point, geometry.coordinates[0])) return false;
    for (let i = 1; i < geometry.coordinates.length; i++) {
      if (pointInRing(point, geometry.coordinates[i])) return false;
    }
    return true;
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((poly) =>
      pointInGeometry(point, { type: "Polygon", coordinates: poly })
    );
  }
  return false;
}

/** Bounding box [minLng, minLat, maxLng, maxLat] for fast pre-filter */
function bbox(geometry) {
  const coords = [];
  function collect(c) {
    if (typeof c[0] === "number") { coords.push(c); return; }
    c.forEach(collect);
  }
  collect(geometry.coordinates);
  return [
    Math.min(...coords.map((c) => c[0])),
    Math.min(...coords.map((c) => c[1])),
    Math.max(...coords.map((c) => c[0])),
    Math.max(...coords.map((c) => c[1])),
  ];
}

/** Douglas-Peucker simplification */
function perpDist(pt, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const mag = Math.sqrt(dx * dx + dy * dy);
  if (mag === 0) return Math.sqrt((pt[0] - a[0]) ** 2 + (pt[1] - a[1]) ** 2);
  const u = ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / (mag * mag);
  return Math.sqrt((pt[0] - (a[0] + u * dx)) ** 2 + (pt[1] - (a[1] + u * dy)) ** 2);
}
function simplifyDP(pts, eps) {
  if (pts.length <= 2) return pts;
  let maxD = 0, maxI = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], pts[0], pts[pts.length - 1]);
    if (d > maxD) { maxD = d; maxI = i; }
  }
  if (maxD > eps) {
    const l = simplifyDP(pts.slice(0, maxI + 1), eps);
    const r = simplifyDP(pts.slice(maxI), eps);
    return l.slice(0, -1).concat(r);
  }
  return [pts[0], pts[pts.length - 1]];
}
function simplifyGeom(coords, eps) {
  if (Array.isArray(coords[0]) && typeof coords[0][0] === "number") return simplifyDP(coords, eps);
  return coords.map((c) => simplifyGeom(c, eps));
}
function roundCoords(coords) {
  if (typeof coords[0] === "number") return [Math.round(coords[0] * 1e5) / 1e5, Math.round(coords[1] * 1e5) / 1e5];
  return coords.map(roundCoords);
}

/** Min-max normalize an array to 0-100 */
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

// ─── BIG API Fetching ────────────────────────────────────────────────

async function fetchArea(whereClause, label) {
  const features = [];
  let offset = 0;
  const pageSize = 2000;
  while (true) {
    const params = new URLSearchParams({
      where: whereClause,
      outFields: "NAMOBJ,WADMKC,WADMKK,WADMPR",
      f: "geojson", resultRecordCount: String(pageSize),
      resultOffset: String(offset), outSR: "4326",
    });
    console.log(`  Fetching ${label} (offset ${offset})...`);
    try {
      const res = await fetch(`${BIG_API}?${params}`, {
        headers: { "User-Agent": "TransitAccessibilityIndex/1.0" },
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) { console.error(`  HTTP ${res.status}`); break; }
      const data = await res.json();
      if (!data.features || data.features.length === 0) break;
      features.push(...data.features);
      console.log(`  Got ${data.features.length} (total: ${features.length})`);
      if (data.features.length < pageSize) break;
      offset += pageSize;
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      console.error(`  Error: ${err.message}`);
      break;
    }
  }
  return features;
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log("Loading hex data...");
  const hexData = JSON.parse(readFileSync(hexPath, "utf-8"));
  console.log(`  ${hexData.features.length} scored hexes`);

  // ── Step 1: Build centroid + vertex lookup for all scored hexes ──
  // centroid is [lng, lat] for GeoJSON convention
  const hexCentroids = new Map(); // h3_index → [lng, lat]
  const hexVertices = new Map();  // h3_index → [[lng, lat], ...] (6 corners)
  const hexProps = new Map();     // h3_index → feature.properties

  for (const feature of hexData.features) {
    const h3 = feature.properties.h3_index;
    const [lat, lng] = cellToLatLng(h3); // h3-js returns [lat, lng]
    hexCentroids.set(h3, [lng, lat]);
    // cellToBoundary returns [[lat,lng],...] — convert to [lng,lat]
    hexVertices.set(h3, cellToBoundary(h3).map(([vLat, vLng]) => [vLng, vLat]));
    hexProps.set(h3, feature.properties);
  }

  // ── Step 2: Fetch BIG boundaries ──
  console.log("\nFetching BIG boundaries...");
  const bigFeatures = [];
  for (const area of JABODETABEK_AREAS) {
    const features = await fetchArea(area.where, area.label);
    console.log(`  ${area.label}: ${features.length}`);
    bigFeatures.push(...features);
  }
  console.log(`Total BIG features: ${bigFeatures.length}`);

  // ── Step 3: Spatial join — assign each hex to its boundary ──
  console.log("\nRunning spatial join (hex centroids → boundary polygons)...");

  // Build bounding boxes for fast pre-filtering
  const boundaryBBoxes = bigFeatures.map((f) =>
    f.geometry ? bbox(f.geometry) : null
  );

  // For each boundary, collect matching hexes
  const boundaryHexes = new Map(); // bigFeat index → [h3_index, ...]
  const assignedHexes = new Set(); // track hexes already assigned (first-match wins)

  for (let bi = 0; bi < bigFeatures.length; bi++) {
    const bigFeat = bigFeatures[bi];
    if (!bigFeat.geometry) continue;
    const [minLng, minLat, maxLng, maxLat] = boundaryBBoxes[bi];
    // Expand bbox by hex circumradius to catch hexes that overlap but whose
    // centroid is just outside the polygon boundary.
    const eminLng = minLng - HEX_CIRCUMRADIUS_DEG, emaxLng = maxLng + HEX_CIRCUMRADIUS_DEG;
    const eminLat = minLat - HEX_CIRCUMRADIUS_DEG, emaxLat = maxLat + HEX_CIRCUMRADIUS_DEG;
    const matched = [];

    for (const [h3, centroid] of hexCentroids) {
      const [lng, lat] = centroid;
      // Quick expanded-bbox pre-filter
      if (lng < eminLng || lng > emaxLng || lat < eminLat || lat > emaxLat) continue;
      // Check centroid first (fast path), then vertices for small/narrow boundaries
      if (
        pointInGeometry(centroid, bigFeat.geometry) ||
        hexVertices.get(h3).some((v) => pointInGeometry(v, bigFeat.geometry))
      ) {
        matched.push(h3);
      }
    }

    if (matched.length > 0) {
      boundaryHexes.set(bi, matched);
      matched.forEach((h3) => assignedHexes.add(h3));
    }

    if ((bi + 1) % 100 === 0) {
      process.stdout.write(`  Processed ${bi + 1}/${bigFeatures.length} boundaries\r`);
    }
  }

  const unassigned = hexData.features.filter(
    (f) => !assignedHexes.has(f.properties.h3_index)
  ).length;
  console.log(`\n  Boundaries with hexes: ${boundaryHexes.size}/${bigFeatures.length}`);
  console.log(`  Hexes assigned: ${assignedHexes.size}/${hexData.features.length}`);
  console.log(`  Unassigned hexes (outside all boundaries): ${unassigned}`);

  // ── Step 4: Build output features ──
  console.log("\nBuilding output features...");
  const outputFeatures = [];

  for (let bi = 0; bi < bigFeatures.length; bi++) {
    const bigFeat = bigFeatures[bi];
    if (!bigFeat.geometry) continue;

    const p = bigFeat.properties || {};
    const kabKota = p.WADMKK || "";
    const cityCode = CITY_CODE_MAP[kabKota] || "";
    const kelurahan = titleCase(p.NAMOBJ || "");
    const kecamatan = titleCase(p.WADMKC || "");

    const geom = {
      type: bigFeat.geometry.type,
      coordinates: simplifyGeom(roundCoords(bigFeat.geometry.coordinates), 0.0001),
    };

    const matchedH3s = boundaryHexes.get(bi) || [];

    if (matchedH3s.length === 0) {
      // No scored hexes in this boundary
      outputFeatures.push({
        type: "Feature", geometry: geom,
        properties: { kelurahan, kecamatan, city_code: cityCode, kab_kota: kabKota, hex_count: 0, source: "big" },
      });
    } else {
      const hexes = matchedH3s.map((h3) => hexProps.get(h3));
      outputFeatures.push({
        type: "Feature", geometry: geom,
        properties: { kelurahan, kecamatan, city_code: cityCode, kab_kota: kabKota, hex_count: hexes.length, source: "big", _hexes: hexes },
      });
    }
  }

  // ── Step 5: Kelurahan-level scoring with normalization ──
  console.log("Computing kelurahan-level scores...");

  const featuresWithData = outputFeatures.filter((f) => f.properties._hexes);
  console.log(`  Kelurahan with data: ${featuresWithData.length}`);

  // Aggregate raw values per kelurahan
  const kelRaw = featuresWithData.map((feat) => {
    const hexes = feat.properties._hexes;
    const n = hexes.length;
    return {
      pop_total: hexes.reduce((s, h) => s + (h.pop_total ?? 0), 0),
      pct_dependent: hexes.reduce((s, h) => s + (h.pct_dependent ?? 0), 0) / n,
      pct_zero_vehicle: hexes.reduce((s, h) => s + (h.pct_zero_vehicle ?? 0), 0) / n,
      avg_njop: hexes.reduce((s, h) => s + (h.avg_njop ?? 0), 0) / n,
      dist_to_transit: hexes.reduce((s, h) => s + (h.dist_to_transit ?? 999), 0) / n,
      transit_capacity_weight: hexes.reduce((s, h) => s + (h.transit_capacity_weight ?? 0), 0) / n,
      local_poi_density: hexes.reduce((s, h) => s + (h.local_poi_density ?? 0), 0) / n,
      transit_shed_poi_count: hexes.reduce((s, h) => s + (h.transit_shed_poi_count ?? 0), 0) / n,
      hospital_30min: hexes.reduce((s, h) => s + (h.hospital_30min ?? 0), 0) / n,
      hospital_60min: hexes.reduce((s, h) => s + (h.hospital_60min ?? 0), 0) / n,
      clinic_30min: hexes.reduce((s, h) => s + (h.clinic_30min ?? 0), 0) / n,
      clinic_60min: hexes.reduce((s, h) => s + (h.clinic_60min ?? 0), 0) / n,
      market_30min: hexes.reduce((s, h) => s + (h.market_30min ?? 0), 0) / n,
      market_60min: hexes.reduce((s, h) => s + (h.market_60min ?? 0), 0) / n,
      supermarket_30min: hexes.reduce((s, h) => s + (h.supermarket_30min ?? 0), 0) / n,
      supermarket_60min: hexes.reduce((s, h) => s + (h.supermarket_60min ?? 0), 0) / n,
      school_30min: hexes.reduce((s, h) => s + (h.school_30min ?? 0), 0) / n,
      school_60min: hexes.reduce((s, h) => s + (h.school_60min ?? 0), 0) / n,
      park_30min: hexes.reduce((s, h) => s + (h.park_30min ?? 0), 0) / n,
      park_60min: hexes.reduce((s, h) => s + (h.park_60min ?? 0), 0) / n,
      composite_score: hexes.reduce((s, h) => s + (h.composite_score ?? 0), 0) / n,
      score_30min: hexes.reduce((s, h) => s + (h.score_30min ?? 0), 0) / n,
      score_60min: hexes.reduce((s, h) => s + (h.score_60min ?? 0), 0) / n,
      is_walkable_transit: hexes.filter((h) => h.is_walkable_transit).length > n / 2,
    };
  });

  // Normalize across all kelurahan with data
  const normPop = minMaxNormalize(kelRaw.map((r) => r.pop_total));
  const normDependent = minMaxNormalize(kelRaw.map((r) => r.pct_dependent));
  const normZeroVeh = minMaxNormalize(kelRaw.map((r) => r.pct_zero_vehicle));
  const njopArr = kelRaw.map((r) => r.avg_njop);
  const maxNjop = Math.max(...njopArr);
  const normInvNjop = minMaxNormalize(njopArr.map((v) => maxNjop - v));
  const distArr = kelRaw.map((r) => r.dist_to_transit);
  const maxDist = Math.max(...distArr);
  const normDistInv = minMaxNormalize(distArr.map((v) => maxDist - v));
  const normWalkable = kelRaw.map((r) => r.is_walkable_transit ? 100 : 0);
  const normCapacity = minMaxNormalize(kelRaw.map((r) => r.transit_capacity_weight));
  const normPoiDensity = minMaxNormalize(kelRaw.map((r) => r.local_poi_density));
  const normShedPoi = minMaxNormalize(kelRaw.map((r) => r.transit_shed_poi_count));

  const needScores = kelRaw.map((_, i) =>
    Math.round((0.25 * normPop[i] + 0.25 * normDependent[i] + 0.25 * normZeroVeh[i] + 0.25 * normInvNjop[i]) * 10) / 10
  );
  const accessScores = kelRaw.map((_, i) =>
    Math.round((0.15 * normWalkable[i] + 0.25 * normDistInv[i] + 0.25 * normCapacity[i] + 0.20 * normPoiDensity[i] + 0.15 * normShedPoi[i]) * 10) / 10
  );

  const medNeed = median(needScores);
  const medAccess = median(accessScores);
  const sortedAccess = [...accessScores].sort((a, b) => a - b);
  console.log(`  Median need: ${medNeed.toFixed(1)}, Median access: ${medAccess.toFixed(1)}`);

  // Assign scores back to features
  let di = 0;
  for (const feat of outputFeatures) {
    delete feat.properties._hexes;
    if (feat.properties.hex_count === 0) continue;

    const raw = kelRaw[di];
    const need = needScores[di];
    const access = accessScores[di];
    const gap = Math.round((need - access) * 10) / 10;
    let quadrant;
    if (need >= medNeed && access < medAccess) quadrant = "transit-desert";
    else if (need >= medNeed && access >= medAccess) quadrant = "transit-ideal";
    else if (need < medNeed && access >= medAccess) quadrant = "over-served";
    else quadrant = "car-suburb";

    const composite = Math.round((0.4 * need + 0.6 * access) * 10) / 10;
    const pctRank = Math.round((sortedAccess.filter((s) => s <= access).length / sortedAccess.length) * 1000) / 10;

    Object.assign(feat.properties, {
      ...raw,
      transit_need_score: need,
      transit_accessibility_score: access,
      equity_gap: gap,
      quadrant,
      composite_score: composite,
      percentile_rank: pctRank,
    });

    di++;
  }

  // ── Step 6: Write output ──
  const geojson = { type: "FeatureCollection", features: outputFeatures };
  writeFileSync(outputPath, JSON.stringify(geojson));

  const sizeKB = Math.round(JSON.stringify(geojson).length / 1024);
  const withScores = outputFeatures.filter((f) => f.properties.hex_count > 0).length;
  console.log(`\nWrote ${outputFeatures.length} features (${sizeKB} KB)`);
  console.log(`With scores: ${withScores} / ${outputFeatures.length}`);
  console.log(`Blank (no hexes in boundary): ${outputFeatures.length - withScores}`);
}

main().catch(console.error);
