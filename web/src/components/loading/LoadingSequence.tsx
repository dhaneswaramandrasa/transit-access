"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useAccessibilityStore } from "@/lib/store";

const STAGES = [
  { key: "resolving", label: "Resolving location..." },
  { key: "fetching-pois", label: "Finding reachable places..." },
  { key: "fetching-transit", label: "Checking transit access..." },
  { key: "analyzing", label: "Computing equity profile..." },
] as const;

function CheckIcon() {
  return (
    <motion.svg
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="w-5 h-5 text-emerald-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        d="M5 13l4 4L19 7"
      />
    </motion.svg>
  );
}

function Spinner() {
  return (
    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
  );
}

function PendingDot() {
  return <div className="w-5 h-5 rounded-full border-2 border-slate-200" />;
}

export default function LoadingSequence() {
  const { appPhase, loadingStage } = useAccessibilityStore();

  if (appPhase !== "loading") return null;

  const stageIndex = STAGES.findIndex((s) => s.key === loadingStage);

  return (
    <AnimatePresence>
      <motion.div
        key="loading"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 z-20 flex items-center justify-center"
      >
        <div className="absolute inset-0 bg-white/40 backdrop-blur-sm" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="relative glass-strong rounded-2xl p-8 max-w-sm w-full mx-4 shadow-xl"
        >
          <h3 className="text-lg font-semibold text-slate-800 mb-6">
            Analyzing Equity
          </h3>

          <div className="space-y-4">
            {STAGES.map((stage, idx) => {
              const isComplete = idx < stageIndex;
              const isCurrent = idx === stageIndex;
              const isPending = idx > stageIndex;

              return (
                <motion.div
                  key={stage.key}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + idx * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="shrink-0">
                    {isComplete && <CheckIcon />}
                    {isCurrent && <Spinner />}
                    {isPending && <PendingDot />}
                  </div>
                  <span
                    className={`text-sm ${
                      isComplete
                        ? "text-emerald-600 font-medium"
                        : isCurrent
                        ? "text-blue-600 font-medium"
                        : "text-slate-400"
                    }`}
                  >
                    {stage.label}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="mt-6 h-1 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-500 rounded-full"
              initial={{ width: "0%" }}
              animate={{
                width:
                  stageIndex < 0
                    ? "0%"
                    : `${((stageIndex + 1) / STAGES.length) * 100}%`,
              }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
