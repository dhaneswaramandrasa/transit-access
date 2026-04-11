"use client";

import { useEffect, useRef } from "react";
import { useAccessibilityStore, type POIFeature } from "@/lib/store";
import { findReachablePOIs } from "@/lib/poiUtils";

const WALK_SPEED_KMH = 4.8;

/**
 * Hook that watches clickedCoordinate and computes reachable POIs.
 * First uses pre-loaded data for instant results, then fetches
 * real POIs from Overpass API for comprehensive coverage.
 */
export function useReachablePOIs() {
  const {
    selectedHex,
    clickedCoordinate,
    allPOIs,
    setReachablePOIs,
    setSelectedPOI,
    clearRoutes,
    setActiveRouteId,
  } = useAccessibilityStore();

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!selectedHex || !clickedCoordinate) {
      setReachablePOIs([]);
      return;
    }

    const [lng, lat] = clickedCoordinate;

    // Step 1: Immediately show pre-loaded POIs (instant)
    const preloadedReachable = findReachablePOIs(allPOIs, lat, lng, 30);
    setReachablePOIs(preloadedReachable);
    setSelectedPOI(null);
    setActiveRouteId(null);
    clearRoutes();

    // Step 2: Fetch real POIs from Overpass API (async)
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const radiusMeters = Math.round((30 / 60) * WALK_SPEED_KMH * 1000);

    fetch(`/api/pois?lat=${lat}&lng=${lng}&radius=${radiusMeters}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`POI fetch failed: ${res.status}`);
        return res.json();
      })
      .then(
        (geojson: {
          features: Array<{
            geometry: { coordinates: [number, number] };
            properties: { id: string; name: string; category: string };
          }>;
        }) => {
          if (!geojson.features || geojson.features.length === 0) {
            // No Overpass results — keep pre-loaded data
            return;
          }

          // Convert Overpass results to POIFeature format
          const overpassPOIs: POIFeature[] = geojson.features.map((f) => ({
            id: f.properties.id,
            name: f.properties.name,
            category: f.properties.category,
            coordinates: f.geometry.coordinates,
            h3_index: "",
          }));

          // Merge: Overpass as primary, add pre-loaded that aren't duplicated
          const overpassIds = new Set(overpassPOIs.map((p) => p.id));
          const merged = [
            ...overpassPOIs,
            ...allPOIs.filter((p) => !overpassIds.has(p.id)),
          ];

          // Filter by distance and update
          const reachable = findReachablePOIs(merged, lat, lng, 30);
          setReachablePOIs(reachable);
        }
      )
      .catch((err) => {
        if (err.name === "AbortError") return;
        // On error, keep pre-loaded data (already set above)
        console.warn(
          "Overpass POI fetch failed, using pre-loaded data:",
          err.message
        );
      });

    return () => controller.abort();
  }, [
    selectedHex?.h3_index,
    clickedCoordinate?.[0],
    clickedCoordinate?.[1],
    allPOIs.length,
    30,
    setReachablePOIs,
    setSelectedPOI,
    setActiveRouteId,
    clearRoutes,
  ]);
}
