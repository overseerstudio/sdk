/** @format */

import fs from 'node:fs';

import type { PluginManifest } from '../types';

const VERSION_RE = /^\d+\.\d+\.\d+$/;
const ID_RE = /^@[a-z0-9-]+\/[a-z0-9-]+$/;

export function readManifest(manifestPath: string): PluginManifest {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`manifest.json not found at ${manifestPath}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch {
    throw new Error('manifest.json is not valid JSON');
  }
  return validateManifest(parsed);
}

export function validateManifest(data: unknown): PluginManifest {
  if (!data || typeof data !== 'object') {
    throw new Error('manifest.json must be a JSON object');
  }
  const m = data as Record<string, unknown>;

  if (typeof m.id !== 'string' || !ID_RE.test(m.id)) {
    throw new Error(
      `manifest.id must match "@scope/name" (lowercase, hyphens only), got: ${JSON.stringify(m.id)}`,
    );
  }
  if (typeof m.name !== 'string' || m.name.length === 0) {
    throw new Error('manifest.name is required');
  }
  if (typeof m.version !== 'string' || !VERSION_RE.test(m.version)) {
    throw new Error(`manifest.version must be semver x.y.z, got: ${JSON.stringify(m.version)}`);
  }

  return m as unknown as PluginManifest;
}
