/** @format */

import fs from 'node:fs';
import path from 'node:path';

import type { PluginManifest } from '../types';

const DOCS = 'https://overseer.studio/docs/developers';
export const SCHEMAS = 'https://overseer.studio/schemas';

export type FileEntry = { path: string; content: string | Buffer };
export type ManifestPatch = Partial<PluginManifest>;
export type ScaffoldResult = { files: FileEntry[]; patch: ManifestPatch };

export type ExtensionConfig = {
  slug: string;
  label: string;
  description: string;
  category: string;
};
export type PresetConfig = {
  slug: string;
  label: string;
  description: string;
  category?: string;
};
export type ThemeConfig = { slug: string; label: string };
export type LocaleConfig = { langCode: string; languageName: string };
export type DatasetConfig = {
  slug: string;
  label: string;
  description: string;
  type: 'static' | 'dynamic';
};

/** Serialize to pretty JSON with a trailing newline, matching the existing CLI. */
function json(value: unknown): string {
  return JSON.stringify(value, null, 2) + '\n';
}

/** Drop keys whose value is an empty string, so optional fields are omitted. */
function compact<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== '' && v !== undefined),
  ) as T;
}

// ---------------------------------------------------------------------------
// Extension (vanilla TS + Vite, self-contained package)
// ---------------------------------------------------------------------------

export function scaffoldExtension(
  pluginId: string,
  author: string,
  sdkVersion: string,
  iconData: Buffer,
  ext: ExtensionConfig,
): ScaffoldResult {
  const dir = `extensions/${ext.slug}`;
  const id = `${pluginId}-${ext.slug}`;

  const manifest = compact({
    $schema: `${SCHEMAS}/extension/manifest.json`,
    id,
    label: ext.label,
    description: ext.description,
    category: ext.category,
    version: '0.1.0',
    author,
    icon: { $ref: 'assets/icon.png' },
    source: { $ref: 'dist/index.html' },
  });

  const packageJson = {
    name: id,
    private: true,
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
    },
    dependencies: {
      '@overseer-studio/sdk': `^${sdkVersion}`,
    },
    devDependencies: {
      typescript: '^5.9.3',
      vite: '^8.0.3',
    },
  };

  const viteConfig = `import { defineConfig } from 'vite';

// 'base' is relative so the built bundle loads from the file:// tile sandbox.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
`;

  const tsconfig = {
    compilerOptions: {
      target: 'ES2020',
      module: 'ESNext',
      moduleResolution: 'bundler',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
    },
    include: ['src'],
  };

  const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${ext.label}</title>
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`;

  const mainTs = `import { onReady } from '@overseer-studio/sdk';

import './style.css';

const app = document.querySelector<HTMLDivElement>('#app');

