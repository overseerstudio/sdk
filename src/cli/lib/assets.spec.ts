/** @format */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { collectAssets } from './assets';

describe('collectAssets', () => {
  let tmpDir: string;
  let pluginDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'overseer-assets-'));
    pluginDir = path.join(tmpDir, 'plugin');
    fs.mkdirSync(pluginDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function write(rel: string, contents = 'x'): void {
    const full = path.join(pluginDir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, contents);
  }

  function writeJson(rel: string, obj: unknown): void {
    write(rel, JSON.stringify(obj));
  }

  function buildFullTree(): void {
    writeJson('manifest.json', {
      id: 'test/plugin',
      name: 'Test',
      version: '1.0.0',
      extensions: [{ $ref: './extensions/intro/manifest.json' }],
      presets: [{ $ref: './presets/main/manifest.json' }],
      themes: [{ src: { $ref: './themes/dark.css' } }],
      locales: [{ src: { $ref: './locales/en.json' } }],
    });

    writeJson('extensions/intro/manifest.json', {
      icon: { $ref: './icon.png' },
      source: { $ref: './dist/index.js' },
    });
    write('extensions/intro/icon.png');
    write('extensions/intro/dist/index.js', 'code');
    write('extensions/intro/dist/chunk.js', 'chunk');
    write('extensions/intro/dist/index.js.map', 'sourcemap');

    writeJson('presets/main/manifest.json', {
      assets: [{ $ref: './assets/map.png' }],
      state: {
        screens: [{ backgroundPath: { $ref: './assets/bg.jpg' } }],
        tiles: [{ config: { image: { $ref: './assets/tile.png' } } }],
      },
    });
    write('presets/main/assets/map.png');
    write('presets/main/assets/bg.jpg');
    write('presets/main/assets/tile.png');

    write('themes/dark.css');
    write('locales/en.json');
  }

  async function collect(): Promise<string[]> {
    const manifest = JSON.parse(fs.readFileSync(path.join(pluginDir, 'manifest.json'), 'utf-8'));
    return collectAssets(pluginDir, manifest);
  }

  it('collects every referenced file and returns a sorted list', async () => {
    buildFullTree();
    const assets = await collect();
    expect(assets).toEqual([
      'extensions/intro/dist/chunk.js',
      'extensions/intro/dist/index.js',
      'extensions/intro/icon.png',
      'extensions/intro/manifest.json',
      'locales/en.json',
      'manifest.json',
      'presets/main/assets/bg.jpg',
      'presets/main/assets/map.png',
      'presets/main/assets/tile.png',
      'presets/main/manifest.json',
      'themes/dark.css',
    ]);
  });

  it('excludes .map files from the sibling source directory walk', async () => {
    buildFullTree();
    const assets = await collect();
    expect(assets).not.toContain('extensions/intro/dist/index.js.map');
  });

  it('resolves nested preset tile config $refs', async () => {
    buildFullTree();
    const assets = await collect();
    expect(assets).toContain('presets/main/assets/tile.png');
  });

  it('resolves preset screen backgroundPath $refs', async () => {
    buildFullTree();
    const assets = await collect();
    expect(assets).toContain('presets/main/assets/bg.jpg');
  });

  it('dedupes duplicate $refs', async () => {
    writeJson('manifest.json', {
      id: 'test/plugin',
      name: 'Test',
      version: '1.0.0',
      themes: [{ src: { $ref: './themes/dark.css' } }, { src: { $ref: './themes/dark.css' } }],
    });
    write('themes/dark.css');
    const assets = await collect();
    expect(assets.filter(a => a === 'themes/dark.css')).toHaveLength(1);
  });

  it('throws with the relative path when a referenced file is missing', async () => {
    writeJson('manifest.json', {
      id: 'test/plugin',
      name: 'Test',
      version: '1.0.0',
      extensions: [{ $ref: './extensions/broken/manifest.json' }],
    });
    writeJson('extensions/broken/manifest.json', {
      icon: { $ref: './icon.png' },
    });
    await expect(collect()).rejects.toThrow('extensions/broken/icon.png');
  });

  it('handles a manifest with no optional sections', async () => {
    writeJson('manifest.json', {
      id: 'test/plugin',
      name: 'Test',
      version: '1.0.0',
    });
    const assets = await collect();
    expect(assets).toEqual(['manifest.json']);
  });

  it('handles an extension without a source (no walk)', async () => {
    writeJson('manifest.json', {
      id: 'test/plugin',
      name: 'Test',
      version: '1.0.0',
      extensions: [{ $ref: './extensions/iconly/manifest.json' }],
    });
    writeJson('extensions/iconly/manifest.json', {
      icon: { $ref: './icon.png' },
    });
    write('extensions/iconly/icon.png');
    const assets = await collect();
    expect(assets).toEqual([
      'extensions/iconly/icon.png',
      'extensions/iconly/manifest.json',
      'manifest.json',
    ]);
  });
});
