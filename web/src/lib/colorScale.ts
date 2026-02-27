import { scaleSequential } from "d3-scale";
import { interpolateRdYlGn } from "d3-scale-chromatic";

const scale = scaleSequential(interpolateRdYlGn).domain([0, 100]);

/**
 * Convert a 0–100 accessibility score to an [R, G, B, A] color array.
 * Uses d3's RdYlGn (Red → Yellow → Green) diverging colormap.
 */
export function scoreToColor(
  score: number,
  alpha: number = 170
): [number, number, number, number] {
  const clamped = Math.max(0, Math.min(100, score));
  const rgb = scale(clamped);

  if (!rgb) return [128, 128, 128, alpha];

  // Parse "rgb(r, g, b)" string from d3
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return [128, 128, 128, alpha];

  return [
    parseInt(match[1], 10),
    parseInt(match[2], 10),
    parseInt(match[3], 10),
    alpha,
  ];
}
