"use client";

import { useState } from "react";
import { useAccessibilityStore } from "@/lib/store";

export default function PlannerLens() {
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const selectedHex = useAccessibilityStore((s) => s.selectedHex);

  const equityGap = selectedHex?.equity_gap ?? null;
  const quadrant = selectedHex?.quadrant ?? null;

  return (
    <>
      {/* LEFT overlay panel — What-If Simulator + Scenario History */}
      <div className="absolute left-6 top-6 w-80 pointer-events-auto flex flex-col gap-3">
        {/* Simulator control card */}
        <div className="glass-panel rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
              What-If Simulator
            </p>
            <span className="text-[9px] font-label px-2 py-0.5 bg-surface-container rounded border border-outline-variant/20 text-on-surface-variant">
              Scenario Mode
            </span>
          </div>

          {/* Disclaimer banner */}
          <div className="bg-surface-container-high border border-outline-variant/20 rounded p-2.5 mb-4">
            <p className="text-[10px] font-label text-on-surface-variant leading-relaxed">
              Scenario simulation, not prediction. Results are indicative only.
            </p>
          </div>

          <button
            onClick={() => setWhatIfOpen(!whatIfOpen)}
            className={`w-full py-2.5 rounded-sm font-label text-xs font-bold tracking-widest uppercase transition-all ${
              whatIfOpen
                ? "bg-surface-container-high text-on-surface-variant border border-outline-variant/20"
                : "bg-primary text-on-primary hover:brightness-110"
            }`}
          >
            {whatIfOpen ? "Close Simulator" : "Open Simulator"}
          </button>
        </div>

        {/* Scenario History — placeholder until what-if store is wired */}
        {whatIfOpen && (
          <div className="glass-panel rounded-xl p-5">
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-3">
              Scenario History
            </p>
            <p className="text-xs text-on-surface/40 font-label">
              No scenarios saved yet. Run a simulation to begin.
            </p>
          </div>
        )}
      </div>

      {/* RIGHT overlay panel — Equity Gap + Ridership Forecast */}
      <div className="absolute right-6 top-6 w-80 pointer-events-auto flex flex-col gap-3">
        {/* Equity Gap Delta card */}
        <div className="glass-panel rounded-xl p-5">
          <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-3">
            Equity Gap
          </p>
          {equityGap !== null ? (
            <>
              <div className="flex items-end gap-2 mb-3">
                <span className="font-mono text-3xl font-bold text-on-surface">
                  {equityGap.toFixed(2)}
                </span>
                <span className="text-xs font-label text-on-surface-variant mb-1">
                  gap score
                </span>
              </div>
              {quadrant && (
                <span
                  className={`inline-block text-[10px] font-label font-bold px-2 py-0.5 rounded-sm uppercase tracking-wide ${
                    quadrant === "Q4"
                      ? "bg-error/15 text-error"
                      : quadrant === "Q1"
                      ? "bg-primary/15 text-primary"
                      : "bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  {quadrant}
                </span>
              )}
              <div className="mt-3 h-2 bg-surface-container-high rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    quadrant === "Q4" ? "bg-error" : "bg-primary"
                  }`}
                  style={{ width: `${Math.min(equityGap * 100, 100)}%` }}
                />
              </div>
            </>
          ) : (
            <p className="text-xs text-on-surface/40 font-label">
              Select a zone to view equity gap.
            </p>
          )}
        </div>

        {/* Ridership Forecast card */}
        <div className="glass-panel rounded-xl p-5">
          <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-3">
            Ridership Forecast
          </p>
          <p className="text-xs text-on-surface/40 font-label mb-4">
            Run a scenario to generate ridership projections.
          </p>
          <div className="space-y-2">
            {[
              { label: "Baseline", val: 0 },
              { label: "+1 Stop", val: 0 },
              { label: "+Route", val: 0 },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="font-label text-[10px] text-on-surface-variant w-20 shrink-0">
                  {item.label}
                </span>
                <div className="flex-1 h-1.5 bg-surface-container-high rounded-full" />
                <span className="font-mono text-[10px] text-on-surface/40 w-6 text-right">
                  —
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[9px] font-label text-on-surface/30 italic">
            Disclaimer: projections are for planning exploration only.
          </p>
        </div>
      </div>
    </>
  );
}
