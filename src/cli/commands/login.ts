/** @format */

import chalk from 'chalk';

import { createApiClient, handleApiError } from '../lib/api';
import { resolveToken } from '../lib/auth';
import { saveConfig } from '../lib/config';

type Options = {
  token?: string;
};

export async function loginCommand(opts: Options): Promise<void> {
  try {
    const token = await resolveToken({ token: opts.token, allowPrompt: true });
    const client = createApiClient(token);
    const user = await client.getUser();
    saveConfig({ token });
    console.log(chalk.green(`Logged in as ${user.name} <${user.email}>`));
  } catch (err) {
    handleApiError(err);
    process.exit(1);
  }
}
