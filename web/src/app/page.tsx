"use client";

import dynamic from "next/dynamic";
import LandingOverlay from "@/components/landing/LandingOverlay";
import LoadingSequence from "@/components/loading/LoadingSequence";
import ResultsLayout from "@/components/ResultsLayout";
import { useAISummary } from "@/hooks/useAISummary";

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
  // Activate the AI summary hook
  useAISummary();

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      {/* Map always renders underneath */}
      <div className="absolute inset-0">
        <AccessibilityMap />
      </div>

      {/* Phase overlays */}
      <LandingOverlay />
      <LoadingSequence />
      <ResultsLayout />
    </div>
  );
}
