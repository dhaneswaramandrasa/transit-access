"use client";

import {
  useAccessibilityStore,
  QUADRANT_LABELS,
  QUADRANT_ACTION,
} from "@/lib/store";
import GlassPanel from "@/components/ui/GlassPanel";
import ScoreCircle from "./ScoreCircle";

export default function TransitScoreCard({ delay = 0 }: { delay?: number }) {
  const { selectedHex, threshold, setThreshold, mapStats } =
    useAccessibilityStore();

  if (!selectedHex || !mapStats) return null;

  const score =
    threshold === 30 ? selectedHex.score_30min : selectedHex.score_60min;
  const quadrant = selectedHex.quadrant;
  const quadrantLabel = QUADRANT_LABELS[quadrant] || quadrant;
  const quadrantAction = QUADRANT_ACTION[quadrant] || "";

  const needScore = selectedHex.transit_need_score ?? 0;
  const accessScore = selectedHex.transit_accessibility_score ?? 0;
  const gap = selectedHex.equity_gap ?? 0;

  return (
    <GlassPanel delay={delay} className="p-6">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
        Accessibility Score
      </h3>

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
      <div className="space-y-2 mb-4">
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

      {/* Action recommendation */}
      <div className="text-xs text-slate-400 italic mb-4 leading-relaxed">
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
    </GlassPanel>
  );
}
