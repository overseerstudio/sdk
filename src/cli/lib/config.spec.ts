/** @format */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readConfig, saveConfig } from './config';

describe('config', () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'overseer-config-'));
    configPath = path.join(tmpDir, '.overseer', 'config.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns null when the config file does not exist', () => {
    expect(readConfig(configPath)).toBeNull();
  });

  it('returns null when the file is malformed JSON', () => {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, '{ not json');
    expect(readConfig(configPath)).toBeNull();
  });

  it('returns null when the token field is missing', () => {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify({ foo: 'bar' }));
    expect(readConfig(configPath)).toBeNull();
  });

  it('round-trips a saved config', () => {
    saveConfig({ token: 'abc123' }, configPath);
    expect(readConfig(configPath)).toEqual({ token: 'abc123' });
  });

  it('creates the parent directory when saving', () => {
    saveConfig({ token: 't' }, configPath);
    expect(fs.existsSync(path.dirname(configPath))).toBe(true);
  });

  it('writes the file with 0o600 permissions', () => {
    saveConfig({ token: 't' }, configPath);
    const mode = fs.statSync(configPath).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it('overwrites an existing config', () => {
    saveConfig({ token: 'first' }, configPath);
    saveConfig({ token: 'second' }, configPath);
    expect(readConfig(configPath)).toEqual({ token: 'second' });
  });
});
