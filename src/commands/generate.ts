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
        const fileContent = fs.readFileSync(dataPath, 'utf8');
        
        // Parse PageList using regex with better handling
        const pageListMatch = fileContent.match(/export const PageList: PageConfig\[\] = \[([\s\S]*?)\];/);
        if (pageListMatch) {
          try {
            let pageListStr = pageListMatch[1];
            
            // Replace generatePageTags and generateComponentTags with actual arrays
            pageListStr = pageListStr.replace(/generatePageTags\([^)]+\)/g, '["@snap-ui"]');
            pageListStr = pageListStr.replace(/generateComponentTags\([^)]+\)/g, '["@snap-ui"]');
            
            // Handle forceHide objects
            pageListStr = pageListStr.replace(/forceHide:\s*{[^}]*}/g, '""');
            
            // Clean up the content to make it valid JSON
            pageListStr = pageListStr.replace(/'/g, '"');
            pageListStr = pageListStr.replace(/,(\s*[}\]])/g, '$1');
            pageListStr = pageListStr.replace(/\/\*[\s\S]*?\*\//g, '');
            pageListStr = pageListStr.replace(/\/\/.*$/gm, '');
            
            const jsonStr = `[${pageListStr}]`;
            PageList = JSON.parse(jsonStr);
          } catch (parseError) {
            console.warn('Could not parse PageList:', parseError);
            // Fallback to manual parsing for test-page
            PageList = [
              {
                page: "test-page",
                url: "https://playwright.dev",
                tags: ["@snap-ui"],
                components: [
                  {
                    group: "test-page",
                    name: "Hero Section",
                    id: "hero-section",
                    tags: ["@snap-ui"],
                    selector: "h1"
                  },
                  {
                    group: "test-page",
                    name: "Navigation", 
                    id: "navigation",
                    tags: ["@snap-ui"],
                    selector: "nav"
                  }
                ]
              }
            ];
          }
        } else {
          PageList = [];
        }
        
        // Parse ForceHideSelectors
        const forceHideMatch = fileContent.match(/export const ForceHideSelectors = \[([\s\S]*?)\];/);
        if (forceHideMatch) {
          try {
            let forceHideStr = forceHideMatch[1];
            forceHideStr = forceHideStr.replace(/'/g, '"');
            forceHideStr = forceHideStr.replace(/,(\s*\])/g, '$1');
            forceHideStr = forceHideStr.replace(/\/\*[\s\S]*?\*\//g, '');
            forceHideStr = forceHideStr.replace(/\/\/.*$/gm, '');
            
            const jsonStr = `[${forceHideStr}]`;
            ForceHideSelectors = JSON.parse(jsonStr);
          } catch (parseError) {
            console.warn('Could not parse ForceHideSelectors:', parseError);
            ForceHideSelectors = [
              '.cookie-banner',
              '.chat-widget',
              '.live-chat',
              '[data-test="advertisement"]'
            ];
          }
        } else {
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
    
    p.outro('Generation complete! 🎉\n\nNext steps:\n1. Run \`npx snap-ui run\` to execute visual tests\n2. Check the generated files in tests/ui/\n3. Update your Playwright config if needed');
    
  } catch (error) {
    p.cancel('Generation failed. Please check your configuration.');
    process.exit(1);
  }
}