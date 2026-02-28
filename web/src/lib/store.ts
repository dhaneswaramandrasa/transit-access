import { create } from "zustand";

// ===== App Phase =====
export type AppPhase = "landing" | "loading" | "results";
export type LoadingStage =
  | "resolving"
  | "fetching-pois"
  | "fetching-transit"
  | "analyzing"
  | "done";

// ===== POI Categories (12) =====
export const POI_CATEGORIES = [
  "hospital",
  "clinic",
  "pharmacy",
  "restaurant",
  "cafe",
  "market",
  "supermarket",
  "school",
  "university",
  "park",
  "worship",
  "bank",
] as const;

export type POICategory = (typeof POI_CATEGORIES)[number];

// ===== Color map for POI categories =====
export const POI_COLORS: Record<POICategory, [number, number, number]> = {
  hospital: [239, 68, 68], // red-500
  clinic: [249, 115, 22], // orange-500
  pharmacy: [236, 72, 153], // pink-500
  restaurant: [245, 158, 11], // amber-500
  cafe: [180, 83, 9], // amber-800 (brown)
  market: [234, 179, 8], // yellow-500
  supermarket: [34, 197, 94], // green-500
  school: [59, 130, 246], // blue-500
  university: [99, 102, 241], // indigo-500
  park: [16, 185, 129], // emerald-500
  worship: [168, 85, 247], // purple-500
  bank: [100, 116, 139], // slate-500
};

export const POI_LABELS: Record<POICategory, string> = {
  hospital: "Hospital",
  clinic: "Clinic",
  pharmacy: "Pharmacy",
  restaurant: "Restaurant",
  cafe: "Cafe",
  market: "Market",
  supermarket: "Supermarket",
  school: "School",
  university: "University",
  park: "Park",
  worship: "Place of Worship",
  bank: "Bank",
};

// ===== Interfaces =====

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

export interface TransitStop {
  id: string;
  name: string;
  type: "transjakarta" | "krl" | "mrt";
  line: string;
  coordinates: [number, number]; // [lng, lat]
  distance_km?: number;
}

export interface Demographics {
  h3_index: string;
  kecamatan: string;
  city_code: string;
  population_density: number;
  total_population: number;
  age_distribution: Record<string, number>;
  dominant_age_group: string;
  sex_ratio: number;
  bps_source?: string;
}

// ===== State Interface =====

interface AccessibilityState {
  // App phase
  appPhase: AppPhase;
  loadingStage: LoadingStage | null;
  searchQuery: string;
  locationName: string;

  // Hex data
  selectedHex: HexProperties | null;
  threshold: 30 | 60;
  mapStats: MapStats | null;
  hexLayerVisible: boolean;

  // Coordinate
  clickedCoordinate: [number, number] | null; // [lng, lat]

  // POI system
  allPOIs: POIFeature[];
  reachablePOIs: ReachablePOI[];
  selectedPOI: ReachablePOI | null;

  // Route cache
  routes: Map<string, RouteData>;
  activeRouteId: string | null;

  // Transit stops
  allTransitStops: TransitStop[];
  nearbyTransitStops: TransitStop[];

  // Demographics
  demographicsData: Map<string, Demographics>;
  demographics: Demographics | null;

  // AI analysis
  aiSummary: string;
  aiLoading: boolean;
  aiError: string | null;

  // ===== Actions =====

  // App phase
  setAppPhase: (phase: AppPhase) => void;
  setLoadingStage: (stage: LoadingStage | null) => void;
  setSearchQuery: (q: string) => void;
  setLocationName: (name: string) => void;

  // Hex
  setSelectedHex: (hex: HexProperties | null) => void;
  setThreshold: (t: 30 | 60) => void;
  setMapStats: (s: MapStats) => void;
  setHexLayerVisible: (v: boolean) => void;
  toggleHexLayer: () => void;

  // Coordinate
  setClickedCoordinate: (coord: [number, number] | null) => void;

  // POI
  setAllPOIs: (pois: POIFeature[]) => void;
  setReachablePOIs: (pois: ReachablePOI[]) => void;
  setSelectedPOI: (poi: ReachablePOI | null) => void;

