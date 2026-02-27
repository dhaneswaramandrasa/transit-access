"use client";

import { useCallback } from "react";
import { useAccessibilityStore } from "@/lib/store";
import { fetchWalkingRoute } from "@/lib/osrmRoute";
import type { ReachablePOI } from "@/lib/store";

const CATEGORY_CONFIG: Record<
  string,
  { label: string; dotColor: string }
> = {
  hospital: { label: "Hospital", dotColor: "bg-red-500" },
  clinic: { label: "Clinic", dotColor: "bg-orange-500" },
  market: { label: "Market", dotColor: "bg-yellow-500" },
  supermarket: { label: "Supermarket", dotColor: "bg-green-500" },
  school: { label: "School", dotColor: "bg-blue-500" },
  park: { label: "Park", dotColor: "bg-emerald-500" },
};

function ScoreBar({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-white/50">{label}</span>
        <span className="text-white/80 font-medium">{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #ef4444, #eab308, #22c55e)",
            backgroundSize: "200% 100%",
            backgroundPosition: `${100 - pct}% 0`,
          }}
        />
      </div>
    </div>
  );
}

function POIRow({
  poi,
  isActive,
  isLoading,
  onSelect,
}: {
  poi: ReachablePOI;
  isActive: boolean;
  isLoading: boolean;
  onSelect: () => void;
}) {
  const config = CATEGORY_CONFIG[poi.category] || {
    label: poi.category,
    dotColor: "bg-gray-400",
  };
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
        isActive
          ? "bg-blue-500/15 border border-blue-500/30"
          : "hover:bg-white/5 border border-transparent"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-white/80 text-xs font-medium truncate flex-1">
          {poi.name}
        </span>
        <span className="text-white/40 text-[10px] ml-2 shrink-0">
          {poi.distance_km} km
        </span>
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
        <span className="text-white/40 text-[10px]">{config.label}</span>
        <span className="text-white/30 text-[10px]">
          ~{poi.walking_minutes} min walk
        </span>
        {isLoading && (
          <span className="text-blue-400/60 text-[10px] animate-pulse ml-auto">
            loading route...
          </span>
        )}
      </div>
    </button>
  );
}

