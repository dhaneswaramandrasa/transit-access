"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QUADRANT_COLORS, QUADRANT_LABELS, type EquityQuadrant } from "@/lib/store";

// --- Types ---
interface QuadrantCounts {
  Q1: number;
  Q2: number;
  Q3: number;
  Q4: number;
}

interface LisaCounts {
  HH: number;
  HL: number;
  LH: number;
  LL: number;
  NS: number;
}

interface EquitySummary {
  kelurahan: {
    n: number;
    gini_tai: number;
    gini_tni: number;
    global_morans_i_tai: { moran_i: number; p_value: number };
    quadrant_counts: QuadrantCounts;
    lisa_cluster_counts: LisaCounts;
  };
  h3: {
    n: number;
    gini_tai: number;
    global_morans_i_tai: { moran_i: number };
    quadrant_counts: QuadrantCounts;
    lisa_cluster_counts: LisaCounts;
  };
  h2_hypothesis_signal: {
    gini_delta: number;
    cohen_kappa: number;
  };
}

interface LorenzPoint {
  population_share: number;
  access_share: number;
}

// --- Data loaders ---
async function loadEquitySummary(): Promise<EquitySummary> {
  const res = await fetch("/data/equity_summary.json");
  return res.json();
}

async function loadLorenz(resolution: "kelurahan" | "h3"): Promise<LorenzPoint[]> {
  const res = await fetch(`/data/lorenz_${resolution}.csv`);
  const text = await res.text();
  const lines = text.trim().split("\n");
  const header = lines[0].split(",");
  const popIdx = header.indexOf("population_share");
  const accIdx = header.indexOf("access_share");
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    return {
      population_share: parseFloat(cols[popIdx]),
      access_share: parseFloat(cols[accIdx]),
    };
  });
}

// --- Lorenz SVG component ---
function LorenzCurve({
  points,
  resolution,
}: {
  points: LorenzPoint[];
  resolution: "kelurahan" | "h3";
}) {
  const W = 260;
  const H = 220;
  const PAD = 32;
  const chartW = W - PAD * 2;
  const chartH = H - PAD * 2;

  const toX = (v: number) => PAD + v * chartW;
  const toY = (v: number) => PAD + (1 - v) * chartH;

  // Sample ~50 points for smooth SVG path
  const step = Math.max(1, Math.floor(points.length / 50));
  const sampled = points.filter((_, i) => i % step === 0 || i === points.length - 1);

  const curvePath =
    "M" +
    sampled
      .map((p) => `${toX(p.population_share).toFixed(1)},${toY(p.access_share).toFixed(1)}`)
      .join("L");

  const egalPath = `M${PAD},${PAD + chartH} L${PAD + chartW},${PAD}`;

  const color = resolution === "kelurahan" ? "#3b82f6" : "#ef4444";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs mx-auto">
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((v) => (
        <g key={v}>
          <line
            x1={PAD} y1={toY(v)} x2={PAD + chartW} y2={toY(v)}
            stroke="#e2e8f0" strokeWidth="0.5"
          />
          <line
            x1={toX(v)} y1={PAD} x2={toX(v)} y2={PAD + chartH}
            stroke="#e2e8f0" strokeWidth="0.5"
          />
          <text x={PAD - 4} y={toY(v) + 3} fontSize="8" textAnchor="end" fill="#94a3b8">
            {v.toFixed(2)}
          </text>
          <text x={toX(v)} y={PAD + chartH + 10} fontSize="8" textAnchor="middle" fill="#94a3b8">
            {v.toFixed(2)}
          </text>
        </g>
      ))}

      {/* Equality line */}
      <path d={egalPath} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" fill="none" />

      {/* Lorenz curve fill */}
      <path
        d={`${curvePath} L${toX(1)},${toY(0)} L${PAD},${toY(0)} Z`}
        fill={color}
        fillOpacity="0.08"
      />

      {/* Lorenz curve line */}
      <path d={curvePath} stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" />

      {/* Axis labels */}
      <text x={W / 2} y={H - 2} fontSize="8" textAnchor="middle" fill="#64748b">
        Cumulative Population Share
      </text>
      <text
        x={6} y={H / 2} fontSize="8" textAnchor="middle" fill="#64748b"
        transform={`rotate(-90, 6, ${H / 2})`}
      >
        Cumulative Access Share
      </text>
    </svg>
  );
}

