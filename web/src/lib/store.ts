import { create } from "zustand";

// ===== Boundary Mode =====
export type BoundaryMode = "kelurahan" | "kecamatan" | "hex";

// ===== App Phase =====
export type AppPhase = "landing" | "loading" | "results";
export type LoadingStage =
  | "resolving"
  | "fetching-pois"
  | "fetching-transit"
  | "analyzing"
  | "done";

// ===== Equity Quadrant System (DATA_MODEL.md) =====
// Q1: high need, high access — transit serves those who need it
// Q2: low need, high access — over-served
// Q3: low need, low access — car-dependent suburbs
// Q4: high need, low access — transit deserts (priority)
export type EquityQuadrant = "Q1" | "Q2" | "Q3" | "Q4";

export const QUADRANT_COLORS: Record<EquityQuadrant, [number, number, number]> = {
  Q4: [220, 38, 38],    // red-600 — high need, low access (transit desert)
  Q1: [22, 163, 74],    // green-600 — high need, high access (ideal)
  Q2: [59, 130, 246],   // blue-500 — low need, high access (over-served)
  Q3: [251, 191, 36],   // amber-400 — low need, low access (car suburb)
};

export const QUADRANT_LABELS: Record<EquityQuadrant, string> = {
  Q4: "Transit Desert",
  Q1: "Transit Ideal",
  Q2: "Over-Served",
  Q3: "Car Suburb",
};

export const QUADRANT_EMOJI: Record<EquityQuadrant, string> = {
  Q4: "🔴",
  Q1: "🟢",
  Q2: "🔵",
  Q3: "🟡",
};

export const QUADRANT_ACTION: Record<EquityQuadrant, string> = {
  Q4: "Priority investment needed — high demand, poor supply",
  Q1: "Maintain & optimize — transit serves those who need it",
  Q2: "Redirect resources — capacity exceeds local demand",
  Q3: "Monitor — low demand, low supply, car-dependent",
};

// ===== Persona System (MVP-90) =====
export type Persona = "commuter" | "explorer" | "researcher" | "planner" | null;

// ===== POI Categories =====
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

