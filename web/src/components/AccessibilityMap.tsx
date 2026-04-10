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
  type BoundaryMode,
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
    h3Resolution,
    boundaryMode,
  } = useAccessibilityStore();

  const [data, setData] = useState<GeoJSONData | null>(null);
  const [hexLookup, setHexLookup] = useState<globalThis.Map<string, HexProperties>>(
    new globalThis.Map()
  );
  const [loading, setLoading] = useState(true);
  const [transitRoutes, setTransitRoutes] = useState<GeoJSONData | null>(null);
  const [kelurahanData, setKelurahanData] = useState<GeoJSONData | null>(null);
  const [kecamatanData, setKecamatanData] = useState<GeoJSONData | null>(null);
  const [selectedKelurahan, setSelectedKelurahan] = useState<string | null>(null);
  const [selectedKecamatan, setSelectedKecamatan] = useState<string | null>(null);

  useReachablePOIs();
  useTransitStops();
  useDemographics();

  // Load hex GeoJSON — reloads when h3Resolution changes
  useEffect(() => {
    setLoading(true);
    // res 7 not in new pipeline — fall back to res 8
    const dataFile = "/data/h3_scores.geojson";

    fetch(dataFile)
      .then((r) => r.json())
      .then((geojson: GeoJSONData) => {
        setData(geojson);
        setHexLookup(buildHexLookup(geojson));

        const scores = geojson.features
          .map((f) => f.properties.tai_score as number)
          .filter((s) => s != null && !isNaN(s))
          .sort((a, b) => a - b);

        const needScores = geojson.features
          .map((f) => f.properties.tni_score as number)
          .filter((s) => s != null && !isNaN(s));

        const accessScores = geojson.features
          .map((f) => f.properties.tai_score as number)
          .filter((s) => s != null && !isNaN(s));

        const equityGaps = geojson.features
          .map((f) => f.properties.equity_gap as number)
          .filter((s) => s != null && !isNaN(s));

        // Count quadrants
        const quadrantCounts: Record<EquityQuadrant, number> = {
          Q1: 0, Q2: 0, Q3: 0, Q4: 0,
        };
        for (const f of geojson.features) {
          const q = f.properties.quadrant as EquityQuadrant;
          if (q && quadrantCounts[q] !== undefined) {
            quadrantCounts[q]++;
          }
        }

        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

        const stats: MapStats = {
          avg_score: Math.round(avg * 1000) / 1000,
          median_score: Math.round(median(scores) * 1000) / 1000,
          total_zones: scores.length,
          h3_resolution: h3Resolution,
          median_need: Math.round(median(needScores) * 1000) / 1000,
          median_accessibility: Math.round(median(accessScores) * 1000) / 1000,
          avg_equity_gap: Math.round((equityGaps.reduce((a, b) => a + b, 0) / equityGaps.length) * 1000) / 1000,
          quadrant_counts: quadrantCounts,
        };
        setMapStats(stats);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [setMapStats, h3Resolution]);

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

  // Load kelurahan scores (boundaries + all score fields)
  useEffect(() => {
    fetch("/data/kelurahan_scores.geojson")
      .then((r) => r.json())
      .then((geojson: GeoJSONData) => setKelurahanData(geojson))
      .catch(console.error);
  }, []);

  // Load kecamatan boundaries
  useEffect(() => {
    fetch("/data/jakarta_kecamatan_boundaries.geojson")
      .then((r) => r.json())
      .then((geojson: GeoJSONData) => setKecamatanData(geojson))
      .catch(console.error);
  }, []);

  // Click handler
  const handleMapClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (info: any) => {
      if (info.layer?.id === "poi-markers") return;
      if (info.layer?.id === "transit-stops") return;

      // If clicking on a kecamatan feature directly
      if (info.layer?.id === "kecamatan-boundaries" && info.object) {
        const props = info.object.properties;
        if (!props.hex_count || props.hex_count === 0) return;

        const kecKey = `${props.kecamatan_name}__${props.kota_kab_name}`;
        setSelectedKecamatan(kecKey);
        setSelectedKelurahan(null);

        const kecHex: HexProperties = {
          h3_index: `kec_${kecKey}`,
          kecamatan_name: props.kecamatan_name as string ?? null,
          kota_kab_name: props.kota_kab_name as string ?? null,
          population: (props.population as number) ?? 0,
          tni_score: (props.tni_score as number) ?? 0,
          tai_score: (props.tai_score as number) ?? 0,
          equity_gap: (props.equity_gap as number) ?? 0,
          quadrant: (props.quadrant as EquityQuadrant) ?? "Q3",
          dependency_ratio: (props.dependency_ratio as number) ?? null,
          zero_vehicle_hh_pct: (props.zero_vehicle_hh_pct as number) ?? null,
          poverty_rate: (props.poverty_rate as number) ?? null,
          avg_household_expenditure: (props.avg_household_expenditure as number) ?? null,
          min_dist_to_transit_m: (props.min_dist_to_transit_m as number) ?? null,
          n_transit_stops: (props.n_transit_stops as number) ?? null,
          avg_headway_min: (props.avg_headway_min as number) ?? null,
          transit_mode_diversity: (props.transit_mode_diversity as number) ?? null,
          tai_l1_first_mile: (props.tai_l1_first_mile as number) ?? null,
          tai_l2_service_quality: (props.tai_l2_service_quality as number) ?? null,
          tai_l3_cbd_journey: (props.tai_l3_cbd_journey as number) ?? null,
          tai_l4_last_mile: (props.tai_l4_last_mile as number) ?? null,
          tai_l5_cost_competitiveness: (props.tai_l5_cost_competitiveness as number) ?? null,
        };

        if (info.coordinate) {
          const [lng, lat] = info.coordinate;
          setClickedCoordinate([lng, lat]);
          setLocationName(`Kec. ${props.kecamatan_name ?? ""}, ${props.kota_kab_name ?? ""}`);
        }

        setSelectedHex(kecHex);

        setAppPhase("loading");
        setLoadingStage("resolving");
        setTimeout(() => setLoadingStage("fetching-pois"), 300);
        setTimeout(() => setLoadingStage("fetching-transit"), 800);
        setTimeout(() => setLoadingStage("analyzing"), 1300);
        setTimeout(() => {
          setLoadingStage("done");
          setAppPhase("results");
        }, 1800);
        return;
      }

      // If clicking on a kelurahan feature directly
      if (info.layer?.id === "kelurahan-boundaries" && info.object) {
        const props = info.object.properties;

        // Skip kelurahan with no scoring data
        if (props.tai_score == null) return;

        const kelKey = `${props.kelurahan_name}__${props.kecamatan_name}__${props.kota_kab_name}`;
        setSelectedKelurahan(kelKey);
        setSelectedKecamatan(null);

        const kelHex: HexProperties = {
          h3_index: `kel_${kelKey}`,
          kelurahan_id: props.kelurahan_id as string ?? null,
          kelurahan_name: props.kelurahan_name as string ?? null,
          kecamatan_name: props.kecamatan_name as string ?? null,
          kota_kab_name: props.kota_kab_name as string ?? null,
          area_km2: props.area_km2 as number ?? null,
          population: (props.population as number) ?? 0,
          pop_density: props.pop_density as number ?? null,
          poverty_rate: props.poverty_rate as number ?? null,
          avg_household_expenditure: props.avg_household_expenditure as number ?? null,
          zero_vehicle_hh_pct: props.zero_vehicle_hh_pct as number ?? null,
          dependency_ratio: props.dependency_ratio as number ?? null,
          tni_score: (props.tni_score as number) ?? 0,
          road_length_km: props.road_length_km as number ?? null,
          road_density_km_per_km2: props.road_density_km_per_km2 as number ?? null,
          pct_footway_pedestrian: props.pct_footway_pedestrian as number ?? null,
          network_connectivity: props.network_connectivity as number ?? null,
          n_transit_stops: props.n_transit_stops as number ?? null,
          n_transit_routes: props.n_transit_routes as number ?? null,
          avg_headway_min: props.avg_headway_min as number ?? null,
          min_dist_to_transit_m: props.min_dist_to_transit_m as number ?? null,
          transit_mode_diversity: props.transit_mode_diversity as number ?? null,
          best_mode_fare_tier: props.best_mode_fare_tier as number ?? null,
          has_affordable_mode: props.has_affordable_mode as boolean ?? null,
          poi_reach_cbd_min: props.poi_reach_cbd_min as number ?? null,
          tai_l1_first_mile: props.tai_l1_first_mile as number ?? null,
          tai_l2_service_quality: props.tai_l2_service_quality as number ?? null,
          tai_l3_cbd_journey: props.tai_l3_cbd_journey as number ?? null,
          tai_l4_last_mile: props.tai_l4_last_mile as number ?? null,
          tai_l5_cost_competitiveness: props.tai_l5_cost_competitiveness as number ?? null,
          gc_transit_idr: props.gc_transit_idr as number ?? null,
          gc_car_idr: props.gc_car_idr as number ?? null,
          gc_motorcycle_idr: props.gc_motorcycle_idr as number ?? null,
          tcr_vs_car: props.tcr_vs_car as number ?? null,
          tcr_vs_motorcycle: props.tcr_vs_motorcycle as number ?? null,
          tcr_combined: props.tcr_combined as number ?? null,
          transit_competitive_zone: props.transit_competitive_zone as HexProperties["transit_competitive_zone"] ?? null,
          distance_to_sudirman_km: props.distance_to_sudirman_km as number ?? null,
          tai_score: (props.tai_score as number) ?? 0,
          equity_gap: (props.equity_gap as number) ?? 0,
          quadrant: (props.quadrant as EquityQuadrant) ?? "Q3",
        };

        if (info.coordinate) {
          const [lng, lat] = info.coordinate;
          setClickedCoordinate([lng, lat]);
          setLocationName(`Kel. ${props.kelurahan_name ?? ""}, Kec. ${props.kecamatan_name ?? ""}`);
        }

        setSelectedHex(kelHex);

        // Always transition to results — handle all phases
        setAppPhase("loading");
        setLoadingStage("resolving");
        setTimeout(() => setLoadingStage("fetching-pois"), 300);
        setTimeout(() => setLoadingStage("fetching-transit"), 800);
        setTimeout(() => setLoadingStage("analyzing"), 1300);
        setTimeout(() => {
          setLoadingStage("done");
          setAppPhase("results");
        }, 1800);
        return;
      }

      if (info.coordinate) {
        const [lng, lat] = info.coordinate;
        setClickedCoordinate([lng, lat]);

        const h3Index = latLngToCell(lat, lng, h3Resolution);
        const hex = hexLookup.get(h3Index);
        setSelectedHex(hex || null);
        setSelectedKelurahan(null);
        setSelectedKecamatan(null);

        setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);

        // Always transition to results
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
    },
    [
      hexLookup,
      setSelectedHex,
      setClickedCoordinate,
      appPhase,
      setAppPhase,
      setLoadingStage,
      setLocationName,
      h3Resolution,
      boundaryMode,
      kelurahanData,
      kecamatanData,
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

  // Kelurahan fill color — quadrant-based
  const getKelurahanColor = useCallback(
    (feature: { properties: Record<string, unknown> }) => {
      const quadrant = feature.properties.quadrant as EquityQuadrant | undefined;
      const kelKey = `${feature.properties.kelurahan_name}__${feature.properties.kecamatan_name}__${feature.properties.kota_kab_name}`;
      const isSelected = selectedKelurahan === kelKey;

      if (quadrant) {
        return quadrantToColor(quadrant, isSelected ? 255 : 160);
      }
      return [128, 128, 128, isSelected ? 255 : 100] as [number, number, number, number];
    },
    [selectedKelurahan]
  );

  // Kecamatan fill color — quadrant-based (only called for features with hex_count > 0)
  const getKecamatanColor = useCallback(
    (feature: { properties: Record<string, unknown> }) => {
      const quadrant = feature.properties.quadrant as EquityQuadrant | undefined;
      const kecKey = `${feature.properties.kecamatan}__${feature.properties.city_code}`;
      const isSelected = selectedKecamatan === kecKey;

      if (quadrant) {
        return quadrantToColor(quadrant, isSelected ? 255 : 160);
      }
      return [128, 128, 128, isSelected ? 255 : 100] as [number, number, number, number];
    },
    [selectedKecamatan]
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
          appPhase === "landing" ? 210 : 90,
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getWidth: (d: any) =>
          d.properties.type === "mrt" || d.properties.type === "lrt" ? 5 : 3,
        widthMinPixels: 2,
        widthMaxPixels: 8,
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

  // 1a. Kelurahan boundary overlay — only render features that have transit data
  const kelurahanWithData = kelurahanData
    ? { ...kelurahanData, features: kelurahanData.features.filter((f) => f.properties.tai_score != null) }
    : null;

  if (kelurahanWithData && boundaryMode === "kelurahan") {
    layers.push(
      new GeoJsonLayer({
        id: "kelurahan-boundaries",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: kelurahanWithData as any,
        opacity: hexLayerVisible ? 0.7 : 0,
        pickable: hexLayerVisible,
        stroked: hexLayerVisible,
        filled: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getFillColor: getKelurahanColor as any,
        getLineColor: [255, 255, 255, 100],
        getLineWidth: 1.5,
        lineWidthMinPixels: 1,
        // Click handled by DeckGL root onClick — no layer-level onClick to avoid double firing
        updateTriggers: {
          getFillColor: [selectedKelurahan],
        },
        transitions: {
          opacity: 500,
          getFillColor: 200,
        },
      })
    );
  }

  // 1a2. Kecamatan boundary overlay — only render features that have transit data
  const kecamatanWithData = kecamatanData
    ? { ...kecamatanData, features: kecamatanData.features.filter((f) => f.properties.tai_score != null) }
    : null;

  if (kecamatanWithData && boundaryMode === "kecamatan") {
    layers.push(
      new GeoJsonLayer({
        id: "kecamatan-boundaries",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: kecamatanWithData as any,
        opacity: hexLayerVisible ? 0.7 : 0,
        pickable: hexLayerVisible,
        stroked: hexLayerVisible,
        filled: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getFillColor: getKecamatanColor as any,
        getLineColor: [255, 255, 255, 120],
        getLineWidth: 2,
        lineWidthMinPixels: 1,
        updateTriggers: {
          getFillColor: [selectedKecamatan],
        },
        transitions: {
          opacity: 500,
          getFillColor: 200,
        },
      })
    );
  }

  // 1b. H3 hex overlay
  if (data && boundaryMode === "hex") {
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
        getTooltip={({ object, layer }: any) => {
          // Kecamatan tooltip
          if (layer?.id === "kecamatan-boundaries" && object?.properties?.kecamatan) {
            const p = object.properties;
            const qLabel = p.quadrant ? (QUADRANT_LABELS[p.quadrant as EquityQuadrant] || p.quadrant) : "Unknown";
            const needScore = p.transit_need_score ?? "N/A";
            const accessScore = p.transit_accessibility_score ?? "N/A";
            const gap = p.equity_gap;
            const gapStr = gap != null ? Number(gap).toFixed(1) : "N/A";
            return {
              html: `
                <div style="background:rgba(255,255,255,0.95);backdrop-filter:blur(8px);padding:8px 12px;border-radius:8px;font-size:12px;color:#1e293b;border:1px solid rgba(0,0,0,0.08);box-shadow:0 4px 12px rgba(0,0,0,0.1)">
                  <div style="font-weight:700;margin-bottom:2px">Kec. ${p.kecamatan}</div>
                  <div style="color:#94a3b8;font-size:10px;margin-bottom:4px">${p.kab_kota || ""} · ${qLabel} · ${p.hex_count} hexes</div>
                  <div>Need: <strong>${typeof needScore === 'number' ? needScore.toFixed(0) : needScore}</strong> | Access: <strong>${typeof accessScore === 'number' ? accessScore.toFixed(0) : accessScore}</strong></div>
                  <div>Equity Gap: <strong>${gapStr}</strong></div>
                </div>`,
              style: {
                background: "none",
                border: "none",
                boxShadow: "none",
              },
            };
          }
          // Kelurahan tooltip
          if (layer?.id === "kelurahan-boundaries" && object?.properties?.kelurahan) {
            const p = object.properties;
            const hasData = p.hex_count && p.hex_count > 0;
            if (!hasData) {
              return {
                html: `
                  <div style="background:rgba(255,255,255,0.95);backdrop-filter:blur(8px);padding:8px 12px;border-radius:8px;font-size:12px;color:#1e293b;border:1px solid rgba(0,0,0,0.08);box-shadow:0 4px 12px rgba(0,0,0,0.1)">
                    <div style="font-weight:700;margin-bottom:2px">${p.kelurahan}</div>
                    <div style="color:#94a3b8;font-size:10px">Kec. ${p.kecamatan}</div>
                  </div>`,
                style: { background: "none", border: "none", boxShadow: "none" },
              };
            }
            const qLabel = QUADRANT_LABELS[p.quadrant as EquityQuadrant] || p.quadrant;
            const needScore = p.transit_need_score;
            const accessScore = p.transit_accessibility_score;
            const gap = p.equity_gap;
            return {
              html: `
                <div style="background:rgba(255,255,255,0.95);backdrop-filter:blur(8px);padding:8px 12px;border-radius:8px;font-size:12px;color:#1e293b;border:1px solid rgba(0,0,0,0.08);box-shadow:0 4px 12px rgba(0,0,0,0.1)">
                  <div style="font-weight:700;margin-bottom:2px">${p.kelurahan}</div>
                  <div style="color:#94a3b8;font-size:10px;margin-bottom:4px">Kec. ${p.kecamatan} · ${qLabel}</div>
                  <div>Need: <strong>${Number(needScore).toFixed(0)}</strong> | Access: <strong>${Number(accessScore).toFixed(0)}</strong></div>
                  <div>Equity Gap: <strong>${Number(gap).toFixed(1)}</strong></div>
                </div>`,
              style: { background: "none", border: "none", boxShadow: "none" },
            };
          }
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
                  <div style="color:#94a3b8;font-size:10px;margin-bottom:3px">H3 res ${h3Resolution} · ${qLabel}</div>
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
