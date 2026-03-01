"use client";

import Link from "next/link";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-bold text-slate-800 mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Variable({
  name,
  description,
  weight,
  color,
}: {
  name: string;
  description: string;
  weight: string;
  color: string;
}) {
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg ${color}`}>
      <div className="flex-1">
        <div className="text-sm font-semibold text-slate-800">{name}</div>
        <div className="text-xs text-slate-500 mt-0.5">{description}</div>
      </div>
      <span className="text-xs font-mono text-slate-500 bg-white/60 px-2 py-0.5 rounded shrink-0">
        {weight}
      </span>
    </div>
  );
}

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-2"
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Map
          </Link>
          <h1 className="text-lg font-semibold text-slate-800">Methodology</h1>
          <div className="w-24" />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-12">
        {/* Intro */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">
            How We Score Transit Equity
          </h1>
          <p className="text-slate-600 leading-relaxed">
            Each H3 hexagon (resolution 8, ~0.74 km&sup2;) in Jabodetabek is scored
            on two dimensions: how much the population <strong>needs</strong>{" "}
            transit, and how much transit <strong>access</strong> is available.
            The gap between these two scores reveals where transit investment is
            most needed.
          </p>
        </div>

        {/* Transit Need Score */}
        <Section title="1. Transit Need Score">
          <p className="text-sm text-slate-600 mb-4 leading-relaxed">
            Measures demand-side pressure and vulnerability. Higher score means
            the population has greater need for public transit. All variables are
            min-max normalized (0-100) before weighting.
          </p>
          <div className="space-y-2">
            <Variable
              name="Population Total"
              description="Total population in the hex. Denser areas generate more transit demand."
              weight="0.25"
              color="bg-orange-50"
            />
            <Variable
              name="% Dependent Population"
              description="Share of population under 15 and over 65 who cannot drive."
              weight="0.25"
              color="bg-orange-50"
            />
            <Variable
              name="% Zero-Vehicle Households"
              description="Households without a car or motorcycle, fully transit-dependent."
              weight="0.25"
              color="bg-orange-50"
            />
            <Variable
              name="Inverse Land Value (NJOP)"
              description="Lower land value = higher equity priority. Inverted so poorer areas score higher."
              weight="0.25"
              color="bg-orange-50"
            />
          </div>
          <div className="mt-4 px-4 py-3 bg-slate-100 rounded-lg font-mono text-xs text-slate-700">
            Need = 0.25 &times; normPop + 0.25 &times; normDependent + 0.25 &times;
            normZeroVeh + 0.25 &times; normInverseNJOP
          </div>
        </Section>

        {/* Transit Accessibility Score */}
        <Section title="2. Transit Accessibility Score">
          <p className="text-sm text-slate-600 mb-4 leading-relaxed">
            Measures supply-side transit availability. Higher score means better
            access to transit services and destinations.
          </p>
          <div className="space-y-2">
            <Variable
              name="Walkable Transit"
              description="Binary bonus: 1 if nearest transit stop is within 800m (~15 min walk), else 0."
              weight="0.15"
              color="bg-emerald-50"
            />
            <Variable
              name="Distance to Transit (inverse)"
              description="Walking distance to nearest KRL, MRT, LRT, TransJakarta, or Microtrans stop. Inverted: closer = higher score."
              weight="0.25"
              color="bg-emerald-50"
            />
            <Variable
              name="Transit Capacity Weight"
              description="Quality of available transit. MRT/LRT weight higher than BRT, which weights higher than Microtrans."
              weight="0.25"
              color="bg-emerald-50"
            />
            <Variable
              name="Local POI Density"
              description="Essential services (healthcare, education, food) reachable within a 15-minute walk."
              weight="0.20"
              color="bg-emerald-50"
            />
            <Variable
              name="Transit Shed POI Count"
              description="Essential services reachable within a 45-minute total transit journey (walk + wait + ride + walk)."
              weight="0.15"
              color="bg-emerald-50"
            />
          </div>
          <div className="mt-4 px-4 py-3 bg-slate-100 rounded-lg font-mono text-xs text-slate-700">
            Access = 0.15 &times; walkBonus + 0.25 &times; normDistInv + 0.25 &times;
            normCapacity + 0.20 &times; normPOIDensity + 0.15 &times; normShedPOI
          </div>
        </Section>

        {/* Equity Gap */}
        <Section title="3. Equity Gap">
          <p className="text-sm text-slate-600 mb-4 leading-relaxed">
            The difference between need and access. A <strong>positive</strong>{" "}
            gap means the area needs more transit than it currently has
            (underserved). A <strong>negative</strong> gap means transit supply
            exceeds local demand.
          </p>
          <div className="px-4 py-3 bg-slate-100 rounded-lg font-mono text-xs text-slate-700">
            Equity Gap = Transit Need Score &minus; Transit Accessibility Score
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="px-4 py-3 bg-red-50 rounded-lg text-center">
              <div className="text-lg font-bold text-red-700">+30</div>
              <div className="text-xs text-red-500">
                High inequity &mdash; urgent need
              </div>
            </div>
            <div className="px-4 py-3 bg-green-50 rounded-lg text-center">
              <div className="text-lg font-bold text-green-700">-10</div>
              <div className="text-xs text-green-500">
                Well served &mdash; access meets need
              </div>
            </div>
          </div>
        </Section>

        {/* Quadrant Classification */}
        <Section title="4. Policymaker Action Matrix">
          <p className="text-sm text-slate-600 mb-4 leading-relaxed">
            Each hex is classified into one of four quadrants based on whether
            its Need and Accessibility scores are above or below the dataset
            median. This creates an actionable framework for transit planning.
          </p>

          {/* 2x2 Matrix */}
          <div className="relative max-w-md mx-auto">
            {/* Y-axis label */}
            <div className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-semibold text-slate-400 whitespace-nowrap">
              Transit Need &rarr;
            </div>

            <div className="grid grid-cols-2 gap-1.5 ml-2">
              {/* High Need, Low Access */}
              <div className="bg-red-100 p-5 rounded-tl-xl text-center">
                <div className="text-2xl mb-1">&#x1F6A8;</div>
                <div className="text-sm font-bold text-red-700">
                  Transit Desert
                </div>
                <div className="text-[10px] text-red-500 mt-1">
                  High Need, Low Access
                </div>
                <div className="text-[10px] text-red-400 mt-2 italic">
                  Expand routes, improve pedestrian access
                </div>
              </div>

              {/* High Need, High Access */}
              <div className="bg-green-100 p-5 rounded-tr-xl text-center">
                <div className="text-2xl mb-1">&#x2705;</div>
                <div className="text-sm font-bold text-green-700">
                  Transit Ideal
                </div>
                <div className="text-[10px] text-green-500 mt-1">
                  High Need, High Access
                </div>
                <div className="text-[10px] text-green-400 mt-2 italic">
                  Maintain subsidies &amp; service frequency
                </div>
              </div>

              {/* Low Need, Low Access */}
              <div className="bg-amber-100 p-5 rounded-bl-xl text-center">
                <div className="text-2xl mb-1">&#x1F4C9;</div>
                <div className="text-sm font-bold text-amber-700">
                  Car Suburb
                </div>
                <div className="text-[10px] text-amber-500 mt-1">
                  Low Need, Low Access
                </div>
                <div className="text-[10px] text-amber-400 mt-2 italic">
                  Low priority; rely on private transport
                </div>
              </div>

              {/* Low Need, High Access */}
              <div className="bg-blue-100 p-5 rounded-br-xl text-center">
                <div className="text-2xl mb-1">&#x1F4B0;</div>
                <div className="text-sm font-bold text-blue-700">
                  Over-Served
                </div>
                <div className="text-[10px] text-blue-500 mt-1">
                  Low Need, High Access
                </div>
                <div className="text-[10px] text-blue-400 mt-2 italic">
                  Push TOD, parking fees, land value capture
                </div>
              </div>
            </div>

            {/* X-axis label */}
            <div className="text-center mt-3 text-xs font-semibold text-slate-400">
              Transit Accessibility &rarr;
            </div>
          </div>
        </Section>

        {/* Data Sources */}
        <Section title="5. Data Sources &amp; Limitations">
          <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
            <div className="flex gap-3">
              <span className="text-slate-400 shrink-0">GTFS</span>
              <span>
                TransJakarta, KRL Commuterline, MRT Jakarta, LRT Jabodebek
                schedules and stop locations.
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-slate-400 shrink-0">OSM</span>
              <span>
                OpenStreetMap pedestrian network and POI locations (hospitals,
                schools, markets, etc.)
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-slate-400 shrink-0">BPS</span>
              <span>
                Badan Pusat Statistik census data &mdash; population,
                demographics, vehicle ownership (modeled estimates).
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-slate-400 shrink-0">NJOP</span>
              <span>
                Land value assessments (Nilai Jual Objek Pajak) as
                socioeconomic proxy.
              </span>
            </div>
          </div>

          <div className="mt-6 px-4 py-3 bg-amber-50 rounded-lg">
            <div className="text-xs font-semibold text-amber-700 mb-2">
              Known Limitations
            </div>
            <ul className="text-xs text-amber-600 space-y-1.5">
              <li>
                &bull; Angkot (informal transit) is not included in GTFS data,
                underestimating access in kampung areas.
              </li>
              <li>
                &bull; GTFS schedules may not reflect actual peak-hour headways
                or delays.
              </li>
              <li>
                &bull; Pedestrian network coverage in OSM is incomplete in some
                suburban areas.
              </li>
              <li>
                &bull; AI-generated analysis is for insight purposes, not
                authoritative urban planning data.
              </li>
              <li>
                &bull; H3 resolution 8 hexes may straddle physical barriers
                (rivers, toll roads).
              </li>
            </ul>
          </div>
        </Section>

        {/* Research context */}
        <div className="text-center text-xs text-slate-400 pt-6 border-t border-slate-200">
          <p>
            Transit Accessibility Index &mdash; Smart Society Program, Hiroshima
            University
          </p>
          <p className="mt-1">
            Phase 1: Jakarta &amp; Jabodetabek | Phase 2: Hiroshima, Japan
          </p>
        </div>
      </main>
    </div>
  );
}
