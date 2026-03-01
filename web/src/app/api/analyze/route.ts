interface AnalyzeRequest {
  h3_index: string;
  h3_resolution: number;
  lat: number;
  lng: number;
  composite_score: number;
  score_30min: number;
  score_60min: number;
  jabodetabek_avg_score: number;
  jabodetabek_median_score: number;
  percentile_rank: number;
  threshold: 30 | 60;
  poi_counts: Record<string, number>;
  transit_need_score: number;
  transit_accessibility_score: number;
  equity_gap: number;
  quadrant: string;
  pop_total: number;
  pct_dependent: number;
  pct_zero_vehicle: number;
  avg_njop: number;
  dist_to_transit: number;
  local_poi_density: number;
  transit_shed_poi_count: number;
  demographics?: {
    population_density: number;
    total_population: number;
    age_distribution: Record<string, number>;
    dominant_age_group: string;
    kelurahan?: string;
    kecamatan: string;
    sex_ratio: number;
  };
  transit_stops?: {
    transjakarta: number;
    krl: number;
    mrt: number;
    lrt: number;
    total: number;
  };
}

const QUADRANT_DESC: Record<string, string> = {
  "transit-desert": "Transit Desert (high need, low access) — priority investment area",
  "transit-ideal": "Transit Ideal (high need, high access) — transit serves those who need it most",
  "over-served": "Over-Served (low need, high access) — resources could be redirected",
  "car-suburb": "Car Suburb (low need, low access) — car-dependent, monitor only",
};

function buildPrompt(data: AnalyzeRequest): string {
  const { poi_counts, threshold, demographics, transit_stops } = data;

  const reachable = Object.entries(poi_counts)
    .filter(([, count]) => count > 0)
    .map(([cat, count]) => `${cat}: ${count}`)
    .join(", ");

  const missing = Object.entries(poi_counts)
    .filter(([, count]) => count === 0)
    .map(([cat]) => cat)
    .join(", ");

  const demoText = demographics
    ? `Area: Kelurahan ${demographics.kelurahan || "Unknown"}, Kec. ${demographics.kecamatan}, ${demographics.population_density.toLocaleString()} ppl/km², mostly ${demographics.dominant_age_group}.`
    : "";

  const transitText = transit_stops
    ? `Transit: ${transit_stops.transjakarta} TransJakarta, ${transit_stops.krl} KRL, ${transit_stops.mrt} MRT, ${transit_stops.lrt} LRT stops nearby.`
    : "No transit stops found nearby.";

  const quadrantLabel = QUADRANT_DESC[data.quadrant] || data.quadrant;

  return `You are a Jabodetabek transit equity analyst. Give a brief, actionable assessment.

Location: ${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}
Equity Quadrant: ${quadrantLabel}
Transit Need Score: ${data.transit_need_score}/100 | Transit Accessibility Score: ${data.transit_accessibility_score}/100 | Equity Gap: ${data.equity_gap.toFixed(1)}
Population: ${data.pop_total} | ${data.pct_dependent.toFixed(0)}% dependent (children+elderly) | ${data.pct_zero_vehicle.toFixed(0)}% no vehicle
Distance to transit: ${data.dist_to_transit.toFixed(1)} km | POI density: ${data.local_poi_density} nearby
Reachable within ${threshold} min: ${reachable || "none"}
${missing ? `Not reachable: ${missing}` : "All categories accessible."}
${demoText}
${transitText}

Write 2 short paragraphs (max 150 words total):
1. Equity assessment: What does this quadrant classification mean for residents here? Who is affected and how?
2. One concrete policy recommendation considering Jabodetabek's transit (TransJakarta, KRL, MRT, LRT, angkot).

Be concise and direct. No headers or bullets. Flowing prose only.`;
}

export async function POST(request: Request) {
  const body: AnalyzeRequest = await request.json();

  if (!body.h3_index || body.composite_score == null) {
    return new Response("Missing required fields", { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response("OPENROUTER_API_KEY not configured", { status: 500 });
  }

  const prompt = buildPrompt(body);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://transit-access.vercel.app",
      "X-Title": "Transit Accessibility Index",
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    return new Response(`OpenRouter error: ${response.status} ${errText}`, {
      status: 502,
    });
  }

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            const payload = trimmed.slice(6);
            if (payload === "[DONE]") continue;

            try {
              const json = JSON.parse(payload);
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            } catch {
              // skip malformed JSON chunks
            }
          }
        }

        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "Transfer-Encoding": "chunked",
    },
  });
}
