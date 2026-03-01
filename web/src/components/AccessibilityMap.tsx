"use client";

import { useEffect, useState, useCallback } from "react";
import DeckGL from "@deck.gl/react";
import { GeoJsonLayer, ScatterplotLayer, PathLayer } from "@deck.gl/layers";
import MapGL from "react-map-gl/maplibre";
import { latLngToCell } from "h3-js";
import {
  useAccessibilityStore,
  POI_COLORS,
  QUADRANT_LABELS,
  type HexProperties,
  type MapStats,
  type POIFeature,
  type ReachablePOI,
  type POICategory,
  type EquityQuadrant,
} from "@/lib/store";
import { quadrantToColor } from "@/lib/colorScale";
import { useReachablePOIs } from "@/hooks/useReachablePOIs";
import { useTransitStops } from "@/hooks/useTransitStops";
import { useDemographics } from "@/hooks/useDemographics";
import MapLegend from "@/components/MapLegend";
import "maplibre-gl/dist/maplibre-gl.css";

// Jabodetabek center
const INITIAL_VIEW = {
  longitude: 106.84,
  latitude: -6.30,
  zoom: 10,
  pitch: 0,
  bearing: 0,
};

// Basemap with labels (street names, POI names like Google Maps)
const BASEMAP =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const H3_RESOLUTION = 8;

