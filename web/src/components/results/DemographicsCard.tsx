"use client";

import { useAccessibilityStore } from "@/lib/store";
import GlassPanel from "@/components/ui/GlassPanel";

const AGE_COLORS: Record<string, string> = {
  "0-14": "#60a5fa",   // blue-400
  "15-24": "#34d399",  // emerald-400
  "25-44": "#fbbf24",  // amber-400
  "45-64": "#f97316",  // orange-500
  "65+": "#a78bfa",    // violet-400
};

const AGE_LABELS: Record<string, string> = {
  "0-14": "Children",
  "15-24": "Youth",
  "25-44": "Working Age",
  "45-64": "Middle Aged",
  "65+": "Elderly",
};

export default function DemographicsCard({ delay = 0 }: { delay?: number }) {
  const demographics = useAccessibilityStore((s) => s.demographics);

  if (!demographics) return null;

  const ageEntries = Object.entries(demographics.age_distribution).sort(
    ([a], [b]) => a.localeCompare(b)
  );

  return (
    <GlassPanel delay={delay}>
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
        Demographics
      </h3>

      {/* Kecamatan + Density */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-sm text-slate-500">Kecamatan</div>
          <div className="text-lg font-semibold text-slate-800">
            {demographics.kecamatan}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-800">
            {demographics.population_density.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400">persons/km²</div>
        </div>
      </div>

      {/* Population estimate */}
      <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-slate-50 rounded-lg">
        <svg
          className="w-4 h-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <span className="text-sm text-slate-600">
          Est. <strong>{demographics.total_population.toLocaleString()}</strong>{" "}
          people in this hex
        </span>
      </div>

      {/* Vulnerability indicators */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="px-3 py-2 bg-orange-50 rounded-lg">
          <div className="text-lg font-bold text-orange-700">
            {demographics.pct_dependent?.toFixed(0) ?? "N/A"}%
          </div>
          <div className="text-[10px] text-orange-500 uppercase">Dependent Pop</div>
        </div>
        <div className="px-3 py-2 bg-purple-50 rounded-lg">
          <div className="text-lg font-bold text-purple-700">
            {demographics.pct_zero_vehicle?.toFixed(0) ?? "N/A"}%
          </div>
          <div className="text-[10px] text-purple-500 uppercase">No Vehicle</div>
        </div>
      </div>

      {/* NJOP */}
      {demographics.avg_njop > 0 && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-slate-50 rounded-lg">
          <span className="text-xs text-slate-500">
            Land Value (NJOP): <strong>Rp {(demographics.avg_njop / 1000000).toFixed(1)}M</strong>/m²
          </span>
        </div>
      )}

      {/* Age distribution stacked bar */}
      <div className="mb-3">
        <div className="text-xs font-medium text-slate-500 mb-2">
          Age Distribution
        </div>
        <div className="h-5 rounded-full overflow-hidden flex">
          {ageEntries.map(([group, pct]) => (
            <div
              key={group}
              style={{
                width: `${pct * 100}%`,
                backgroundColor: AGE_COLORS[group] || "#94a3b8",
              }}
              title={`${group}: ${(pct * 100).toFixed(1)}%`}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {ageEntries.map(([group, pct]) => (
          <div key={group} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{
                backgroundColor: AGE_COLORS[group] || "#94a3b8",
              }}
            />
            <span className="text-xs text-slate-600">
              {AGE_LABELS[group] || group}{" "}
              <span className="text-slate-400">
                {(pct * 100).toFixed(1)}%
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* BPS source */}
      <div className="mt-2 text-[10px] text-slate-300 uppercase tracking-wider">
        Source: BPS {demographics.city_code} (modeled)
      </div>
    </GlassPanel>
  );
}
