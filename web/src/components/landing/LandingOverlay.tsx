"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useAccessibilityStore } from "@/lib/store";
import SearchBar from "./SearchBar";

export default function LandingOverlay() {
  const appPhase = useAccessibilityStore((s) => s.appPhase);

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
                How Walkable
              </h1>
              <h2 className="text-4xl md:text-5xl font-bold text-blue-600 tracking-tight mt-1">
                Is Your Location?
              </h2>
              <p className="text-sm text-slate-500 mt-3 leading-relaxed max-w-xs">
                Find out what you can reach on foot or by transit within 30 or 60 minutes
              </p>
              <p className="text-xs text-slate-400 mt-2 tracking-wide uppercase">
                Jakarta, Indonesia
              </p>
            </motion.div>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
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
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
