"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccessibilityStore, type Persona } from "@/lib/store";

const STORAGE_KEY = "jtm_persona";

interface PersonaCard {
  id: Persona;
  icon: string;
  label: string;
  description: string;
  highlighted?: boolean;
}

const PERSONA_CARDS: PersonaCard[] = [
  {
    id: "commuter",
    icon: "train",
    label: "Commuter",
    description: "Plan multi-modal journeys with real-time sync for everyday travel.",
  },
  {
    id: "planner",
    icon: "dashboard",
    label: "Planner & Ops",
    description: "Identify underinvestment and simulate expansion scenarios.",
    highlighted: true,
  },
  {
    id: "researcher",
    icon: "biotech",
    label: "Researcher",
    description: "Deep dive into Gini coefficients and spatial resolution effects.",
  },
];

export default function LandingOverlay() {
  const appPhase = useAccessibilityStore((s) => s.appPhase);
  const setSelectedPersona = useAccessibilityStore((s) => s.setSelectedPersona);
  const setAppPhase = useAccessibilityStore((s) => s.setAppPhase);
  const [hoveredPersona, setHoveredPersona] = useState<Persona>(null);

  const handleStartAnalysis = (persona: Persona) => {
    const chosen = persona ?? hoveredPersona ?? null;
    setSelectedPersona(chosen);
    if (chosen !== null) {
      localStorage.setItem(STORAGE_KEY, chosen);
    }
    setAppPhase("loading");
  };

  return (
    <AnimatePresence>
      {appPhase === "landing" && (
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 z-20 flex flex-col overflow-hidden"
        >
          {/* Outer Glow Border Frame */}
          <div className="fixed inset-4 pointer-events-none z-50 rounded-2xl glow-border" />

          {/* H3 hex pattern + gradient overlay */}
          <div className="absolute inset-0 h3-overlay opacity-40 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-tr from-surface via-transparent to-surface/20 pointer-events-none" />

          {/* Top Navigation */}
          <nav className="relative z-50 flex justify-between items-center px-12 h-20 bg-transparent">
            <div className="flex items-center gap-10">
              <span className="text-xl font-black text-primary tracking-tighter font-headline">
                JTEM
              </span>
              <div className="hidden md:flex items-center gap-8">
                {(["Methodology", "Research Paper", "Contact"] as const).map((link) => (
                  <a
                    key={link}
                    href="#"
                    className="text-on-surface/60 font-medium text-xs uppercase tracking-widest hover:text-primary transition-colors"
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <button className="p-2 text-on-surface/50 hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined">light_mode</span>
              </button>
              <button
                onClick={() => handleStartAnalysis(null)}
                className="bg-primary text-on-primary px-5 py-2 rounded-sm font-label text-xs font-bold tracking-widest hover:brightness-110 transition-all uppercase"
              >
                Enter Engine
              </button>
            </div>
          </nav>

          {/* Floating Search Bar */}
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-6 pointer-events-auto">
            <div className="bg-surface/60 backdrop-blur-xl border border-white/10 rounded-lg flex items-center px-4 py-3 gap-4 shadow-2xl">
              <span className="material-symbols-outlined text-on-surface/40">search</span>
              <input
                className="bg-transparent border-none outline-none flex-1 text-sm font-label tracking-wide placeholder:text-on-surface/30 text-on-surface focus:ring-0"
                placeholder="Search by Kelurahan, H3 Hex, or Coordinates..."
                type="text"
              />
              <span className="material-symbols-outlined text-on-surface/40 text-lg">
                my_location
              </span>
            </div>
          </div>

          {/* Main Central Panel */}
          <main className="flex-1 relative z-10 flex items-center justify-center px-8 pb-12 pt-4">
            <div className="main-glass-panel w-full max-w-5xl rounded-2xl p-12 md:p-16 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
              {/* Map Mode Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full mb-10 border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-primary status-dot" />
                <span className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
                  Map Interactive Mode
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter font-headline mb-4 max-w-3xl leading-tight text-on-surface">
                A Data-Driven Diagnostic for <br />
                <span className="text-primary italic">Transit Equity</span> in Jabodetabek
              </h1>
              <p className="text-on-surface-variant text-sm md:text-base max-w-2xl mb-16 leading-relaxed opacity-80">
                Click anywhere on the map to begin spatial diagnostics for Indonesia&apos;s capital
                region. Visualize connectivity, identify deserts, and simulate infrastructure impact.
              </p>

              {/* Persona Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mb-16">
                {PERSONA_CARDS.map((card) => (
                  <div
                    key={card.id}
                    className={`card-glass p-6 rounded-xl text-left group cursor-pointer ${
                      card.highlighted ? "border-primary/30" : ""
                    }`}
                    onMouseEnter={() => setHoveredPersona(card.id)}
                    onMouseLeave={() => setHoveredPersona(null)}
                    onClick={() => handleStartAnalysis(card.id)}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          card.highlighted ? "bg-primary/20" : "bg-primary/10"
                        }`}
                      >
                        <span className="material-symbols-outlined text-primary text-lg">
                          {card.icon}
                        </span>
                      </div>
                      <span className="font-label text-[10px] uppercase tracking-widest font-bold text-on-surface-variant group-hover:text-primary transition-colors">
                        {card.label}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">
                      {card.description}
                    </p>
                  </div>
                ))}
              </div>

              {/* Action Area */}
              <div className="flex flex-col md:flex-row items-center gap-8">
                <button
                  onClick={() => handleStartAnalysis(null)}
                  className="bg-primary text-on-primary px-10 py-4 rounded-sm font-label text-sm font-black tracking-[0.2em] uppercase hover:brightness-110 transition-all shadow-[0_0_30px_rgba(111,216,200,0.2)]"
                >
                  Start Analysis
                </button>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] tracking-widest text-on-surface/40 uppercase">
                    {hoveredPersona ? `Selected: ${hoveredPersona}` : "Waiting for input..."}
                  </span>
                </div>
              </div>
            </div>
          </main>

          {/* Bottom Stats Footer */}
          <footer className="relative z-50 flex flex-col md:flex-row justify-between items-center px-12 py-6 bg-surface/80 backdrop-blur-md border-t border-white/5">
            <div className="flex gap-12 mb-4 md:mb-0">
              <div className="flex flex-col">
                <span className="font-label text-[9px] uppercase tracking-widest text-on-surface/40">
                  Population
                </span>
                <span className="font-mono text-sm font-bold text-on-surface">30.4M</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label text-[9px] uppercase tracking-widest text-on-surface/40">
                  Kelurahan
                </span>
                <span className="font-mono text-sm font-bold text-on-surface">2,670</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label text-[9px] uppercase tracking-widest text-on-surface/40">
                  Transit Desert
                </span>
                <span className="font-mono text-sm font-bold text-primary">42%</span>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <span className="font-mono text-[9px] text-on-surface/30 uppercase tracking-[0.2em]">
                EPSG:3857 | Jabodetabek Metropolitan Area
              </span>
              <div className="flex items-center gap-4 border-l border-white/10 pl-8">
                <a
                  href="#"
                  className="text-on-surface/40 text-[9px] uppercase tracking-widest hover:text-on-surface transition-colors"
                >
                  Privacy
                </a>
                <a
                  href="#"
                  className="text-on-surface/40 text-[9px] uppercase tracking-widest hover:text-on-surface transition-colors"
                >
                  API
                </a>
              </div>
            </div>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
