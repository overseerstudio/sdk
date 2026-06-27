/** @format */

import fs from 'node:fs';
import path from 'node:path';

import { cancel, intro, isCancel, multiselect, outro, select, spinner, text } from '@clack/prompts';
import chalk from 'chalk';

import pkg from '../../../package.json';
import { createApiClient, createPublicClient } from '../lib/api';
import { resolveToken } from '../lib/auth';
import { loadDefaultIcon } from '../lib/defaultIcon';
import {
  SCHEMAS,
  mergeManifest,
  scaffoldDataset,
  scaffoldExtension,
  scaffoldLocale,
  scaffoldPreset,
  scaffoldTheme,
  writeFiles,
} from '../lib/scaffold';

import type { ApiScope } from '../lib/api';
import type { FileEntry, ManifestPatch } from '../lib/scaffold';
import type { ApiCategory, PluginManifest } from '../types';

const ID_RE = /^@[a-z0-9-]+\/[a-z0-9-]+$/;
const NAME_RE = /^[a-z0-9-]+$/;
const LANG_RE = /^[a-zA-Z0-9_-]+$/;

// Mirrors app/src/modules/extension/constants.ts (CATEGORIES). Kept inline because
// the CLI package cannot import from the app workspace.
const EXTENSION_CATEGORIES = [
  'Audio',
  'Character Sheets',
  'Combat',
  'Dice',
  'Organization',
  'Reference',
  'VTT',
  'Video',
  'Other',
] as const;

/** Unwrap a clack prompt result, exiting cleanly if the user cancelled. */
function ensure<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel('Cancelled.');
    process.exit(0);
  }
  return value as T;
}

const slugValidator = (v: string | undefined): string | undefined =>
  NAME_RE.test(v ?? '') ? undefined : 'Use lowercase letters, numbers, and hyphens.';

