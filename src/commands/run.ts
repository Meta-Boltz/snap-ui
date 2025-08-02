import { promises as fs } from 'fs';
import * as fsExtra from 'fs-extra';
import * as path from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';
import { generateTestFiles } from '../utils/generateTestFiles.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function run() {
  console.log('Running visual tests...');

  const uiTestDataPath = path.join(process.cwd(), 'data', 'ui-test-data.ts');
  
  if (!await fsExtra.pathExists(uiTestDataPath)) {
    console.error('ui-test-data.ts not found. Run `npx snap-ui init` first.');
    process.exit(1);
  }

  const testFiles = await generateTestFiles();

  const existingFiles = [];
  for (const file of testFiles) {
    if (await fsExtra.pathExists(file.path)) {
      existingFiles.push(file);
    }
  }
  
  if (existingFiles.length > 0) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: `The following ${existingFiles.length} test file(s) already exist. What would you like to do?`,
        choices: [
          'Overwrite all',
          'Select files to overwrite',
          'Cancel'
        ]
      }
    ]);

    if (action === 'Cancel') {
      console.log('Operation cancelled.');
      return;
    }

    if (action === 'Select files to overwrite') {
      const { selectedFiles } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'selectedFiles',
          message: 'Select files to overwrite:',
          choices: existingFiles.map(file => ({ name: file.path, value: file.path }))
        }
      ]);

      if (selectedFiles.length === 0) {
        console.log('No files selected. Operation cancelled.');
        return;
      }

      const selectedTestFiles = testFiles.filter(file => selectedFiles.includes(file.path));
      await writeTestFiles(selectedTestFiles);
    } else {
      await writeTestFiles(testFiles);
    }
  } else {
    await writeTestFiles(testFiles);
  }

  console.log('Visual tests generated successfully!');
}

async function writeTestFiles(testFiles: { path: string; content: string }[]) {
  for (const file of testFiles) {
    await fsExtra.ensureDir(path.dirname(file.path));
    await fs.writeFile(file.path, file.content);
  }
}