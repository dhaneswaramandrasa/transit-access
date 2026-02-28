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
        for (const [h3Index, demo] of Object.entries(data)) {
          demoMap.set(h3Index, demo);
        }

        setDemographicsData(demoMap);
      } catch (err) {
        console.error("Failed to load demographics:", err);
      }
    })();
  }, [setDemographicsData]);

  // Look up demographics for selected hex
  useEffect(() => {
    if (!selectedHex) {
      setDemographics(null);
      return;
    }

    const demo = demographicsData.get(selectedHex.h3_index) || null;
    setDemographics(demo);
  }, [selectedHex, demographicsData, setDemographics]);
}
