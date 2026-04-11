"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useAccessibilityStore,
  QUADRANT_LABELS,
  QUADRANT_ACTION,
  QUADRANT_COLORS,
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

function pct(val: number | null | undefined): string {
  if (val == null) return "N/A";
  return `${Math.round(val * 100)}%`;
}

function fmt(val: number | null | undefined, decimals = 2): string {
  if (val == null) return "N/A";
  return val.toFixed(decimals);
}

export default function TransitScoreCard({ delay = 0 }: { delay?: number }) {
  const { selectedHex, mapStats, boundaryMode } = useAccessibilityStore();
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (!selectedHex || !mapStats) return null;

  const isAdmin = boundaryMode === "kelurahan" || boundaryMode === "kecamatan";
  const levelLabel = boundaryMode === "kelurahan" ? "Kelurahan" : boundaryMode === "kecamatan" ? "Kecamatan" : "Hex";

  const taiScore = selectedHex.tai_score ?? 0;
  const tniScore = selectedHex.tni_score ?? 0;
  const gap = selectedHex.equity_gap ?? 0;
  const quadrant = selectedHex.quadrant;
  const quadrantLabel = QUADRANT_LABELS[quadrant] || quadrant;
  const quadrantAction = QUADRANT_ACTION[quadrant] || "";

  // ScoreCircle expects 0–100
  const scoreDisplay = Math.round(taiScore * 100);

  // Quadrant badge color
  const [r, g, b] = QUADRANT_COLORS[quadrant] || [128, 128, 128];
  const badgeBg = `rgba(${r},${g},${b},0.12)`;
  const badgeText = `rgb(${r},${g},${b})`;

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

      {/* Score circle */}
      <div className="flex justify-center mb-4">
        <ScoreCircle score={scoreDisplay} size={120} strokeWidth={8} />
      </div>

      {/* Quadrant badge */}
      <div className="text-center mb-3">
        <span
          className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
          style={{ backgroundColor: badgeBg, color: badgeText }}
        >
          {quadrant} — {quadrantLabel}
        </span>
      </div>

      {/* Equity gap */}
      <div className="text-center mb-4 text-xs text-slate-500">
        Equity Gap:{" "}
        <span className={`font-bold ${gap > 0 ? "text-red-600" : "text-green-600"}`}>
          {gap > 0 ? "+" : ""}{gap.toFixed(3)}
        </span>
      </div>

      {/* TAI vs TNI bars */}
      <div className="space-y-2 mb-3">
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Transit Need (TNI)</span>
            <span>{pct(tniScore)}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-400 rounded-full"
              style={{ width: `${tniScore * 100}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Transit Access (TAI)</span>
            <span>{pct(taiScore)}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full"
              style={{ width: `${taiScore * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Show breakdown toggle */}
      <button
        onClick={() => setShowBreakdown(!showBreakdown)}
        className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-blue-500 hover:text-blue-700 transition-colors"
      >
        <span>{showBreakdown ? "Hide" : "View"} 5-Layer Breakdown</span>
        <svg
          className={`w-3 h-3 transition-transform ${showBreakdown ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 5-layer TAI breakdown */}
      {showBreakdown && (
        <div className="mt-2 animate-in slide-in-from-top-2">
          <div className="bg-emerald-50/50 rounded-lg px-3 py-2">
            <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>TAI Layer Scores</span>
              <span className="text-[9px] text-emerald-400 normal-case">weight</span>
            </div>
            <div className="divide-y divide-emerald-100/60">
              <BreakdownRow
                label="L1 First Mile"
                value={pct(selectedHex.tai_l1_first_mile)}
                weight="20%"
                color="bg-emerald-400"
              />
              <BreakdownRow
                label="L2 Service Quality"
                value={pct(selectedHex.tai_l2_service_quality)}
                weight="15%"
                color="bg-emerald-500"
              />
              <BreakdownRow
                label="L3 CBD Journey"
                value={selectedHex.poi_reach_cbd_min != null
                  ? `${fmt(selectedHex.poi_reach_cbd_min, 0)} min`
                  : pct(selectedHex.tai_l3_cbd_journey)}
                weight="35%"
                color="bg-blue-500"
              />
              <BreakdownRow
                label="L4 Last Mile"
                value={pct(selectedHex.tai_l4_last_mile)}
                weight="15%"
                color="bg-emerald-600"
              />
              <BreakdownRow
                label="L5 Cost Competitiveness"
                value={pct(selectedHex.tai_l5_cost_competitiveness)}
                weight="15%"
                color="bg-amber-500"
              />
            </div>
          </div>

          {/* Supply context */}
          <div className="bg-slate-50/70 rounded-lg px-3 py-2 mt-2">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Supply Indicators
            </div>
            <div className="divide-y divide-slate-100/60">
              <BreakdownRow
                label="Transit Stops"
                value={selectedHex.n_transit_stops ?? "N/A"}
                weight=""
                color="bg-slate-400"
              />
              <BreakdownRow
                label="Avg Headway"
                value={selectedHex.avg_headway_min != null ? fmt(selectedHex.avg_headway_min, 0) : "N/A"}
                unit={selectedHex.avg_headway_min != null ? "min" : undefined}
                weight=""
                color="bg-slate-400"
              />
              <BreakdownRow
                label="Nearest Stop"
                value={selectedHex.min_dist_to_transit_m != null
                  ? fmt(selectedHex.min_dist_to_transit_m / 1000, 2)
                  : "N/A"}
                unit={selectedHex.min_dist_to_transit_m != null ? "km" : undefined}
                weight=""
                color="bg-slate-400"
              />
              <BreakdownRow
                label="Mode Diversity"
                value={selectedHex.transit_mode_diversity ?? "N/A"}
                weight=""
                color="bg-slate-400"
              />
            </div>
          </div>
        </div>
      )}

      {/* Action recommendation */}
      <div className="text-xs text-slate-400 italic mt-3 mb-4 leading-relaxed">
        {quadrantAction}
      </div>

      {/* Methodology link */}
      <div className="mt-2 text-center">
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
