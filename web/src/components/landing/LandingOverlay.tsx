"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useAccessibilityStore, type BoundaryMode } from "@/lib/store";
import SearchBar from "./SearchBar";

type Category = "administrative" | "hex" | null;

export default function LandingOverlay() {
  const appPhase = useAccessibilityStore((s) => s.appPhase);
  const boundaryMode = useAccessibilityStore((s) => s.boundaryMode);
  const setBoundaryMode = useAccessibilityStore((s) => s.setBoundaryMode);
  const setHexLayerVisible = useAccessibilityStore((s) => s.setHexLayerVisible);
  const setH3Resolution = useAccessibilityStore((s) => s.setH3Resolution);
  const [category, setCategory] = useState<Category>(null);

  const handleChooseMode = (mode: BoundaryMode, resolution?: 7 | 8) => {
    setBoundaryMode(mode);
    if (resolution) setH3Resolution(resolution);
    setHexLayerVisible(true);
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
          className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none"
        >
          {/* Gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/30 to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center gap-6 pointer-events-auto px-4">
            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-center"
            >
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
                Transit Equity
              </h1>
              <h2 className="text-4xl md:text-5xl font-bold text-blue-600 tracking-tight mt-1">
                in Jabodetabek
              </h2>
              <p className="text-sm text-slate-500 mt-3 leading-relaxed max-w-xs">
                Explore transit accessibility and equity gaps across Jakarta, Bogor, Depok, Tangerang &amp; Bekasi
              </p>
              <p className="text-xs text-slate-400 mt-2 tracking-wide uppercase">
                Jabodetabek, Indonesia
              </p>
            </motion.div>

            {/* Boundary Mode Chooser — Two-level */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="w-full max-w-md"
            >
              <p className="text-xs text-slate-400 text-center mb-2 uppercase tracking-wider font-medium">
                Choose Boundary Type
              </p>

              {/* Level 1: Administrative vs Hex */}
              <div className="flex gap-3 mb-2">
                <button
                  onClick={() => setCategory(category === "administrative" ? null : "administrative")}
                  className={`flex-1 rounded-xl p-3 border-2 transition-all text-left ${
                    category === "administrative"
                      ? "border-blue-500 bg-blue-50/80 shadow-md"
                      : "border-slate-200 bg-white/70 hover:border-blue-300 hover:bg-white/90"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <span className="text-sm font-semibold text-slate-800">Administrative</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Official government boundaries from BIG
                  </p>
                </button>
                <button
                  onClick={() => setCategory(category === "hex" ? null : "hex")}
                  className={`flex-1 rounded-xl p-3 border-2 transition-all text-left ${
                    category === "hex"
                      ? "border-blue-500 bg-blue-50/80 shadow-md"
                      : "border-slate-200 bg-white/70 hover:border-blue-300 hover:bg-white/90"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l8 4.5v9L12 22l-8-6.5v-9L12 2z" />
                    </svg>
                    <span className="text-sm font-semibold text-slate-800">H3 Hex Grid</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Uniform hexagonal grid for precise analysis
                  </p>
                </button>
              </div>

              {/* Level 2: Sub-options */}
              <AnimatePresence mode="wait">
                {category === "administrative" && (
                  <motion.div
                    key="admin-sub"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleChooseMode("kelurahan")}
                        className={`flex-1 rounded-lg p-2.5 border transition-all ${
                          boundaryMode === "kelurahan"
                            ? "border-blue-400 bg-blue-50 shadow-sm"
                            : "border-slate-200 bg-white/70 hover:border-blue-300"
                        }`}
                      >
                        <span className="text-xs font-semibold text-slate-700">Kelurahan</span>
                        <p className="text-[9px] text-slate-400 mt-0.5">Village level (~1,500 areas)</p>
                      </button>
                      <button
                        onClick={() => handleChooseMode("kecamatan")}
                        className={`flex-1 rounded-lg p-2.5 border transition-all ${
                          boundaryMode === "kecamatan"
                            ? "border-blue-400 bg-blue-50 shadow-sm"
                            : "border-slate-200 bg-white/70 hover:border-blue-300"
                        }`}
                      >
                        <span className="text-xs font-semibold text-slate-700">Kecamatan</span>
                        <p className="text-[9px] text-slate-400 mt-0.5">Sub-district level (~185 areas)</p>
                      </button>
                    </div>
                  </motion.div>
                )}
                {category === "hex" && (
                  <motion.div
                    key="hex-sub"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleChooseMode("hex", 8)}
                        className={`flex-1 rounded-lg p-2.5 border transition-all ${
                          boundaryMode === "hex" && useAccessibilityStore.getState().h3Resolution === 8
                            ? "border-blue-400 bg-blue-50 shadow-sm"
                            : "border-slate-200 bg-white/70 hover:border-blue-300"
                        }`}
                      >
                        <span className="text-xs font-semibold text-slate-700">Small Hex</span>
                        <p className="text-[9px] text-slate-400 mt-0.5">Res 8 · ~0.74 km² each</p>
                      </button>
                      <button
                        onClick={() => handleChooseMode("hex", 7)}
                        className={`flex-1 rounded-lg p-2.5 border transition-all ${
                          boundaryMode === "hex" && useAccessibilityStore.getState().h3Resolution === 7
                            ? "border-blue-400 bg-blue-50 shadow-sm"
                            : "border-slate-200 bg-white/70 hover:border-blue-300"
                        }`}
                      >
                        <span className="text-xs font-semibold text-slate-700">Large Hex</span>
                        <p className="text-[9px] text-slate-400 mt-0.5">Res 7 · ~5.16 km² each</p>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="w-full max-w-md"
            >
              <SearchBar />
            </motion.div>

            {/* Hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="text-sm text-slate-400 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                />
              </svg>
              Or click anywhere on the map
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.5 }}
            >
              <Link
                href="/methodology"
                className="text-xs text-blue-500 hover:text-blue-700 underline underline-offset-2"
              >
                How does the scoring work?
              </Link>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
