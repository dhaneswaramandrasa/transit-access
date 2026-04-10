"use client";

import { useEffect } from "react";
import { useAccessibilityStore, type Demographics } from "@/lib/store";

/**
 * Derives demographics from the selected zone's HexProperties.
 * Kelurahan-level properties are available for admin boundary clicks.
 * For H3 hex clicks, only aggregate fields are available.
 */
export function useDemographics() {
  const { selectedHex, setDemographics } = useAccessibilityStore();

  useEffect(() => {
    if (!selectedHex) {
      setDemographics(null);
      return;
    }

    // Kecamatan boundary — no single kelurahan to display
    if (selectedHex.h3_index.startsWith("kec_")) {
      setDemographics(null);
      return;
    }

    // Build Demographics from HexProperties fields
    const demo: Demographics = {
      h3_index: selectedHex.h3_index,
      kelurahan_name: selectedHex.kelurahan_name ?? "—",
      kecamatan_name: selectedHex.kecamatan_name ?? "—",
      kota_kab_name: selectedHex.kota_kab_name ?? "—",
      pop_density: selectedHex.pop_density ?? 0,
      population: selectedHex.population ?? 0,
      poverty_rate: selectedHex.poverty_rate ?? 0,
      avg_household_expenditure: selectedHex.avg_household_expenditure ?? 0,
      zero_vehicle_hh_pct: selectedHex.zero_vehicle_hh_pct ?? 0,
      dependency_ratio: selectedHex.dependency_ratio ?? 0,
      kelurahan_id: selectedHex.kelurahan_id ?? null,
      area_km2: selectedHex.area_km2 ?? null,
    };

    setDemographics(demo);
  }, [selectedHex, setDemographics]);
}
