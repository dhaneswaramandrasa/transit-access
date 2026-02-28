"use client";

import { useAccessibilityStore, type TransitStop } from "@/lib/store";
import GlassPanel from "@/components/ui/GlassPanel";

const TRANSIT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  transjakarta: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    dot: "bg-orange-500",
  },
  krl: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  mrt: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  lrt: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    dot: "bg-purple-500",
  },
};

const TRANSIT_LABELS: Record<string, string> = {
  transjakarta: "TransJakarta",
  krl: "KRL Commuterline",
  mrt: "MRT Jakarta",
  lrt: "LRT Jabodebek",
};

const TRANSIT_ICONS: Record<string, string> = {
  transjakarta: "🚌",
  krl: "🚆",
  mrt: "🚇",
  lrt: "🚈",
};

export default function TransitLinesCard({ delay = 0 }: { delay?: number }) {
  const nearbyTransitStops = useAccessibilityStore((s) => s.nearbyTransitStops);

  // Group by type
  const grouped: Record<string, TransitStop[]> = {};
  for (const stop of nearbyTransitStops) {
    if (!grouped[stop.type]) grouped[stop.type] = [];
    grouped[stop.type].push(stop);
  }

  return (
    <GlassPanel delay={delay}>
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
        Transit Connections
      </h3>

      {nearbyTransitStops.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">
          No transit stops found nearby
        </p>
      ) : (
        <div className="space-y-4">
          {/* Summary badges */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(grouped).map(([type, stops]) => {
              const style = TRANSIT_COLORS[type] || TRANSIT_COLORS.krl;
              return (
                <div
                  key={type}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
                >
                  <span>{TRANSIT_ICONS[type] || "🚉"}</span>
                  {stops.length} {TRANSIT_LABELS[type] || type}
                </div>
              );
            })}
          </div>

          {/* Stop list by type */}
          {(["mrt", "lrt", "krl", "transjakarta"] as const).map((type) => {
            const stops = grouped[type];
            if (!stops || stops.length === 0) return null;
            const style = TRANSIT_COLORS[type];

            return (
              <div key={type}>
                <div className="text-xs font-medium text-slate-500 mb-2">
                  {TRANSIT_LABELS[type]}
                </div>
                <div className="space-y-1">
                  {stops.slice(0, 5).map((stop) => (
                    <div
                      key={stop.id}
                      className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${style.dot} shrink-0`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-700 truncate">
                          {stop.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {stop.line}
                        </div>
                      </div>
                      {stop.distance_km != null && (
                        <span className="text-xs text-slate-400 shrink-0">
                          {stop.distance_km} km
                        </span>
                      )}
                    </div>
                  ))}
                  {stops.length > 5 && (
                    <div className="text-xs text-slate-400 pl-6">
                      +{stops.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Total count */}
      <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-400 text-center">
        {nearbyTransitStops.length} stops within walking distance
      </div>
    </GlassPanel>
  );
}
