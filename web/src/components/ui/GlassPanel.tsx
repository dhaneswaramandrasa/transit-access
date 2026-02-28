"use client";

import { motion } from "framer-motion";

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
  delay?: number;
}

export default function GlassPanel({
  children,
  className = "",
  animate = true,
  delay = 0,
}: GlassPanelProps) {
  if (!animate) {
    return (
      <div className={`glass rounded-2xl p-5 ${className}`}>{children}</div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={`glass rounded-2xl p-5 ${className}`}
    >
      {children}
    </motion.div>
  );
}
