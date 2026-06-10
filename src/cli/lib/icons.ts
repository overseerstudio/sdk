/** @format */

import fs from 'node:fs';
import path from 'node:path';

import { imageSize } from 'image-size';

import type { PluginManifest } from '../types';

const MAX_BYTES = 2 * 1024 * 1024;
const REQUIRED_SIZE = 256;
const ACCEPTED_TYPES = new Set(['png', 'jpg', 'webp']);

/**
 * Validate every icon referenced by the plugin — the plugin-level icon and each
 * extension's icon — against the marketplace constraints: PNG/JPEG/WebP only
 * (no SVG), square, exactly 256×256, and 2 MB or smaller. Throws on the first
 * violation; the build command's catch block reports it and exits.
 */
export function validateIcons(pluginDir: string, manifest: PluginManifest): void {
  if (manifest.icon?.$ref) {
    checkIcon(path.resolve(pluginDir, manifest.icon.$ref), manifest.icon.$ref);
  }

  for (const ext of manifest.extensions ?? []) {
    const extManifestPath = path.resolve(pluginDir, ext.$ref);
    const extJson = JSON.parse(fs.readFileSync(extManifestPath, 'utf-8')) as {
      icon?: { $ref?: string };
    };

    const ref = extJson.icon?.$ref;
    if (ref) {
      const absPath = path.resolve(path.dirname(extManifestPath), ref);
      checkIcon(absPath, ref);
    }
  }
}

function checkIcon(absPath: string, label: string): void {
  if (fs.statSync(absPath).size > MAX_BYTES) {
    throw new Error(`Icon "${label}" must be 2 MB or smaller`);
  }

  const { width, height, type } = imageSize(fs.readFileSync(absPath));

  if (type === 'svg') {
    throw new Error(`Icon "${label}" must be PNG, JPEG, or WebP — SVG is not accepted`);
  }

  if (!type || !ACCEPTED_TYPES.has(type)) {
    throw new Error(`Icon "${label}" must be PNG, JPEG, or WebP`);
  }

  if (width !== REQUIRED_SIZE || height !== REQUIRED_SIZE) {
    throw new Error(`Icon "${label}" must be exactly 256×256 (got ${width}×${height})`);
  }
}
