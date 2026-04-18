/** @format */

import readline from 'node:readline';

import chalk from 'chalk';

import { baseUrl } from './api';
import { readConfig } from './config';

type ResolveOptions = {
  token?: string;
  allowPrompt?: boolean;
};

export async function resolveToken(opts: ResolveOptions = {}): Promise<string> {
  if (opts.token) return opts.token;
  if (process.env.OVERSEER_TOKEN) return process.env.OVERSEER_TOKEN;

  const config = readConfig();
  if (config?.token) return config.token;

  if (opts.allowPrompt === false) {
    console.error(chalk.red('No API token found. Run `overseer login` or set OVERSEER_TOKEN.'));
    process.exit(1);
  }

  console.log(
    chalk.dim(
      `No token found. Create a publisher token at ${baseUrl()}/dashboard/publisher-tokens`,
    ),
  );
  return promptForToken();
}

function promptForToken(): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise(resolve => {
    rl.question('Paste API token: ', answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}
