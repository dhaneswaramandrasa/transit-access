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
  poi_counts: {
    hospital: number;
    clinic: number;
    market: number;
    supermarket: number;
    school: number;
    park: number;
  };
}

function buildPrompt(data: AnalyzeRequest): string {
  const { poi_counts, threshold } = data;

  return `You are an urban transit analyst specialising in Jakarta, Indonesia. Analyse the transit accessibility of this H3 hexagon.

DATA:
- H3 index: ${data.h3_index} (resolution ${data.h3_resolution})
- Composite score: ${data.composite_score}/100
- Score at ${threshold} min threshold: ${data[`score_${threshold}min` as keyof AnalyzeRequest]}/100
- Jakarta average score: ${data.jakarta_avg_score}
- Jakarta median score: ${data.jakarta_median_score}
- Percentile rank: ${data.percentile_rank}th (higher = better access)

POIs reachable within ${threshold} minutes by public transit + walking:
- Hospitals: ${poi_counts.hospital}
- Clinics: ${poi_counts.clinic}
- Traditional markets: ${poi_counts.market}
- Supermarkets: ${poi_counts.supermarket}
- Schools: ${poi_counts.school}
- Parks: ${poi_counts.park}

Write exactly 3 short paragraphs:

1. POI ACCESS SUMMARY: What essential services are reachable from this hex, and what's notably missing or scarce? Reference specific counts.

2. JAKARTA COMPARISON: How does this hex compare to the city average and median? What percentile is it in? What kind of neighbourhood might this represent (central business district, established residential, urban kampung, peripheral area)?

3. PLANNING RECOMMENDATIONS: Give 2–3 concrete, actionable suggestions grounded in Jakarta's actual transit context (TransJakarta BRT, KRL Commuterline, MRT, angkot). Consider what realistic interventions would most improve access for residents of this hex.

Keep the tone analytical but accessible. Do not use headers or bullet points — write in flowing prose. Stay under 200 words total.`;
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
    model: "claude-sonnet-4-6-20250514",
    max_tokens: 450,
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