// onReady fires once Overseer has handed the tile its config, id, and language.
onReady(({ detail }) => {
  if (!app) return;
  app.textContent = \`\${detail.extensionId} is ready.\`;
});
`;

  const styleCss = `:root {
  color-scheme: dark;
}

body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: transparent;
  color: #e5e5e5;
}

#app {
  padding: 16px;
}
`;

  const readme = `# ${ext.label}

A bundled Overseer extension built with Vite and TypeScript.

## Develop

\`\`\`shell
npm install
npm run build   # emits dist/index.html, which the manifest references
\`\`\`

Restart Overseer after building — plugins load at startup.

See ${DOCS}/extensions/building/ for the full guide.
`;

  return {
    files: [
      { path: `${dir}/manifest.json`, content: json(manifest) },
      { path: `${dir}/package.json`, content: json(packageJson) },
      { path: `${dir}/vite.config.ts`, content: viteConfig },
      { path: `${dir}/tsconfig.json`, content: json(tsconfig) },
      { path: `${dir}/index.html`, content: indexHtml },
      { path: `${dir}/src/main.ts`, content: mainTs },
      { path: `${dir}/src/style.css`, content: styleCss },
      { path: `${dir}/assets/icon.png`, content: iconData },
      { path: `${dir}/README.md`, content: readme },
    ],
    patch: { extensions: [{ $ref: `./${dir}/manifest.json` }] },
  };
}

// ---------------------------------------------------------------------------
// Preset (one blank canvas screen, zero tiles)
// ---------------------------------------------------------------------------

export function scaffoldPreset(
  pluginId: string,
  author: string,
  iconData: Buffer,
  preset: PresetConfig,
): ScaffoldResult {
  const dir = `presets/${preset.slug}`;
  const id = `${pluginId}-${preset.slug}`;

  // Mirrors app/src/modules/screen/utils/createScreen defaults; gridColor is the
  // decimal form of 0x717171 since JSON has no hex literals.
  const screen = {
    id: 'screen-1',
    name: 'Screen 1',
    type: 'canvas',
    backgroundPath: null,
    camera: null,
    clamp: null,
    enableCollision: false,
    gridAlpha: 30,
    gridColor: 7434609,
    gridGap: 0,
    gridSize: 30,
    gridStyle: 'dots',
    lockGrid: false,
    lockPan: false,
    lockZoom: false,
    shortcut: null,
  };

  const manifest = compact({
    $schema: `${SCHEMAS}/preset/manifest.json`,
    id,
    label: preset.label,
    description: preset.description,
    category: preset.category ?? 'Other',
    version: '0.1.0',
    author,
    icon: { $ref: 'assets/icon.png' },
    state: {
      currentScreen: screen.id,
      screens: [screen],
      tiles: [],
    },
  });

  const readme = `# ${preset.label}

An Overseer preset — a ready-made session layout users can drop in.

Edit \`manifest.json\` to add screens and tiles. The starter ships one empty
canvas screen.

See ${DOCS}/plugins/presets/ for the full guide.
`;

  return {
    files: [
      { path: `${dir}/manifest.json`, content: json(manifest) },
      { path: `${dir}/assets/icon.png`, content: iconData },
      { path: `${dir}/README.md`, content: readme },
    ],
    patch: { presets: [{ $ref: `./${dir}/manifest.json` }] },
  };
}

// ---------------------------------------------------------------------------
// Theme (inline manifest entry + CSS custom properties)
// ---------------------------------------------------------------------------

export function scaffoldTheme(pluginId: string, theme: ThemeConfig): ScaffoldResult {
  const dir = `themes/${theme.slug}`;
  const id = `${pluginId}-${theme.slug}-theme`;

  const css = `/*
 * ${theme.label} theme for Overseer.
 * Override any of the --color-* custom properties below.
 * Reference: ${DOCS}/plugins/themes/
 */

:root {
  /* Base surfaces */
  --color-base-accent: #d4d4d8;
  --color-base: #e4e4e7;
  --color-base-highlight: #fafafa;
  --color-base-content: #09090b;

  /* Primary accent */
  --color-primary-accent: #5b21b6;
  --color-primary: #7c3aed;
  --color-primary-highlight: #a78bfa;
  --color-primary-content: #ffffff;

  /* Secondary accent */
  --color-secondary-accent: #a21caf;
  --color-secondary: #c026d3;
  --color-secondary-highlight: #f0abfc;
  --color-secondary-content: #ffffff;

  /* Status */
  --color-error: #dc2626;
  --color-danger: #dc2626;
  --color-danger-content: #ffffff;
  --color-warning: #fef08a;
  --color-warning-content: #713f12;
  --color-success: #bbf7d0;
  --color-success-content: #14532d;

  /* Layout */
  --color-background: #f4f4f5;
  --color-content: #09090b;
  --color-foreground: #fafafa;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-base-accent: #52525b;
    --color-base: #3f3f46;
    --color-base-highlight: #27272a;
    --color-base-content: #fafafa;

    --color-error: #ef4444;

    --color-background: #09090b;
    --color-foreground: #27272a;
    --color-content: #ffffff;
  }
}
`;

  const readme = `# ${theme.label}

An Overseer theme. Edit \`theme.css\` to restyle the app's --color-* tokens.

See ${DOCS}/plugins/themes/ for the full list of properties.
`;

  return {
    files: [
      { path: `${dir}/theme.css`, content: css },
      { path: `${dir}/README.md`, content: readme },
    ],
    patch: { themes: [{ id, label: theme.label, src: { $ref: `./${dir}/theme.css` } }] },
  };
}

// ---------------------------------------------------------------------------
// Locale (inline manifest entry + Fluent .ftl)
// ---------------------------------------------------------------------------

export function scaffoldLocale(pluginId: string, locale: LocaleConfig): ScaffoldResult {
  const dir = `locales/${locale.langCode}`;
  const id = `${pluginId}-${locale.langCode}`;

  const ftl = `# ${locale.languageName} translations for Overseer.
# This file uses Fluent (.ftl). Uncomment and translate the entries you need.
# Fluent syntax guide: https://projectfluent.org/fluent/guide/
#
# Plain message:
# app-name = Overseer
#
# Message with a variable:
# welcome-user = Welcome, { $name }!
#
# Message with an attribute:
# login-button =
#     .label = Log in
#     .title = Click to log in
`;

  const readme = `# ${locale.languageName} locale

Overseer translations in Fluent (.ftl) format.

See ${DOCS}/plugins/locales/ for the full guide.
`;

  return {
    files: [
      { path: `${dir}/locale.ftl`, content: ftl },
      { path: `${dir}/README.md`, content: readme },
    ],
    patch: { locales: [{ id, label: locale.languageName, src: { $ref: `./${dir}/locale.ftl` } }] },
  };
}

// ---------------------------------------------------------------------------
// Dataset (static local JSON or dynamic remote endpoints)
// ---------------------------------------------------------------------------

export function scaffoldDataset(dataset: DatasetConfig): ScaffoldResult {
  const files: FileEntry[] = [];

  const base = {
    $schema: `${SCHEMAS}/dataset/manifest.json`,
    id: dataset.slug,
    label: dataset.label,
    ...(dataset.description ? { description: dataset.description } : {}),
    version: '0.1.0',
  };

  if (dataset.type === 'static') {
    const manifest = {
      ...base,
      idField: 'id',
      source: { local: { $ref: `./${dataset.slug}/records.json` } },
    };
    files.push({
      path: `datasets/${dataset.slug}.json`,
      content: json(manifest),
    });
    files.push({
      path: `datasets/${dataset.slug}/records.json`,
      content: json([{ id: '1', name: 'Example' }]),
    });
  } else {
    const manifest = {
      ...base,
      source: {
        remote: {
          list: 'https://example.com/api/items',
          get: 'https://example.com/api/items/{id}',
        },
      },
    };
    files.push({
      path: `datasets/${dataset.slug}.json`,
      content: json(manifest),
    });
  }

  files.push({
    path: `datasets/${dataset.slug}/README.md`,
    content: `# ${dataset.label}

An Overseer ${dataset.type} dataset.

See ${DOCS}/plugins/datasets/ for the full guide.
`,
  });

  return {
    files,
    patch: { datasets: [{ $ref: `./datasets/${dataset.slug}.json` }] },
  };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Write every entry to disk, creating parent directories as needed. */
export function writeFiles(cwd: string, entries: FileEntry[]): void {
  for (const entry of entries) {
    const fullPath = path.join(cwd, entry.path);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, entry.content);
  }
}

/** Merge content patches into the base manifest, concatenating array fields. */
export function mergeManifest(base: PluginManifest, patches: ManifestPatch[]): PluginManifest {
  const result: Record<string, unknown> = { ...base };
  for (const patch of patches) {
    for (const [key, value] of Object.entries(patch)) {
      const existing = result[key];
      if (Array.isArray(value) && Array.isArray(existing)) {
        result[key] = [...existing, ...value];
      } else {
        result[key] = value;
      }
    }
  }
  return result as PluginManifest;
}
