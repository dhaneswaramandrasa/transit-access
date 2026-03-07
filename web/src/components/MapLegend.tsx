"use client";

import { useState } from "react";
import {
  useAccessibilityStore,
  QUADRANT_COLORS,
  QUADRANT_LABELS,
  type EquityQuadrant,
  type BoundaryMode,
} from "@/lib/store";

const QUADRANT_SHORT: Record<EquityQuadrant, string> = {
  "transit-desert": "Priority",
  "transit-ideal": "Protect",
  "over-served": "Monetize",
  "car-suburb": "Low Priority",
};

const QUADRANT_ORDER: EquityQuadrant[] = [
  "transit-desert",
  "transit-ideal",
  "over-served",
  "car-suburb",
];

const MODE_LABELS: Record<BoundaryMode, string> = {
  kelurahan: "Kelurahan",
  kecamatan: "Kecamatan",
  hex: "H3 Hex",
};

const MODE_DESCRIPTIONS: Record<string, string> = {
  kelurahan: "Scores normalized across kelurahan",
  kecamatan: "Scores normalized across kecamatan",
  "hex-8": "Scores normalized across small hexes (res 8)",
  "hex-7": "Scores normalized across large hexes (res 7)",
};

export default function MapLegend() {
  const hexLayerVisible = useAccessibilityStore((s) => s.hexLayerVisible);
  const h3Resolution = useAccessibilityStore((s) => s.h3Resolution);
  const setH3Resolution = useAccessibilityStore((s) => s.setH3Resolution);
  const boundaryMode = useAccessibilityStore((s) => s.boundaryMode);
  const setBoundaryMode = useAccessibilityStore((s) => s.setBoundaryMode);
  const [collapsed, setCollapsed] = useState(false);

  if (!hexLayerVisible) return null;

  const descKey = boundaryMode === "hex" ? `hex-${h3Resolution}` : boundaryMode;

  return (
    <div className="absolute bottom-6 left-4 z-10">
      <div className="glass rounded-xl shadow-lg overflow-hidden">
        {/* Header toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:bg-white/30 transition-colors"
        >
          <span>Legend</span>
          <svg
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
              collapsed ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Legend items */}
        {!collapsed && (
          <div className="px-3 pb-3 space-y-1.5">
            {QUADRANT_ORDER.map((q) => {
              const [r, g, b] = QUADRANT_COLORS[q];
              return (
                <div key={q} className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: `rgb(${r},${g},${b})` }}
                  />
                  <span className="text-xs text-slate-700">
                    {QUADRANT_LABELS[q]}{" "}
                    <span className="text-slate-400">
                      ({QUADRANT_SHORT[q]})
                    </span>
                  </span>
                </div>
              );
            })}

            {/* Transit lines legend */}
            <div className="pt-2 mt-2 border-t border-slate-200/50">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">
                Transit Lines
              </div>
              <div className="space-y-1">
                {([
                  { label: "MRT", color: [16, 185, 129] },
                  { label: "LRT", color: [168, 85, 247] },
                  { label: "KRL", color: [59, 130, 246] },
                  { label: "TransJakarta", color: [249, 115, 22] },
                ] as const).map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span
                      className="w-4 h-[3px] rounded-full shrink-0"
                      style={{ backgroundColor: `rgb(${color[0]},${color[1]},${color[2]})` }}
                    />
                    <span className="text-[11px] text-slate-600">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Boundary mode toggle — 4 modes */}
            <div className="pt-2 mt-2 border-t border-slate-200/50">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">
                Score Level
              </div>
              {/* Administrative row */}
              <div className="flex gap-1 mb-1">
                <button
                  onClick={() => setBoundaryMode("kelurahan")}
                  className={`flex-1 px-1.5 py-1.5 text-[10px] rounded font-medium transition-colors ${
                    boundaryMode === "kelurahan"
                      ? "bg-blue-500 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  Kelurahan
                </button>
                <button
                  onClick={() => setBoundaryMode("kecamatan")}
                  className={`flex-1 px-1.5 py-1.5 text-[10px] rounded font-medium transition-colors ${
                    boundaryMode === "kecamatan"
                      ? "bg-blue-500 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  Kecamatan
                </button>
              </div>
              {/* Hex row */}
              <div className="flex gap-1">
                <button
                  onClick={() => { setBoundaryMode("hex"); setH3Resolution(8); }}
                  className={`flex-1 px-1.5 py-1.5 text-[10px] rounded font-medium transition-colors ${
                    boundaryMode === "hex" && h3Resolution === 8
                      ? "bg-blue-500 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  Hex (S)
                </button>
                <button
                  onClick={() => { setBoundaryMode("hex"); setH3Resolution(7); }}
                  className={`flex-1 px-1.5 py-1.5 text-[10px] rounded font-medium transition-colors ${
                    boundaryMode === "hex" && h3Resolution === 7
                      ? "bg-blue-500 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  Hex (L)
                </button>
              </div>
              <div className="text-[9px] text-slate-400 mt-1 leading-tight">
                {MODE_DESCRIPTIONS[descKey] || ""}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
