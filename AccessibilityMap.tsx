"use client";

import { useEffect, useState, useCallback } from "react";
import DeckGL from "@deck.gl/react";
import { GeoJsonLayer } from "@deck.gl/layers";
import Map from "react-map-gl/maplibre";
import { latLngToCell, cellToLatLng } from "h3-js";
import { useAccessibilityStore } from "@/lib/store";
import { scoreToColor } from "@/lib/colorScale";
import type { HexProperties, MapStats } from "@/lib/store";
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

type GeoJSONData = {
  type: "FeatureCollection";
  features: Array<{ properties: Record<string, unknown> }>;
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
  const { threshold, setSelectedHex, selectedHex, setMapStats } =
    useAccessibilityStore();
  const [data, setData] = useState<GeoJSONData | null>(null);
  const [hexLookup, setHexLookup] = useState<Map<string, HexProperties>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/data/jakarta_h3_scores.geojson")
      .then((r) => r.json())
      .then((geojson: GeoJSONData) => {
        setData(geojson);
        setHexLookup(buildHexLookup(geojson));

        // Compute Jakarta-wide stats
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

  // User clicks ANY coordinate → resolve to H3 index → look up score
  const handleMapClick = useCallback(
    (info: {
      coordinate?: [number, number];
      object?: { properties: Record<string, unknown> };
    }) => {
      // Clicked directly on a rendered hex feature
      if (info.object?.properties?.h3_index) {
        setSelectedHex(info.object.properties as unknown as HexProperties);
        return;
      }

      // Clicked on an empty map area → resolve coordinate to H3
      if (info.coordinate) {
        const [lng, lat] = info.coordinate;
        const h3Index = latLngToCell(lat, lng, H3_RESOLUTION);
        const hex = hexLookup.get(h3Index);
        if (hex) {
          setSelectedHex(hex);
        } else {
          // Coordinate is outside Jakarta coverage (no data)
          setSelectedHex(null);
        }
      }
    },
    [hexLookup, setSelectedHex]
  );

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

  const layers = data
    ? [
        new GeoJsonLayer({
          id: "h3-accessibility",
          data,
          pickable: true,
          stroked: true,
          filled: true,
          getFillColor: getColor,
          getLineColor: [255, 255, 255, 20],
          getLineWidth: 1,
          lineWidthMinPixels: 0.5,
          onClick: handleMapClick,
          updateTriggers: {
            getFillColor: [threshold, selectedHex?.h3_index],
          },
          transitions: { getFillColor: 200 },
        }),
      ]
    : [];

  return (
    <div className="w-full h-full relative">
      <DeckGL
        initialViewState={INITIAL_VIEW}
        controller
        layers={layers}
        onClick={handleMapClick}
        getCursor={({ isHovering }) =>
          isHovering ? "pointer" : "crosshair"
        }
        getTooltip={({
          object,
        }: {
          object?: { properties: Record<string, unknown> };
        }) =>
          object?.properties?.h3_index
            ? {
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
              }
            : null
        }
      >
        <Map mapStyle={BASEMAP} />
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
