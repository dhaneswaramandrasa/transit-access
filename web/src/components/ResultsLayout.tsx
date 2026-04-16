"use client";

import { motion } from "framer-motion";
import { useAccessibilityStore, QUADRANT_LABELS, QUADRANT_COLORS, type Persona } from "@/lib/store";
import CardGrid from "./results/CardGrid";
import CommuterLens from "./results/lenses/CommuterLens";
import ResearcherLens from "./results/lenses/ResearcherLens";
import PlannerLens from "./results/lenses/PlannerLens";

interface SideNavItem {
  icon: string;
  label: string;
  persona: Persona | "stats";
}

const SIDE_NAV_ITEMS: SideNavItem[] = [
  { icon: "directions_transit", label: "Commuter", persona: "commuter" },
  { icon: "analytics", label: "Researcher", persona: "researcher" },
  { icon: "map", label: "Planner", persona: "planner" },
  { icon: "query_stats", label: "Stats", persona: "stats" },
];

export default function ResultsLayout() {
  const {
    appPhase,
    locationName,
    clickedCoordinate,
    resetForNewAnalysis,
    boundaryMode,
    setBoundaryMode,
    setH3Resolution,
    selectedHex,
    selectedPersona,
    setSelectedPersona,
  } = useAccessibilityStore();

  const quadrant = selectedHex?.quadrant;
  const quadrantLabel = quadrant ? QUADRANT_LABELS[quadrant] : null;
  const quadrantColor = quadrant ? QUADRANT_COLORS[quadrant] : null;

  if (appPhase !== "results") return null;

  const coordText = clickedCoordinate
    ? `${clickedCoordinate[1].toFixed(4)}, ${clickedCoordinate[0].toFixed(4)}`
    : "";

  const handlePersonaSwitch = (persona: Persona | "stats") => {
    if (persona !== "stats") {
      setSelectedPersona(persona);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="absolute inset-0 z-10 flex"
    >
      {/* Collapsible Left Sidebar */}
      <aside className="relative flex flex-col h-full z-40 bg-surface-container-low transition-all duration-300 shadow-[12px_0_32px_rgba(0,0,0,0.4)] group w-16 hover:w-64 shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-4 px-5 py-6 overflow-hidden border-b border-white/5">
          <div className="w-6 h-6 rounded bg-primary-container flex items-center justify-center shrink-0">
            <span
              className="material-symbols-outlined text-primary text-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              terminal
            </span>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap overflow-hidden">
            <p className="font-label text-[10px] uppercase tracking-widest text-primary">JTEM</p>
            <p className="text-[9px] text-outline">Tactical Intel</p>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 pt-4 space-y-1">
          {SIDE_NAV_ITEMS.map(({ icon, label, persona }) => {
            const isActive =
              persona !== "stats" && selectedPersona === persona;
            return (
              <button
                key={label}
                onClick={() => handlePersonaSwitch(persona)}
                className={`w-full flex items-center gap-4 p-3 rounded-lg transition-all text-left ${
                  isActive
                    ? "bg-surface-container text-primary border-r-2 border-primary"
                    : "text-on-surface/40 hover:bg-surface-container/50 hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined shrink-0">{icon}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity font-label text-xs uppercase tracking-widest whitespace-nowrap">
                  {label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-white/5 space-y-2">
          <button className="w-full flex items-center gap-4 p-3 rounded-lg text-on-surface/40 hover:text-on-surface hover:bg-surface-container/50 transition-all text-left">
            <span className="material-symbols-outlined shrink-0">download</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity font-label text-[10px] uppercase tracking-widest whitespace-nowrap">
              Download Data
            </span>
          </button>
          <button
            onClick={resetForNewAnalysis}
            className="w-full flex items-center gap-4 p-3 rounded-lg text-on-surface/40 hover:text-primary hover:bg-surface-container/50 transition-all text-left"
          >
            <span className="material-symbols-outlined shrink-0">home</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity font-label text-[10px] uppercase tracking-widest whitespace-nowrap">
              Back to Landing
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-surface-container-lowest">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-6 py-3 bg-surface-container-low border-b border-white/5 shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <span className="material-symbols-outlined text-primary text-sm">location_on</span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-on-surface truncate">
                {locationName || coordText || "Selected Location"}
              </h2>
              {quadrantLabel && quadrantColor && (
                <span
                  className="inline-block text-[10px] font-label font-semibold px-1.5 py-0.5 rounded mt-0.5 uppercase tracking-widest"
                  style={{
                    backgroundColor: `rgba(${quadrantColor[0]},${quadrantColor[1]},${quadrantColor[2]},0.15)`,
                    color: `rgb(${quadrantColor[0]},${quadrantColor[1]},${quadrantColor[2]})`,
                  }}
                >
                  {quadrant} · {quadrantLabel}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Boundary mode toggle */}
            <div className="flex rounded overflow-hidden border border-outline-variant text-[10px] font-label">
              {(["kelurahan", "hex"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setBoundaryMode(mode);
                    if (mode === "hex") setH3Resolution(8);
                  }}
                  className={`px-3 py-1.5 transition-colors uppercase tracking-widest ${
                    boundaryMode === mode
                      ? "bg-primary text-on-primary font-bold"
                      : "bg-surface-container text-on-surface/50 hover:bg-surface-container-high"
                  }`}
                >
                  {mode === "kelurahan" ? "Admin" : "H3"}
                </button>
              ))}
            </div>

            <button
              onClick={resetForNewAnalysis}
              className="p-2 text-on-surface/40 hover:text-on-surface hover:bg-surface-container rounded transition-colors"
              title="Close"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </header>

        {/* Content — persona-specific lens or default CardGrid */}
        <div className="flex-1 relative overflow-hidden">
          {selectedPersona === "commuter" ? (
            <CommuterLens />
          ) : selectedPersona === "researcher" ? (
            <ResearcherLens />
          ) : selectedPersona === "planner" ? (
            <PlannerLens />
          ) : (
            <div className="h-full overflow-y-auto p-4">
              <CardGrid />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
