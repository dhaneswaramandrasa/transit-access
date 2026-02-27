const OSRM_BASE = "https://router.project-osrm.org/route/v1/foot";

export interface OSRMRoute {
  coordinates: [number, number][]; // [lng, lat][]
  distance_km: number;
  duration_minutes: number;
}

/**
 * Fetch a walking route from OSRM public API.
 * Returns GeoJSON coordinates for the route line, plus distance/duration.
 * Returns null on any error (graceful degradation).
 */
export async function fetchWalkingRoute(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
  signal?: AbortSignal
): Promise<OSRMRoute | null> {
  const url = `${OSRM_BASE}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;

    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.[0]) return null;

    const route = data.routes[0];
    return {
      coordinates: route.geometry.coordinates as [number, number][],
      distance_km: Math.round(route.distance / 10) / 100, // m → km, 2dp
      duration_minutes: Math.round(route.duration / 60),
    };
  } catch {
    return null;
  }
}
