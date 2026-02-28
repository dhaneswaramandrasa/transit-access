"use client";

import { useEffect, useRef } from "react";
import { useAccessibilityStore } from "@/lib/store";

// Must match Python config analysis.h3_resolution
const H3_RESOLUTION = 8;

export function useAISummary() {
  const {
    selectedHex,
    threshold,
    mapStats,
    clickedCoordinate,
    demographics,
    nearbyTransitStops,
    setAISummary,
    setAILoading,
    setAIError,
    appendAISummary,
    resetAI,
  } = useAccessibilityStore();

  const abortRef = useRef<AbortController | null>(null);
  const prevHexRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedHex || !mapStats) return;

    // Skip if same hex
    if (prevHexRef.current === selectedHex.h3_index) return;
    prevHexRef.current = selectedHex.h3_index;

    // Abort previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    resetAI();
    setAILoading(true);

    // Build POI counts from hex-level pre-computed routing data
    const poiCounts: Record<string, number> = {
      hospital: selectedHex[`hospital_${threshold}min`] ?? 0,
      clinic: selectedHex[`clinic_${threshold}min`] ?? 0,
      market: selectedHex[`market_${threshold}min`] ?? 0,
      supermarket: selectedHex[`supermarket_${threshold}min`] ?? 0,
      school: selectedHex[`school_${threshold}min`] ?? 0,
      park: selectedHex[`park_${threshold}min`] ?? 0,
    };

    // Compute lat/lng from clicked coordinate
    const lat = clickedCoordinate ? clickedCoordinate[1] : 0;
    const lng = clickedCoordinate ? clickedCoordinate[0] : 0;

    // Count transit stops by type
    const transitCounts = {
      transjakarta: nearbyTransitStops.filter((s) => s.type === "transjakarta").length,
      krl: nearbyTransitStops.filter((s) => s.type === "krl").length,
      mrt: nearbyTransitStops.filter((s) => s.type === "mrt").length,
      total: nearbyTransitStops.length,
    };

    const body: Record<string, unknown> = {
      h3_index: selectedHex.h3_index,
      h3_resolution: H3_RESOLUTION,
      lat,
      lng,
      composite_score: selectedHex.composite_score,
      score_30min: selectedHex.score_30min,
      score_60min: selectedHex.score_60min,
      jakarta_avg_score: mapStats.avg_score,
      jakarta_median_score: mapStats.median_score,
      percentile_rank: selectedHex.percentile_rank,
      threshold,
      poi_counts: poiCounts,
    };

    // Add demographics if available
    if (demographics) {
      body.demographics = {
        population_density: demographics.population_density,
        total_population: demographics.total_population,
        age_distribution: demographics.age_distribution,
        dominant_age_group: demographics.dominant_age_group,
        kecamatan: demographics.kecamatan,
        sex_ratio: demographics.sex_ratio,
      };
    }

    // Add transit stops if available
    if (nearbyTransitStops.length > 0) {
      body.transit_stops = transitCounts;
    }

    (async () => {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errText = await res.text();
          setAIError(`Analysis failed: ${res.status} ${errText}`);
          setAILoading(false);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setAIError("No response stream");
          setAILoading(false);
          return;
        }

        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          appendAISummary(chunk);
        }

        setAILoading(false);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setAIError(
          err instanceof Error ? err.message : "Unknown error"
        );
        setAILoading(false);
      }
    })();

    return () => controller.abort();
  }, [
    selectedHex?.h3_index,
    threshold,
    mapStats,
    selectedHex,
    clickedCoordinate,
    demographics,
    nearbyTransitStops,
    resetAI,
    setAILoading,
    setAIError,
    appendAISummary,
    setAISummary,
  ]);
}
