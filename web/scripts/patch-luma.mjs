/**
 * Patches @luma.gl/core canvas-context.js to add a null-check
 * for device.limits before accessing maxTextureDimension2D.
 *
 * This fixes the "Cannot read properties of undefined (reading 'maxTextureDimension2D')"
 * error that occurs when ResizeObserver fires before the WebGL device is initialized.
 *
 * Usage: node scripts/patch-luma.mjs (runs automatically via postinstall)
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(
  __dirname,
  "..",
  "node_modules",
  "@luma.gl",
  "core",
  "dist",
  "adapter",
  "canvas-context.js"
);

if (!existsSync(filePath)) {
  console.log("luma.gl canvas-context.js not found, skipping patch.");
  process.exit(0);
}

let content = readFileSync(filePath, "utf-8");

const buggyCode =
  "const maxTextureDimension = this.device.limits.maxTextureDimension2D;";
const fixedCode =
  "const maxTextureDimension = this.device?.limits?.maxTextureDimension2D || 8192;";

if (content.includes(fixedCode)) {
  console.log("luma.gl canvas-context.js already patched.");
  process.exit(0);
}

if (!content.includes(buggyCode)) {
  console.log("luma.gl canvas-context.js: target code not found, skipping.");
  process.exit(0);
}

content = content.replace(buggyCode, fixedCode);
writeFileSync(filePath, content);
console.log("Patched luma.gl canvas-context.js (maxTextureDimension2D null check).");
