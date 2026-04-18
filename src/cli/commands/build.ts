/** @format */

import fs from 'node:fs';
import path from 'node:path';

import chalk from 'chalk';
import ora from 'ora';

import { collectAssets } from '../lib/assets';
import { readManifest } from '../lib/manifest';
import { packPlugin } from '../lib/pack';
import { isStale } from '../lib/stale';

import type { PluginDistribution } from '../types';

type Options = {
  force?: boolean;
  cwd?: string;
};

export async function buildCommand(opts: Options = {}): Promise<void> {
  const pluginDir = path.resolve(opts.cwd ?? process.cwd());
  const manifestPath = path.join(pluginDir, 'manifest.json');
  const tarPath = path.join(pluginDir, 'plugin.tar.gz');
  const distPath = path.join(pluginDir, 'plugin.json');

  const spinner = ora();
  try {
    const manifest = readManifest(manifestPath);

    spinner.start('Collecting assets');
    const assets = await collectAssets(pluginDir, manifest);
    spinner.succeed(`Collected ${assets.length} asset(s)`);

    const sourcePaths = assets.map(a => path.join(pluginDir, a));
    if (!opts.force && !isStale(tarPath, sourcePaths) && fs.existsSync(distPath)) {
      console.log(chalk.dim('Build is up to date. Use --force to rebuild.'));
      return;
    }

    spinner.start('Packing plugin');
    const rawHash = await packPlugin(pluginDir, assets, tarPath);
    const hash = `sha256-${rawHash}`;
    spinner.succeed(`Packed ${path.basename(tarPath)} (${hash})`);

    const existing = readExistingDistribution(distPath);
    const distribution: PluginDistribution = {
      $schema: existing?.$schema ?? 'https://overseer.studio/schemas/plugin.json',
      version: manifest.version,
      packageUrl: existing?.packageUrl ?? '',
      hash,
      assets,
    };
    fs.writeFileSync(distPath, JSON.stringify(distribution, null, 2) + '\n');
    console.log(chalk.green(`Wrote ${path.basename(distPath)}`));
  } catch (err) {
    if (spinner.isSpinning) spinner.fail();
    if (err instanceof Error) console.error(chalk.red(err.message));
    else console.error(chalk.red('Build failed'));
    process.exit(1);
  }
}

function readExistingDistribution(distPath: string): PluginDistribution | null {
  try {
    return JSON.parse(fs.readFileSync(distPath, 'utf-8')) as PluginDistribution;
  } catch {
    return null;
  }
}
