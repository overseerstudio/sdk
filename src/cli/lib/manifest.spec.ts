/** @format */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readManifest, resolveManifestRefs, validateManifest } from './manifest';

import type { PluginManifest } from '../types';

describe('validateManifest', () => {
  const valid = {
    id: '@overseer/welcome',
    name: 'Welcome',
    version: '1.0.0',
  };

  it('accepts a valid manifest with @ scope', () => {
    expect(validateManifest(valid).id).toBe('@overseer/welcome');
  });

  it('rejects a manifest id without @ scope', () => {
    expect(() => validateManifest({ ...valid, id: 'myorg/tools' })).toThrow(/manifest\.id/);
  });

  it('rejects non-object input', () => {
    expect(() => validateManifest(null)).toThrow(/JSON object/);
    expect(() => validateManifest('oops')).toThrow(/JSON object/);
  });

  it('rejects invalid id', () => {
    expect(() => validateManifest({ ...valid, id: 'no-slash' })).toThrow(/manifest\.id/);
    expect(() => validateManifest({ ...valid, id: 'Bad/CASE' })).toThrow(/manifest\.id/);
    expect(() => validateManifest({ ...valid, id: 42 })).toThrow(/manifest\.id/);
  });

  it('rejects missing name', () => {
    expect(() => validateManifest({ ...valid, name: '' })).toThrow(/manifest\.name/);
  });

  it('rejects non-semver version', () => {
    expect(() => validateManifest({ ...valid, version: '1.0' })).toThrow(/manifest\.version/);
    expect(() => validateManifest({ ...valid, version: 'v1.0.0' })).toThrow(/manifest\.version/);
  });
});

describe('readManifest', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'overseer-manifest-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('throws when file is missing', () => {
    expect(() => readManifest(path.join(tmpDir, 'missing.json'))).toThrow(/not found/);
  });

  it('throws when file is invalid JSON', () => {
    const p = path.join(tmpDir, 'manifest.json');
    fs.writeFileSync(p, '{ not json');
    expect(() => readManifest(p)).toThrow(/valid JSON/);
  });

  it('reads and validates a good manifest', () => {
    const p = path.join(tmpDir, 'manifest.json');
    fs.writeFileSync(p, JSON.stringify({ id: '@a/b', name: 'n', version: '0.1.0' }));
    expect(readManifest(p).id).toBe('@a/b');
  });
});

describe('resolveManifestRefs', () => {
  let tmpDir: string;
  const base: PluginManifest = { id: '@a/b', name: 'n', version: '0.1.0' };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'overseer-refs-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('passes through an inline string description and omits changelog', () => {
    const res = resolveManifestRefs({ ...base, description: 'short' }, tmpDir);
    expect(res.description).toBe('short');
    expect(res.changelog).toBeUndefined();
  });

  it('resolves $ref description and changelog from files', () => {
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Full README\n');
    fs.mkdirSync(path.join(tmpDir, 'changelogs'));
    fs.writeFileSync(path.join(tmpDir, 'changelogs/0.1.0.md'), '- first release\n');

    const res = resolveManifestRefs(
      {
        ...base,
        description: { $ref: 'README.md' },
        changelog: { $ref: 'changelogs/0.1.0.md' },
      },
      tmpDir,
    );

    expect(res.description).toBe('# Full README');
    expect(res.changelog).toBe('- first release');
  });

  it('throws when a $ref description file is missing', () => {
    expect(() =>
      resolveManifestRefs({ ...base, description: { $ref: 'README.md' } }, tmpDir),
    ).toThrow(/manifest\.description references a missing file/);
  });

  it('throws when a $ref changelog file is missing', () => {
    expect(() =>
      resolveManifestRefs({ ...base, changelog: { $ref: 'changelogs/0.1.0.md' } }, tmpDir),
    ).toThrow(/manifest\.changelog references a missing file/);
  });
});
