import { NextRequest } from "next/server";

/**
 * GET /api/geocode?q=Bundaran+HI
 *
 * Proxies to Nominatim for forward geocoding.
 * Bounded to Jakarta area, limited to Indonesian results.
 * Respects Nominatim usage policy (1 req/sec handled client-side).
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");

  if (!q || q.trim().length < 2) {
    return Response.json(
      { error: "Query parameter 'q' must be at least 2 characters" },
      { status: 400 }
    );
  }

  try {
    const params = new URLSearchParams({
      q: q.trim(),
      format: "json",
      countrycodes: "id",
      viewbox: "106.6,-5.9,107.0,-6.5",
      bounded: "1",
      limit: "5",
      addressdetails: "1",
    });

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          "User-Agent": "TransitAccessibilityIndex/1.0",
          Accept: "application/json",
        },
      }
    );

    if (!res.ok) {
      return Response.json(
        { error: `Nominatim returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();

    const results = data.map(
      (item: {
        lat: string;
        lon: string;
        display_name: string;
        type: string;
      }) => ({
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        display_name: item.display_name,
        type: item.type,
      })
    );

    return Response.json(results, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch (err) {
    console.error("Geocode error:", err);
    return Response.json({ error: "Geocoding failed" }, { status: 500 });
  }
}
