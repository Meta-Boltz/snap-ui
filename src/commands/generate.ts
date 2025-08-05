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
            execSync(`npx tsc ${tempConfigPath} --target es2020 --module es2020 --outDir ${tempDir} --skipLibCheck --allowSyntheticDefaultImports --noResolve`, { 
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
          const content = fs.readFileSync(dataPath, 'utf8');
          
          // Try to extract PageList using regex - look for the array structure
          const pageListStart = content.indexOf('export const PageList');
          if (pageListStart !== -1) {
            const arrayStart = content.indexOf('[', pageListStart);
            if (arrayStart !== -1) {
              let braceCount = 0;
              let bracketCount = 1;
              let i = arrayStart + 1;
              
              while (i < content.length && (bracketCount > 0 || braceCount > 0)) {
                if (content[i] === '[') bracketCount++;
                if (content[i] === ']') bracketCount--;
                if (content[i] === '{') braceCount++;
                if (content[i] === '}') braceCount--;
                i++;
              }
              
              if (bracketCount === 0 && braceCount === 0) {
                const pageListStr = content.substring(arrayStart, i);
                try {
                  // Clean and parse the structure
                  let cleanStr = pageListStr
                    .replace(/'/g, '"')
                    .replace(/,\s*}/g, '}')
                    .replace(/,\s*\]/g, ']')
                    .replace(/\/\*[\s\S]*?\*\//g, '')
                    .replace(/\/\/.*$/gm, '');
                  
                  // Handle function calls by replacing them with empty arrays
                  cleanStr = cleanStr.replace(/generatePageTags\([^)]*\)/g, '[]')
                                   .replace(/generateComponentTags\([^)]*\)/g, '[]');
                  
                  PageList = JSON.parse(cleanStr);
                } catch (parseError) {
                  console.warn('Failed to parse PageList:', parseError);
                }
              }
            }
          }
          
          // Try to extract ForceHideSelectors
          const forceHideStart = content.indexOf('export const ForceHideSelectors');
          if (forceHideStart !== -1) {
            const arrayStart = content.indexOf('[', forceHideStart);
            if (arrayStart !== -1) {
              const arrayEnd = content.indexOf(']', arrayStart);
              if (arrayEnd !== -1) {
                const forceHideStr = content.substring(arrayStart, arrayEnd + 1);
                try {
                  let cleanStr = forceHideStr
                    .replace(/'/g, '"')
                    .replace(/,\s*\]/g, ']')
                    .replace(/\/\*[\s\S]*?\*\//g, '')
                    .replace(/\/\/.*$/gm, '');
                  ForceHideSelectors = JSON.parse(cleanStr);
                } catch (parseError) {
                  console.warn('Failed to parse ForceHideSelectors:', parseError);
                }
              }
            }
          }
          
          // If still no PageList, try to extract from PageList array
          if (!PageList || PageList.length === 0) {
            // Enhanced regex-based extraction for complex nested structures
            const content = fs.readFileSync(dataPath, 'utf8');
            
            // Method 1: Try to extract complete PageList array
            const pageListMatch = content.match(/export const PageList:\s*PageConfig\[]\s*=\s*(\[[\s\S]*?\]);/);
            if (pageListMatch) {
              try {
                let cleanStr = pageListMatch[1];
                
                // Remove comments
                cleanStr = cleanStr.replace(/\/\*[\s\S]*?\*\//g, '');
                cleanStr = cleanStr.replace(/\/\/.*$/gm, '');
                
                // Replace function calls with proper arrays
                cleanStr = cleanStr.replace(/generatePageTags\([^)]*\)/g, '["@snap-ui"]');
                cleanStr = cleanStr.replace(/generateComponentTags\([^)]*\)/g, '["@snap-ui"]');
                
                // Handle forceHide objects - simplify to just selectors array
                cleanStr = cleanStr.replace(/forceHide:\s*{[^}]*selectors:\s*\[([^\]]*)\][^}]*}/g, 'forceHide: [$1]');
                
                // Handle trailing commas
                cleanStr = cleanStr.replace(/,(\s*[}\]])/g, '$1');
                
                // Replace single quotes with double quotes
                cleanStr = cleanStr.replace(/'/g, '"');
                
                // Ensure proper JSON format
                cleanStr = cleanStr.trim();
                
                PageList = JSON.parse(cleanStr);
              } catch (parseError) {
                // Silently fallback to manual extraction methods
              }
            }
            
            // Method 2: If JSON parsing fails, extract page objects manually
            if (!PageList || PageList.length === 0) {
              const pageObjects = [];
              
              // Extract page objects with their components
              const pageRegex = /{\s*page:\s*["']([^"']+)["'][\s\S]*?url:\s*["']([^"']+)["'][\s\S]*?components:\s*\[([\s\S]*?)\][\s\S]*?}/g;
              
              let pageMatch;
              while ((pageMatch = pageRegex.exec(content)) !== null) {
                const page = pageMatch[1];
                const url = pageMatch[2];
                const componentsStr = pageMatch[3];
                
                // Extract components from the components array
                const components = [];
                const compRegex = /{\s*group:\s*["']([^"']+)["'][\s\S]*?name:\s*["']([^"']+)["'][\s\S]*?selector:\s*["']([^"']+)["'][\s\S]*?}/g;
                
                let compMatch;
                while ((compMatch = compRegex.exec(componentsStr)) !== null) {
                  components.push({
                    group: compMatch[1],
                    name: compMatch[2],
                    selector: compMatch[3]
                  });
                }
                
                // If no components found, add a default one
                if (components.length === 0) {
                  components.push({ name: 'main', selector: 'body' });
                }
                
                pageObjects.push({
                  page,
                  url,
                  components
                });
              }
              
              if (pageObjects.length > 0) {
                PageList = pageObjects;
              } else {
                // Method 3: Ultra-simple fallback - just extract page/url pairs
                const simplePages = [];
                const simpleRegex = /{\s*page:\s*["']([^"']+)["'][\s\S]*?url:\s*["']([^"']+)["'][\s\S]*?}/g;
                
                let simpleMatch;
                while ((simpleMatch = simpleRegex.exec(content)) !== null) {
                  simplePages.push({
                    page: simpleMatch[1],
                    url: simpleMatch[2],
                    components: [{ name: 'main', selector: 'body' }]
                  });
                }
                
                PageList = simplePages;
              }
            }
          }
          
          if (!ForceHideSelectors || ForceHideSelectors.length === 0) {
            ForceHideSelectors = [
              '.cookie-banner',
              '.chat-widget',
              '.live-chat',
              '[data-test="advertisement"]'
            ];
          }
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
import type { PageConfig, ComponentConfig } from '@meta-boltz/snap-ui';

