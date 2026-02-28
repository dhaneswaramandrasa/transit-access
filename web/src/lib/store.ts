import { create } from "zustand";

// ===== App Phase =====
export type AppPhase = "landing" | "loading" | "results";
export type LoadingStage =
  | "resolving"
  | "fetching-pois"
  | "fetching-transit"
  | "analyzing"
  | "done";

// ===== Equity Quadrant System =====
export type EquityQuadrant =
  | "transit-desert"
  | "transit-ideal"
  | "over-served"
  | "car-suburb";

export const QUADRANT_COLORS: Record<EquityQuadrant, [number, number, number]> = {
  "transit-desert": [220, 38, 38],   // red-600 — high need, low access
  "transit-ideal": [22, 163, 74],    // green-600 — high need, high access
  "over-served": [59, 130, 246],     // blue-500 — low need, high access
  "car-suburb": [251, 191, 36],      // amber-400 — low need, low access
};

export const QUADRANT_LABELS: Record<EquityQuadrant, string> = {
  "transit-desert": "Transit Desert",
  "transit-ideal": "Transit Ideal",
  "over-served": "Over-Served",
  "car-suburb": "Car Suburb",
};

export const QUADRANT_EMOJI: Record<EquityQuadrant, string> = {
  "transit-desert": "🔴",
  "transit-ideal": "🟢",
  "over-served": "🔵",
  "car-suburb": "🟡",
};

export const QUADRANT_ACTION: Record<EquityQuadrant, string> = {
  "transit-desert": "Priority investment needed — high demand, poor supply",
  "transit-ideal": "Maintain & optimize — transit serves those who need it",
  "over-served": "Redirect resources — capacity exceeds local demand",
  "car-suburb": "Monitor — low demand, low supply, car-dependent",
};

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
  // Legacy scoring
  composite_score: number;
  score_30min: number;
  score_60min: number;
  percentile_rank: number;
  // POI counts per threshold
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
  // Demand-side variables
  pop_total: number;
  pct_dependent: number;
  pct_zero_vehicle: number;
  // Socioeconomic
  avg_njop: number;
  is_informal_settlement: boolean;
  // First-mile supply
  dist_to_transit: number;
  is_walkable_transit: boolean;
  transit_capacity_weight: number;
  // Destination accessibility
  local_poi_density: number;
  transit_shed_poi_count: number;
  // Computed scores (0-100)
  transit_need_score: number;
  transit_accessibility_score: number;
  equity_gap: number;
  quadrant: EquityQuadrant;
}

export interface MapStats {
  avg_score: number;
  median_score: number;
  total_hexes: number;
  h3_resolution: number;
  median_need: number;
  median_accessibility: number;
  avg_equity_gap: number;
  quadrant_counts: Record<EquityQuadrant, number>;
}

export interface POIFeature {
  id: string;
  name: string;
  category: string;
  coordinates: [number, number];
  h3_index: string;
}

export interface ReachablePOI extends POIFeature {
  distance_km: number;
  walking_minutes: number;
}

export interface RouteData {
  poiId: string;
  geometry: [number, number][];
  distance_km: number;
  duration_minutes: number;
}

export interface TransitStop {
  id: string;
  name: string;
  type: "transjakarta" | "krl" | "mrt" | "lrt";
  line: string;
  coordinates: [number, number];
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
  pct_dependent: number;
  pct_zero_vehicle: number;
  avg_njop: number;
  bps_source?: string;
}

// ===== State Interface =====

interface AccessibilityState {
  appPhase: AppPhase;
  loadingStage: LoadingStage | null;
  searchQuery: string;
  locationName: string;

  selectedHex: HexProperties | null;
  threshold: 30 | 60;
  mapStats: MapStats | null;
  hexLayerVisible: boolean;

  clickedCoordinate: [number, number] | null;

  allPOIs: POIFeature[];
  reachablePOIs: ReachablePOI[];
  selectedPOI: ReachablePOI | null;

  routes: Map<string, RouteData>;
  activeRouteId: string | null;

  allTransitStops: TransitStop[];
  nearbyTransitStops: TransitStop[];

  demographicsData: Map<string, Demographics>;
  demographics: Demographics | null;

  aiSummary: string;
  aiLoading: boolean;
  aiError: string | null;

  setAppPhase: (phase: AppPhase) => void;
  setLoadingStage: (stage: LoadingStage | null) => void;
  setSearchQuery: (q: string) => void;
  setLocationName: (name: string) => void;

  setSelectedHex: (hex: HexProperties | null) => void;
  setThreshold: (t: 30 | 60) => void;
  setMapStats: (s: MapStats) => void;
  setHexLayerVisible: (v: boolean) => void;
  toggleHexLayer: () => void;

  setClickedCoordinate: (coord: [number, number] | null) => void;

  setAllPOIs: (pois: POIFeature[]) => void;
  setReachablePOIs: (pois: ReachablePOI[]) => void;
  setSelectedPOI: (poi: ReachablePOI | null) => void;

  addRoute: (poiId: string, route: RouteData) => void;
  setActiveRouteId: (id: string | null) => void;
  clearRoutes: () => void;

  setAllTransitStops: (stops: TransitStop[]) => void;
  setNearbyTransitStops: (stops: TransitStop[]) => void;

  setDemographicsData: (data: Map<string, Demographics>) => void;
  setDemographics: (d: Demographics | null) => void;

  setAISummary: (s: string) => void;
  setAILoading: (l: boolean) => void;
  setAIError: (e: string | null) => void;
  appendAISummary: (chunk: string) => void;
  resetAI: () => void;

  resetForNewAnalysis: () => void;
}

export const useAccessibilityStore = create<AccessibilityState>((set) => ({
  appPhase: "landing",
  loadingStage: null,
  searchQuery: "",
  locationName: "",

  selectedHex: null,
  threshold: 30,
  mapStats: null,
  hexLayerVisible: false,

  clickedCoordinate: null,

  allPOIs: [],
  reachablePOIs: [],
  selectedPOI: null,

  routes: new Map(),
  activeRouteId: null,

  allTransitStops: [],
  nearbyTransitStops: [],

  demographicsData: new Map(),
  demographics: null,

  aiSummary: "",
  aiLoading: false,
  aiError: null,

  setAppPhase: (phase) => set({ appPhase: phase }),
  setLoadingStage: (stage) => set({ loadingStage: stage }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setLocationName: (name) => set({ locationName: name }),

  setSelectedHex: (hex) => set({ selectedHex: hex }),
  setThreshold: (t) => set({ threshold: t }),
  setMapStats: (s) => set({ mapStats: s }),
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

  setAllTransitStops: (stops) => set({ allTransitStops: stops }),
  setNearbyTransitStops: (stops) => set({ nearbyTransitStops: stops }),

  setDemographicsData: (data) => set({ demographicsData: data }),
  setDemographics: (d) => set({ demographics: d }),

  setAISummary: (s) => set({ aiSummary: s }),
  setAILoading: (l) => set({ aiLoading: l }),
  setAIError: (e) => set({ aiError: e }),
  appendAISummary: (chunk) =>
    set((state) => ({ aiSummary: state.aiSummary + chunk })),
  resetAI: () => set({ aiSummary: "", aiLoading: false, aiError: null }),

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
