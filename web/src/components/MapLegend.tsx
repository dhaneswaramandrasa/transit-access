"use client";

import { useState } from "react";
import {
  useAccessibilityStore,
  QUADRANT_COLORS,
  QUADRANT_LABELS,
  type EquityQuadrant,
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

export default function MapLegend() {
  const hexLayerVisible = useAccessibilityStore((s) => s.hexLayerVisible);
  const [collapsed, setCollapsed] = useState(false);

  if (!hexLayerVisible) return null;

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
          </div>
        )}
      </div>
    </div>
  );
}
