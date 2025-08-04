import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import os from 'os';
import { execSync } from 'child_process';

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
      console.log('Loading data from TypeScript file...');
      
      // Use a more robust approach by temporarily compiling the TypeScript file
      const tempDir = path.join(os.tmpdir(), 'snap-ui-compile-' + Date.now());
      
      try {
        fs.mkdirSync(tempDir, { recursive: true });
        
        // Copy the data file to temp directory
        const tempDataPath = path.join(tempDir, 'ui-test-data.ts');
        fs.copyFileSync(dataPath, tempDataPath);
        
        // Compile TypeScript to JavaScript with better configuration
        try {
          // Create a temporary tsconfig for compilation
          const tempTsConfig = path.join(tempDir, 'tsconfig.json');
          const tsConfigContent = {
            compilerOptions: {
              target: 'ES2020',
              module: 'CommonJS',
              esModuleInterop: true,
              skipLibCheck: true,
              allowSyntheticDefaultImports: true,
              resolveJsonModule: true,
              moduleResolution: 'node',
              strict: false,
              noImplicitAny: false,
              paths: {
                "@meta-boltz/snap-ui": [path.join(__dirname, '../../dist/index.js')]
              }
            },
            include: ['ui-test-data.ts']
          };
          fs.writeFileSync(tempTsConfig, JSON.stringify(tsConfigContent, null, 2));
          
          execSync(`npx tsc --project ${tempTsConfig}`, { 
            stdio: 'pipe',
            cwd: process.cwd()
          });
          
          // Import the compiled JavaScript
          const compiledPath = path.join(tempDir, 'ui-test-data.js');
          // Convert to file URL for ESM compatibility on Windows
          const fileUrl = 'file://' + compiledPath.replace(/\\/g, '/');
          const dataModule = await import(fileUrl);
          
          PageList = dataModule.PageList || [];
          ForceHideSelectors = dataModule.ForceHideSelectors || [];
          
          if (PageList.length === 0) {
            console.warn('Compiled successfully but PageList is empty');
          }
        } catch (compileError) {
          console.warn('TypeScript compilation failed, attempting manual parsing...');
          console.warn('Compilation error:', (compileError as Error).message || compileError);
          
          // Create a simplified version by removing TypeScript-specific syntax
          const fileContent = fs.readFileSync(dataPath, 'utf8');
          
          // Simple approach: create a basic JS file with the data
          const simplifiedContent = fileContent
            .replace(/:\s*\w+(\[\])?/g, '') // Remove type annotations
            .replace(/:\s*\{[^}]*\}/g, '')
            .replace(/:\s*\([^)]*\)\s*=>\s*[^,\]}]+/g, '')
            .replace(/\bas\s+const/g, '')
            .replace(/\bconst\s+\w+\s*=\s*[^;]+;/g, '')
            .replace(/\bfunction\s+\w+\s*\([^)]*\)\s*\{[^}]*\}/g, '')
            .replace(/\basync\s+\([^)]*\)\s*=>\s*\{[^}]*\}/g, '')
            .replace(/\([^)]*\)\s*=>\s*[^,\]}]+/g, 'null');
          
          const simplifiedPath = path.join(tempDir, 'ui-test-data.js');
          fs.writeFileSync(simplifiedPath, simplifiedContent);
          
          try {
            const fileUrl = 'file://' + simplifiedPath.replace(/\\/g, '/');
            const dataModule = await import(fileUrl);
            PageList = dataModule.PageList || [];
            ForceHideSelectors = dataModule.ForceHideSelectors || [];
          } catch (importError) {
            console.warn('Simplified parsing also failed:', (importError as Error).message || importError);
          }
        }
        
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
        
      } catch (e: any) {
         console.warn('Could not compile TypeScript, using fallback data:', e.message || e);
      } finally {
        // Clean up temp directory
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      }
    } else if (fs.existsSync(jsDataPath)) {
      // Use dynamic import for JS file
      const jsFileUrl = 'file://' + jsDataPath.replace(/\\/g, '/');
      const { PageList: PL, ForceHideSelectors: FHS } = await import(jsFileUrl);
      PageList = PL;
      ForceHideSelectors = FHS;
    } else {
      console.error('No ui-test-data.ts or ui-test-data.js found in data directory');
      process.exit(1);
    }
    
    if (!PageList || PageList.length === 0) {
      console.warn('No PageList data found, creating example configuration...');
      
      // Create a simple example configuration
      PageList = [
        {
          page: 'example',
          url: 'https://example.com',
          components: [
            {
              group: 'example',
              name: 'Header',
              id: 'header',
              selector: 'header',
              tags: ['@example', '@header']
            },
            {
              group: 'example',
              name: 'Main Content',
              id: 'main-content',
              selector: 'main',
              tags: ['@example', '@main']
            }
          ]
        }
      ];
      ForceHideSelectors = [];
      
      console.warn('Using example configuration. Please update data/ui-test-data.ts with your actual configuration.');
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