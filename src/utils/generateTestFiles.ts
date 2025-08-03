import fs from 'fs-extra';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import os from 'os';

import type { ComponentConfig } from '../types/ui-test-config.js';

interface PageConfig {
  page: string;
  url: string;
  components: ComponentConfig[];
}

interface UITestConfig {
  PageList: PageConfig[];
  ForceHideSelectors: string[];
}

export async function generateTestFiles() {
  const tempDir = path.join(os.tmpdir(), 'snap-ui-temp-' + Date.now());
  const configPath = path.join(process.cwd(), 'data', 'ui-test-data.ts');
  
  try {
    fs.ensureDirSync(tempDir);
    
    // Copy config file to temp directory
    const tempConfigPath = path.join(tempDir, 'ui-test-data.ts');
    fs.copyFileSync(configPath, tempConfigPath);
    
    // Compile TypeScript to JavaScript using npx
    execSync(`npx tsc ${tempConfigPath} --target es2020 --module es2020 --outDir ${tempDir} --skipLibCheck`, { 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    
    // Import the compiled JavaScript config file
    const jsConfigPath = path.join(tempDir, 'ui-test-data.js');
    const configUrl = 'file://' + jsConfigPath.replace(/\\/g, '/');
    const module = await import(configUrl);
    const components = module.components || [];
    const ForceHideSelectors = module.ForceHideSelectors || [];
    const PageList = module.PageList || [];
    
    const testFiles: { path: string; content: string }[] = [];

    // Use PageList if available, otherwise use components
    const pageConfigs = PageList || [
      {
        page: 'ui-tests',
        url: 'http://localhost:3000',
        components: components || []
      }
    ];

    for (const pageConfig of pageConfigs) {
      const { page, url } = pageConfig;
      
      const testFilePath = path.join('tests', 'ui', `${page}.spec.ts`);
      const baselineTestFilePath = path.join('tests', 'ui', `${page}-baseline.spec.ts`);

      const testContent = generateTestContent(page, url);
      const baselineTestContent = generateBaselineTestContent(page, url);

      testFiles.push({ path: baselineTestFilePath, content: baselineTestContent });
      testFiles.push({ path: testFilePath, content: testContent });
    }

    return testFiles;
  } finally {
    // Always clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.removeSync(tempDir);
    }
  }
}

function generateBaselineTestContent(page: string, baseURL: string): string {
  return `import { test, expect } from '@playwright/test';
import { updateVisualBaseline } from '@meta-boltz/snap-ui';
import { PageList, ForceHideSelectors } from '../../data/ui-test-data';

const config = PageList.find(p => p.page === '${page}');
const testData = config?.components || [];
const baseURL = '${baseURL}';
const forceHideSelectors = ForceHideSelectors || [];

test.describe('${page} - Baseline Generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(process.env.TEST_URL || baseURL);
    await page.waitForLoadState('networkidle');
  });

  updateVisualBaseline(testData, forceHideSelectors);
});`;
}

function generateTestContent(page: string, baseURL: string): string {
  return `import { test, expect } from '@playwright/test';
import { runVisualTests } from '@meta-boltz/snap-ui';
import { PageList, ForceHideSelectors } from '../../data/ui-test-data';

const config = PageList.find(p => p.page === '${page}');
const testData = config?.components || [];
const baseURL = '${baseURL}';
const forceHideSelectors = ForceHideSelectors || [];

test.describe('${page} - Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(process.env.TEST_URL || baseURL);
    await page.waitForLoadState('networkidle');
  });

  runVisualTests(testData, forceHideSelectors);
});`;
}