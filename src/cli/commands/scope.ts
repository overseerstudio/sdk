/** @format */

import chalk from 'chalk';

import { createApiClient, handleApiError } from '../lib/api';
import { resolveToken } from '../lib/auth';

type Options = {
  token?: string;
};

export async function scopeListCommand(opts: Options): Promise<void> {
  try {
    const token = await resolveToken({ token: opts.token, allowPrompt: false });
    const client = createApiClient(token);
    const scopes = await client.listScopes();

    if (scopes.length === 0) {
      console.log(chalk.dim('You have not claimed any scopes yet.'));
      console.log(chalk.dim('Claim one with `overseer scope claim @yourscope`.'));
      return;
    }

    console.log(chalk.cyan('Your claimed scopes:'));
    for (const s of scopes) {
      const badge = s.is_system ? chalk.yellow(' [system]') : '';
      console.log(`  ${s.scope}${badge}`);
    }
  } catch (err) {
    handleApiError(err);
    process.exit(1);
  }
}

export async function scopeClaimCommand(scope: string, opts: Options): Promise<void> {
  try {
    const token = await resolveToken({ token: opts.token, allowPrompt: false });
    const client = createApiClient(token);
    const claimed = await client.claimScope(scope);
    console.log(chalk.green(`Claimed scope ${claimed.scope}`));
  } catch (err) {
    handleApiError(err);
    process.exit(1);
  }
}

export async function scopeReleaseCommand(scope: string, opts: Options): Promise<void> {
  try {
    const token = await resolveToken({ token: opts.token, allowPrompt: false });
    const client = createApiClient(token);
    await client.releaseScope(scope);
    console.log(chalk.green(`Released scope ${scope}`));
  } catch (err) {
    handleApiError(err);
    process.exit(1);
  }
}
