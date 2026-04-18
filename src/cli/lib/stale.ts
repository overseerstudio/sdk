/** @format */

import fs from 'node:fs';

export function isStale(outputPath: string, sourcePaths: string[]): boolean {
  if (!fs.existsSync(outputPath)) return true;
  const outputMtime = fs.statSync(outputPath).mtimeMs;
  for (const src of sourcePaths) {
    if (!fs.existsSync(src)) continue;
    if (fs.statSync(src).mtimeMs > outputMtime) return true;
  }
  return false;
}
