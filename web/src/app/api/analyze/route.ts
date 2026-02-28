import Anthropic from "@anthropic-ai/sdk";

interface AnalyzeRequest {
  h3_index: string;
  h3_resolution: number;
  lat: number;
  lng: number;
  composite_score: number;
  score_30min: number;
  score_60min: number;
  jakarta_avg_score: number;
  jakarta_median_score: number;
  percentile_rank: number;
  threshold: 30 | 60;
  poi_counts: Record<string, number>;
  demographics?: {
    population_density: number;
    total_population: number;
    age_distribution: Record<string, number>;
    dominant_age_group: string;
    kecamatan: string;
    sex_ratio: number;
  };
  transit_stops?: {
    transjakarta: number;
    krl: number;
    mrt: number;
    total: number;
  };
}

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
    ? `Area: ${demographics.kecamatan}, ${demographics.population_density.toLocaleString()} ppl/km², mostly ${demographics.dominant_age_group}.`
    : "";

  const transitText = transit_stops
    ? `Transit: ${transit_stops.transjakarta} TransJakarta, ${transit_stops.krl} KRL, ${transit_stops.mrt} MRT stops nearby.`
    : "No transit stops found nearby.";

  return `You are a Jakarta urban walkability analyst. Give a brief, actionable assessment.

Location: ${data.lat.toFixed(4)}, ${data.lng.toFixed(4)} | Score: ${data.composite_score}/100 (${data.percentile_rank}th percentile, city avg: ${data.jakarta_avg_score})
Reachable within ${threshold} min walk: ${reachable || "none"}
${missing ? `Not reachable: ${missing}` : "All categories accessible."}
${demoText}
${transitText}

Write 2 short paragraphs (max 150 words total):
1. How walkable is this location? What can/can't residents reach on foot or by transit within ${threshold} min? Be specific about which services are accessible and which gaps exist.
2. One concrete recommendation to improve access, considering Jakarta's transit (TransJakarta, KRL, MRT, angkot).

Be concise and direct. No headers or bullets. Flowing prose only.`;
}

export async function POST(request: Request) {
  const body: AnalyzeRequest = await request.json();

  if (!body.h3_index || body.composite_score == null) {
    return new Response("Missing required fields", { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response("ANTHROPIC_API_KEY not configured", { status: 500 });
  }

  const client = new Anthropic({ apiKey });
  const prompt = buildPrompt(body);

  const stream = await client.messages.stream({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 350,
    messages: [{ role: "user", content: prompt }],
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
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
