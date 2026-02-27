import { create } from "zustand";

export interface HexProperties {
  h3_index: string;
  composite_score: number;
  score_30min: number;
  score_60min: number;
  percentile_rank: number;
  hospital_30min: number;
  hospital_60min: number;
  clinic_30min: number;
  clinic_60min: number;
  market_30min: number;
  market_60min: number;
  supermarket_30min: number;
  supermarket_60min: number;
  school_30min: number;
  school_60min: number;
  park_30min: number;
  park_60min: number;
}

export interface MapStats {
  avg_score: number;
  median_score: number;
  total_hexes: number;
  h3_resolution: number;
}

export interface POIFeature {
  id: string;
  name: string;
  category: string;
  coordinates: [number, number]; // [lng, lat]
  h3_index: string;
}

export interface ReachablePOI extends POIFeature {
  distance_km: number;
  walking_minutes: number;
}

export interface RouteData {
  poiId: string;
  geometry: [number, number][]; // array of [lng, lat] for PathLayer
  distance_km: number;
  duration_minutes: number;
}

interface AccessibilityState {
  // Existing
  selectedHex: HexProperties | null;
  threshold: 30 | 60;
  mapStats: MapStats | null;
  aiSummary: string;
  aiLoading: boolean;
  aiError: string | null;

  // New: hex layer toggle
  hexLayerVisible: boolean;

  // New: clicked coordinate
  clickedCoordinate: [number, number] | null; // [lng, lat]

  // New: POI system
  allPOIs: POIFeature[];
  reachablePOIs: ReachablePOI[];
  selectedPOI: ReachablePOI | null;

  // New: route cache
  routes: Map<string, RouteData>; // keyed by POI id
  activeRouteId: string | null;

  // Existing actions
  setSelectedHex: (hex: HexProperties | null) => void;
  setThreshold: (t: 30 | 60) => void;
  setMapStats: (s: MapStats) => void;
  setAISummary: (s: string) => void;
  setAILoading: (l: boolean) => void;
  setAIError: (e: string | null) => void;
  appendAISummary: (chunk: string) => void;
  resetAI: () => void;

  // New actions
  setHexLayerVisible: (v: boolean) => void;
  toggleHexLayer: () => void;
  setClickedCoordinate: (coord: [number, number] | null) => void;
  setAllPOIs: (pois: POIFeature[]) => void;
  setReachablePOIs: (pois: ReachablePOI[]) => void;
  setSelectedPOI: (poi: ReachablePOI | null) => void;
  addRoute: (poiId: string, route: RouteData) => void;
  setActiveRouteId: (id: string | null) => void;
  clearRoutes: () => void;
}

export const useAccessibilityStore = create<AccessibilityState>((set) => ({
  // Existing state
  selectedHex: null,
  threshold: 30,
  mapStats: null,
  aiSummary: "",
  aiLoading: false,
  aiError: null,

  // New state
  hexLayerVisible: false,
  clickedCoordinate: null,
  allPOIs: [],
  reachablePOIs: [],
  selectedPOI: null,
  routes: new Map(),
  activeRouteId: null,

  // Existing actions
  setSelectedHex: (hex) => set({ selectedHex: hex }),
  setThreshold: (t) => set({ threshold: t }),
  setMapStats: (s) => set({ mapStats: s }),
  setAISummary: (s) => set({ aiSummary: s }),
  setAILoading: (l) => set({ aiLoading: l }),
  setAIError: (e) => set({ aiError: e }),
  appendAISummary: (chunk) =>
    set((state) => ({ aiSummary: state.aiSummary + chunk })),
  resetAI: () => set({ aiSummary: "", aiLoading: false, aiError: null }),

  // New actions
  setHexLayerVisible: (v) => set({ hexLayerVisible: v }),
  toggleHexLayer: () =>
    set((state) => ({ hexLayerVisible: !state.hexLayerVisible })),
  setClickedCoordinate: (coord) => set({ clickedCoordinate: coord }),
  setAllPOIs: (pois) => set({ allPOIs: pois }),
  setReachablePOIs: (pois) => set({ reachablePOIs: pois }),
  setSelectedPOI: (poi) => set({ selectedPOI: poi }),
  addRoute: (poiId, route) =>
    set((state) => {
      const newRoutes = new Map(state.routes);
      newRoutes.set(poiId, route);
      return { routes: newRoutes };
    }),
  setActiveRouteId: (id) => set({ activeRouteId: id }),
  clearRoutes: () => set({ routes: new Map(), activeRouteId: null }),
}));
