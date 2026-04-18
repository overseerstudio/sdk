/** @format */

import { Command } from 'commander';

import { buildCommand } from './commands/build';
import { initCommand } from './commands/init';
import { loginCommand } from './commands/login';
import { publishCommand } from './commands/publish';
import { scopeClaimCommand, scopeListCommand, scopeReleaseCommand } from './commands/scope';
import { whoamiCommand } from './commands/whoami';

const program = new Command();

program.name('overseer').description('Overseer plugin developer CLI').version('0.3.0');

program
  .command('login')
  .description('Log in to the Overseer marketplace')
  .option('-t, --token <token>', 'API token (skips interactive prompt)')
  .action(loginCommand);

program
  .command('whoami')
  .description('Show the authenticated user')
  .option('-t, --token <token>', 'API token (skips config lookup)')
  .action(whoamiCommand);

program
  .command('init')
  .description('Scaffold a new plugin manifest in the current directory')
  .action(initCommand);

program
  .command('build')
  .description('Pack the plugin into plugin.tar.gz and write plugin.json')
  .option('-f, --force', 'Rebuild even if the package is up to date')
  .action(buildCommand);

program
  .command('publish')
  .description('Build and publish the plugin to the marketplace')
  .option('-t, --token <token>', 'API token')
  .option('--skip-build', 'Skip the build step (publish the existing plugin.tar.gz)')
  .action(publishCommand);

const scope = program.command('scope').description('Manage plugin scopes (@my-org)');

scope
  .command('list')
  .description('List the scopes you have claimed')
  .option('-t, --token <token>', 'API token')
  .action(scopeListCommand);

scope
  .command('claim <scope>')
  .description('Claim a new scope (e.g. @my-org)')
  .option('-t, --token <token>', 'API token')
  .action(scopeClaimCommand);

scope
  .command('release <scope>')
  .description('Release a scope you own (must have no plugins)')
  .option('-t, --token <token>', 'API token')
  .action(scopeReleaseCommand);

program.parseAsync(process.argv).catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
