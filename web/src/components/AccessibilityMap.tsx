"use client";

import { useEffect, useState, useCallback } from "react";
import DeckGL from "@deck.gl/react";
import { GeoJsonLayer, ScatterplotLayer, PathLayer } from "@deck.gl/layers";
import MapGL from "react-map-gl/maplibre";
import { latLngToCell } from "h3-js";
import { useAccessibilityStore } from "@/lib/store";
import { scoreToColor } from "@/lib/colorScale";
import { useReachablePOIs } from "@/hooks/useReachablePOIs";
import type { HexProperties, MapStats, POIFeature, ReachablePOI } from "@/lib/store";
import "maplibre-gl/dist/maplibre-gl.css";

const INITIAL_VIEW = {
  longitude: 106.8456,
  latitude: -6.2088,
  zoom: 11,
  pitch: 0,
  bearing: 0,
};

const BASEMAP =
  "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json";

// Must match Python config analysis.h3_resolution
const H3_RESOLUTION = 8;

// POI category → color mapping
const POI_COLORS: Record<string, [number, number, number]> = {
  hospital: [239, 68, 68], // red
  clinic: [249, 115, 22], // orange
  market: [234, 179, 8], // yellow
  supermarket: [34, 197, 94], // green
  school: [59, 130, 246], // blue
  park: [16, 185, 129], // emerald
};

type GeoJSONFeature = {
  type: "Feature";
  geometry: Record<string, unknown>;
  properties: Record<string, unknown>;
};

type GeoJSONData = {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
};

// Build a lookup map from h3_index → hex properties for O(1) click resolution
function buildHexLookup(
  geojson: GeoJSONData
): Map<string, HexProperties> {
  const map = new Map<string, HexProperties>();
  for (const feature of geojson.features) {
    const p = feature.properties;
    if (p.h3_index) {
      map.set(p.h3_index as string, p as unknown as HexProperties);
    }
  }
  return map;
}