export const POI_COLORS: Record<POICategory, [number, number, number]> = {
  hospital: [239, 68, 68],
  clinic: [249, 115, 22],
  pharmacy: [236, 72, 153],
  restaurant: [245, 158, 11],
  cafe: [180, 83, 9],
  market: [234, 179, 8],
  supermarket: [34, 197, 94],
  school: [59, 130, 246],
  university: [99, 102, 241],
  park: [16, 185, 129],
  worship: [168, 85, 247],
  bank: [100, 116, 139],
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

// ===== Zone Properties (DATA_MODEL.md schema) =====
// Used for both H3 cells and kelurahan zones.
// Optional fields are absent from one resolution level.

export interface HexProperties {
  // Identity
  h3_index: string;                       // H3 cell ID or synthetic "kel_*"/"kec_*"
  kelurahan_id?: string | null;
  kelurahan_name?: string | null;
  kecamatan_name?: string | null;
  kota_kab_name?: string | null;

  // H3-specific
  h3_area_km2?: number | null;
  is_edge_cell?: boolean | null;
  kelurahan_ids?: string[] | null;
  area_km2?: number | null;               // kelurahan area

  // Need indicators (TNI)
  population: number;
  pop_density?: number | null;
  poverty_rate?: number | null;
  avg_household_expenditure?: number | null;
  zero_vehicle_hh_pct?: number | null;
  dependency_ratio?: number | null;
  tni_score: number;

  // Road network
  road_length_km?: number | null;
  road_density_km_per_km2?: number | null;
  pct_primary_secondary?: number | null;
  pct_residential_tertiary?: number | null;
  pct_footway_pedestrian?: number | null;
  avg_road_class_score?: number | null;
  network_connectivity?: number | null;
  road_adjusted_access?: number | null;

  // Access indicators (TAI inputs)
  n_transit_stops?: number | null;
  n_transit_routes?: number | null;
  avg_headway_min?: number | null;
  min_dist_to_transit_m?: number | null;
  transit_mode_diversity?: number | null;
  best_mode_fare_tier?: number | null;
  has_affordable_mode?: boolean | null;
  has_feeder_service?: boolean | null;

  // POI travel times (r5py)
  poi_reach_cbd_min?: number | null;
  poi_reach_hospital_min?: number | null;
  poi_reach_school_min?: number | null;
  poi_reach_market_min?: number | null;
  poi_reach_industrial_min?: number | null;
  poi_reach_govoffice_min?: number | null;

  // TAI layer scores [0,1]
  tai_l1_first_mile?: number | null;
  tai_l2_service_quality?: number | null;
  tai_l3_cbd_journey?: number | null;
  tai_l4_last_mile?: number | null;
  tai_l5_cost_competitiveness?: number | null;

  // Fare
  est_cbd_journey_fare_idr?: number | null;

  // Generalized cost — Layer 5
  gc_transit_idr?: number | null;
  gc_car_idr?: number | null;
  gc_motorcycle_idr?: number | null;
  cheapest_private_mode?: "car" | "motorcycle" | null;
  tcr_vs_car?: number | null;
  tcr_vs_motorcycle?: number | null;
  tcr_combined?: number | null;
  transit_competitive_zone?: "transit_wins" | "swing" | "private_wins" | "transit_not_available" | null;
  distance_to_sudirman_km?: number | null;

  // Traffic (v2 — null by default)
  avg_traffic_speed_kmh?: number | null;
  peak_congestion_index?: number | null;
  traffic_adjusted_access?: number | null;

  // Composite & derived
  tai_score: number;
  equity_gap: number;
  quadrant: EquityQuadrant;
}

export interface MapStats {
  avg_score: number;
  median_score: number;
  total_zones: number;
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

// Demographics — extracted from kelurahan zone properties
export interface Demographics {
  h3_index: string;
  kelurahan_name: string;
  kecamatan_name: string;
  kota_kab_name: string;
  pop_density: number;
  population: number;
  poverty_rate: number;
  avg_household_expenditure: number;
  zero_vehicle_hh_pct: number;
  dependency_ratio: number;
  kelurahan_id?: string | null;
  area_km2?: number | null;
}

// ===== State Interface =====

interface AccessibilityState {
  appPhase: AppPhase;
  loadingStage: LoadingStage | null;
  searchQuery: string;
  locationName: string;
  selectedPersona: Persona;

  selectedHex: HexProperties | null;
  mapStats: MapStats | null;
  hexLayerVisible: boolean;
  h3Resolution: 7 | 8;
  boundaryMode: BoundaryMode;

  clickedCoordinate: [number, number] | null;

  allPOIs: POIFeature[];
  reachablePOIs: ReachablePOI[];
  selectedPOI: ReachablePOI | null;

  routes: Map<string, RouteData>;
  activeRouteId: string | null;

  allTransitStops: TransitStop[];
  nearbyTransitStops: TransitStop[];
  selectedTransitStop: TransitStop | null;
  transitRoute: RouteData | null;

  demographicsData: Map<string, Demographics>;
  demographics: Demographics | null;

  aiSummary: string;
  aiLoading: boolean;
  aiError: string | null;

  setAppPhase: (phase: AppPhase) => void;
  setLoadingStage: (stage: LoadingStage | null) => void;
  setSearchQuery: (q: string) => void;
  setLocationName: (name: string) => void;
  setSelectedPersona: (p: Persona) => void;

  setSelectedHex: (hex: HexProperties | null) => void;
  setMapStats: (s: MapStats) => void;
  setHexLayerVisible: (v: boolean) => void;
  toggleHexLayer: () => void;
  setH3Resolution: (r: 7 | 8) => void;
  setBoundaryMode: (mode: BoundaryMode) => void;

  setClickedCoordinate: (coord: [number, number] | null) => void;

  setAllPOIs: (pois: POIFeature[]) => void;
  setReachablePOIs: (pois: ReachablePOI[]) => void;
  setSelectedPOI: (poi: ReachablePOI | null) => void;

  addRoute: (poiId: string, route: RouteData) => void;
  setActiveRouteId: (id: string | null) => void;
  clearRoutes: () => void;

  setAllTransitStops: (stops: TransitStop[]) => void;
  setNearbyTransitStops: (stops: TransitStop[]) => void;
  setSelectedTransitStop: (stop: TransitStop | null) => void;
  setTransitRoute: (route: RouteData | null) => void;

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
  selectedPersona: null,

  selectedHex: null,
  mapStats: null,
  hexLayerVisible: false,
  h3Resolution: 8,
  boundaryMode: "kelurahan" as BoundaryMode,

  clickedCoordinate: null,

  allPOIs: [],
  reachablePOIs: [],
  selectedPOI: null,

  routes: new Map(),
  activeRouteId: null,

  allTransitStops: [],
  nearbyTransitStops: [],
  selectedTransitStop: null,
  transitRoute: null,

  demographicsData: new Map(),
  demographics: null,

  aiSummary: "",
  aiLoading: false,
  aiError: null,

  setAppPhase: (phase) => set({ appPhase: phase }),
  setLoadingStage: (stage) => set({ loadingStage: stage }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setLocationName: (name) => set({ locationName: name }),
  setSelectedPersona: (p) => set({ selectedPersona: p }),

  setSelectedHex: (hex) => set({ selectedHex: hex }),
  setMapStats: (s) => set({ mapStats: s }),
  setHexLayerVisible: (v) => set({ hexLayerVisible: v }),
  toggleHexLayer: () =>
    set((state) => ({ hexLayerVisible: !state.hexLayerVisible })),
  setH3Resolution: (r) => set({ h3Resolution: r }),
  setBoundaryMode: (mode) => set({ boundaryMode: mode }),

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
  setSelectedTransitStop: (stop) => set({ selectedTransitStop: stop }),
  setTransitRoute: (route) => set({ transitRoute: route }),

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
      selectedTransitStop: null,
      transitRoute: null,
      demographics: null,
      aiSummary: "",
      aiLoading: false,
      aiError: null,
      locationName: "",
    }),
}));
