import { NextRequest } from "next/server";

/**
 * GET /api/pois?lat=-6.2&lng=106.85&radius=5000
 *
 * Proxies to Overpass API to fetch POIs within a radius of a coordinate.
 * Returns GeoJSON FeatureCollection with 12 POI categories.
 * Falls back gracefully on error (client uses pre-loaded data).
 */

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

function buildOverpassQuery(
  lat: number,
  lng: number,
  radius: number
): string {
  // Query both nodes and ways (many POIs are mapped as areas in OSM)
  // Use "out center" so ways get a center lat/lon
  return `[out:json][timeout:25];
(
  nw["amenity"="hospital"](around:${radius},${lat},${lng});
  nw["amenity"="clinic"](around:${radius},${lat},${lng});
  nw["amenity"="doctors"](around:${radius},${lat},${lng});
  nw["amenity"="pharmacy"](around:${radius},${lat},${lng});
  nw["amenity"="restaurant"](around:${radius},${lat},${lng});
  nw["amenity"="cafe"](around:${radius},${lat},${lng});
  nw["amenity"="marketplace"](around:${radius},${lat},${lng});
  nw["shop"="supermarket"](around:${radius},${lat},${lng});
  nw["shop"="mall"](around:${radius},${lat},${lng});
  nw["amenity"="school"](around:${radius},${lat},${lng});
  nw["amenity"="university"](around:${radius},${lat},${lng});
  nw["leisure"="park"](around:${radius},${lat},${lng});
  nw["amenity"="place_of_worship"](around:${radius},${lat},${lng});
  nw["amenity"="bank"](around:${radius},${lat},${lng});
);
out center body;`;
}

function mapAmenityToCategory(tags: Record<string, string>): string {
  if (tags.amenity === "hospital") return "hospital";
  if (tags.amenity === "clinic" || tags.amenity === "doctors") return "clinic";
  if (tags.amenity === "pharmacy") return "pharmacy";
  if (tags.amenity === "restaurant") return "restaurant";
  if (tags.amenity === "cafe") return "cafe";
  if (tags.amenity === "marketplace") return "market";
  if (tags.shop === "supermarket") return "supermarket";
  if (tags.shop === "mall") return "supermarket"; // map malls → supermarket category
  if (tags.amenity === "school") return "school";
  if (tags.amenity === "university") return "university";
  if (tags.leisure === "park") return "park";
  if (tags.amenity === "place_of_worship") return "worship";
  if (tags.amenity === "bank") return "bank";
  return "other";
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number }; // for way elements with "out center"
  tags: Record<string, string>;
}

export async function GET(request: NextRequest) {
  const lat = parseFloat(request.nextUrl.searchParams.get("lat") || "");
  const lng = parseFloat(request.nextUrl.searchParams.get("lng") || "");
  const radius = parseInt(
    request.nextUrl.searchParams.get("radius") || "5000"
  );

  if (isNaN(lat) || isNaN(lng)) {
    return Response.json(
      { error: "lat and lng are required numeric parameters" },
      { status: 400 }
    );
  }

  if (radius < 100 || radius > 10000) {
    return Response.json(
      { error: "radius must be between 100 and 10000 meters" },
      { status: 400 }
    );
  }

  try {
    const query = buildOverpassQuery(lat, lng, radius);

    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!res.ok) {
      return Response.json(
        { error: `Overpass returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();

    const features = data.elements
      .filter((el: OverpassElement) => {
        // Nodes have lat/lon directly; ways have center from "out center"
        if (el.type === "node") return el.lat != null && el.lon != null;
        if (el.type === "way") return el.center?.lat != null && el.center?.lon != null;
        return false;
      })
      .map((el: OverpassElement, idx: number) => {
        const category = mapAmenityToCategory(el.tags || {});
        const name =
          el.tags?.name ||
          el.tags?.["name:id"] ||
          el.tags?.["name:en"] ||
          `${category} #${idx + 1}`;

        // Get coordinates: nodes use lat/lon, ways use center
        const elLat = el.type === "way" ? el.center!.lat : el.lat!;
        const elLon = el.type === "way" ? el.center!.lon : el.lon!;

        return {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [
              Math.round(elLon * 100000) / 100000,
              Math.round(elLat * 100000) / 100000,
            ],
          },
          properties: {
            id: `overpass_${el.type}_${el.id}`,
            name,
            category,
            osm_id: el.id,
          },
        };
      })
      .filter(
        (f: { properties: { category: string } }) =>
          f.properties.category !== "other"
      );

    const geojson = { type: "FeatureCollection", features };

    return Response.json(geojson, {
      headers: { "Cache-Control": "public, max-age=300" }, // 5 min cache
    });
  } catch (err) {
    console.error("Overpass error:", err);
    return Response.json(
      { error: "POI fetch failed. Use pre-loaded data." },
      { status: 500 }
    );
  }
}
