"use client";

import { motion } from "framer-motion";
import { useAccessibilityStore } from "@/lib/store";
import CardGrid from "./results/CardGrid";

export default function ResultsLayout() {
  const { appPhase, locationName, clickedCoordinate, resetForNewAnalysis, hexLayerVisible, toggleHexLayer } =
    useAccessibilityStore();

  if (appPhase !== "results") return null;

  const coordText = clickedCoordinate
    ? `${clickedCoordinate[1].toFixed(4)}, ${clickedCoordinate[0].toFixed(4)}`
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35 }}
      className="absolute top-0 right-0 z-10 h-full w-full md:w-[520px] lg:w-[560px] flex flex-col bg-slate-50/90 backdrop-blur-md border-l border-slate-200/50"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/50 bg-white/70 backdrop-blur-md">
        <div className="min-w-0 mr-3">
          <h2 className="text-sm font-semibold text-slate-800 truncate">
            {locationName || coordText || "Selected Location"}
          </h2>
          {locationName && coordText && (
            <p className="text-xs text-slate-400 truncate">{coordText}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggleHexLayer}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              hexLayerVisible
                ? "bg-blue-100 text-blue-700"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {hexLayerVisible ? "Hide Index" : "Show Index"}
          </button>
          <button
            onClick={resetForNewAnalysis}
            className="px-3 py-1.5 text-xs bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-lg font-medium transition-colors"
          >
            New Search
          </button>
        </div>
      </div>

      {/* Scrollable cards */}
      <div className="flex-1 overflow-y-auto p-4">
        <CardGrid />
      </div>
    </motion.div>
  );
}
