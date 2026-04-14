"use client";

import { useAccessibilityStore } from "@/lib/store";

const LISA_KEYS = [
  { label: "HH — High-High Cluster", color: "#E63946" },
  { label: "LL — Low-Low Cluster", color: "#2A9D8F" },
  { label: "HL — High-Low Outlier", color: "#F4A261" },
  { label: "LH — Low-High Outlier", color: "#457B9D" },
] as const;

export default function ResearcherLens() {
  const selectedHex = useAccessibilityStore((s) => s.selectedHex);
  const mapStats = useAccessibilityStore((s) => s.mapStats);

  const totalZones = mapStats?.total_zones ?? 0;
  const q4Count = mapStats?.quadrant_counts?.Q4 ?? 0;
  const giniProxy = totalZones > 0 ? (q4Count / totalZones) : 0;

  const taiL1 = selectedHex?.tai_l1_first_mile ?? 0;
  const taiL2 = selectedHex?.tai_l2_service_quality ?? 0;
  const taiL3 = selectedHex?.tai_l3_cbd_journey ?? 0;
  const taiL4 = selectedHex?.tai_l4_last_mile ?? 0;
  const taiL5 = selectedHex?.tai_l5_cost_competitiveness ?? 0;

  return (
    <>
      {/* LEFT — fixed sidebar after icon sidebar, w-80 */}
      <div className="absolute left-0 top-0 bottom-0 w-80 pointer-events-auto bg-surface-container-low border-r border-outline-variant/10 flex flex-col overflow-y-auto">
        <div className="px-5 py-4 border-b border-outline-variant/10">
          <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
            Spatial Statistics
          </p>
          <h2 className="font-headline font-bold text-on-surface text-sm mt-0.5">
            Equity Distribution
          </h2>
        </div>

        {/* Equity Coefficient card */}
        <div className="p-4 border-b border-outline-variant/10">
          <p className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant mb-2">
            Equity Coefficient (Q4 Share)
          </p>
          <div className="flex items-end gap-2 mb-2">
            <span className="font-mono text-2xl font-bold text-on-surface">
              {(giniProxy * 100).toFixed(1)}%
            </span>
            <span className="text-xs font-label text-on-surface-variant mb-1">
              transit deserts
            </span>
          </div>
          <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-full bg-error rounded-full transition-all duration-700"
              style={{ width: `${giniProxy * 100}%` }}
            />
          </div>
          {mapStats && (
            <div className="grid grid-cols-2 gap-2 mt-3 text-[10px] font-mono">
              {(["Q1", "Q2", "Q3", "Q4"] as const).map((q) => (
                <div key={q} className="flex justify-between">
                  <span className="text-on-surface-variant">{q}</span>
                  <span className="text-on-surface font-bold">
                    {mapStats.quadrant_counts[q]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Spatial Autocorrelation card */}
        <div className="p-4 border-b border-outline-variant/10">
          <p className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant mb-2">
            Spatial Autocorrelation
          </p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-bold text-secondary">
              Moran&apos;s I
            </span>
            <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
              <div className="h-full bg-secondary rounded-full" style={{ width: "72%" }} />
            </div>
            <span className="font-mono text-xs text-on-surface">0.72</span>
          </div>
          <p className="text-[10px] font-label text-on-surface-variant mt-2">
            Strong positive spatial clustering detected
          </p>
        </div>

        {/* LISA Cluster Legend */}
        <div className="p-4">
          <p className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant mb-3">
            LISA Cluster Map
          </p>
          <div className="space-y-2">
            {LISA_KEYS.map((item) => (
              <div key={item.label} className="flex items-center gap-2.5">
                <span
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[10px] font-label text-on-surface-variant">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT — fixed sidebar, w-96 */}
      <div className="absolute right-0 top-0 bottom-0 w-96 pointer-events-auto bg-surface-container-low border-l border-outline-variant/10 flex flex-col overflow-y-auto">
        <div className="px-5 py-4 border-b border-outline-variant/10">
          <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
            Equity Deep-Dive
          </p>
          <h2 className="font-headline font-bold text-on-surface text-sm mt-0.5">
            {selectedHex
              ? selectedHex.kelurahan_name ?? selectedHex.h3_index
              : "Select a zone on the map"}
          </h2>
        </div>

        {selectedHex ? (
          <>
            {/* 2-col metrics grid */}
            <div className="grid grid-cols-2 gap-3 p-4 border-b border-outline-variant/10">
              <div className="bg-surface-container rounded p-3">
                <p className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant mb-1">
                  Access Score
                </p>
                <span className="font-mono text-xl font-bold text-primary">
                  {Math.round(selectedHex.tai_score * 100)}
                </span>
              </div>
              <div className="bg-surface-container rounded p-3">
                <p className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant mb-1">
                  Pop Density
                </p>
                <span className="font-mono text-xl font-bold text-on-surface">
                  {selectedHex.pop_density != null
                    ? selectedHex.pop_density.toFixed(0)
                    : "—"}
                </span>
              </div>
            </div>

            {/* Cross-Modal Efficiency */}
            <div className="p-4 border-b border-outline-variant/10">
              <p className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant mb-3">
                Cross-Modal Efficiency (TAI Layers)
              </p>
              {[
                { key: "L1 First Mile", val: taiL1 },
                { key: "L2 Service Quality", val: taiL2 },
                { key: "L3 CBD Journey", val: taiL3 },
                { key: "L4 Last Mile", val: taiL4 },
                { key: "L5 Cost", val: taiL5 },
              ].map((item) => (
                <div key={item.key} className="flex items-center gap-3 mb-2">
                  <span className="font-label text-[10px] text-on-surface-variant w-28 shrink-0">
                    {item.key}
                  </span>
                  <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/70 rounded-full"
                      style={{ width: `${item.val * 100}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-on-surface w-7 text-right">
                    {Math.round(item.val * 100)}
                  </span>
                </div>
              ))}
            </div>

            {/* Distance-Decay chart */}
            <div className="p-4 border-b border-outline-variant/10">
              <p className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant mb-3">
                Distance-Decay Profile
              </p>
              <div className="flex items-end gap-1 h-16">
                {[taiL1, taiL2, taiL3, taiL4, taiL5].map((v, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-primary/50 rounded-sm transition-all duration-500"
                    style={{ height: `${Math.max(v * 100, 4)}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-1">
                {["L1", "L2", "L3", "L4", "L5"].map((l) => (
                  <span key={l} className="font-mono text-[8px] text-on-surface/30">
                    {l}
                  </span>
                ))}
              </div>
            </div>

            {/* Download */}
            <div className="p-4">
              <button className="w-full border border-outline-variant/30 text-on-surface-variant hover:border-primary hover:text-primary transition-colors py-2.5 rounded-sm font-label text-xs font-bold tracking-widest uppercase">
                Download Research Data
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-on-surface/30 text-sm font-label text-center">
              Click any zone on the map to load equity metrics.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