  // Routes
  addRoute: (poiId: string, route: RouteData) => void;
  setActiveRouteId: (id: string | null) => void;
  clearRoutes: () => void;

  // Transit
  setAllTransitStops: (stops: TransitStop[]) => void;
  setNearbyTransitStops: (stops: TransitStop[]) => void;

  // Demographics
  setDemographicsData: (data: Map<string, Demographics>) => void;
  setDemographics: (d: Demographics | null) => void;

  // AI
  setAISummary: (s: string) => void;
  setAILoading: (l: boolean) => void;
  setAIError: (e: string | null) => void;
  appendAISummary: (chunk: string) => void;
  resetAI: () => void;

  // Compound: reset for new analysis
  resetForNewAnalysis: () => void;
}

export const useAccessibilityStore = create<AccessibilityState>((set) => ({
  // App phase
  appPhase: "landing",
  loadingStage: null,
  searchQuery: "",
  locationName: "",

  // Hex
  selectedHex: null,
  threshold: 30,
  mapStats: null,
  hexLayerVisible: false,

  // Coordinate
  clickedCoordinate: null,

  // POI
  allPOIs: [],
  reachablePOIs: [],
  selectedPOI: null,

  // Routes
  routes: new Map(),
  activeRouteId: null,

  // Transit
  allTransitStops: [],
  nearbyTransitStops: [],

  // Demographics
  demographicsData: new Map(),
  demographics: null,

  // AI
  aiSummary: "",
  aiLoading: false,
  aiError: null,

  // ===== Actions =====

  // App phase
  setAppPhase: (phase) => set({ appPhase: phase }),
  setLoadingStage: (stage) => set({ loadingStage: stage }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setLocationName: (name) => set({ locationName: name }),

  // Hex
  setSelectedHex: (hex) => set({ selectedHex: hex }),
  setThreshold: (t) => set({ threshold: t }),
  setMapStats: (s) => set({ mapStats: s }),
  setHexLayerVisible: (v) => set({ hexLayerVisible: v }),
  toggleHexLayer: () =>
    set((state) => ({ hexLayerVisible: !state.hexLayerVisible })),

  // Coordinate
  setClickedCoordinate: (coord) => set({ clickedCoordinate: coord }),

  // POI
  setAllPOIs: (pois) => set({ allPOIs: pois }),
  setReachablePOIs: (pois) => set({ reachablePOIs: pois }),
  setSelectedPOI: (poi) => set({ selectedPOI: poi }),

  // Routes
  addRoute: (poiId, route) =>
    set((state) => {
      const newRoutes = new Map(state.routes);
      newRoutes.set(poiId, route);
      return { routes: newRoutes };
    }),
  setActiveRouteId: (id) => set({ activeRouteId: id }),
  clearRoutes: () => set({ routes: new Map(), activeRouteId: null }),

  // Transit
  setAllTransitStops: (stops) => set({ allTransitStops: stops }),
  setNearbyTransitStops: (stops) => set({ nearbyTransitStops: stops }),

  // Demographics
  setDemographicsData: (data) => set({ demographicsData: data }),
  setDemographics: (d) => set({ demographics: d }),

  // AI
  setAISummary: (s) => set({ aiSummary: s }),
  setAILoading: (l) => set({ aiLoading: l }),
  setAIError: (e) => set({ aiError: e }),
  appendAISummary: (chunk) =>
    set((state) => ({ aiSummary: state.aiSummary + chunk })),
  resetAI: () => set({ aiSummary: "", aiLoading: false, aiError: null }),

  // Compound
  resetForNewAnalysis: () =>
    set({
      appPhase: "landing",
      loadingStage: null,
      selectedHex: null,
      clickedCoordinate: null,
      reachablePOIs: [],
      selectedPOI: null,
      routes: new Map(),
      activeRouteId: null,
      nearbyTransitStops: [],
      demographics: null,
      aiSummary: "",
      aiLoading: false,
      aiError: null,
      locationName: "",
    }),
}));
