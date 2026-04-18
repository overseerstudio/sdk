/** @format */

import fs from 'node:fs';
import path from 'node:path';

type ManifestLike = {
  extensions?: Array<{ $ref: string }>;
  presets?: Array<{ $ref: string }>;
  themes?: Array<{ src?: { $ref: string } }>;
  locales?: Array<{ src?: { $ref: string } }>;
};

export async function collectAssets(pluginDir: string, manifest: ManifestLike): Promise<string[]> {
  const assets = new Set<string>();

  function normalize(rel: string): string {
    return rel.replace(/\\/g, '/').replace(/^\.\//, '');
  }

  function add(relPath: string): void {
    const normalized = normalize(relPath);
    const fullPath = path.join(pluginDir, normalized);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing referenced file: ${normalized}`);
    }
    assets.add(normalized);
  }

  function resolveRef(containingFilePath: string, ref: string): string {
    const containingDir = path.dirname(containingFilePath);
    const absPath = path.resolve(containingDir, ref);
    return normalize(path.relative(pluginDir, absPath));
  }

  const pluginManifestPath = path.join(pluginDir, 'manifest.json');
  add('manifest.json');

  for (const ext of manifest.extensions ?? []) {
    const extManifestRel = resolveRef(pluginManifestPath, ext.$ref);
    add(extManifestRel);

    const extManifestPath = path.join(pluginDir, extManifestRel);
    const extJson = JSON.parse(fs.readFileSync(extManifestPath, 'utf-8')) as Record<
      string,
      unknown
    >;

    const icon = extJson.icon as { $ref?: string } | undefined;
    if (icon?.$ref) add(resolveRef(extManifestPath, icon.$ref));

    const source = extJson.source as { $ref?: string } | undefined;
    if (source?.$ref) {
      const sourceRel = resolveRef(extManifestPath, source.$ref);
      add(sourceRel);

      const sourceDir = path.dirname(path.join(pluginDir, sourceRel));
      if (fs.existsSync(sourceDir)) {
        for (const rel of walkDir(sourceDir)) {
          if (rel.endsWith('.map')) continue;
          const full = path.join(sourceDir, rel);
          add(normalize(path.relative(pluginDir, full)));
        }
      }
    }
  }

  for (const preset of manifest.presets ?? []) {
    const presetManifestRel = resolveRef(pluginManifestPath, preset.$ref);
    add(presetManifestRel);

    const presetManifestPath = path.join(pluginDir, presetManifestRel);
    const presetJson = JSON.parse(fs.readFileSync(presetManifestPath, 'utf-8')) as Record<
      string,
      unknown
    >;

    const presetAssets = presetJson.assets as Array<{ $ref?: string }> | undefined;
    for (const a of presetAssets ?? []) {
      if (a?.$ref) add(resolveRef(presetManifestPath, a.$ref));
    }

    const state = presetJson.state as
      | {
          screens?: Array<{ backgroundPath?: { $ref?: string } }>;
          tiles?: Array<{ config?: Record<string, unknown> }>;
        }
      | undefined;

    for (const screen of state?.screens ?? []) {
      if (screen?.backgroundPath?.$ref) {
        add(resolveRef(presetManifestPath, screen.backgroundPath.$ref));
      }
    }
    for (const tile of state?.tiles ?? []) {
      for (const value of Object.values(tile?.config ?? {})) {
        if (value && typeof value === 'object' && '$ref' in value) {
          const ref = (value as { $ref?: unknown }).$ref;
          if (typeof ref === 'string') {
            add(resolveRef(presetManifestPath, ref));
          }
        }
      }
    }
  }

  for (const entry of [...(manifest.themes ?? []), ...(manifest.locales ?? [])]) {
    if (entry?.src?.$ref) {
      add(resolveRef(pluginManifestPath, entry.src.$ref));
    }
  }

  return Array.from(assets).sort();
}

function walkDir(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      for (const inner of walkDir(full)) {
        files.push(path.join(entry.name, inner));
      }
    } else {
      files.push(entry.name);
    }
  }
  return files.map(f => f.replace(/\\/g, '/'));
}
