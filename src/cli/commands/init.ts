/** @format */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

import chalk from 'chalk';

import { createApiClient, createPublicClient, handleApiError } from '../lib/api';
import { resolveToken } from '../lib/auth';

import type { ApiScope } from '../lib/api';
import type { ApiCategory } from '../types';

const ID_RE = /^@[a-z0-9-]+\/[a-z0-9-]+$/;
const NAME_RE = /^[a-z0-9-]+$/;

export async function initCommand(): Promise<void> {
  const cwd = process.cwd();
  const manifestPath = path.join(cwd, 'manifest.json');

  if (fs.existsSync(manifestPath)) {
    console.error(chalk.red(`manifest.json already exists at ${manifestPath}`));
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (q: string): Promise<string> =>
    new Promise(resolve => rl.question(q, answer => resolve(answer.trim())));

  try {
    console.log(chalk.cyan('Scaffolding a new Overseer plugin.'));

    let scopes: ApiScope[] = [];
    try {
      const token = await resolveToken({ allowPrompt: false });
      scopes = await createApiClient(token).listScopes();
    } catch {
      // not logged in — fall back to manual ID entry
    }

    let id = '';
    if (scopes.length > 0) {
      console.log(chalk.dim('\nYour claimed scopes:'));
      scopes.forEach((s, i) => console.log(chalk.dim(`  ${i + 1}) ${s.scope}`)));

      let scope = '';
      while (!scope) {
        const choice = await ask(`Choose a scope (1-${scopes.length}): `);
        const idx = Number.parseInt(choice, 10) - 1;
        if (Number.isInteger(idx) && idx >= 0 && idx < scopes.length) {
          scope = scopes[idx].scope;
        } else {
          console.log(chalk.red('Invalid choice.'));
        }
      }

      let pluginName = '';
      while (!NAME_RE.test(pluginName)) {
        pluginName = await ask('Plugin name (lowercase, hyphens): ');
        if (!NAME_RE.test(pluginName)) {
          console.log(chalk.red('Invalid format. Use lowercase letters, numbers, hyphens.'));
        }
      }
      id = `${scope}/${pluginName}`;
    } else {
      console.log(
        chalk.yellow(
          '\nNo claimed scopes found. Claim one first with `overseer scope claim @yourscope`,',
        ),
      );
      console.log(chalk.yellow('or enter a plugin ID manually below.'));
      while (!ID_RE.test(id)) {
        id = await ask('Plugin ID (@scope/name): ');
        if (!ID_RE.test(id)) {
          console.log(chalk.red('Invalid format. Use lowercase letters, numbers, hyphens.'));
        }
      }
    }

    const name = (await ask('Display name: ')) || id.split('/').pop() || 'My Plugin';
    const description = await ask('Description (optional): ');
    const author = await ask('Author (optional): ');
    const homepage = await ask('Homepage (optional): ');

    let categories: ApiCategory[] = [];
    try {
      categories = await createPublicClient().getCategories();
    } catch (err) {
      console.log(chalk.yellow('Could not fetch categories; skipping category selection.'));
      handleApiError(err);
    }

    let category: string | undefined;
    if (categories.length > 0) {
      console.log(chalk.dim('Available categories:'));
      for (const c of categories) console.log(chalk.dim(`  - ${c.slug}`));
      category = (await ask('Category slug (optional): ')) || undefined;
    }

    const manifest = {
      id,
      name,
      version: '0.1.0',
      ...(description ? { description } : {}),
      ...(author ? { author } : {}),
      ...(homepage ? { homepage } : {}),
      ...(category ? { category } : {}),
      extensions: [] as Array<{ $ref: string }>,
      presets: [] as Array<{ $ref: string }>,
      themes: [] as Array<unknown>,
      locales: [] as Array<unknown>,
    };

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    fs.mkdirSync(path.join(cwd, 'extensions'), { recursive: true });
    fs.mkdirSync(path.join(cwd, 'presets'), { recursive: true });

    console.log(chalk.green(`\nCreated ${manifestPath}`));
    console.log(chalk.dim('Next: add extensions/ and presets/, then run `overseer build`.'));
  } finally {
    rl.close();
  }
}
