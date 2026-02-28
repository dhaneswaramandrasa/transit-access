"use client";

import { useEffect, useRef } from "react";
import { useAccessibilityStore, type TransitStop } from "@/lib/store";
import { haversineDistance } from "@/lib/poiUtils";

const WALK_SPEED_KMH = 4.8;

export function useTransitStops() {
  const {
    clickedCoordinate,
    threshold,
    allTransitStops,
    setAllTransitStops,
    setNearbyTransitStops,
  } = useAccessibilityStore();

  const loadedRef = useRef(false);

  // Load transit stops GeoJSON on mount
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    (async () => {
      try {
        const res = await fetch("/data/jakarta_transit_stops.geojson");
        if (!res.ok) return;
        const data = await res.json();

        const stops: TransitStop[] = data.features.map(
          (f: {
            geometry: { coordinates: [number, number] };
            properties: {
              id: string;
              name: string;
              type: "transjakarta" | "krl" | "mrt";
              line: string;
            };
          }) => ({
            id: f.properties.id,
            name: f.properties.name,
            type: f.properties.type,
            line: f.properties.line,
            coordinates: f.geometry.coordinates as [number, number],
          })
        );

        setAllTransitStops(stops);
      } catch (err) {
        console.error("Failed to load transit stops:", err);
      }
    })();
  }, [setAllTransitStops]);

  // Filter nearby stops on coordinate/threshold change
  useEffect(() => {
    if (!clickedCoordinate || allTransitStops.length === 0) {
      setNearbyTransitStops([]);
      return;
    }

    const [lng, lat] = clickedCoordinate;
    const maxDistKm = (threshold / 60) * WALK_SPEED_KMH;

    const nearby = allTransitStops
      .map((stop) => {
        const dist = haversineDistance(
          lat,
          lng,
          stop.coordinates[1],
          stop.coordinates[0]
        );
        return {
          ...stop,
          distance_km: Math.round(dist * 100) / 100,
        };
      })
      .filter((s) => s.distance_km <= maxDistKm)
      .sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));

    setNearbyTransitStops(nearby);
  }, [clickedCoordinate, threshold, allTransitStops, setNearbyTransitStops]);
}
