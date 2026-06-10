/** @format */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  mergeManifest,
  scaffoldDataset,
  scaffoldExtension,
  scaffoldLocale,
  scaffoldPreset,
  scaffoldTheme,
  writeFiles,
  type FileEntry,
} from './scaffold';

import type { PluginManifest } from '../types';

const PLUGIN_ID = '@acme/tools';
const ICON = Buffer.from('fake-png-bytes');

function find(files: FileEntry[], suffix: string): FileEntry {
  const entry = files.find(f => f.path.endsWith(suffix));
  if (!entry) throw new Error(`No scaffolded file ending in ${suffix}`);
  return entry;
}

function parse(entry: FileEntry): Record<string, unknown> {
  return JSON.parse(entry.content as string) as Record<string, unknown>;
}

describe('scaffoldExtension', () => {
  const result = scaffoldExtension(PLUGIN_ID, 'Ada', '0.6.0', ICON, {
    slug: 'timer',
    label: 'Session Timer',
    description: 'Tracks time.',
    category: 'Organization',
  });

  it('emits the expected file set', () => {
    const paths = result.files.map(f => f.path).sort();
    expect(paths).toEqual(
      [
        'extensions/timer/README.md',
        'extensions/timer/assets/icon.png',
        'extensions/timer/index.html',
        'extensions/timer/manifest.json',
        'extensions/timer/package.json',
        'extensions/timer/src/main.ts',
        'extensions/timer/src/style.css',
        'extensions/timer/tsconfig.json',
        'extensions/timer/vite.config.ts',
      ].sort(),
    );
  });

  it('writes a valid extension manifest with $ref icon and source', () => {
    const manifest = parse(find(result.files, 'manifest.json'));
    expect(manifest.id).toBe('@acme/tools-timer');
    expect(manifest.category).toBe('Organization');
    expect(manifest.author).toBe('Ada');
    expect(manifest.icon).toEqual({ $ref: 'assets/icon.png' });
    expect(manifest.source).toEqual({ $ref: 'dist/index.html' });
  });

  it('injects the SDK version into package.json', () => {
    const pkg = parse(find(result.files, 'package.json'));
    const deps = pkg.dependencies as Record<string, string>;
    expect(deps['@overseer-studio/sdk']).toBe('^0.6.0');
  });

  it('ships the icon as raw bytes', () => {
    expect(find(result.files, 'assets/icon.png').content).toBe(ICON);
  });

  it('patches the plugin manifest with a $ref', () => {
    expect(result.patch).toEqual({
      extensions: [{ $ref: './extensions/timer/manifest.json' }],
    });
  });

  it('omits author when blank', () => {
    const res = scaffoldExtension(PLUGIN_ID, '', '0.6.0', ICON, {
      slug: 'a',
      label: 'A',
      description: 'd',
      category: 'Other',
    });
    expect(parse(find(res.files, 'manifest.json')).author).toBeUndefined();
  });
});

describe('scaffoldPreset', () => {
  const result = scaffoldPreset(PLUGIN_ID, 'Ada', ICON, {
    slug: 'starter',
    label: 'Starter',
    description: 'A start.',
    category: 'maps',
  });

  it('builds one blank canvas screen and zero tiles', () => {
    const manifest = parse(find(result.files, 'manifest.json'));
    expect(manifest.id).toBe('@acme/tools-starter');
    expect(manifest.icon).toEqual({ $ref: 'assets/icon.png' });
    const state = manifest.state as { currentScreen: string; screens: unknown[]; tiles: unknown[] };
    expect(state.tiles).toEqual([]);
    expect(state.screens).toHaveLength(1);
    expect(state.currentScreen).toBe('screen-1');
  });

  it('defaults category to Other when none is given', () => {
    const res = scaffoldPreset(PLUGIN_ID, '', ICON, { slug: 's', label: 'S', description: '' });
    expect(parse(find(res.files, 'manifest.json')).category).toBe('Other');
  });

  it('patches the plugin manifest with a $ref', () => {
    expect(result.patch).toEqual({ presets: [{ $ref: './presets/starter/manifest.json' }] });
  });
});