// Transit stop colors (including LRT)
const TRANSIT_STOP_COLORS: Record<string, [number, number, number]> = {
  transjakarta: [249, 115, 22], // orange-500
  krl: [59, 130, 246], // blue-500
  mrt: [16, 185, 129], // emerald-500
  lrt: [168, 85, 247], // purple-500
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

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] || 0;
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
    selectedTransitStop,
    transitRoute,
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
  const [transitRoutes, setTransitRoutes] = useState<GeoJSONData | null>(null);

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

        const needScores = geojson.features
          .map((f) => f.properties.transit_need_score as number)
          .filter((s) => s != null && !isNaN(s));

        const accessScores = geojson.features
          .map((f) => f.properties.transit_accessibility_score as number)
          .filter((s) => s != null && !isNaN(s));

        const equityGaps = geojson.features
          .map((f) => f.properties.equity_gap as number)
          .filter((s) => s != null && !isNaN(s));

        // Count quadrants
        const quadrantCounts: Record<EquityQuadrant, number> = {
          "transit-desert": 0,
          "transit-ideal": 0,
          "over-served": 0,
          "car-suburb": 0,
        };
        for (const f of geojson.features) {
          const q = f.properties.quadrant as EquityQuadrant;
          if (q && quadrantCounts[q] !== undefined) {
            quadrantCounts[q]++;
          }
        }

        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

        const stats: MapStats = {
          avg_score: Math.round(avg * 10) / 10,
          median_score: Math.round(median(scores) * 10) / 10,
          total_hexes: scores.length,
          h3_resolution: H3_RESOLUTION,
          median_need: Math.round(median(needScores) * 10) / 10,
          median_accessibility: Math.round(median(accessScores) * 10) / 10,
          avg_equity_gap: Math.round((equityGaps.reduce((a, b) => a + b, 0) / equityGaps.length) * 10) / 10,
          quadrant_counts: quadrantCounts,
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

  // Load transit route lines
  useEffect(() => {
    fetch("/data/jakarta_transit_routes.geojson")
      .then((r) => r.json())
      .then((geojson: GeoJSONData) => setTransitRoutes(geojson))
      .catch(console.error);
  }, []);

  // Click handler
  const handleMapClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (info: any) => {
      if (info.layer?.id === "poi-markers") return;
      if (info.layer?.id === "transit-stops") return;

      if (info.coordinate) {
        const [lng, lat] = info.coordinate;
        setClickedCoordinate([lng, lat]);

        const h3Index = latLngToCell(lat, lng, H3_RESOLUTION);
        const hex = hexLookup.get(h3Index);
        setSelectedHex(hex || null);

        setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);

        if (appPhase === "landing" || appPhase === "results") {
          setAppPhase("loading");
          setLoadingStage("resolving");

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

  // Hex fill color — quadrant-based
  const getColor = useCallback(
    (feature: { properties: Record<string, unknown> }) => {
      const quadrant = feature.properties.quadrant as EquityQuadrant | undefined;
      const isSelected =
        selectedHex?.h3_index === feature.properties.h3_index;

      if (quadrant) {
        return quadrantToColor(quadrant, isSelected ? 255 : 170);
      }
      // Fallback for data without quadrant
      return [128, 128, 128, isSelected ? 255 : 100] as [number, number, number, number];
    },
    [selectedHex?.h3_index]
  );

  const activeRoute = activeRouteId ? routes.get(activeRouteId) : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layers: any[] = [];

  // 0. Transit corridor lines (visible on landing, faded in results)
  if (transitRoutes) {
    const ROUTE_COLORS: Record<string, [number, number, number]> = {
      transjakarta: [249, 115, 22],
      krl: [59, 130, 246],
      mrt: [16, 185, 129],
      lrt: [168, 85, 247],
    };

    layers.push(
      new PathLayer({
        id: "transit-corridors",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: transitRoutes.features as any[],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getPath: (d: any) => d.geometry.coordinates,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getColor: (d: any) => [
          ...(ROUTE_COLORS[d.properties.type] || [150, 150, 150]),
          appPhase === "landing" ? 180 : 60,
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getWidth: (d: any) =>
          d.properties.type === "mrt" || d.properties.type === "lrt" ? 4 : 2,
        widthMinPixels: 1,
        widthMaxPixels: 6,
        capRounded: true,
        jointRounded: true,
        pickable: false,
        updateTriggers: {
          getColor: [appPhase],
        },
        transitions: {
          getColor: 500,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    );
  }

  // 1. H3 hex overlay
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
          getFillColor: [selectedHex?.h3_index],
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
          selectedTransitStop?.id === d.id ? 255 : 200,
        ],
        getLineColor: [255, 255, 255, 200],
        getLineWidth: 2,
        lineWidthMinPixels: 1.5,
        stroked: true,
        filled: true,
        pickable: true,
        updateTriggers: {
          getFillColor: [selectedTransitStop?.id],
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    );
  }

  // 3. POI markers
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

  // 4. Walking route to POI
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

  // 4b. Walking route to transit stop
  if (transitRoute) {
    layers.push(
      new PathLayer({
        id: "transit-walking-route",
        data: [{ path: transitRoute.geometry }],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getPath: (d: any) => d.path,
        getColor: [16, 185, 129, 200],
        getWidth: 3,
        widthMinPixels: 2,
        widthMaxPixels: 6,
        capRounded: true,
        jointRounded: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    );
  }

  // 5. Click pin marker
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
          // Hex tooltip — show quadrant + scores
          if (object?.properties?.h3_index) {
            const q = object.properties.quadrant as string;
            const qLabel = q ? (QUADRANT_LABELS[q as EquityQuadrant] || q) : "Unknown";
            const needScore = object.properties.transit_need_score ?? "N/A";
            const accessScore = object.properties.transit_accessibility_score ?? "N/A";
            const gap = object.properties.equity_gap;
            const gapStr = gap != null ? gap.toFixed(1) : "N/A";
            return {
              html: `
                <div style="background:rgba(255,255,255,0.95);backdrop-filter:blur(8px);padding:8px 12px;border-radius:8px;font-size:12px;color:#1e293b;border:1px solid rgba(0,0,0,0.08);box-shadow:0 4px 12px rgba(0,0,0,0.1)">
                  <div style="color:#94a3b8;font-size:10px;margin-bottom:3px">H3 res ${H3_RESOLUTION} · ${qLabel}</div>
                  <div style="font-weight:600;font-family:monospace;font-size:10px;margin-bottom:4px">${object.properties.h3_index}</div>
                  <div>Need: <strong>${needScore}</strong> | Access: <strong>${accessScore}</strong></div>
                  <div>Equity Gap: <strong>${gapStr}</strong></div>
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

      <MapLegend />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-10">
          <div className="text-slate-400 text-sm animate-pulse">
            Loading Jabodetabek H3 grid...
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
              Run{" "}
              <code className="bg-slate-100 px-1 rounded text-slate-600">
                npm run generate-all
              </code>{" "}
              to create sample data
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
