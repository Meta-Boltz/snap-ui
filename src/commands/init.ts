import * as fs from 'fs-extra';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as p from '@clack/prompts';
import { setTimeout } from 'timers/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function init() {
  console.clear();
  p.intro('🎯 Welcome to snap-ui!');

  const s = p.spinner();
  s.start('Setting up your visual testing environment...');

  try {
    const dirs = [
      'screenshots/actual',
      'screenshots/baseline',
      'screenshots/diff',
      'data',
      'tests/ui'
    ];

    for (const dir of dirs) {
      await fs.ensureDir(dir);
    }

    const gitkeepFiles = [
      'screenshots/actual/.gitkeep',
      'screenshots/baseline/.gitkeep',
      'screenshots/diff/.gitkeep'
    ];

    for (const file of gitkeepFiles) {
      await fs.ensureFile(file);
    }

    const uiTestDataPath = path.join('data', 'ui-test-data.ts');
    if (!await fs.pathExists(uiTestDataPath)) {
      // Get the package root directory (works both in development and when installed)
      const packageRoot = path.join(__dirname, '..', '..');
      const templatePath = path.join(packageRoot, 'templates', 'ui-test-data-template.ts');
      await fs.copy(templatePath, uiTestDataPath);
      s.stop('✅ Created ui-test-data.ts configuration file');
    } else {
      s.stop('ℹ️  ui-test-data.ts already exists - no changes made');
    }

    p.note(
      `Created directories: ${dirs.map(d => `📁 ${d}`).join('\n')}`,
      'Project Structure'
    );
    p.outro('Your snap-ui project is ready! 🚀\n\nNext steps:\n1. Update data/ui-test-data.ts with your pages and components\n2. Run `npx snap-ui generate` to create test files\n3. Run `npx snap-ui run` to execute visual tests');
  } catch (error) {
    s.stop('Failed to initialize project');
    p.cancel('Setup failed. Please try again.');
    process.exit(1);
  }
}