"use client";

import { useAccessibilityStore } from "@/lib/store";
import GlassPanel from "@/components/ui/GlassPanel";

export default function AIAnalysisCard({ delay = 0 }: { delay?: number }) {
  const { aiSummary, aiLoading, aiError } = useAccessibilityStore();

  return (
    <GlassPanel delay={delay}>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Equity Analysis
        </h3>
        {aiLoading && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-blue-500">Analyzing...</span>
          </div>
        )}
      </div>

      {aiError && (
        <div className="px-3 py-2 bg-red-50 rounded-lg text-sm text-red-600 mb-3">
          {aiError}
        </div>
      )}

      {!aiSummary && !aiLoading && !aiError && (
        <p className="text-sm text-slate-400 py-4 text-center">
          Equity assessment will appear here
        </p>
      )}

      {aiSummary && (
        <div className="prose prose-sm prose-slate max-w-none">
          <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
            {aiSummary}
            {aiLoading && (
              <span className="inline-block w-1.5 h-4 bg-blue-500 ml-0.5 animate-pulse rounded-sm" />
            )}
          </div>
        </div>
      )}

      {/* Model attribution */}
      {aiSummary && !aiLoading && (
        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-1.5">
          <svg
            className="w-3 h-3 text-slate-300"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <span className="text-[10px] text-slate-300 uppercase tracking-wider">
            Powered by AI
          </span>
        </div>
      )}
    </GlassPanel>
  );
}
