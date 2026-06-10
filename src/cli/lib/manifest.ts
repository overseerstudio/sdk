/** @format */

import fs from 'node:fs';
import path from 'node:path';

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

export type ResolvedManifestRefs = {
  description: string | undefined;
  changelog: string | undefined;
};

/**
 * Resolve `$ref` fields that point at markdown files (`description`, `changelog`)
 * to their file contents, relative to `pluginDir`. Throws if a referenced file
 * is missing so publishing fails fast before any network call.
 */
export function resolveManifestRefs(
  manifest: PluginManifest,
  pluginDir: string,
): ResolvedManifestRefs {
  const read = (ref: string, field: string): string => {
    const filePath = path.resolve(pluginDir, ref);
    if (!fs.existsSync(filePath)) {
      throw new Error(`manifest.${field} references a missing file: ${ref}`);
    }
    return fs.readFileSync(filePath, 'utf-8').trim();
  };

  const description =
    typeof manifest.description === 'object' && manifest.description?.$ref
      ? read(manifest.description.$ref, 'description')
      : manifest.description;

  const changelog = manifest.changelog?.$ref
    ? read(manifest.changelog.$ref, 'changelog')
    : undefined;

  return { description, changelog };
}
