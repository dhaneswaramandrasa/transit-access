"use client";

import { useAccessibilityStore } from "@/lib/store";
import { useAISummary } from "@/hooks/useAISummary";

export default function AISummaryPanel() {
  useAISummary();

  const { selectedHex, aiSummary, aiLoading, aiError } =
    useAccessibilityStore();

  return (
    <div className="w-96 bg-surface-raised border-l border-white/10 p-5 flex flex-col overflow-y-auto">
      <div className="flex items-center gap-2 mb-4">
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            aiLoading ? "bg-amber-400 animate-pulse" : "bg-emerald-400/50"
          }`}
        />
        <h2 className="text-white/70 text-sm font-medium">AI Analysis</h2>
      </div>

      {!selectedHex && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white/30 text-xs text-center leading-relaxed">
            Select a hex on the map
            <br />
            to generate an AI analysis
          </p>
        </div>
      )}

      {selectedHex && !aiSummary && !aiLoading && !aiError && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-white/30 text-xs animate-pulse">
            Preparing analysis...
          </div>
        </div>
      )}

      {aiLoading && !aiSummary && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-white/40 text-xs animate-pulse">
            Analysing hex {selectedHex?.h3_index?.slice(0, 10)}...
          </div>
        </div>
      )}

      {aiError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-3">
          <p className="text-red-400 text-xs">{aiError}</p>
        </div>
      )}

      {aiSummary && (
        <div className="flex-1">
          <div className="text-white/70 text-xs leading-relaxed whitespace-pre-wrap">
            {aiSummary}
          </div>
          {aiLoading && (
            <span className="inline-block w-1.5 h-3 bg-white/40 animate-pulse ml-0.5 align-text-bottom" />
          )}
        </div>
      )}

      <div className="mt-auto pt-3 border-t border-white/5">
        <p className="text-white/20 text-[10px] leading-relaxed">
          AI analysis is generative and should be treated as insight, not
          authoritative data. Powered by Claude.
        </p>
      </div>
    </div>
  );
}
