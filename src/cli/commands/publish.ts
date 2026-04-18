/** @format */

import fs from 'node:fs';
import path from 'node:path';

import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';

import { createApiClient, handleApiError } from '../lib/api';
import { resolveToken } from '../lib/auth';
import { readManifest } from '../lib/manifest';

import { buildCommand } from './build';

import type { PluginDistribution } from '../types';

type Options = {
  token?: string;
  cwd?: string;
  skipBuild?: boolean;
};

export async function publishCommand(opts: Options = {}): Promise<void> {
  const pluginDir = path.resolve(opts.cwd ?? process.cwd());
  const manifestPath = path.join(pluginDir, 'manifest.json');
  const tarPath = path.join(pluginDir, 'plugin.tar.gz');
  const distPath = path.join(pluginDir, 'plugin.json');

  try {
    if (!opts.skipBuild) {
      await buildCommand({ cwd: pluginDir });
    }

    const manifest = readManifest(manifestPath);

    if (!fs.existsSync(tarPath) || !fs.existsSync(distPath)) {
      throw new Error('plugin.tar.gz or plugin.json missing — run `overseer build` first.');
    }

    const distribution = JSON.parse(fs.readFileSync(distPath, 'utf-8')) as PluginDistribution;

    const token = await resolveToken({ token: opts.token, allowPrompt: false });
    const client = createApiClient(token);

    const categorySpinner = ora('Fetching categories').start();
    const categories = await client.getCategories();
    categorySpinner.stop();

    const categorySlug = (manifest as unknown as { category?: string }).category;
    const category = categories.find(c => c.slug === categorySlug) ?? categories[0];
    if (!category) throw new Error('No categories available from the marketplace API.');

    const registerSpinner = ora(`Registering ${manifest.id}`).start();
    try {
      await client.registerPlugin({
        id: manifest.id,
        name: manifest.name,
        description: manifest.description,
        category_id: category.id,
        homepage: (manifest as unknown as { homepage?: string }).homepage,
      });
      registerSpinner.succeed('Plugin registered');
    } catch (err) {
      registerSpinner.fail('Registration failed');
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        const scope = manifest.id.split('/')[0];
        console.error(
          chalk.red(
            `\nScope '${scope}' is not yours. Run \`overseer scope claim ${scope}\` or choose a scope you own.`,
          ),
        );
        process.exit(1);
      }
      throw err;
    }

    const uploadSpinner = ora('Publishing package (0%)').start();
    const result = await client.publishVersion(
      manifest.id,
      {
        version: manifest.version,
        tarballPath: tarPath,
        hash: distribution.hash,
        assets: distribution.assets,
      },
      percent => {
        uploadSpinner.text = `Publishing package (${percent}%)`;
      },
    );
    uploadSpinner.succeed(`Published ${result.plugin_id}@${result.version}`);

    const updatedDistribution: PluginDistribution = {
      ...distribution,
      packageUrl: result.package_url,
    };
    fs.writeFileSync(distPath, JSON.stringify(updatedDistribution, null, 2) + '\n');

    console.log(chalk.green(`\nPlugin available at: ${result.plugin_json_url}`));
  } catch (err) {
    handleApiError(err);
    process.exit(1);
  }
}
