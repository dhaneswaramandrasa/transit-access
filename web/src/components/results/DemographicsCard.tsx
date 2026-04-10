"use client";

import { useAccessibilityStore } from "@/lib/store";
import GlassPanel from "@/components/ui/GlassPanel";

export default function DemographicsCard({ delay = 0 }: { delay?: number }) {
  const demographics = useAccessibilityStore((s) => s.demographics);

  if (!demographics) return null;

  const formatIDR = (val: number | null | undefined) => {
    if (val == null) return "N/A";
    return `Rp ${(val / 1_000_000).toFixed(1)}M`;
  };

  return (
    <GlassPanel delay={delay}>
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
        Demographics
      </h3>

      {/* Kelurahan + Density */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-sm text-slate-500">Kelurahan</div>
          <div className="text-lg font-semibold text-slate-800">
            {demographics.kelurahan_name}
          </div>
          <div className="text-xs text-slate-400">
            Kec. {demographics.kecamatan_name}
          </div>
          <div className="text-xs text-slate-400">
            {demographics.kota_kab_name}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-800">
            {demographics.pop_density.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400">persons/km²</div>
        </div>
      </div>

      {/* Population */}
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
          Est. <strong>{demographics.population.toLocaleString()}</strong> people
        </span>
      </div>

      {/* Vulnerability indicators */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="px-3 py-2 bg-orange-50 rounded-lg">
          <div className="text-lg font-bold text-orange-700">
            {demographics.dependency_ratio != null
              ? `${(demographics.dependency_ratio * 100).toFixed(0)}%`
              : "N/A"}
          </div>
          <div className="text-[10px] text-orange-500 uppercase">Dependency Ratio</div>
        </div>
        <div className="px-3 py-2 bg-purple-50 rounded-lg">
          <div className="text-lg font-bold text-purple-700">
            {demographics.zero_vehicle_hh_pct != null
              ? `${(demographics.zero_vehicle_hh_pct * 100).toFixed(0)}%`
              : "N/A"}
          </div>
          <div className="text-[10px] text-purple-500 uppercase">No Vehicle HH</div>
        </div>
      </div>

      {/* Poverty + Expenditure */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="px-3 py-2 bg-red-50 rounded-lg">
          <div className="text-lg font-bold text-red-700">
            {demographics.poverty_rate != null
              ? `${(demographics.poverty_rate * 100).toFixed(1)}%`
              : "N/A"}
          </div>
          <div className="text-[10px] text-red-500 uppercase">Poverty Rate</div>
        </div>
        <div className="px-3 py-2 bg-slate-50 rounded-lg">
          <div className="text-base font-bold text-slate-700">
            {formatIDR(demographics.avg_household_expenditure)}
          </div>
          <div className="text-[10px] text-slate-500 uppercase">Avg HH Spend/mo</div>
        </div>
      </div>

      <div className="mt-2 text-[10px] text-slate-300 uppercase tracking-wider">
        Source: BPS {demographics.kota_kab_name} (modeled)
      </div>
    </GlassPanel>
  );
}
