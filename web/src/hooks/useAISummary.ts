"use client";

import { useEffect, useRef } from "react";
import { useAccessibilityStore } from "@/lib/store";

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

    if (prevHexRef.current === selectedHex.h3_index) return;
    prevHexRef.current = selectedHex.h3_index;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    resetAI();
    setAILoading(true);

    const poiCounts: Record<string, number> = {
      hospital: selectedHex[`hospital_${threshold}min`] ?? 0,
      clinic: selectedHex[`clinic_${threshold}min`] ?? 0,
      market: selectedHex[`market_${threshold}min`] ?? 0,
      supermarket: selectedHex[`supermarket_${threshold}min`] ?? 0,
      school: selectedHex[`school_${threshold}min`] ?? 0,
      park: selectedHex[`park_${threshold}min`] ?? 0,
    };

    const lat = clickedCoordinate ? clickedCoordinate[1] : 0;
    const lng = clickedCoordinate ? clickedCoordinate[0] : 0;

    const transitCounts = {
      transjakarta: nearbyTransitStops.filter((s) => s.type === "transjakarta").length,
      krl: nearbyTransitStops.filter((s) => s.type === "krl").length,
      mrt: nearbyTransitStops.filter((s) => s.type === "mrt").length,
      lrt: nearbyTransitStops.filter((s) => s.type === "lrt").length,
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
      jabodetabek_avg_score: mapStats.avg_score,
      jabodetabek_median_score: mapStats.median_score,
      percentile_rank: selectedHex.percentile_rank,
      threshold,
      poi_counts: poiCounts,
      transit_need_score: selectedHex.transit_need_score ?? 0,
      transit_accessibility_score: selectedHex.transit_accessibility_score ?? 0,
      equity_gap: selectedHex.equity_gap ?? 0,
      quadrant: selectedHex.quadrant ?? "car-suburb",
      pop_total: selectedHex.pop_total ?? 0,
      pct_dependent: selectedHex.pct_dependent ?? 0,
      pct_zero_vehicle: selectedHex.pct_zero_vehicle ?? 0,
      avg_njop: selectedHex.avg_njop ?? 0,
      dist_to_transit: selectedHex.dist_to_transit ?? 999,
      local_poi_density: selectedHex.local_poi_density ?? 0,
      transit_shed_poi_count: selectedHex.transit_shed_poi_count ?? 0,
    };

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
