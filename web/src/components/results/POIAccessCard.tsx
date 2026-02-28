"use client";

import { useState } from "react";
import { useAccessibilityStore, POI_COLORS, POI_LABELS, type POICategory } from "@/lib/store";
import { fetchWalkingRoute } from "@/lib/osrmRoute";
import GlassPanel from "@/components/ui/GlassPanel";

export default function POIAccessCard({ delay = 0 }: { delay?: number }) {
  const {
    reachablePOIs,
    clickedCoordinate,
    selectedPOI,
    setSelectedPOI,
    addRoute,
    setActiveRouteId,
    routes,
  } = useAccessibilityStore();

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [loadingRouteId, setLoadingRouteId] = useState<string | null>(null);

  if (!clickedCoordinate) return null;

  // Group POIs by category
  const grouped: Record<string, typeof reachablePOIs> = {};
  for (const poi of reachablePOIs) {
    if (!grouped[poi.category]) grouped[poi.category] = [];
    grouped[poi.category].push(poi);
  }

  const handlePOIClick = async (poi: typeof reachablePOIs[0]) => {
    setSelectedPOI(poi);

    // Check route cache
    if (routes.has(poi.id)) {
      setActiveRouteId(poi.id);
      return;
    }

    if (!clickedCoordinate) return;
    setLoadingRouteId(poi.id);

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
    setLoadingRouteId(null);
  };

  return (
    <GlassPanel delay={delay} className="max-h-[400px] flex flex-col">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        What Can You Reach?
      </h3>

      {/* Category pills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {Object.entries(grouped).map(([cat, pois]) => {
          const color = POI_COLORS[cat as POICategory] || [100, 100, 100];
          return (
            <button
              key={cat}
              onClick={() =>
                setExpandedCategory(expandedCategory === cat ? null : cat)
              }
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                expandedCategory === cat
                  ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: `rgb(${color[0]},${color[1]},${color[2]})`,
                }}
              />
              {pois.length} {POI_LABELS[cat as POICategory] || cat}
            </button>
          );
        })}
      </div>

      {reachablePOIs.length === 0 && (
        <div className="py-4 text-center">
          <p className="text-sm text-slate-400">
            Searching for nearby places...
          </p>
          <div className="mt-2 flex justify-center">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      )}

      {/* Expandable POI list */}
      <div className="overflow-y-auto flex-1 -mx-2 px-2 space-y-1">
        {(expandedCategory
          ? (grouped[expandedCategory] || [])
          : reachablePOIs
        ).map((poi) => {
          const color = POI_COLORS[poi.category as POICategory] || [100, 100, 100];
          const isActive = selectedPOI?.id === poi.id;
          const isLoading = loadingRouteId === poi.id;

          return (
            <button
              key={poi.id}
              onClick={() => handlePOIClick(poi)}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                isActive
                  ? "bg-blue-50 ring-1 ring-blue-200"
                  : "hover:bg-slate-50"
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{
                  backgroundColor: `rgb(${color[0]},${color[1]},${color[2]})`,
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-700 truncate font-medium">
                  {poi.name}
                </div>
                <div className="text-xs text-slate-400">
                  {poi.distance_km} km &middot; {poi.walking_minutes} min walk
                </div>
              </div>
              {isLoading && (
                <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
              )}
              {!isLoading && isActive && (
                <svg
                  className="w-4 h-4 text-blue-500 shrink-0"
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
            </button>
          );
        })}
      </div>

      {/* Total count */}
      {reachablePOIs.length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-400 text-center">
          {reachablePOIs.length} places within walking distance
        </div>
      )}
    </GlassPanel>
  );
}
