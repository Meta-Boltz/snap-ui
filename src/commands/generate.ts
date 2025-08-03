import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function generate() {
  console.log('Generating baseline test files...');
  
  try {
    // Get the current working directory (where the command is run from)
    const cwd = process.cwd();
    
    // Look for ui-test-data.ts in the data directory
    const dataPath = path.join(cwd, 'data', 'ui-test-data.ts');
    const jsDataPath = path.join(cwd, 'data', 'ui-test-data.js');
    
    let PageList: any[] = [];
    let ForceHideSelectors: string[] = [];
    
    // Try to load the data file
    if (fs.existsSync(dataPath)) {
      // Convert TypeScript to JavaScript
      console.log('Converting TypeScript data to JavaScript...');
      const tsContent = fs.readFileSync(dataPath, 'utf8');
      
      // Extract PageList data using regex
      const pageListMatch = tsContent.match(/export const PageList = \[(.*?)\];/s);
      const forceHideMatch = tsContent.match(/export const ForceHideSelectors = \[(.*?)\];/s);
      
      if (pageListMatch) {
        const pageListStr = `[${pageListMatch[1]}]`;
        try {
          PageList = eval(`(${pageListStr})`);
          // Handle both 'components' and 'ComponentList' for backward compatibility
          PageList = PageList.map((page: any) => ({
            ...page,
            components: page.components || page.ComponentList || []
          }));
          // Ensure components have group attribute
          PageList = PageList.map((page: any) => ({
            ...page,
            components: (page.components || []).map((comp: any) => ({
              ...comp,
              group: comp.group || comp.page || page.page
            }))
          }));
        } catch (e) {
          console.warn('Could not parse PageList, using fallback data');
        }
      }
      
      if (forceHideMatch) {
        const forceHideStr = `[${forceHideMatch[1]}]`;
        try {
          ForceHideSelectors = eval(`(${forceHideStr})`);
        } catch (e) {
          console.warn('Could not parse ForceHideSelectors, using empty array');
        }
      }
    } else if (fs.existsSync(jsDataPath)) {
      // Use dynamic import for JS file
      const { PageList: PL, ForceHideSelectors: FHS } = await import(path.join(cwd, 'data', 'ui-test-data.js'));
      PageList = PL;
      ForceHideSelectors = FHS;
    } else {
      console.error('No ui-test-data.ts or ui-test-data.js found in data directory');
      process.exit(1);
    }
    
    if (!PageList || PageList.length === 0) {
      console.warn('No PageList data found, using fallback configuration');
      PageList = [
        {
          page: 'northshore-gosupreme',
          url: 'https://www.northshorecare.com/gosupreme',
          components: [
            { name: 'hero', group: 'northshore-gosupreme', selector: '.hero-section' },
            { name: 'products', group: 'northshore-gosupreme', selector: '.product_grid' }
          ]
        }
      ];
    }

    // Create tests directory if it doesn't exist
    const testsDir = path.join(cwd, 'tests', 'ui');
    if (!fs.existsSync(testsDir)) {
      fs.mkdirSync(testsDir, { recursive: true });
    }

    // Generate both baseline and comparison test files for each page
    pagesLoop: for (const pageConfig of PageList) {
      const pageName = pageConfig.page;
      
      // Skip if no components to test
      if (!pageConfig.components || pageConfig.components.length === 0) {
        console.log(`Skipping ${pageName} - no components defined`);
        continue pagesLoop;
      }
      
      // Generate baseline test file
      const baselineContent = `import { test, expect } from '@playwright/test';
import { updateVisualBaseline } from '@meta-boltz/snap-ui';
import { PageList, ForceHideSelectors } from '../../data/ui-test-data';

const config = PageList.find(p => p.page === '${pageName}');
const testData = config?.components || [];
const baseURL = config?.url;
const forceHideSelectors = ForceHideSelectors || [];

test.describe('${pageName} Baseline Generation', () => {
  test.beforeEach(async ({ page }) => {
    if (!config || !baseURL) {
      throw new Error('Page configuration for ${pageName} not found');
    }
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
  });

  updateVisualBaseline(testData, forceHideSelectors);
});`;

      // Generate comparison test file
      const comparisonContent = `import { test, expect } from '@playwright/test';
import { runVisualTests } from '@meta-boltz/snap-ui';
import { PageList, ForceHideSelectors } from '../../data/ui-test-data';

const config = PageList.find(p => p.page === '${pageName}');
const testData = config?.components || [];
const baseURL = config?.url;
const forceHideSelectors = ForceHideSelectors || [];

test.describe('${pageName} Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    if (!config || !baseURL) {
      throw new Error('Page configuration for ${pageName} not found');
    }
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
  });

  runVisualTests(testData, forceHideSelectors);
});`;

      const baselineFileName = `${pageName}.baseline.spec.ts`;
      const comparisonFileName = `${pageName}.spec.ts`;
      const baselineFilePath = path.join(testsDir, baselineFileName);
      const comparisonFilePath = path.join(testsDir, comparisonFileName);
      
      fs.writeFileSync(baselineFilePath, baselineContent);
      fs.writeFileSync(comparisonFilePath, comparisonContent);
      console.log(`Generated: ${baselineFilePath}`);
      console.log(`Generated: ${comparisonFilePath}`);
    }

    console.log('All baseline test files generated successfully!');
  } catch (error) {
    console.error('Error generating test files:', error);
    process.exit(1);
  }
}