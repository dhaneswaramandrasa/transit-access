"use client";

import { useEffect, useRef } from "react";
import { useAccessibilityStore, type Demographics } from "@/lib/store";

export function useDemographics() {
  const {
    selectedHex,
    demographicsData,
    setDemographicsData,
    setDemographics,
  } = useAccessibilityStore();

  const loadedRef = useRef(false);
  // Secondary lookup: "kelurahan__kecamatan__city_code" → Demographics
  const kelLookupRef = useRef<Map<string, Demographics>>(new Map());

  // Load demographics JSON on mount
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    (async () => {
      try {
        const res = await fetch("/data/jakarta_demographics.json");
        if (!res.ok) return;
        const data: Record<string, Demographics> = await res.json();

        const demoMap = new Map<string, Demographics>();
        const kelMap = new Map<string, Demographics>();

        for (const [h3Index, demo] of Object.entries(data)) {
          demoMap.set(h3Index, demo);
          // Key matches the click handler format in AccessibilityMap
          const kelKey = `${demo.kelurahan}__${demo.kecamatan}__${demo.city_code}`;
          if (!kelMap.has(kelKey)) {
            kelMap.set(kelKey, demo);
          }
        }

        kelLookupRef.current = kelMap;
        setDemographicsData(demoMap);
      } catch (err) {
        console.error("Failed to load demographics:", err);
      }
    })();
  }, [setDemographicsData]);

  // Look up demographics for selected hex or boundary
  useEffect(() => {
    if (!selectedHex) {
      setDemographics(null);
      return;
    }

    const h3Index = selectedHex.h3_index;

    // Kelurahan boundary click: h3_index = "kel_<kelurahan>__<kecamatan>__<city_code>"
    if (h3Index.startsWith("kel_")) {
      const kelKey = h3Index.slice(4); // strip "kel_" prefix
      const demo = kelLookupRef.current.get(kelKey) || null;
      setDemographics(demo);
      return;
    }

    // Kecamatan boundary: no single kelurahan to display
    if (h3Index.startsWith("kec_")) {
      setDemographics(null);
      return;
    }

    // Normal H3 hex lookup
    const demo = demographicsData.get(h3Index) || null;
    setDemographics(demo);
  }, [selectedHex, demographicsData, setDemographics]);
}