describe('scaffoldTheme', () => {
  const result = scaffoldTheme(PLUGIN_ID, { slug: 'midnight', label: 'Midnight' });

  it('emits a theme.css with color custom properties', () => {
    const css = find(result.files, 'theme.css').content as string;
    expect(css).toContain('--color-primary');
    expect(css).toContain('prefers-color-scheme: dark');
  });

  it('patches the plugin manifest inline with a src $ref', () => {
    expect(result.patch).toEqual({
      themes: [
        {
          id: '@acme/tools-midnight-theme',
          label: 'Midnight',
          src: { $ref: './themes/midnight/theme.css' },
        },
      ],
    });
  });
});

describe('scaffoldLocale', () => {
  const result = scaffoldLocale(PLUGIN_ID, { langCode: 'fr', languageName: 'Français' });

  it('emits a commented Fluent file', () => {
    const ftl = find(result.files, 'locale.ftl').content as string;
    expect(ftl).toContain('projectfluent.org');
    expect(ftl).toContain('# welcome-user = Welcome, { $name }!');
  });

  it('patches the plugin manifest inline with a src $ref', () => {
    expect(result.patch).toEqual({
      locales: [
        { id: '@acme/tools-fr', label: 'Français', src: { $ref: './locales/fr/locale.ftl' } },
      ],
    });
  });
});

describe('scaffoldDataset', () => {
  it('static datasets reference a local records file', () => {
    const result = scaffoldDataset({
      slug: 'monsters',
      label: 'Monsters',
      description: '',
      type: 'static',
    });
    const manifest = parse(find(result.files, 'monsters.json'));
    expect(manifest.id).toBe('monsters');
    expect(manifest.source).toEqual({ local: { $ref: './monsters/records.json' } });
    expect(result.files.some(f => f.path === 'datasets/monsters/records.json')).toBe(true);
    expect(result.patch).toEqual({ datasets: [{ $ref: './datasets/monsters.json' }] });
  });

  it('dynamic datasets reference https remote endpoints and ship no records file', () => {
    const result = scaffoldDataset({
      slug: 'spells',
      label: 'Spells',
      description: '',
      type: 'dynamic',
    });
    const manifest = parse(find(result.files, 'spells.json'));
    const source = manifest.source as { remote: Record<string, string> };
    expect(source.remote.list).toMatch(/^https:\/\//);
    expect(result.files.some(f => f.path.endsWith('records.json'))).toBe(false);
  });
});

describe('writeFiles', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'overseer-scaffold-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates nested directories and writes string and buffer content', () => {
    writeFiles(tmpDir, [
      { path: 'a/b/c.txt', content: 'hello' },
      { path: 'a/icon.png', content: ICON },
    ]);
    expect(fs.readFileSync(path.join(tmpDir, 'a/b/c.txt'), 'utf-8')).toBe('hello');
    expect(fs.readFileSync(path.join(tmpDir, 'a/icon.png')).equals(ICON)).toBe(true);
  });
});

describe('mergeManifest', () => {
  const base: PluginManifest = {
    id: '@acme/tools',
    name: 'Tools',
    version: '0.1.0',
    extensions: [],
    presets: [],
    themes: [],
    locales: [],
  };

  it('concatenates array fields from each patch', () => {
    const merged = mergeManifest(base, [
      { extensions: [{ $ref: './extensions/a/manifest.json' }] },
      { datasets: [{ $ref: './datasets/d.json' }] },
    ]);
    expect(merged.extensions).toEqual([{ $ref: './extensions/a/manifest.json' }]);
    expect(merged.datasets).toEqual([{ $ref: './datasets/d.json' }]);
    expect(merged.presets).toEqual([]);
  });

  it('does not mutate the base manifest', () => {
    mergeManifest(base, [{ extensions: [{ $ref: './x/manifest.json' }] }]);
    expect(base.extensions).toEqual([]);
  });
});
