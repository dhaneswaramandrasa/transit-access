import { scaleSequential } from "d3-scale";
import { interpolateRdYlGn } from "d3-scale-chromatic";
import type { EquityQuadrant } from "./store";
import { QUADRANT_COLORS } from "./store";

const scale = scaleSequential(interpolateRdYlGn).domain([0, 100]);

/**
 * Convert a 0–100 accessibility score to an [R, G, B, A] color array.
 */
export function scoreToColor(
  score: number,
  alpha: number = 170
): [number, number, number, number] {
  const clamped = Math.max(0, Math.min(100, score));
  const rgb = scale(clamped);

  if (!rgb) return [128, 128, 128, alpha];

  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return [128, 128, 128, alpha];

  return [
    parseInt(match[1], 10),
    parseInt(match[2], 10),
    parseInt(match[3], 10),
    alpha,
  ];
}

/**
 * Convert an equity quadrant to an [R, G, B, A] color array.
 */
export function quadrantToColor(
  quadrant: EquityQuadrant,
  alpha: number = 170
): [number, number, number, number] {
  const rgb = QUADRANT_COLORS[quadrant] || [128, 128, 128];
  return [rgb[0], rgb[1], rgb[2], alpha];
}