export default function AccessibilityMap() {
  const {
    threshold,
    setSelectedHex,
    selectedHex,
    setMapStats,
    hexLayerVisible,
    clickedCoordinate,
    setClickedCoordinate,
    setAllPOIs,
    reachablePOIs,
    selectedPOI,
    setSelectedPOI,
    routes,
    activeRouteId,
  } = useAccessibilityStore();

  const [data, setData] = useState<GeoJSONData | null>(null);
  const [hexLookup, setHexLookup] = useState<Map<string, HexProperties>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);

  // Activate the reachable POIs hook
  useReachablePOIs();

  // Load hex GeoJSON
  useEffect(() => {
    fetch("/data/jakarta_h3_scores.geojson")
      .then((r) => r.json())
      .then((geojson: GeoJSONData) => {
        setData(geojson);
        setHexLookup(buildHexLookup(geojson));

        const scores = geojson.features
          .map((f) => f.properties.composite_score as number)
          .filter((s) => s != null && !isNaN(s))
          .sort((a, b) => a - b);

        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const median = scores[Math.floor(scores.length / 2)];

        const stats: MapStats = {
          avg_score: Math.round(avg * 10) / 10,
          median_score: Math.round(median * 10) / 10,
          total_hexes: scores.length,
          h3_resolution: H3_RESOLUTION,
        };
        setMapStats(stats);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [setMapStats]);

  // Load POI GeoJSON
  useEffect(() => {
    fetch("/data/jakarta_pois.geojson")
      .then((r) => r.json())
      .then((geojson: { features: GeoJSONFeature[] }) => {
        const pois: POIFeature[] = geojson.features.map((f) => ({
          id: f.properties.id as string,
          name: f.properties.name as string,
          category: f.properties.category as string,
          coordinates: (f.geometry as { coordinates: [number, number] })
            .coordinates,
          h3_index: f.properties.h3_index as string,
        }));
        setAllPOIs(pois);
      })
      .catch(console.error);
  }, [setAllPOIs]);

  // Click handler: place pin + resolve H3 hex
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMapClick = useCallback(
    (info: any) => {
      // Clicked directly on a hex feature (only when hex layer is visible/pickable)
      if (info.object?.properties?.h3_index) {
        const coord = info.coordinate;
        if (coord) setClickedCoordinate([coord[0], coord[1]]);
        setSelectedHex(info.object.properties as unknown as HexProperties);
        return;
      }

      // Clicked on a POI marker — ignore (handled by POI layer)
      if (info.layer?.id === "poi-markers") return;

      // Clicked on empty map → resolve coordinate to H3
      if (info.coordinate) {
        const [lng, lat] = info.coordinate;
        setClickedCoordinate([lng, lat]);
        const h3Index = latLngToCell(lat, lng, H3_RESOLUTION);
        const hex = hexLookup.get(h3Index);
        if (hex) {
          setSelectedHex(hex);
        } else {
          setSelectedHex(null);
        }
      }
    },
    [hexLookup, setSelectedHex, setClickedCoordinate]
  );

  // Hex fill color
  const getColor = useCallback(
    (feature: { properties: Record<string, unknown> }) => {
      const score =
        (feature.properties[`score_${threshold}min`] as number) ?? 0;
      const isSelected =
        selectedHex?.h3_index === feature.properties.h3_index;
      return scoreToColor(score, isSelected ? 255 : 170);
    },
    [threshold, selectedHex?.h3_index]
  );

  // Get active route geometry for PathLayer
  const activeRoute = activeRouteId ? routes.get(activeRouteId) : null;

  // Build layers bottom-to-top
  const layers: any[] = [];

  // 1. H3 hex overlay (toggleable opacity)
  if (data) {
    layers.push(
      new GeoJsonLayer({
        id: "h3-accessibility",
        data: data as any,
        opacity: hexLayerVisible ? 0.85 : 0,
        pickable: hexLayerVisible,
        stroked: hexLayerVisible,
        filled: true,
        getFillColor: getColor as any,
        getLineColor: [255, 255, 255, 20],
        getLineWidth: 1,
        lineWidthMinPixels: 0.5,
        onClick: handleMapClick as any,
        updateTriggers: {
          getFillColor: [threshold, selectedHex?.h3_index],
        },
        transitions: {
          opacity: 500,
          getFillColor: 200,
        },
      })
    );
  }

  // 2. POI markers (when hex is selected and POIs are computed)
  if (reachablePOIs.length > 0) {
    layers.push(
      new ScatterplotLayer({
        id: "poi-markers",
        data: reachablePOIs,
        getPosition: (d: ReachablePOI) => d.coordinates,
        getRadius: 6,
        radiusMinPixels: 4,
        radiusMaxPixels: 10,
        getFillColor: (d: ReachablePOI) => [
          ...(POI_COLORS[d.category] || [200, 200, 200]),
          selectedPOI?.id === d.id ? 255 : 180,
        ] as [number, number, number, number],
        getLineColor: [255, 255, 255, 120],
        getLineWidth: 1,
        lineWidthMinPixels: 1,
        stroked: true,
        filled: true,
        pickable: true,
        onClick: ({ object }: any) => {
          if (object) setSelectedPOI(object as ReachablePOI);
        },
        updateTriggers: {
          getFillColor: [selectedPOI?.id],
        },
      } as any)
    );
  }

  // 3. Walking route line (when a POI is clicked and route fetched)
  if (activeRoute) {
    layers.push(
      new PathLayer({
        id: "walking-route",
        data: [{ path: activeRoute.geometry }],
        getPath: (d: any) => d.path,
        getColor: [59, 130, 246, 200],
        getWidth: 3,
        widthMinPixels: 2,
        widthMaxPixels: 6,
        capRounded: true,
        jointRounded: true,
      } as any)
    );
  }

  // 4. Click pin marker (always visible when coordinate is set)
  if (clickedCoordinate) {
    layers.push(
      new ScatterplotLayer({
        id: "click-marker",
        data: [{ position: clickedCoordinate }],
        getPosition: (d: any) => d.position,
        getRadius: 8,
        radiusMinPixels: 6,
        radiusMaxPixels: 12,
        getFillColor: [255, 255, 255, 220],
        getLineColor: [59, 130, 246, 255],
        getLineWidth: 3,
        lineWidthMinPixels: 2,
        stroked: true,
        filled: true,
        pickable: false,
      } as any)
    );
  }

  return (
    <div className="w-full h-full relative">
      <DeckGL
        initialViewState={INITIAL_VIEW}
        controller
        layers={layers}
        onClick={handleMapClick as any}
        getCursor={({ isHovering }: any) =>
          isHovering ? "pointer" : "crosshair"
        }
        getTooltip={({ object }: any) => {
          // Hex tooltip (only when hex layer is visible)
          if (object?.properties?.h3_index) {
            return {
              html: `
                <div style="background:#1a2035;padding:8px 12px;border-radius:8px;font-size:12px;color:#fff;border:1px solid rgba(255,255,255,0.1)">
                  <div style="color:rgba(255,255,255,0.4);font-size:10px;margin-bottom:3px">H3 · res ${H3_RESOLUTION}</div>
                  <div style="font-weight:600;font-family:monospace;font-size:11px;margin-bottom:4px">${object.properties.h3_index}</div>
                  <div>Score: <strong>${(object.properties as Record<string, unknown>)[`score_${threshold}min`] ?? "N/A"}</strong> / 100</div>
                </div>`,
              style: {
                background: "none",
                border: "none",
                boxShadow: "none",
              },
            };
          }
          // POI tooltip
          if (object?.name && object?.category) {
            const color = POI_COLORS[object.category] || [200, 200, 200];
            return {
              html: `
                <div style="background:#1a2035;padding:8px 12px;border-radius:8px;font-size:12px;color:#fff;border:1px solid rgba(255,255,255,0.1)">
                  <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:rgb(${color.join(",")})"></span>
                    <span style="font-weight:600">${object.name}</span>
                  </div>
                  <div style="color:rgba(255,255,255,0.5);font-size:10px">${object.category} · ${object.distance_km} km · ~${object.walking_minutes} min walk</div>
                </div>`,
              style: {
                background: "none",
                border: "none",
                boxShadow: "none",
              },
            };
          }
          return null;
        }}
      >
        <MapGL mapStyle={BASEMAP} />
      </DeckGL>

      {/* Click anywhere hint */}
      {!loading && data && !selectedHex && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white/60 text-xs px-4 py-2 rounded-full pointer-events-none">
          Click anywhere on the map to analyse that area
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0f1117]/80 z-10">
          <div className="text-white/50 text-sm animate-pulse">
            Loading Jakarta H3 grid…
          </div>
        </div>
      )}

      {!loading && !data && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#0f1117]/60">
          <div className="bg-[#161b27] border border-white/10 rounded-xl p-6 max-w-sm text-center">
            <p className="text-white/70 font-medium mb-2">
              Data not yet available
            </p>
            <p className="text-white/40 text-xs leading-relaxed">
              Run the Python pipeline, then{" "}
              <code className="bg-white/10 px-1 rounded">
                python scripts/export_to_web.py
              </code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
