/** @format */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { validateIcons } from './icons';

import type { PluginManifest } from '../types';

/** Minimal PNG: 8-byte signature + IHDR chunk carrying width/height. */
function pngBytes(width: number, height: number): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0); // chunk length
  ihdr.write('IHDR', 4);
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  ihdr[16] = 8; // bit depth
  ihdr[17] = 6; // color type (RGBA)
  return Buffer.concat([sig, ihdr]);
}

/**
 * Minimal JPEG: SOI + an empty APP0 segment (image-size skips the first marker)
 * + a SOF0 segment carrying height/width.
 */
function jpegBytes(width: number, height: number): Buffer {
  return Buffer.from([
    0xff,
    0xd8, // SOI
    0xff,
    0xe0, // APP0 marker (skipped by the parser)
    0x00,
    0x02, // APP0 segment length (just the length field)
    0xff,
    0xc0, // SOF0 marker
    0x00,
    0x11, // SOF segment length (17)
    0x08, // precision
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    0x03, // components
    0x01,
    0x11,
    0x00,
    0x02,
    0x11,
    0x00,
    0x03,
    0x11,
    0x00,
  ]);
}

/** Minimal WebP (VP8X extended) carrying canvas width/height. */
function webpBytes(width: number, height: number): Buffer {
  const buf = Buffer.alloc(30);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(22, 4); // file size after this field
  buf.write('WEBP', 8);
  buf.write('VP8X', 12);
  buf.writeUInt32LE(10, 16); // chunk size
  // flags (20) + reserved (21-23) stay zero
  buf.writeUIntLE(width - 1, 24, 3); // 24-bit width-1
  buf.writeUIntLE(height - 1, 27, 3); // 24-bit height-1
  return buf;
}

describe('validateIcons', () => {
  let tmpDir: string;
  let pluginDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'overseer-icons-'));
    pluginDir = path.join(tmpDir, 'plugin');
    fs.mkdirSync(pluginDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function write(rel: string, contents: Buffer | string): void {
    const full = path.join(pluginDir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, contents);
  }

  /** Manifest with a plugin-level icon at ./icon.png (written by the caller). */
  function pluginIconManifest(): PluginManifest {
    return { id: 'test/plugin', name: 'Test', version: '1.0.0', icon: { $ref: './icon.png' } };
  }

  it('accepts a 256×256 PNG', () => {
    write('icon.png', pngBytes(256, 256));
    expect(() => validateIcons(pluginDir, pluginIconManifest())).not.toThrow();
  });

  it('accepts a 256×256 JPEG', () => {
    write('icon.png', jpegBytes(256, 256));
    expect(() => validateIcons(pluginDir, pluginIconManifest())).not.toThrow();
  });

  it('accepts a 256×256 WebP', () => {
    write('icon.png', webpBytes(256, 256));
    expect(() => validateIcons(pluginDir, pluginIconManifest())).not.toThrow();
  });

  it('rejects an icon larger than 2 MB', () => {
    const big = Buffer.concat([pngBytes(256, 256), Buffer.alloc(2 * 1024 * 1024 + 1)]);
    write('icon.png', big);
    expect(() => validateIcons(pluginDir, pluginIconManifest())).toThrow('2 MB or smaller');
  });

  it('rejects an SVG with a SVG-specific message', () => {
    write('icon.png', '<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg"></svg>');
    expect(() => validateIcons(pluginDir, pluginIconManifest())).toThrow('SVG is not accepted');
  });

  it('rejects a non-square icon', () => {
    write('icon.png', pngBytes(256, 128));
    expect(() => validateIcons(pluginDir, pluginIconManifest())).toThrow('exactly 256×256');
  });

  it('rejects a 128×128 icon', () => {
    write('icon.png', pngBytes(128, 128));
    expect(() => validateIcons(pluginDir, pluginIconManifest())).toThrow('exactly 256×256');
  });

  it('rejects a 1024×1024 icon', () => {
    write('icon.png', pngBytes(1024, 1024));
    expect(() => validateIcons(pluginDir, pluginIconManifest())).toThrow('exactly 256×256');
  });

  it('skips validation when the manifest has no icon', () => {
    const manifest: PluginManifest = { id: 'test/plugin', name: 'Test', version: '1.0.0' };
    expect(() => validateIcons(pluginDir, manifest)).not.toThrow();
  });

  it('validates an extension-level icon', () => {
    write('manifest.json', '{}');
    write('extensions/intro/manifest.json', JSON.stringify({ icon: { $ref: './icon.png' } }));
    write('extensions/intro/icon.png', pngBytes(128, 128));

    const manifest: PluginManifest = {
      id: 'test/plugin',
      name: 'Test',
      version: '1.0.0',
      extensions: [{ $ref: './extensions/intro/manifest.json' }],
    };
    expect(() => validateIcons(pluginDir, manifest)).toThrow('exactly 256×256');
  });

  it('accepts a valid extension-level icon', () => {
    write('extensions/intro/manifest.json', JSON.stringify({ icon: { $ref: './icon.png' } }));
    write('extensions/intro/icon.png', pngBytes(256, 256));

    const manifest: PluginManifest = {
      id: 'test/plugin',
      name: 'Test',
      version: '1.0.0',
      extensions: [{ $ref: './extensions/intro/manifest.json' }],
    };
    expect(() => validateIcons(pluginDir, manifest)).not.toThrow();
  });
});
