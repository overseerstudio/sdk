/** @format */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { Config } from '../types';

export const CONFIG_DIR = path.join(os.homedir(), '.overseer');
export const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

export function readConfig(configPath: string = CONFIG_PATH): Config | null {
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as Config;
    if (!parsed || typeof parsed.token !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveConfig(config: Config, configPath: string = CONFIG_PATH): void {
  const dir = path.dirname(configPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', {
    mode: 0o600,
    flag: 'w',
  });
}
