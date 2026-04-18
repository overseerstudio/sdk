/** @format */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { isStale } from './stale';

describe('isStale', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'overseer-stale-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function write(name: string, mtimeMs: number): string {
    const p = path.join(tmpDir, name);
    fs.writeFileSync(p, name);
    fs.utimesSync(p, mtimeMs / 1000, mtimeMs / 1000);
    return p;
  }

  it('is stale when the output does not exist', () => {
    const src = write('src', Date.now());
    expect(isStale(path.join(tmpDir, 'missing'), [src])).toBe(true);
  });

  it('is stale when a source is newer than the output', () => {
    const output = write('output', Date.now() - 10_000);
    const src = write('src', Date.now());
    expect(isStale(output, [src])).toBe(true);
  });

  it('is fresh when the output is newer than every source', () => {
    const src = write('src', Date.now() - 10_000);
    const output = write('output', Date.now());
    expect(isStale(output, [src])).toBe(false);
  });

  it('skips non-existent source files', () => {
    const output = write('output', Date.now());
    expect(isStale(output, [path.join(tmpDir, 'nope')])).toBe(false);
  });
});