const pageConfig = PageList.find((p: PageConfig) => p.page === '${pageName}');
const components = pageConfig?.components || [];
const forceHideSelectors: string[] = ForceHideSelectors;

test.describe('${pageName} - Visual Baseline', () => {
  test.beforeEach(async ({ page }) => {
    if (!pageConfig) {
      throw new Error('Page configuration not found for ${pageName}');
    }
    await page.goto(pageConfig!.url);
    
    // Hide elements that should not be part of visual comparison
    for (const selector of forceHideSelectors) {
      await page.addStyleTag({
        content: \`\${selector} { display: none !important; }\`
      });
    }
  });

  for (const component of components) {
    test(component.name + ' - Visual Baseline', async ({ page }, testInfo) => {
      await updateVisualBaseline({ page, testInfo, component, forceHideSelectors });
    });
  }
});`;

      // Generate comparison test file content
      const specContent = `import { test, expect } from '@playwright/test';
import { runVisualTests } from '@meta-boltz/snap-ui';
import { PageList, ForceHideSelectors } from '../../data/ui-test-data';
import type { PageConfig, ComponentConfig } from '@meta-boltz/snap-ui';

const pageConfig = PageList.find((p: PageConfig) => p.page === '${pageName}');
const components = pageConfig?.components || [];
const forceHideSelectors: string[] = ForceHideSelectors;

test.describe('${pageName} - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    if (!pageConfig) {
      throw new Error('Page configuration not found for ${pageName}');
    }
    await page.goto(pageConfig!.url);
    
    // Hide elements that should not be part of visual comparison
    for (const selector of forceHideSelectors) {
      await page.addStyleTag({
        content: \`\${selector} { display: none !important; }\`
      });
    }
  });

  for (const component of components) {
    test(component.name + ' - Visual Regression', async ({ page }, testInfo) => {
      await runVisualTests({ page, testInfo, component, forceHideSelectors });
    });
  }
});`;

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