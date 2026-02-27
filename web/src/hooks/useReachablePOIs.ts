"use client";

import { useEffect } from "react";
import { useAccessibilityStore } from "@/lib/store";
import { findReachablePOIs } from "@/lib/poiUtils";

/**
 * Hook that watches selectedHex + clickedCoordinate and computes
 * reachable POIs within the walking-time threshold.
 * Clears routes and selectedPOI when inputs change.
 */
export function useReachablePOIs() {
  const {
    selectedHex,
    clickedCoordinate,
    allPOIs,
    threshold,
    setReachablePOIs,
    setSelectedPOI,
    clearRoutes,
    setActiveRouteId,
  } = useAccessibilityStore();

  useEffect(() => {
    if (!selectedHex || !clickedCoordinate || allPOIs.length === 0) {
      setReachablePOIs([]);
      return;
    }

    const [lng, lat] = clickedCoordinate;
    const reachable = findReachablePOIs(allPOIs, lat, lng, threshold);
    setReachablePOIs(reachable);
    setSelectedPOI(null);
    setActiveRouteId(null);
    clearRoutes();
  }, [
    selectedHex?.h3_index,
    clickedCoordinate?.[0],
    clickedCoordinate?.[1],
    allPOIs.length,
    threshold,
    setReachablePOIs,
    setSelectedPOI,
    setActiveRouteId,
    clearRoutes,
  ]);
}