export default function InfoPanel() {
  const {
    selectedHex,
    threshold,
    mapStats,
    clickedCoordinate,
    reachablePOIs,
    selectedPOI,
    setSelectedPOI,
    routes,
    activeRouteId,
    setActiveRouteId,
    addRoute,
  } = useAccessibilityStore();

  const handlePOIClick = useCallback(
    async (poi: ReachablePOI) => {
      setSelectedPOI(poi);

      // Check cache first
      if (routes.has(poi.id)) {
        setActiveRouteId(poi.id);
        return;
      }

      if (!clickedCoordinate) return;

      // Set active (triggers loading indicator in POIRow)
      setActiveRouteId(poi.id);

      const route = await fetchWalkingRoute(
        clickedCoordinate[0],
        clickedCoordinate[1],
        poi.coordinates[0],
        poi.coordinates[1]
      );

      if (route) {
        addRoute(poi.id, {
          poiId: poi.id,
          geometry: route.coordinates,
          distance_km: route.distance_km,
          duration_minutes: route.duration_minutes,
        });
        setActiveRouteId(poi.id);
      }
    },
    [clickedCoordinate, routes, setSelectedPOI, setActiveRouteId, addRoute]
  );

  // Group reachable POIs by category for summary
  const categoryGroups = reachablePOIs.reduce(
    (acc, poi) => {
      acc[poi.category] = (acc[poi.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Get active route data from cache
  const activeRouteData = activeRouteId ? routes.get(activeRouteId) : null;

  // --- Empty state ---
  if (!selectedHex) {
    return (
      <div className="w-80 bg-surface-raised border-l border-white/10 p-5 flex flex-col">
        <h2 className="text-white/70 text-sm font-medium mb-4">
          Location Details
        </h2>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white/30 text-xs text-center leading-relaxed">
            Click any location on the map
            <br />
            to view accessibility details
          </p>
        </div>

        {/* Legend */}
        <div className="mt-auto pt-4 border-t border-white/5">
          <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">
            Score Legend
          </p>
          <div className="flex items-center gap-1.5">
            <div
              className="h-2 flex-1 rounded-sm"
              style={{
                background:
                  "linear-gradient(90deg, #d73027, #fc8d59, #fee08b, #d9ef8b, #91cf60, #1a9850)",
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-white/30 mt-1">
            <span>0 — Low</span>
            <span>100 — High</span>
          </div>
        </div>
      </div>
    );
  }

  // --- Selected hex state ---
  const scoreKey = `score_${threshold}min` as keyof typeof selectedHex;
  const score = (selectedHex[scoreKey] as number) ?? 0;

  return (
    <div className="w-80 bg-surface-raised border-l border-white/10 p-5 flex flex-col overflow-y-auto">
      {/* H3 index */}
      <div className="mb-3">
        <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">
          H3 Index
        </p>
        <p className="text-white/80 text-xs font-mono">
          {selectedHex.h3_index}
        </p>
      </div>

      {/* Clicked coordinate */}
      {clickedCoordinate && (
        <div className="mb-3">
          <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">
            Location
          </p>
          <p className="text-white/60 text-xs font-mono">
            {clickedCoordinate[1].toFixed(5)}, {clickedCoordinate[0].toFixed(5)}
          </p>
        </div>
      )}

      {/* Scores */}
      <div className="space-y-3 mb-4">
        <ScoreBar value={score} label={`${threshold}-min score`} />
        <ScoreBar
          value={selectedHex.composite_score}
          label="Composite score"
        />
      </div>

      {/* Percentile */}
      <div className="bg-surface/50 rounded-lg p-3 mb-4">
        <div className="flex justify-between items-baseline">
          <span className="text-white/50 text-xs">Percentile rank</span>
          <span className="text-white font-semibold text-lg">
            {selectedHex.percentile_rank.toFixed(0)}
            <span className="text-white/40 text-xs ml-0.5">th</span>
          </span>
        </div>
        {mapStats && (
          <div className="mt-2 flex gap-3 text-[10px] text-white/30">
            <span>Avg: {mapStats.avg_score}</span>
            <span>Median: {mapStats.median_score}</span>
          </div>
        )}
      </div>

      {/* Category summary pills */}
      {Object.keys(categoryGroups).length > 0 && (
        <div className="mb-3">
          <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">
            Reachable POIs ({threshold} min)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(categoryGroups).map(([cat, count]) => {
              const config = CATEGORY_CONFIG[cat];
              return (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-[10px]"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${config?.dotColor || "bg-gray-400"}`}
                  />
                  <span className="text-white/50">
                    {count} {config?.label || cat}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Active route info card */}
      {selectedPOI && activeRouteData && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-3">
          <p className="text-blue-300 text-xs font-medium mb-1">
            Walking route to {selectedPOI.name}
          </p>
          <div className="flex gap-3 text-[10px] text-blue-300/70">
            <span>{activeRouteData.distance_km} km</span>
            <span>~{activeRouteData.duration_minutes} min walk</span>
          </div>
        </div>
      )}

      {/* Individual POI list */}
      {reachablePOIs.length > 0 ? (
        <div className="flex-1 min-h-0">
          <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">
            Nearby Places ({reachablePOIs.length})
          </p>
          <div className="space-y-1 overflow-y-auto max-h-[40vh] pr-1">
            {reachablePOIs.map((poi) => (
              <POIRow
                key={poi.id}
                poi={poi}
                isActive={selectedPOI?.id === poi.id}
                isLoading={activeRouteId === poi.id && !routes.has(poi.id)}
                onSelect={() => handlePOIClick(poi)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-white/30 text-xs text-center py-4">
          No POIs found within {threshold} min walking distance
        </div>
      )}

      {/* Legend */}
      <div className="mt-auto pt-4 border-t border-white/5">
        <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">
          Score Legend
        </p>
        <div className="flex items-center gap-1.5">
          <div
            className="h-2 flex-1 rounded-sm"
            style={{
              background:
                "linear-gradient(90deg, #d73027, #fc8d59, #fee08b, #d9ef8b, #91cf60, #1a9850)",
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-white/30 mt-1">
          <span>0 — Low</span>
          <span>100 — High</span>
        </div>
      </div>
    </div>
  );
}
