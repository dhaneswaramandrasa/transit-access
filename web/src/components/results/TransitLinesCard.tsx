"use client";

import { useState } from "react";
import { useAccessibilityStore, type TransitStop } from "@/lib/store";
import { fetchWalkingRoute } from "@/lib/osrmRoute";
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
  transjakarta: "\u{1F68C}",
  krl: "\u{1F686}",
  mrt: "\u{1F687}",
  lrt: "\u{1F688}",
};

export default function TransitLinesCard({ delay = 0 }: { delay?: number }) {
  const {
    nearbyTransitStops,
    clickedCoordinate,
    selectedTransitStop,
    setSelectedTransitStop,
    setTransitRoute,
    setSelectedPOI,
    setActiveRouteId,
  } = useAccessibilityStore();

  const [loadingStopId, setLoadingStopId] = useState<string | null>(null);

  // Group by type
  const grouped: Record<string, TransitStop[]> = {};
  for (const stop of nearbyTransitStops) {
    if (!grouped[stop.type]) grouped[stop.type] = [];
    grouped[stop.type].push(stop);
  }

  const handleStopClick = async (stop: TransitStop) => {
    // Clear POI selection when selecting a transit stop
    setSelectedPOI(null);
    setActiveRouteId(null);
    setSelectedTransitStop(stop);

    if (!clickedCoordinate) return;
    setLoadingStopId(stop.id);

    const route = await fetchWalkingRoute(
      clickedCoordinate[0],
      clickedCoordinate[1],
      stop.coordinates[0],
      stop.coordinates[1]
    );

    if (route) {
      setTransitRoute({
        poiId: stop.id,
        geometry: route.coordinates,
        distance_km: route.distance_km,
        duration_minutes: route.duration_minutes,
      });
    }
    setLoadingStopId(null);
  };

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
                  <span>{TRANSIT_ICONS[type] || "\u{1F689}"}</span>
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
                  {stops.slice(0, 5).map((stop) => {
                    const isSelected = selectedTransitStop?.id === stop.id;
                    const isLoading = loadingStopId === stop.id;

                    return (
                      <button
                        key={stop.id}
                        onClick={() => handleStopClick(stop)}
                        className={`w-full text-left flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors ${
                          isSelected
                            ? "bg-emerald-50 ring-1 ring-emerald-200"
                            : "hover:bg-slate-50"
                        }`}
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
                        {isLoading && (
                          <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin shrink-0" />
                        )}
                        {!isLoading && isSelected && (
                          <svg
                            className="w-4 h-4 text-emerald-500 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                            />
                          </svg>
                        )}
                        {!isLoading && !isSelected && stop.distance_km != null && (
                          <span className="text-xs text-slate-400 shrink-0">
                            {stop.distance_km} km
                          </span>
                        )}
                      </button>
                    );
                  })}
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
