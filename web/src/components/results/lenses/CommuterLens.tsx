"use client";

import { useAccessibilityStore } from "@/lib/store";

export default function CommuterLens() {
  const selectedHex = useAccessibilityStore((s) => s.selectedHex);
  const clickedCoordinate = useAccessibilityStore((s) => s.clickedCoordinate);

  const taiPct = selectedHex ? Math.round(selectedHex.tai_score * 100) : 0;
  const tniPct = selectedHex ? Math.round(selectedHex.tni_score * 100) : 0;
  const gcTransit = selectedHex?.gc_transit_idr ?? null;
  const gcMoto = selectedHex?.gc_motorcycle_idr ?? null;
  const savingsPct =
    gcTransit && gcMoto && gcMoto > gcTransit
      ? Math.round(((gcMoto - gcTransit) / gcMoto) * 100)
      : null;

  const coordText = clickedCoordinate
    ? `${clickedCoordinate[1].toFixed(6)}, ${clickedCoordinate[0].toFixed(6)}`
    : "—";

  // SVG gauge arc
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (taiPct / 100) * circumference;

  return (
    <>
      {/* LEFT panel */}
      <div className="absolute left-6 top-6 w-80 pointer-events-auto flex flex-col gap-3">
        {/* Route Intelligence card */}
        <div className="glass-panel rounded-xl p-5">
          <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-4">
            Route Intelligence
          </p>
          <div className="space-y-3">
            <div className="bg-surface-container-high rounded px-3 py-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-on-surface/40 text-base">
                trip_origin
              </span>
              <input
                readOnly
                value={coordText}
                className="bg-transparent flex-1 text-xs font-mono text-on-surface outline-none truncate"
                placeholder="Origin..."
              />
            </div>
            <div className="bg-surface-container-high rounded px-3 py-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">
                place
              </span>
              <input
                readOnly
                value="Sudirman CBD"
                className="bg-transparent flex-1 text-xs font-mono text-on-surface outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            {["Transit", "Walk", "Mixed"].map((m) => (
              <span
                key={m}
                className="px-2 py-1 bg-surface-container text-on-surface-variant text-[10px] font-label rounded border border-outline-variant/20 cursor-pointer hover:border-primary hover:text-primary transition-colors"
              >
                {m}
              </span>
            ))}
          </div>
          <button className="mt-4 w-full bg-primary text-on-primary py-2.5 rounded-sm font-label text-xs font-bold tracking-widest uppercase hover:brightness-110 transition-all">
            Calculate
          </button>
        </div>

        {/* Live Coordinates card */}
        <div className="glass-panel rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
              Live Coordinates
            </p>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 rounded-full">
              <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
              <span className="text-[9px] font-label text-primary">LIVE</span>
            </span>
          </div>
          <p className="font-mono text-xs text-on-surface">{coordText}</p>
          {selectedHex && (
            <div className="mt-3">
              <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-700"
                  style={{ width: `${tniPct}%` }}
                />
              </div>
              <p className="text-[9px] font-label text-on-surface/40 mt-1 uppercase tracking-wide">
                Need index: {tniPct}%
              </p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT panel */}
      <div className="absolute right-6 top-6 w-80 pointer-events-auto flex flex-col gap-3">
        {/* Transit Friendliness card */}
        <div className="glass-panel rounded-xl overflow-hidden">
          <div className="bg-surface-bright px-5 py-3 flex items-center justify-between">
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
              Transit Friendliness
            </p>
            <span className="font-mono text-xs text-primary font-bold">
              TAI
            </span>
          </div>
          <div className="p-5 flex items-center gap-5">
            {/* Circular gauge */}
            <div className="relative shrink-0">
              <svg width="88" height="88" viewBox="0 0 88 88">
                <circle
                  cx="44"
                  cy="44"
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="8"
                />
                <circle
                  cx="44"
                  cy="44"
                  r={radius}
                  fill="none"
                  stroke="#6fd8c8"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  transform="rotate(-90 44 44)"
                  style={{ transition: "stroke-dashoffset 0.7s ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-xl font-bold text-on-surface">
                  {taiPct}
                </span>
                <span className="font-label text-[8px] text-on-surface/40 uppercase">
                  /100
                </span>
              </div>
            </div>
            <div className="flex-1 space-y-1.5">
              {(["L1", "L2", "L3", "L4", "L5"] as const).map((l) => {
                const key = `tai_${l.toLowerCase()}_${
                  l === "L1" ? "first_mile" : l === "L2" ? "service_quality" : l === "L3" ? "cbd_journey" : l === "L4" ? "last_mile" : "cost_competitiveness"
                }` as keyof typeof selectedHex;
                const val = selectedHex
                  ? ((selectedHex[key] as number | null) ?? 0) * 100
                  : 0;
                return (
                  <div key={l} className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-on-surface/50 w-4">
                      {l}
                    </span>
                    <div className="flex-1 h-1 bg-surface-container-high rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/70 rounded-full"
                        style={{ width: `${val}%` }}
                      />
                    </div>
                    <span className="font-mono text-[9px] text-on-surface/60 w-6 text-right">
                      {Math.round(val)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Price Diagnostic card */}
        <div className="glass-panel rounded-xl p-5">
          <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-4">
            Price Diagnostic
          </p>
          {gcTransit || gcMoto ? (
            <div className="space-y-3">
              {gcTransit && (
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-label text-on-surface-variant">
                      Transit GC
                    </span>
                    <span className="font-mono text-xs text-on-surface">
                      Rp {gcTransit.toLocaleString("id")}
                    </span>
                  </div>
                  <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: "60%" }} />
                  </div>
                </div>
              )}
              {gcMoto && (
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-label text-on-surface-variant">
                      Motorcycle GC
                    </span>
                    <span className="font-mono text-xs text-on-surface">
                      Rp {gcMoto.toLocaleString("id")}
                    </span>
                  </div>
                  <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                    <div className="h-full bg-tertiary/70 rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>
              )}
              {savingsPct !== null && (
                <div className="mt-3 p-2.5 bg-primary/10 rounded border border-primary/20">
                  <p className="text-[10px] font-label text-primary font-bold uppercase tracking-wide">
                    Transit Saves {savingsPct}% vs Motorcycle
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-on-surface/40 font-label">
              No cost data for this zone.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
