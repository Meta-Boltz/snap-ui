#!/usr/bin/env node
import { Command } from 'commander';
import { init } from '../commands/init.js';
import { run } from '../commands/run.js';
import { generateTemplate } from './generate-template.js';

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
  .command('template')
  .description('Generate ui-test-data.ts template file')
  .option('-f, --force', 'overwrite existing file')
  .action(async (options) => {
    if (options.force) {
      const fs = await import('fs-extra');
      const path = await import('path');
      const outputPath = path.join(process.cwd(), 'data', 'ui-test-data.ts');
      if (await fs.pathExists(outputPath)) {
        await fs.remove(outputPath);
      }
    }
    await generateTemplate();
  });

program.parse();