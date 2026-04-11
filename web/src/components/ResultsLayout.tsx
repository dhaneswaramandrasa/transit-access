"use client";

import { motion } from "framer-motion";
import { useAccessibilityStore, QUADRANT_LABELS, QUADRANT_COLORS } from "@/lib/store";
import CardGrid from "./results/CardGrid";

export default function ResultsLayout() {
  const {
    appPhase, locationName, clickedCoordinate, resetForNewAnalysis,
    hexLayerVisible, toggleHexLayer, boundaryMode, setBoundaryMode,
    h3Resolution, setH3Resolution, selectedHex,
  } = useAccessibilityStore();

  const quadrant = selectedHex?.quadrant;
  const quadrantLabel = quadrant ? QUADRANT_LABELS[quadrant] : null;
  const quadrantColor = quadrant ? QUADRANT_COLORS[quadrant] : null;

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
          {quadrantLabel && quadrantColor && (
            <span
              className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5"
              style={{
                backgroundColor: `rgba(${quadrantColor[0]},${quadrantColor[1]},${quadrantColor[2]},0.12)`,
                color: `rgb(${quadrantColor[0]},${quadrantColor[1]},${quadrantColor[2]})`,
              }}
            >
              {quadrant} · {quadrantLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Compact resolution toggle */}
          <div className="flex rounded-lg overflow-hidden border border-slate-200 text-[10px] font-medium">
            {(["kelurahan", "hex"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setBoundaryMode(mode);
                  if (mode === "hex") setH3Resolution(8);
                }}
                className={`px-2 py-1 transition-colors ${
                  boundaryMode === mode
                    ? "bg-blue-500 text-white"
                    : "bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                {mode === "kelurahan" ? "Admin" : "H3"}
              </button>
            ))}
          </div>
          <button
            onClick={toggleHexLayer}
            className={`px-2.5 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              hexLayerVisible
                ? "bg-blue-100 text-blue-700"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {hexLayerVisible ? "Hide" : "Show"} Map
          </button>
          <button
            onClick={resetForNewAnalysis}
            className="px-2.5 py-1.5 text-xs bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-lg font-medium transition-colors"
          >
            ✕
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
