"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccessibilityStore, type Persona } from "@/lib/store";

const STORAGE_KEY = "jtm_persona";

interface PersonaCard {
  id: Persona;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  borderColor: string;
  bgColor: string;
  initialMode: "kelurahan" | "hex";
}

const PERSONAS: PersonaCard[] = [
  {
    id: "commuter",
    icon: "🚌",
    title: "Daily Commuter",
    subtitle: "I use public transit to get to work",
    description: "Check transit access from your neighborhood, compare modes, and see if your area is underserved.",
    color: "text-blue-700",
    borderColor: "border-blue-400",
    bgColor: "bg-blue-50",
    initialMode: "kelurahan",
  },
  {
    id: "explorer",
    icon: "🗺️",
    title: "Curious Citizen",
    subtitle: "I want to understand transit equity",
    description: "Explore which neighborhoods lack transit access and why the equity gap exists across Jabodetabek.",
    color: "text-emerald-700",
    borderColor: "border-emerald-400",
    bgColor: "bg-emerald-50",
    initialMode: "kelurahan",
  },
  {
    id: "researcher",
    icon: "📊",
    title: "Researcher / Analyst",
    subtitle: "I want data, statistics, and methodology",
    description: "Access Gini coefficients, LISA clusters, Lorenz curves, and H3 resolution comparisons.",
    color: "text-violet-700",
    borderColor: "border-violet-400",
    bgColor: "bg-violet-50",
    initialMode: "hex",
  },
  {
    id: "planner",
    icon: "🏙️",
    title: "Urban Planner",
    subtitle: "I work in transport policy or planning",
    description: "Simulate new routes, evaluate investment priorities, and identify transit deserts by zone.",
    color: "text-amber-700",
    borderColor: "border-amber-400",
    bgColor: "bg-amber-50",
    initialMode: "kelurahan",
  },
];

interface EntryScreenProps {
  onDone: () => void;
}

export default function EntryScreen({ onDone }: EntryScreenProps) {
  const [visible, setVisible] = useState(false);
  const { setSelectedPersona, setBoundaryMode, setH3Resolution, setHexLayerVisible } =
    useAccessibilityStore();

  useEffect(() => {
    // Small delay so map can render first
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleSelect = (persona: PersonaCard) => {
    setSelectedPersona(persona.id);
    setBoundaryMode(persona.initialMode);
    if (persona.initialMode === "hex") setH3Resolution(8);
    setHexLayerVisible(true);

    // Persist to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, persona.id as string);
    }

    onDone();
  };

  const handleSkip = () => {
    setSelectedPersona(null);
    setHexLayerVisible(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "skipped");
    }
    onDone();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="entry-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 z-30 flex flex-col items-center justify-center"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" />

          <div className="relative z-10 w-full max-w-2xl px-4 flex flex-col items-center gap-6">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-center"
            >
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
                Transit Equity in Jabodetabek
              </h1>
              <p className="text-sm text-slate-500 mt-2">
                Who are you? We'll tailor the view for you.
              </p>
            </motion.div>

            {/* Persona cards — 2×2 grid */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="grid grid-cols-2 gap-3 w-full"
            >
              {PERSONAS.map((persona, i) => (
                <motion.button
                  key={persona.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 + i * 0.07, duration: 0.3 }}
                  onClick={() => handleSelect(persona)}
                  className={`rounded-2xl border-2 p-4 text-left transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.99] bg-white/90 hover:${persona.bgColor} hover:${persona.borderColor} border-slate-200`}
                >
                  <div className="text-2xl mb-2">{persona.icon}</div>
                  <div className={`text-sm font-bold ${persona.color} mb-0.5`}>
                    {persona.title}
                  </div>
                  <div className="text-[11px] text-slate-500 mb-2 leading-tight">
                    {persona.subtitle}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    {persona.description}
                  </p>
                </motion.button>
              ))}
            </motion.div>

            {/* Skip */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              onClick={handleSkip}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-2"
            >
              Skip — show full tool
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
