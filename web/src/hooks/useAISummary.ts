"use client";

import { useEffect, useRef } from "react";
import { useAccessibilityStore } from "@/lib/store";

const H3_RESOLUTION = 8;

export function useAISummary() {
  const selectedHex = useAccessibilityStore((s) => s.selectedHex);
  const threshold = useAccessibilityStore((s) => s.threshold);
  const mapStats = useAccessibilityStore((s) => s.mapStats);
  const clickedCoordinate = useAccessibilityStore((s) => s.clickedCoordinate);
  const demographics = useAccessibilityStore((s) => s.demographics);
  const nearbyTransitStops = useAccessibilityStore((s) => s.nearbyTransitStops);
  const setAILoading = useAccessibilityStore((s) => s.setAILoading);
  const setAIError = useAccessibilityStore((s) => s.setAIError);
  const appendAISummary = useAccessibilityStore((s) => s.appendAISummary);
  const resetAI = useAccessibilityStore((s) => s.resetAI);

  // Refs for values that should NOT retrigger the effect
  const demoRef = useRef(demographics);
  demoRef.current = demographics;
  const stopsRef = useRef(nearbyTransitStops);
  stopsRef.current = nearbyTransitStops;
  const coordRef = useRef(clickedCoordinate);
  coordRef.current = clickedCoordinate;

  const prevKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedHex || !mapStats) return;

    // Key includes threshold so re-analysis happens when user switches 30/60min
    const key = `${selectedHex.h3_index}:${threshold}`;
    if (prevKeyRef.current === key) return;
    prevKeyRef.current = key;

    resetAI();
    setAILoading(true);

    const demo = demoRef.current;
    const stops = stopsRef.current;
    const coord = coordRef.current;

    const poiCounts: Record<string, number> = {
      hospital: selectedHex[`hospital_${threshold}min`] ?? 0,
      clinic: selectedHex[`clinic_${threshold}min`] ?? 0,
      market: selectedHex[`market_${threshold}min`] ?? 0,
      supermarket: selectedHex[`supermarket_${threshold}min`] ?? 0,
      school: selectedHex[`school_${threshold}min`] ?? 0,
      park: selectedHex[`park_${threshold}min`] ?? 0,
    };

    const body: Record<string, unknown> = {
      h3_index: selectedHex.h3_index,
      h3_resolution: H3_RESOLUTION,
      lat: coord ? coord[1] : 0,
      lng: coord ? coord[0] : 0,
      composite_score: selectedHex.composite_score ?? 0,
      score_30min: selectedHex.score_30min ?? 0,
      score_60min: selectedHex.score_60min ?? 0,
      jabodetabek_avg_score: mapStats.avg_score,
      jabodetabek_median_score: mapStats.median_score,
      percentile_rank: selectedHex.percentile_rank ?? 0,
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

    if (demo) {
      body.demographics = {
        population_density: demo.population_density,
        total_population: demo.total_population,
        age_distribution: demo.age_distribution,
        dominant_age_group: demo.dominant_age_group,
        kelurahan: demo.kelurahan,
        kecamatan: demo.kecamatan,
        sex_ratio: demo.sex_ratio,
      };
    }

    if (stops.length > 0) {
      body.transit_stops = {
        transjakarta: stops.filter((s) => s.type === "transjakarta").length,
        krl: stops.filter((s) => s.type === "krl").length,
        mrt: stops.filter((s) => s.type === "mrt").length,
        lrt: stops.filter((s) => s.type === "lrt").length,
        total: stops.length,
      };
    }

    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errText = await res.text();
          setAIError(`Analysis failed (${res.status}): ${errText}`);
          setAILoading(false);
          return;
        }
        const text = await res.text();
        appendAISummary(text);
        setAILoading(false);
      })
      .catch((err: unknown) => {
        setAIError(err instanceof Error ? err.message : "Request failed");
        setAILoading(false);
      });

  }, [selectedHex?.h3_index, threshold, mapStats]); // eslint-disable-line react-hooks/exhaustive-deps
}
