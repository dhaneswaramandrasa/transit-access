"use client";

import { useEffect, useState, useCallback } from "react";
import DeckGL from "@deck.gl/react";
import { GeoJsonLayer, ScatterplotLayer, PathLayer } from "@deck.gl/layers";
import MapGL from "react-map-gl/maplibre";
import { latLngToCell } from "h3-js";
import {
  useAccessibilityStore,
  POI_COLORS,
  type HexProperties,
  type MapStats,
  type POIFeature,
  type ReachablePOI,
  type POICategory,
} from "@/lib/store";
import { scoreToColor } from "@/lib/colorScale";
import { useReachablePOIs } from "@/hooks/useReachablePOIs";
import { useTransitStops } from "@/hooks/useTransitStops";
import { useDemographics } from "@/hooks/useDemographics";
import "maplibre-gl/dist/maplibre-gl.css";

const INITIAL_VIEW = {
  longitude: 106.8456,
  latitude: -6.2088,
  zoom: 11,
  pitch: 0,
  bearing: 0,
};

// Light basemap
const BASEMAP =
  "https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json";

// Must match Python config analysis.h3_resolution
const H3_RESOLUTION = 8;

// Transit stop colors
const TRANSIT_STOP_COLORS: Record<string, [number, number, number]> = {
  transjakarta: [249, 115, 22], // orange-500
  krl: [59, 130, 246], // blue-500
  mrt: [16, 185, 129], // emerald-500
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
): globalThis.Map<string, HexProperties> {
  const map = new globalThis.Map<string, HexProperties>();
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
    nearbyTransitStops,
    appPhase,
    setAppPhase,
    setLoadingStage,
    setLocationName,
  } = useAccessibilityStore();

  const [data, setData] = useState<GeoJSONData | null>(null);
  const [hexLookup, setHexLookup] = useState<globalThis.Map<string, HexProperties>>(
    new globalThis.Map()
  );
  const [loading, setLoading] = useState(true);

  // Activate hooks
  useReachablePOIs();
  useTransitStops();
  useDemographics();

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

  // Click handler: place pin + resolve H3 hex + trigger analysis flow
  const handleMapClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (info: any) => {
      // Clicked on a POI marker — ignore (handled by POI layer)
      if (info.layer?.id === "poi-markers") return;
      if (info.layer?.id === "transit-stops") return;

      if (info.coordinate) {
        const [lng, lat] = info.coordinate;
        setClickedCoordinate([lng, lat]);

        // Resolve H3 hex
        const h3Index = latLngToCell(lat, lng, H3_RESOLUTION);
        const hex = hexLookup.get(h3Index);
        setSelectedHex(hex || null);

        // Set location name from coordinates
        setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);

        // Trigger loading flow
        if (appPhase === "landing" || appPhase === "results") {
          setAppPhase("loading");
          setLoadingStage("resolving");

          // Simulate loading stages
          setTimeout(() => setLoadingStage("fetching-pois"), 300);
          setTimeout(() => setLoadingStage("fetching-transit"), 800);
          setTimeout(() => setLoadingStage("analyzing"), 1300);
          setTimeout(() => {
            setLoadingStage("done");
            setAppPhase("results");
          }, 1800);
        }
      }
    },
    [
      hexLookup,
      setSelectedHex,
      setClickedCoordinate,
      appPhase,
      setAppPhase,
      setLoadingStage,
      setLocationName,
    ]
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layers: any[] = [];

  // 1. H3 hex overlay (toggleable opacity)
  if (data) {
    layers.push(
      new GeoJsonLayer({
        id: "h3-accessibility",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: data as any,
        opacity: hexLayerVisible ? 0.75 : 0,
        pickable: hexLayerVisible,
        stroked: hexLayerVisible,
        filled: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getFillColor: getColor as any,
        getLineColor: [0, 0, 0, 30],
        getLineWidth: 1,
        lineWidthMinPixels: 0.5,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // 2. Transit stop markers
  if (nearbyTransitStops.length > 0 && appPhase === "results") {
    layers.push(
      new ScatterplotLayer({
        id: "transit-stops",
        data: nearbyTransitStops,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getPosition: (d: any) => d.coordinates,
        getRadius: 8,
        radiusMinPixels: 5,
        radiusMaxPixels: 12,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getFillColor: (d: any) => [
          ...(TRANSIT_STOP_COLORS[d.type] || [150, 150, 150]),
          200,
        ],
        getLineColor: [255, 255, 255, 200],
        getLineWidth: 2,
        lineWidthMinPixels: 1.5,
        stroked: true,
        filled: true,
        pickable: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    );
  }

  // 3. POI markers (when hex is selected and POIs are computed)
  if (reachablePOIs.length > 0) {
    layers.push(
      new ScatterplotLayer({
        id: "poi-markers",
        data: reachablePOIs,
        getPosition: (d: ReachablePOI) => d.coordinates,
        getRadius: 6,
        radiusMinPixels: 4,
        radiusMaxPixels: 10,
        getFillColor: (d: ReachablePOI) =>
          [
            ...(POI_COLORS[d.category as POICategory] || [200, 200, 200]),
            selectedPOI?.id === d.id ? 255 : 180,
          ] as [number, number, number, number],
        getLineColor: [255, 255, 255, 120],
        getLineWidth: 1,
        lineWidthMinPixels: 1,
        stroked: true,
        filled: true,
        pickable: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onClick: ({ object }: any) => {
          if (object) setSelectedPOI(object as ReachablePOI);
        },
        updateTriggers: {
          getFillColor: [selectedPOI?.id],
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    );
  }

  // 4. Walking route line (when a POI is clicked and route fetched)
  if (activeRoute) {
    layers.push(
      new PathLayer({
        id: "walking-route",
        data: [{ path: activeRoute.geometry }],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getPath: (d: any) => d.path,
        getColor: [59, 130, 246, 200],
        getWidth: 3,
        widthMinPixels: 2,
        widthMaxPixels: 6,
        capRounded: true,
        jointRounded: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    );
  }

  // 5. Click pin marker (always visible when coordinate is set)
  if (clickedCoordinate) {
    layers.push(
      new ScatterplotLayer({
        id: "click-marker",
        data: [{ position: clickedCoordinate }],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getPosition: (d: any) => d.position,
        getRadius: 8,
        radiusMinPixels: 6,
        radiusMaxPixels: 12,
        getFillColor: [59, 130, 246, 220],
        getLineColor: [255, 255, 255, 255],
        getLineWidth: 3,
        lineWidthMinPixels: 2,
        stroked: true,
        filled: true,
        pickable: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    );
  }

  return (
    <div className="w-full h-full relative">
      <DeckGL
        initialViewState={INITIAL_VIEW}
        controller
        layers={layers}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onClick={handleMapClick as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getCursor={({ isHovering }: any) =>
          isHovering ? "pointer" : "crosshair"
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getTooltip={({ object }: any) => {
          // Hex tooltip
          if (object?.properties?.h3_index) {
            return {
              html: `
                <div style="background:rgba(255,255,255,0.95);backdrop-filter:blur(8px);padding:8px 12px;border-radius:8px;font-size:12px;color:#1e293b;border:1px solid rgba(0,0,0,0.08);box-shadow:0 4px 12px rgba(0,0,0,0.1)">
                  <div style="color:#94a3b8;font-size:10px;margin-bottom:3px">H3 · res ${H3_RESOLUTION}</div>
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
          // Transit stop tooltip
          if (object?.type && object?.line && object?.name) {
            const color = TRANSIT_STOP_COLORS[object.type] || [150, 150, 150];
            return {
              html: `
                <div style="background:rgba(255,255,255,0.95);backdrop-filter:blur(8px);padding:8px 12px;border-radius:8px;font-size:12px;color:#1e293b;border:1px solid rgba(0,0,0,0.08);box-shadow:0 4px 12px rgba(0,0,0,0.1)">
                  <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:rgb(${color.join(",")})"></span>
                    <span style="font-weight:600">${object.name}</span>
                  </div>
                  <div style="color:#94a3b8;font-size:10px">${object.line}${object.distance_km != null ? ` · ${object.distance_km} km` : ""}</div>
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
            const color = POI_COLORS[object.category as POICategory] || [200, 200, 200];
            return {
              html: `
                <div style="background:rgba(255,255,255,0.95);backdrop-filter:blur(8px);padding:8px 12px;border-radius:8px;font-size:12px;color:#1e293b;border:1px solid rgba(0,0,0,0.08);box-shadow:0 4px 12px rgba(0,0,0,0.1)">
                  <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:rgb(${color.join(",")})"></span>
                    <span style="font-weight:600">${object.name}</span>
                  </div>
                  <div style="color:#94a3b8;font-size:10px">${object.category} · ${object.distance_km} km · ~${object.walking_minutes} min walk</div>
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

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-10">
          <div className="text-slate-400 text-sm animate-pulse">
            Loading Jakarta H3 grid...
          </div>
        </div>
      )}

      {!loading && !data && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/60">
          <div className="glass-strong rounded-xl p-6 max-w-sm text-center">
            <p className="text-slate-700 font-medium mb-2">
              Data not yet available
            </p>
            <p className="text-slate-400 text-xs leading-relaxed">
              Run the Python pipeline, then{" "}
              <code className="bg-slate-100 px-1 rounded text-slate-600">
                python scripts/export_to_web.py
              </code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
