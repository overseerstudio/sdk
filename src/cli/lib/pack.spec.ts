/** @format */

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

import tar from 'tar-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { computeFileHash, packPlugin } from './pack';

describe('packPlugin', () => {
  let tmpDir: string;
  let pluginDir: string;
  let outDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'overseer-pack-'));
    pluginDir = path.join(tmpDir, 'plugin');
    outDir = path.join(tmpDir, 'out');
    fs.mkdirSync(pluginDir, { recursive: true });
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(pluginDir, 'manifest.json'), '{"id":"a/b"}');
    fs.mkdirSync(path.join(pluginDir, 'sub'), { recursive: true });
    fs.writeFileSync(path.join(pluginDir, 'sub', 'file.txt'), 'hello');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  async function extract(tarGzPath: string, destDir: string): Promise<string[]> {
    fs.mkdirSync(destDir, { recursive: true });
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(tarGzPath)
        .pipe(zlib.createGunzip())
        .pipe(tar.extract(destDir))
        .on('finish', () => resolve())
        .on('error', reject);
    });
    const found: string[] = [];
    function walk(dir: string, prefix: string): void {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) walk(full, rel);
        else found.push(rel);
      }
    }
    walk(destDir, '');
    return found.sort();
  }

  it('packs the listed entries and round-trips', async () => {
    const outPath = path.join(outDir, 'plugin.tar.gz');
    const hash = await packPlugin(pluginDir, ['manifest.json', 'sub/file.txt'], outPath);
    expect(typeof hash).toBe('string');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    const extracted = await extract(outPath, path.join(tmpDir, 'extracted'));
    expect(extracted).toEqual(['manifest.json', 'sub/file.txt']);
    expect(fs.readFileSync(path.join(tmpDir, 'extracted', 'sub', 'file.txt'), 'utf-8')).toBe(
      'hello',
    );
  });
});

describe('computeFileHash', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'overseer-hash-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('matches the expected sha256 for a known input', async () => {
    const p = path.join(tmpDir, 'f.bin');
    const content = Buffer.from('the quick brown fox');
    fs.writeFileSync(p, content);
    const expected = crypto.createHash('sha256').update(content).digest('hex');
    await expect(computeFileHash(p)).resolves.toBe(expected);
  });

  it('is deterministic across calls', async () => {
    const p = path.join(tmpDir, 'f.bin');
    fs.writeFileSync(p, 'same content');
    const a = await computeFileHash(p);
    const b = await computeFileHash(p);
    expect(a).toBe(b);
  });
});
