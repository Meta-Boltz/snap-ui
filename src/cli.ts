#!/usr/bin/env node

import { Command } from 'commander';
import { init } from './commands/init.js';
import { run } from './commands/run.js';
import { generate } from './commands/generate.js';

const program = new Command();

program
  .name('snap-ui')
  .description('A visual testing tool for Playwright')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize the project')
  .action(init);

program
  .command('run')
  .description('Run visual tests')
  .action(run);

program
  .command('generate')
  .description('Generate baseline test files')
  .action(generate);

program.parse();