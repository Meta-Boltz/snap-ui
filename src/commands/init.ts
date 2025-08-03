import * as fs from 'fs-extra';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function init() {
  console.log('Initializing snap-ui...');

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
    const templatePath = path.join(packageRoot, 'data', 'ui-test-data-template.ts');
    await fs.copy(templatePath, uiTestDataPath);
  }

  console.log('snap-ui initialized successfully!');
}