"use client";

import { useAccessibilityStore } from "@/lib/store";
import GlassPanel from "@/components/ui/GlassPanel";
import ScoreCircle from "./ScoreCircle";

export default function TransitScoreCard({ delay = 0 }: { delay?: number }) {
  const { selectedHex, threshold, setThreshold, mapStats } =
    useAccessibilityStore();

  if (!selectedHex || !mapStats) return null;

  const score =
    threshold === 30 ? selectedHex.score_30min : selectedHex.score_60min;
  const percentile = selectedHex.percentile_rank;

  return (
    <GlassPanel delay={delay} className="p-6">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
        Walkability Score
      </h3>

      {/* Score circle centered */}
      <div className="flex justify-center mb-4">
        <ScoreCircle score={score} size={120} strokeWidth={8} />
      </div>

      {/* Percentile */}
      <div className="text-center mb-4">
        <div className="text-sm font-medium text-slate-700">
          Better than{" "}
          <span className="text-blue-600 font-bold">{percentile}%</span> of
          Jakarta
        </div>
      </div>

      {/* Comparison bar */}
      <div className="space-y-1.5 mb-4">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Your Score</span>
          <span>City Avg: {mapStats.avg_score.toFixed(0)}</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full relative overflow-hidden">
          <div
            className="absolute h-full bg-slate-200 rounded-full"
            style={{ width: `${mapStats.avg_score}%` }}
          />
          <div
            className="absolute h-full bg-blue-500 rounded-full"
            style={{ width: `${score}%` }}
          />
        </div>
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
