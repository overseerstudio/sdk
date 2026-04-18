/** @format */

import chalk from 'chalk';

import { createApiClient, handleApiError } from '../lib/api';
import { resolveToken } from '../lib/auth';

type Options = {
  token?: string;
};

export async function whoamiCommand(opts: Options): Promise<void> {
  try {
    const token = await resolveToken({ token: opts.token, allowPrompt: false });
    const client = createApiClient(token);
    const user = await client.getUser();
    console.log(chalk.green(`${user.name} <${user.email}>`));
  } catch (err) {
    handleApiError(err);
    process.exit(1);
  }
}
