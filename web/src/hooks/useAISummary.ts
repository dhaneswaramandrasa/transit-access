"use client";

import { useEffect, useRef } from "react";
import { useAccessibilityStore } from "@/lib/store";

const H3_RESOLUTION = 8;

export function useAISummary() {
  const selectedHex = useAccessibilityStore((s) => s.selectedHex);
  const mapStats = useAccessibilityStore((s) => s.mapStats);
  const clickedCoordinate = useAccessibilityStore((s) => s.clickedCoordinate);
  const demographics = useAccessibilityStore((s) => s.demographics);
  const nearbyTransitStops = useAccessibilityStore((s) => s.nearbyTransitStops);
  const setAILoading = useAccessibilityStore((s) => s.setAILoading);
  const setAIError = useAccessibilityStore((s) => s.setAIError);
  const appendAISummary = useAccessibilityStore((s) => s.appendAISummary);
  const resetAI = useAccessibilityStore((s) => s.resetAI);

  const demoRef = useRef(demographics);
  demoRef.current = demographics;
  const stopsRef = useRef(nearbyTransitStops);
  stopsRef.current = nearbyTransitStops;
  const coordRef = useRef(clickedCoordinate);
  coordRef.current = clickedCoordinate;

  const prevKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedHex || !mapStats) return;

    const key = selectedHex.h3_index;
    if (prevKeyRef.current === key) return;
    prevKeyRef.current = key;

    resetAI();
    setAILoading(true);

    const demo = demoRef.current;
    const stops = stopsRef.current;
    const coord = coordRef.current;

    const body: Record<string, unknown> = {
      h3_index: selectedHex.h3_index,
      h3_resolution: H3_RESOLUTION,
      lat: coord ? coord[1] : 0,
      lng: coord ? coord[0] : 0,
      tai_score: selectedHex.tai_score ?? 0,
      tni_score: selectedHex.tni_score ?? 0,
      equity_gap: selectedHex.equity_gap ?? 0,
      quadrant: selectedHex.quadrant ?? "Q3",
      jabodetabek_avg_tai: mapStats.avg_score,
      jabodetabek_median_tai: mapStats.median_score,
      // 5-layer breakdown
      tai_l1: selectedHex.tai_l1_first_mile ?? null,
      tai_l2: selectedHex.tai_l2_service_quality ?? null,
      tai_l3: selectedHex.tai_l3_cbd_journey ?? null,
      tai_l4: selectedHex.tai_l4_last_mile ?? null,
      tai_l5: selectedHex.tai_l5_cost_competitiveness ?? null,
      // Supply indicators
      n_transit_stops: selectedHex.n_transit_stops ?? null,
      avg_headway_min: selectedHex.avg_headway_min ?? null,
      min_dist_to_transit_m: selectedHex.min_dist_to_transit_m ?? null,
      transit_mode_diversity: selectedHex.transit_mode_diversity ?? null,
      poi_reach_cbd_min: selectedHex.poi_reach_cbd_min ?? null,
      // Cost competitiveness
      tcr_combined: selectedHex.tcr_combined ?? null,
      transit_competitive_zone: selectedHex.transit_competitive_zone ?? null,
      // Need-side
      population: selectedHex.population ?? 0,
      poverty_rate: selectedHex.poverty_rate ?? null,
      zero_vehicle_hh_pct: selectedHex.zero_vehicle_hh_pct ?? null,
      dependency_ratio: selectedHex.dependency_ratio ?? null,
    };

    if (demo) {
      body.demographics = {
        kelurahan_name: demo.kelurahan_name,
        kecamatan_name: demo.kecamatan_name,
        kota_kab_name: demo.kota_kab_name,
        pop_density: demo.pop_density,
        population: demo.population,
        poverty_rate: demo.poverty_rate,
        zero_vehicle_hh_pct: demo.zero_vehicle_hh_pct,
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

  }, [selectedHex?.h3_index, mapStats]); // eslint-disable-line react-hooks/exhaustive-deps
}
