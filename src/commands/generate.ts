import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import os from 'os';
import { execSync } from 'child_process';
import * as p from '@clack/prompts';
import { setTimeout } from 'timers/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function generate() {
  console.clear();
  p.intro('🎯 snap-ui test file generator');
  
  const s = p.spinner();
  s.start('Loading test configuration...');
  
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
      try {
        // Use a more robust approach: compile TypeScript to JavaScript
        const { execSync } = await import('child_process');
        const os = await import('os');
        const fsExtra = await import('fs-extra');
        
        // Create a temporary directory for compilation
        const tempDir = path.join(os.tmpdir(), 'snap-ui-temp-' + Date.now());
        await fsExtra.ensureDir(tempDir);
        
        // Copy the config file to temp directory
        const tempConfigPath = path.join(tempDir, 'ui-test-data.ts');
        await fsExtra.copy(dataPath, tempConfigPath);
        
        // Compile TypeScript to JavaScript using npx
        try {
          execSync(`npx tsc ${tempConfigPath} --target es2020 --module commonjs --outDir ${tempDir} --skipLibCheck --allowSyntheticDefaultImports`, { 
            stdio: 'pipe',
            cwd: process.cwd()
          });
          
          // Import the compiled JavaScript config file
          const jsConfigPath = path.join(tempDir, 'ui-test-data.js');
          const configUrl = 'file://' + jsConfigPath.replace(/\\/g, '/');
          const module = await import(configUrl);
          
          PageList = module.PageList || [];
          ForceHideSelectors = module.ForceHideSelectors || [
            '.cookie-banner',
            '.chat-widget',
            '.live-chat',
            '[data-test="advertisement"]'
          ];
          
          // Clean up temp directory
          await fsExtra.remove(tempDir);
        } catch (compileError) {
          console.warn('TypeScript compilation failed, using fallback parsing...');
          
          // Clean up temp directory
           await fsExtra.remove(tempDir);
          
          // Fallback to basic regex parsing for simple cases
          const fileContent = fs.readFileSync(dataPath, 'utf8');
          
          // Simple parsing for basic structure
          const urlMatch = fileContent.match(/url:\s*["']([^"']+)["']/);
          const pageMatch = fileContent.match(/page:\s*["']([^"']+)["']/);
          
          if (urlMatch && pageMatch) {
            PageList = [{
              page: pageMatch[1],
              url: urlMatch[1],
              components: []
            }];
          } else {
            PageList = [];
          }
          
          ForceHideSelectors = [
            '.cookie-banner',
            '.chat-widget',
            '.live-chat',
            '[data-test="advertisement"]'
          ];
        }
      } catch (e: any) {
        console.warn('Could not read configuration file:', e.message || e);
        PageList = [];
      }
    } else if (fs.existsSync(jsDataPath)) {
      const jsFileUrl = 'file://' + jsDataPath.replace(/\\/g, '/');
      const { PageList: PL, ForceHideSelectors: FHS } = await import(jsFileUrl);
      PageList = PL;
      ForceHideSelectors = FHS;
    } else {
      s.stop('Configuration file not found');
      p.cancel('No ui-test-data.ts or ui-test-data.js found in data directory');
      process.exit(1);
    }
    
    if (!PageList || PageList.length === 0) {
      s.stop('No configuration found');
      
      const useExample = await p.confirm({
        message: 'No PageList data found. Use example configuration?',
        initialValue: true
      });
      
      if (p.isCancel(useExample) || !useExample) {
        p.cancel('Please update data/ui-test-data.ts with your actual configuration');
        process.exit(0);
      }
      
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
    }

    // Process and normalize data
    PageList = PageList.map((page: any) => ({
      ...page,
      components: (page.components || page.ComponentList || []).map((comp: any) => ({
        ...comp,
        group: comp.group || comp.page || page.page
      }))
    }));

    // Create tests directory if it doesn't exist
    const testsDir = path.join(cwd, 'tests', 'ui');
    if (!fs.existsSync(testsDir)) {
      fs.mkdirSync(testsDir, { recursive: true });
    }

    // Check for existing files
    const existingFiles: string[] = [];
    const filesToGenerate: Array<{ path: string; name: string; content: string }> = [];

    s.stop('Configuration loaded');

    // Prepare files to generate
    for (const pageConfig of PageList) {
      const pageName = pageConfig.page;
      
      if (!pageConfig.components || pageConfig.components.length === 0) {
        continue;
      }
      
      const baselineFileName = `${pageName}.baseline.spec.ts`;
      const specFileName = `${pageName}.spec.ts`;
      
      const baselinePath = path.join(testsDir, baselineFileName);
      const specPath = path.join(testsDir, specFileName);
      
      // Generate baseline test file content
      const baselineContent = `import { test, expect } from '@playwright/test';
import { updateVisualBaseline } from '@meta-boltz/snap-ui';
import { PageList, ForceHideSelectors } from '../../data/ui-test-data';

const pageConfig = PageList.find(p => p.page === '${pageName}');
const forceHideSelectors = ForceHideSelectors;

test.describe('${pageName} - Visual Baseline', () => {
  test.beforeEach(async ({ page }) => {
    if (!pageConfig) {
      throw new Error('Page configuration not found for ${pageName}');
    }
    await page.goto(pageConfig.url);
    
    // Hide elements that should not be part of visual comparison
    for (const selector of forceHideSelectors) {
      await page.addStyleTag({
        content: \`\${selector} { display: none !important; }\`
      });
    }
  });

  pageConfig.components.forEach(component => {
    test(\`capture \${component.name}\`, async ({ page }) => {
      const element = page.locator(component.selector);
      await expect(element).toBeVisible();
      
      // Hide component-specific elements
      if (component.forceHide && component.forceHide.length > 0) {
        for (const selector of component.forceHide) {
          await page.addStyleTag({
            content: \`\${selector} { display: none !important; }\`
          });
        }
      }

      await updateVisualBaseline(page, component, pageConfig.page);
    });
  });
});
`;

      // Generate comparison test file content
      const specContent = `import { test, expect } from '@playwright/test';
import { runVisualTests } from '@meta-boltz/snap-ui';
import { PageList, ForceHideSelectors } from '../../data/ui-test-data';

const pageConfig = PageList.find(p => p.page === '${pageName}');
const forceHideSelectors = ForceHideSelectors;

test.describe('${pageName} - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    if (!pageConfig) {
      throw new Error('Page configuration not found for ${pageName}');
    }
    await page.goto(pageConfig.url);
    
    // Hide elements that should not be part of visual comparison
    for (const selector of forceHideSelectors) {
      await page.addStyleTag({
        content: \`\${selector} { display: none !important; }\`
      });
    }
  });

  pageConfig.components.forEach(component => {
    test(\`compare \${component.name}\`, async ({ page }) => {
      const element = page.locator(component.selector);
      await expect(element).toBeVisible();
      
      // Hide component-specific elements
      if (component.forceHide && component.forceHide.length > 0) {
        for (const selector of component.forceHide) {
          await page.addStyleTag({
            content: \`\${selector} { display: none !important; }\`
          });
        }
      }

      await runVisualTests(page, component, pageConfig.page);
    });
  });
});
`;

      if (fs.existsSync(baselinePath)) existingFiles.push(baselineFileName);
      if (fs.existsSync(specPath)) existingFiles.push(specFileName);
      
      filesToGenerate.push(
        { path: baselinePath, name: baselineFileName, content: baselineContent },
        { path: specPath, name: specFileName, content: specContent }
      );
    }

    if (existingFiles.length > 0) {
      const overwrite = await p.confirm({
        message: `${existingFiles.length} test file(s) already exist. Overwrite?`,
        initialValue: false
      });
      
      if (p.isCancel(overwrite)) {
        p.cancel('Generation cancelled');
        process.exit(0);
      }
      
      if (!overwrite) {
        p.note('Skipping existing files. No changes made.', 'Files Preserved');
        p.outro('Generation complete!');
        return;
      }
    }

    const progress = p.spinner();
    progress.start('Generating test files...');

    let generatedCount = 0;
    
    for (const file of filesToGenerate) {
      fs.writeFileSync(file.path, file.content);
      generatedCount++;
    }

    await setTimeout(1000);
    progress.stop(`Generated ${generatedCount} test files`);

    const generatedFiles = filesToGenerate.map(f => `📄 ${f.name}`).join('\n');
    p.note(generatedFiles, 'Generated Files');
    
    p.outro('Generation complete! 🎉\n\nNext steps:\n1. Run `npx snap-ui run` to execute visual tests\n2. Check the generated files in tests/ui/\n3. Update your Playwright config if needed');
    
  } catch (error) {
    p.cancel('Generation failed. Please check your configuration.');
    process.exit(1);
  }
}