export async function initCommand(): Promise<void> {
  const cwd = process.cwd();
  const manifestPath = path.join(cwd, 'manifest.json');

  if (fs.existsSync(manifestPath)) {
    console.error(chalk.red(`manifest.json already exists at ${manifestPath}`));
    process.exit(1);
  }

  intro('Overseer Plugin Scaffolder');

  // --- Plugin ID (claimed scope when logged in, otherwise manual entry) ---
  let scopes: ApiScope[] = [];
  try {
    const token = await resolveToken({ allowPrompt: false });
    scopes = await createApiClient(token).listScopes();
  } catch {
    // Not logged in — fall back to manual ID entry below.
  }

  let id: string;
  if (scopes.length > 0) {
    const scope = ensure(
      await select({
        message: 'Choose a scope',
        options: scopes.map(s => ({ value: s.scope, label: s.scope })),
      }),
    );
    const pluginName = ensure(
      await text({ message: 'Plugin name (lowercase, hyphens)', validate: slugValidator }),
    );
    id = `${scope}/${pluginName}`;
  } else {
    id = ensure(
      await text({
        message: 'Plugin ID (@scope/name)',
        validate: v => (ID_RE.test(v ?? '') ? undefined : 'Use the format @scope/name.'),
      }),
    );
  }

  // --- Plugin metadata ---
  const fallbackName = id.split('/').pop() ?? 'My Plugin';
  const name = ensure(
    await text({ message: 'Display name', placeholder: fallbackName, defaultValue: fallbackName }),
  );
  const description = ensure(await text({ message: 'Description (optional)', defaultValue: '' }));
  const author = ensure(await text({ message: 'Author (optional)', defaultValue: '' }));
  const homepage = ensure(await text({ message: 'Homepage (optional)', defaultValue: '' }));

  let categories: ApiCategory[] = [];
  try {
    categories = await createPublicClient().getCategories();
  } catch {
    // Categories unavailable — skip the selection gracefully.
  }

  let category = '';
  if (categories.length > 0) {
    category = ensure(
      await select({
        message: 'Category',
        options: [
          { value: '', label: 'Skip for now' },
          ...categories.map(c => ({ value: c.slug, label: c.slug })),
        ],
      }),
    );
  }

  // --- What content to scaffold ---
  const selections = ensure(
    await multiselect({
      message: 'What would you like to add to your plugin?',
      required: false,
      options: [
        { value: 'extension', label: 'Extension', hint: 'tile content (Vite + TypeScript)' },
        { value: 'preset', label: 'Preset', hint: 'a ready-made session layout' },
        { value: 'theme', label: 'Theme', hint: 'colors and styling' },
        { value: 'locale', label: 'Locale', hint: 'translations' },
        { value: 'dataset', label: 'Dataset', hint: 'data records' },
      ],
    }),
  ) as string[];

  // --- Per-type detail prompts ---
  const patches: ManifestPatch[] = [];
  const files: FileEntry[] = [];
  let extensionSlug: string | undefined;
  const icon = loadDefaultIcon();

  if (selections.includes('extension')) {
    const slug = ensure(await text({ message: 'Extension slug', validate: slugValidator }));
    const label = ensure(
      await text({ message: 'Extension label', placeholder: slug, defaultValue: slug }),
    );
    const desc = ensure(await text({ message: 'Extension description', defaultValue: '' }));
    const cat = ensure(
      await select({
        message: 'Extension category',
        initialValue: 'Other',
        options: EXTENSION_CATEGORIES.map(c => ({ value: c, label: c })),
      }),
    );
    const res = scaffoldExtension(id, author, pkg.version, icon, {
      slug,
      label,
      description: desc,
      category: cat,
    });
    patches.push(res.patch);
    files.push(...res.files);
    extensionSlug = slug;
  }

  if (selections.includes('preset')) {
    const slug = ensure(await text({ message: 'Preset slug', validate: slugValidator }));
    const label = ensure(
      await text({ message: 'Preset label', placeholder: slug, defaultValue: slug }),
    );
    const desc = ensure(await text({ message: 'Preset description', defaultValue: '' }));
    const res = scaffoldPreset(id, author, icon, {
      slug,
      label,
      description: desc,
      category: category || undefined,
    });
    patches.push(res.patch);
    files.push(...res.files);
  }

  if (selections.includes('theme')) {
    const slug = ensure(await text({ message: 'Theme slug', validate: slugValidator }));
    const label = ensure(
      await text({ message: 'Theme label', placeholder: slug, defaultValue: slug }),
    );
    const res = scaffoldTheme(id, { slug, label });
    patches.push(res.patch);
    files.push(...res.files);
  }

  if (selections.includes('locale')) {
    const langCode = ensure(
      await text({
        message: 'Language code (e.g. en, fr, en_US)',
        validate: v =>
          LANG_RE.test(v ?? '') ? undefined : 'Use letters, numbers, hyphens, underscores.',
      }),
    );
    const languageName = ensure(
      await text({ message: 'Language name (e.g. English)', defaultValue: langCode }),
    );
    const res = scaffoldLocale(id, { langCode, languageName });
    patches.push(res.patch);
    files.push(...res.files);
  }

  if (selections.includes('dataset')) {
    const slug = ensure(
      await text({
        message: 'Dataset id (letters, numbers, hyphens, underscores)',
        validate: v =>
          LANG_RE.test(v ?? '') ? undefined : 'Use letters, numbers, hyphens, underscores.',
      }),
    );
    const label = ensure(
      await text({ message: 'Dataset label', placeholder: slug, defaultValue: slug }),
    );
    const desc = ensure(await text({ message: 'Dataset description', defaultValue: '' }));
    const type = ensure(
      await select({
        message: 'Dataset type',
        options: [
          { value: 'static', label: 'Static', hint: 'records shipped as a local JSON file' },
          { value: 'dynamic', label: 'Dynamic', hint: 'records fetched from a remote API' },
        ],
      }),
    ) as 'static' | 'dynamic';
    const res = scaffoldDataset({ slug, label, description: desc, type });
    patches.push(res.patch);
    files.push(...res.files);
  }

  // Per-version changelog file, referenced from the manifest. Bump the $ref
  // (e.g. changelogs/0.2.0.md) with each release.
  files.push({
    path: 'changelogs/0.1.0.md',
    content: `# 0.1.0\n\n- Initial release.\n`,
  });

  files.push({ path: 'assets/icon.png', content: icon });

  // --- Build and write the manifest + content files ---
  const baseManifest: PluginManifest = {
    $schema: `${SCHEMAS}/plugin/manifest.json`,
    id,
    name,
    version: '0.1.0',
    ...(description ? { description } : {}),
    changelog: { $ref: 'changelogs/0.1.0.md' },
    icon: { $ref: 'assets/icon.png' },
    ...(author ? { author } : {}),
    ...(homepage ? { homepage } : {}),
    ...(category ? { category } : {}),
    extensions: [],
    presets: [],
    themes: [],
    locales: [],
  };
  const manifest = mergeManifest(baseManifest, patches);

  const s = spinner();
  s.start('Scaffolding files…');
  try {
    writeFiles(cwd, files);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    s.stop('Files created.');
  } catch (err) {
    s.stop('Failed to scaffold files.');
    throw err;
  }

  printNextSteps(extensionSlug, selections.length === 0);
  outro('Done!');
}

function printNextSteps(extensionSlug: string | undefined, empty: boolean): void {
  const lines: string[] = ['', chalk.bold('Next steps:')];

  if (extensionSlug) {
    lines.push(
      chalk.cyan(`  cd extensions/${extensionSlug} && npm install`) +
        chalk.dim('   install extension dependencies'),
      chalk.cyan('  npm run build') +
        chalk.dim('                          build the extension bundle'),
    );
  }

  lines.push(
    chalk.cyan('  overseer build') + chalk.dim('     package the plugin'),
    chalk.cyan('  overseer publish') + chalk.dim('   publish to the marketplace'),
  );

  if (empty) {
    lines.push(chalk.dim('  Add extensions/, presets/, themes/, locales/, or datasets/ manually.'));
  }

  console.log(lines.join('\n'));
}
