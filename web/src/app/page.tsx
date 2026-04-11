"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import LandingOverlay from "@/components/landing/LandingOverlay";
import LoadingSequence from "@/components/loading/LoadingSequence";
import ResultsLayout from "@/components/ResultsLayout";
import EntryScreen from "@/components/EntryScreen";
import { useAISummary } from "@/hooks/useAISummary";
import { useAccessibilityStore } from "@/lib/store";

const STORAGE_KEY = "jtm_persona";

// deck.gl / luma.gl require WebGL — must skip SSR to avoid
// "Cannot read properties of undefined (reading 'maxTextureDimension2D')"
const AccessibilityMap = dynamic(
  () => import("@/components/AccessibilityMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-50">
        <div className="text-slate-400 text-sm animate-pulse">
          Loading map...
        </div>
      </div>
    ),
  }
);

export default function Home() {
  useAISummary();

  const setSelectedPersona = useAccessibilityStore((s) => s.setSelectedPersona);
  const [showEntry, setShowEntry] = useState<boolean | null>(null);

  // On mount: check localStorage — skip entry screen for returning users
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored !== "") {
      // Restore stored persona (may be "skipped")
      if (stored !== "skipped") {
        setSelectedPersona(stored as Parameters<typeof setSelectedPersona>[0]);
      }
      setShowEntry(false);
    } else {
      setShowEntry(true);
    }
  }, [setSelectedPersona]);

  // Wait for localStorage check before rendering
  if (showEntry === null) return null;

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      {/* Map always renders underneath */}
      <div className="absolute inset-0">
        <AccessibilityMap />
      </div>

      {/* Entry persona screen (first visit only) */}
      {showEntry && (
        <EntryScreen onDone={() => setShowEntry(false)} />
      )}

      {/* Phase overlays */}
      {!showEntry && (
        <>
          <LandingOverlay />
          <LoadingSequence />
          <ResultsLayout />
        </>
      )}
    </div>
  );
}
