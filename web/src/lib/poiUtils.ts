import type { POIFeature, ReachablePOI } from "./store";

const WALK_SPEED_KMH = 4.8;

/**
 * Haversine distance between two lat/lng points in kilometres.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Find all POIs reachable within the given walking time threshold.
 * Returns sorted by distance (nearest first).
 *
 * 30 min at 4.8 km/h = 2.4 km straight-line radius
 * 60 min at 4.8 km/h = 4.8 km straight-line radius
 */
export function findReachablePOIs(
  allPOIs: POIFeature[],
  clickLat: number,
  clickLng: number,
  thresholdMinutes: 30 | 60
): ReachablePOI[] {
  const maxDistKm = (thresholdMinutes / 60) * WALK_SPEED_KMH;

  return allPOIs
    .map((poi) => {
      const dist = haversineDistance(
        clickLat,
        clickLng,
        poi.coordinates[1], // lat
        poi.coordinates[0] // lng
      );
      return {
        ...poi,
        distance_km: Math.round(dist * 100) / 100,
        walking_minutes: Math.round((dist / WALK_SPEED_KMH) * 60),
      };
    })
    .filter((p) => p.distance_km <= maxDistKm)
    .sort((a, b) => a.distance_km - b.distance_km);
}
