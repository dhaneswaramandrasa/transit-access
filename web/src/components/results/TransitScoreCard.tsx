"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useAccessibilityStore,
  QUADRANT_LABELS,
  QUADRANT_ACTION,
} from "@/lib/store";
import GlassPanel from "@/components/ui/GlassPanel";
import ScoreCircle from "./ScoreCircle";

function BreakdownRow({
  label,
  value,
  unit,
  weight,
  color,
}: {
  label: string;
  value: string | number;
  unit?: string;
  weight: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color}`} />
        <span className="text-xs text-slate-600 truncate">{label}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-semibold text-slate-800">
          {value}{unit ? ` ${unit}` : ""}
        </span>
        <span className="text-[10px] text-slate-400 w-8 text-right">{weight}</span>
      </div>
    </div>
  );
}

export default function TransitScoreCard({ delay = 0 }: { delay?: number }) {
  const { selectedHex, threshold, setThreshold, mapStats, boundaryMode } =
    useAccessibilityStore();
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (!selectedHex || !mapStats) return null;

  const isAdmin = boundaryMode === "kelurahan" || boundaryMode === "kecamatan";
  const levelLabel = boundaryMode === "kelurahan" ? "Kelurahan" : boundaryMode === "kecamatan" ? "Kecamatan" : "Hex";
  // Main score = transit accessibility score (consistent with Need/Access framework)
  const score = Math.round(selectedHex.transit_accessibility_score ?? 0);
  const quadrant = selectedHex.quadrant;
  const quadrantLabel = QUADRANT_LABELS[quadrant] || quadrant;
  const quadrantAction = QUADRANT_ACTION[quadrant] || "";

  const needScore = selectedHex.transit_need_score ?? 0;
  const accessScore = selectedHex.transit_accessibility_score ?? 0;
  const gap = selectedHex.equity_gap ?? 0;

  return (
    <GlassPanel delay={delay} className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Accessibility Score
        </h3>
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
          isAdmin ? "bg-blue-50 text-blue-500" : "bg-slate-50 text-slate-400"
        }`}>
          {levelLabel} Level
        </span>
      </div>

      {/* Score circle centered */}
      <div className="flex justify-center mb-4">
        <ScoreCircle score={score} size={120} strokeWidth={8} />
      </div>

      {/* Quadrant badge */}
      <div className="text-center mb-3">
        <span
          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
            quadrant === "transit-desert"
              ? "bg-red-100 text-red-700"
              : quadrant === "transit-ideal"
              ? "bg-green-100 text-green-700"
              : quadrant === "over-served"
              ? "bg-blue-100 text-blue-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {quadrantLabel}
        </span>
      </div>

      {/* Equity gap */}
      <div className="text-center mb-4 text-xs text-slate-500">
        Equity Gap: <span className={`font-bold ${gap > 0 ? "text-red-600" : "text-green-600"}`}>{gap > 0 ? "+" : ""}{gap.toFixed(1)}</span>
      </div>

      {/* Need vs Access bars */}
      <div className="space-y-2 mb-3">
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Transit Need</span>
            <span>{needScore.toFixed(0)}/100</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-400 rounded-full"
              style={{ width: `${needScore}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Transit Access</span>
            <span>{accessScore.toFixed(0)}/100</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full"
              style={{ width: `${accessScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Show breakdown toggle */}
      <button
        onClick={() => setShowBreakdown(!showBreakdown)}
        className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-blue-500 hover:text-blue-700 transition-colors"
      >
        <span>{showBreakdown ? "Hide" : "View"} Score Details</span>
        <svg
          className={`w-3 h-3 transition-transform ${showBreakdown ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Detailed score breakdown */}
      {showBreakdown && (
        <div className="mt-2 space-y-3 animate-in slide-in-from-top-2">
          {/* Transit Need breakdown */}
          <div className="bg-orange-50/50 rounded-lg px-3 py-2">
            <div className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Need Score Components</span>
              <span className="text-[9px] text-orange-400 normal-case">weight</span>
            </div>
            <div className="divide-y divide-orange-100/60">
              <BreakdownRow
                label="Population"
                value={(selectedHex.pop_total ?? 0).toLocaleString()}
                weight="25%"
                color="bg-orange-400"
              />
              <BreakdownRow
                label="Dependent Pop"
                value={`${(selectedHex.pct_dependent ?? 0).toFixed(1)}%`}
                weight="25%"
                color="bg-orange-400"
              />
              <BreakdownRow
                label="No Vehicle"
                value={`${(selectedHex.pct_zero_vehicle ?? 0).toFixed(1)}%`}
                weight="25%"
                color="bg-orange-400"
              />
              <BreakdownRow
                label="Land Value (NJOP)"
                value={selectedHex.avg_njop > 0
                  ? `Rp ${(selectedHex.avg_njop / 1e6).toFixed(1)}M`
                  : "N/A"}
                unit="/m²"
                weight="25%"
                color="bg-orange-400"
              />
            </div>
          </div>

          {/* Transit Accessibility breakdown */}
          <div className="bg-emerald-50/50 rounded-lg px-3 py-2">
            <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Access Score Components</span>
              <span className="text-[9px] text-emerald-400 normal-case">weight</span>
            </div>
            <div className="divide-y divide-emerald-100/60">
              <BreakdownRow
                label="Distance to Transit"
                value={`${(selectedHex.dist_to_transit ?? 0).toFixed(2)}`}
                unit="km"
                weight="25%"
                color="bg-emerald-400"
              />
              <BreakdownRow
                label="Walkable (<1km)"
                value={selectedHex.is_walkable_transit ? "Yes" : "No"}
                weight="15%"
                color="bg-emerald-400"
              />
              <BreakdownRow
                label="Transit Capacity"
                value={(selectedHex.transit_capacity_weight ?? 0).toFixed(1)}
                weight="25%"
                color="bg-emerald-400"
              />
              <BreakdownRow
                label="Local POI Density"
                value={(selectedHex.local_poi_density ?? 0).toFixed(1)}
                weight="20%"
                color="bg-emerald-400"
              />
              <BreakdownRow
                label="Transit Shed POIs"
                value={Math.round(selectedHex.transit_shed_poi_count ?? 0)}
                weight="15%"
                color="bg-emerald-400"
              />
            </div>
          </div>

          {/* Percentile rank */}
          <div className="text-center text-xs text-slate-500 bg-slate-50 rounded-lg py-2">
            Ranks better than <span className="font-bold text-slate-700">{(selectedHex.percentile_rank ?? 0).toFixed(0)}%</span> of {isAdmin ? levelLabel.toLowerCase() : "hexes"} in Jabodetabek
          </div>
        </div>
      )}

      {/* Action recommendation */}
      <div className="text-xs text-slate-400 italic mt-3 mb-4 leading-relaxed">
        {quadrantAction}
      </div>

      {/* Threshold toggle */}
      <div className="flex justify-center gap-2">
        {([30, 60] as const).map((t) => (
          <button
            key={t}
            onClick={() => setThreshold(t)}
            className={`px-4 py-1.5 text-xs rounded-full font-medium transition-colors ${
              threshold === t
                ? "bg-blue-500 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {t} min
          </button>
        ))}
      </div>

      {/* Methodology link */}
      <div className="mt-4 text-center">
        <Link
          href="/methodology"
          className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
        >
          How does the scoring work?
        </Link>
      </div>
    </GlassPanel>
  );
}
