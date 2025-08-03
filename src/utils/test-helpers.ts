import { test, Page } from '@playwright/test';
import fs from 'fs-extra';
import * as path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

interface ComponentConfig {
  name: string;
  id: string;
  selector: string;
  tags?: string[];
  forceHide?: {
    type: 'display' | 'visibility';
    selectors: string[];
    excludes?: string[];
  };
  preConditions?: () => Promise<void>;
}

export async function waitForLazyComponents(page: Page): Promise<void> {
  // Wait for network to be idle
  await page.waitForLoadState('networkidle');
  
  // Wait for common lazy loading indicators
  await page.waitForSelector('[data-testid], .loaded, .ready', { state: 'attached', timeout: 10000 }).catch(() => {});
  
  // Additional wait for images to load
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const images = Array.from(document.images);
      if (images.length === 0) return resolve();
      
      let loadedCount = 0;
      images.forEach(img => {
        if (img.complete) {
          loadedCount++;
        } else {
          img.addEventListener('load', () => { loadedCount++; });
        img.addEventListener('error', () => { loadedCount++; });
        }
      });
      
      if (loadedCount === images.length) {
        resolve();
      } else {
        const checkInterval = setInterval(() => {
          if (Array.from(document.images).every(img => img.complete)) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 5000);
      }
    });
  });
}

export async function hideElements(page: Page, selectors: string[]): Promise<void> {
  if (!selectors || selectors.length === 0) return;
  
  await page.evaluate((selectors: string[]) => {
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (el instanceof HTMLElement) {
          el.style.display = 'none';
        }
      });
    });
  }, selectors);
}

export function updateVisualBaseline(components: ComponentConfig[], globalForceHideSelectors: string[] = []) {
  components.forEach((component) => {
    test(`${component.name} - Baseline`, async ({ page }) => {
      // Wait for lazy components
      await waitForLazyComponents(page);
      
      // Run preConditions if provided
      if (component.preConditions) {
        await component.preConditions();
      }
      
      // Find the element
      const element = await page.waitForSelector(component.selector, { timeout: 10000 });
      
      // Apply global force hide selectors
      if (globalForceHideSelectors.length > 0) {
        await hideElements(page, globalForceHideSelectors);
      }
      
      // Apply component-specific force hide selectors
      if (component.forceHide?.selectors) {
        await hideElements(page, component.forceHide.selectors);
      }
      
      const screenshot = await element.screenshot();
      
      const baselinePath = path.join(process.cwd(), 'screenshots', 'baseline', `${component.id}.png`);
      
      await fs.ensureDir(path.dirname(baselinePath));
      
      await fs.writeFile(baselinePath, screenshot);
      console.log(`✅ Baseline saved: ${component.name}`);
    });
  });
}

export function runVisualTests(components: ComponentConfig[], globalForceHideSelectors: string[] = []) {
  components.forEach((component) => {
    test(`${component.name}`, async ({ page }) => {
      // Wait for lazy components
      await waitForLazyComponents(page);
      
      // Run preConditions if provided
      if (component.preConditions) {
        await component.preConditions();
      }
      
      // Find the element
      const element = await page.waitForSelector(component.selector, { timeout: 10000 });
      
      // Apply global force hide selectors
      if (globalForceHideSelectors.length > 0) {
        await hideElements(page, globalForceHideSelectors);
      }
      
      // Apply component-specific force hide selectors
      if (component.forceHide?.selectors) {
        await hideElements(page, component.forceHide.selectors);
      }
      
      const screenshot = await element.screenshot();
      
      const baselinePath = path.join(process.cwd(), 'screenshots', 'baseline', `${component.id}.png`);
      const actualPath = path.join(process.cwd(), 'screenshots', 'actual', `${component.id}.png`);
      const diffPath = path.join(process.cwd(), 'screenshots', 'diff', `${component.id}.png`);
      
      await fs.ensureDir(path.dirname(baselinePath));
      await fs.ensureDir(path.dirname(actualPath));
      await fs.ensureDir(path.dirname(diffPath));
      
      if (await fs.pathExists(baselinePath)) {
        const baseline = PNG.sync.read(await fs.readFile(baselinePath));
        const actual = PNG.sync.read(screenshot);
        
        const { width, height } = baseline;
        const diff = new PNG({ width, height });
        
        const numDiffPixels = pixelmatch(baseline.data, actual.data, diff.data, width, height, { threshold: 0.1 });
        
        if (numDiffPixels > 0) {
          await fs.writeFile(actualPath, screenshot);
          await fs.writeFile(diffPath, PNG.sync.write(diff));
          throw new Error(`Visual regression detected for "${component.name}". ${numDiffPixels} pixels differ.`);
        } else {
          // Test passed, clean up the actual screenshot
          if (await fs.pathExists(actualPath)) {
            await fs.remove(actualPath);
          }
          console.log(`✅ No visual changes: ${component.name}`);
        }
      } else {
        throw new Error(`No baseline found for "${component.name}". Please run baseline generation first.`);
      }
    });
  });
}