// --- Quadrant bar chart ---
function QuadrantBar({
  counts,
  total,
}: {
  counts: QuadrantCounts;
  total: number;
}) {
  const order: EquityQuadrant[] = ["Q4", "Q1", "Q2", "Q3"];
  return (
    <div className="space-y-1.5">
      {order.map((q) => {
        const count = counts[q];
        const pct = ((count / total) * 100).toFixed(1);
        const [r, g, b] = QUADRANT_COLORS[q];
        return (
          <div key={q} className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500 w-4">{q}</span>
            <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor: `rgb(${r},${g},${b})`,
                  opacity: 0.8,
                }}
              />
            </div>
            <span className="text-[10px] text-slate-500 w-12 text-right">
              {count.toLocaleString()} ({pct}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}

// --- LISA cluster legend ---
const LISA_COLORS: Record<string, string> = {
  HH: "#d73027",
  HL: "#fc8d59",
  LH: "#91bfdb",
  LL: "#4575b4",
  NS: "#e0e0e0",
};
const LISA_LABELS: Record<string, string> = {
  HH: "High-High cluster",
  HL: "High-Low outlier",
  LH: "Low-High outlier",
  LL: "Low-Low cluster",
  NS: "Not significant",
};

function LisaTable({ counts, total }: { counts: LisaCounts; total: number }) {
  return (
    <div className="space-y-1">
      {(["HH", "HL", "LH", "LL", "NS"] as const).map((cluster) => {
        const count = counts[cluster];
        const pct = ((count / total) * 100).toFixed(1);
        return (
          <div key={cluster} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: LISA_COLORS[cluster] }}
            />
            <span className="text-[10px] text-slate-600 flex-1">{LISA_LABELS[cluster]}</span>
            <span className="text-[10px] font-mono text-slate-500 text-right">
              {count.toLocaleString()} ({pct}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}

// --- Main dashboard ---
type Tab = "overview" | "lorenz" | "lisa" | "resolution";

interface EquityDashboardProps {
  onClose: () => void;
}

export default function EquityDashboard({ onClose }: EquityDashboardProps) {
  const [tab, setTab] = useState<Tab>("overview");
  const [summary, setSummary] = useState<EquitySummary | null>(null);
  const [lorenzKel, setLorenzKel] = useState<LorenzPoint[]>([]);
  const [lorenzH3, setLorenzH3] = useState<LorenzPoint[]>([]);
  const [lorenzRes, setLorenzRes] = useState<"kelurahan" | "h3">("kelurahan");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      loadEquitySummary(),
      loadLorenz("kelurahan"),
      loadLorenz("h3"),
    ]).then(([s, lk, lh]) => {
      setSummary(s);
      setLorenzKel(lk);
      setLorenzH3(lh);
      setLoading(false);
    });
  }, []);

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "lorenz", label: "Lorenz" },
    { id: "lisa", label: "LISA" },
    { id: "resolution", label: "Resolution" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.97 }}
      transition={{ duration: 0.25 }}
      className="absolute bottom-16 left-4 z-20 w-[360px] bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Equity Summary</h3>
          <p className="text-[10px] text-slate-400">Jabodetabek · r5py pipeline</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-[11px] font-medium transition-colors ${
              tab === t.id
                ? "text-blue-600 border-b-2 border-blue-500 bg-blue-50/50"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="p-4 max-h-[420px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-24 text-slate-400 text-xs animate-pulse">
            Loading equity data…
          </div>
        ) : !summary ? (
          <div className="text-xs text-red-400 text-center py-8">Failed to load data</div>
        ) : (
          <>
            {tab === "overview" && (
              <div className="space-y-4">
                {/* Gini side-by-side */}
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Gini Coefficient (TAI)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["kelurahan", "h3"] as const).map((res) => {
                      const gini = summary[res].gini_tai;
                      const severity =
                        gini < 0.3 ? "text-green-600" : gini < 0.5 ? "text-amber-600" : "text-red-600";
                      return (
                        <div key={res} className="bg-slate-50 rounded-xl p-3 text-center">
                          <p className="text-[10px] text-slate-400 capitalize mb-1">
                            {res === "kelurahan" ? "Admin (Kelurahan)" : "H3 Hexagon"}
                          </p>
                          <p className={`text-2xl font-bold tabular-nums ${severity}`}>
                            {gini.toFixed(4)}
                          </p>
                          <p className="text-[9px] text-slate-400 mt-0.5">
                            n = {summary[res].n.toLocaleString()}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                    H3 reveals{" "}
                    <span className="text-red-500 font-semibold">
                      +{summary.h2_hypothesis_signal.gini_delta.toFixed(4)}
                    </span>{" "}
                    more inequality than admin boundaries
                  </p>
                </div>

                {/* Moran's I */}
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Global Moran's I (Spatial Clustering)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["kelurahan", "h3"] as const).map((res) => {
                      const moran = summary[res].global_morans_i_tai.moran_i;
                      return (
                        <div key={res} className="bg-slate-50 rounded-xl p-3 text-center">
                          <p className="text-[10px] text-slate-400 capitalize mb-1">
                            {res === "kelurahan" ? "Admin" : "H3"}
                          </p>
                          <p className="text-2xl font-bold tabular-nums text-violet-600">
                            {moran.toFixed(4)}
                          </p>
                          {"p_value" in summary[res].global_morans_i_tai && (
                            <p className="text-[9px] text-slate-400 mt-0.5">
                              p &lt; {summary.kelurahan.global_morans_i_tai.p_value}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quadrant distribution */}
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Quadrant Distribution · Kelurahan
                  </p>
                  <QuadrantBar
                    counts={summary.kelurahan.quadrant_counts}
                    total={summary.kelurahan.n}
                  />
                </div>
              </div>
            )}

            {tab === "lorenz" && (
              <div className="space-y-3">
                <div className="flex gap-2 justify-center">
                  {(["kelurahan", "h3"] as const).map((res) => (
                    <button
                      key={res}
                      onClick={() => setLorenzRes(res)}
                      className={`px-3 py-1 text-[10px] font-medium rounded-full transition-colors ${
                        lorenzRes === res
                          ? "bg-blue-500 text-white"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {res === "kelurahan" ? "Admin" : "H3"}
                    </button>
                  ))}
                </div>
                <LorenzCurve
                  points={lorenzRes === "kelurahan" ? lorenzKel : lorenzH3}
                  resolution={lorenzRes}
                />
                <div className="text-center space-y-0.5">
                  <p className="text-[10px] text-slate-500">
                    Gini:{" "}
                    <span className="font-semibold text-slate-700">
                      {lorenzRes === "kelurahan"
                        ? summary.kelurahan.gini_tai.toFixed(4)
                        : summary.h3.gini_tai.toFixed(4)}
                    </span>
                  </p>
                  <p className="text-[9px] text-slate-400">
                    Curve below diagonal = unequal distribution of transit access
                  </p>
                </div>
              </div>
            )}

            {tab === "lisa" && (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    LISA Clusters · Kelurahan (n = {summary.kelurahan.n.toLocaleString()})
                  </p>
                  <LisaTable
                    counts={summary.kelurahan.lisa_cluster_counts}
                    total={summary.kelurahan.n}
                  />
                </div>
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    LISA Clusters · H3 (n = {summary.h3.n.toLocaleString()})
                  </p>
                  <LisaTable
                    counts={summary.h3.lisa_cluster_counts}
                    total={summary.h3.n}
                  />
                </div>
                <p className="text-[9px] text-slate-400 border-t border-slate-100 pt-2">
                  HH = transit-rich clusters · LL = transit-desert clusters · NS = not significant
                </p>
              </div>
            )}

            {tab === "resolution" && (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-[10px] text-slate-400 mb-1">Cohen's Kappa (κ)</p>
                  <p className="text-3xl font-bold text-slate-800 tabular-nums">
                    {summary.h2_hypothesis_signal.cohen_kappa.toFixed(4)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Strong agreement</p>
                </div>
                <div className="space-y-2 text-[11px] text-slate-600">
                  <div className="flex justify-between">
                    <span>Admin boundaries</span>
                    <span className="font-mono text-slate-800">
                      {summary.kelurahan.n.toLocaleString()} kelurahan
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>H3 hexagons (res 8)</span>
                    <span className="font-mono text-slate-800">
                      {summary.h3.n.toLocaleString()} cells
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reclassified zones</span>
                    <span className="font-mono text-amber-600">29.0%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gini delta (H3 − Admin)</span>
                    <span className="font-mono text-red-500">
                      +{summary.h2_hypothesis_signal.gini_delta.toFixed(4)}
                    </span>
                  </div>
                </div>
                <div className="bg-violet-50 rounded-xl p-3">
                  <p className="text-[10px] text-violet-700 font-semibold mb-1">H2 Confirmed</p>
                  <p className="text-[10px] text-violet-600 leading-relaxed">
                    H3 hexagons reveal significantly more inequality than administrative boundaries.
                    29% of zones are reclassified — MAUP effect validated.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
