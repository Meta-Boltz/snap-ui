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
  viewport?: {
    width: number;
    height: number;
  };
}

/**
 * Comprehensive page preparation for visual testing
 * Based on poc-pixel-match concepts for stable screenshots
 */
export async function prepareForVisualTesting(page: Page, selector?: string): Promise<void> {
  console.log('⏳ Preparing page for visual testing...');
  
  // Disable audio to prevent music/autoplay issues
  await disableAudio(page);
  
  // Wait for page to be fully loaded
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('load');
  
  // Wait for network to be idle with shorter timeout
  try {
    await page.waitForLoadState('networkidle', { timeout: 5000 });
  } catch (error) {
    console.log('⚠️ Network idle timeout - continuing anyway');
  }
  
  // Scroll through entire page to trigger lazy loading
  console.log('🔄 Scrolling through page to load all components...');
  await page.evaluate(() => {
    // Scroll to top first
    window.scrollTo(0, 0);
    // Scroll to bottom to trigger lazy loading
    window.scrollTo(0, document.body.scrollHeight);
    // Brief wait for loading
    return new Promise(resolve => setTimeout(resolve, 1000));
  });
  
  // Scroll back to middle for better positioning
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight / 2);
  });
  
  // Wait for any lazy-loaded content
  await page.waitForTimeout(1000);
  
  // If specific selector provided, prepare that element
  if (selector) {
    await prepareElementForScreenshot(page, selector);
  }
  
  console.log('✅ Page prepared for visual testing');
}

/**
 * Disable audio and autoplay elements to prevent music during tests
 */
async function disableAudio(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Disable all audio and video elements
    const mediaElements = document.querySelectorAll('audio, video');
    mediaElements.forEach((element: any) => {
      element.muted = true;
      element.pause();
      element.autoplay = false;
    });
    
    // Override play method to prevent autoplay
    const originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function() {
      console.log('Audio/video play prevented for testing');
      return Promise.resolve();
    };
  });
}

/**
 * Enhanced element preparation for stable screenshots
 * Ensures element is fully loaded, visible, and stable
 */
export async function prepareElementForScreenshot(page: Page, selector: string): Promise<void> {
  console.log(`🎯 Preparing element for screenshot: ${selector}`);
  
  // Wait for element to be attached and visible
  const locator = page.locator(selector);
  await locator.waitFor({ state: 'attached', timeout: 15000 });
  await locator.waitFor({ state: 'visible', timeout: 15000 });
  
  // Ensure element is stable (wait for animations)
  await page.waitForTimeout(1000);
  
  // Scroll element into view
  await locator.scrollIntoViewIfNeeded();
  
  // Final stability wait
  await page.waitForTimeout(500);
  
  console.log('✅ Element ready for screenshot');
}

/**
 * Wait for lazy components and images to load (legacy - use prepareForVisualTesting)
 */
export async function waitForLazyComponents(page: Page): Promise<void> {
  await prepareForVisualTesting(page);
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
    const testOptions = component.tags && component.tags.length > 0 ? { tag: component.tags } : {};
    test(`${component.name} - Baseline`, testOptions, async ({ page }) => {
      // Comprehensive page preparation
      await prepareForVisualTesting(page, component.selector);
      
      // Run preConditions if provided
      if (component.preConditions) {
        await component.preConditions();
      }
      
      // Apply global force hide selectors
      if (globalForceHideSelectors.length > 0) {
        await hideElements(page, globalForceHideSelectors);
      }
      
      // Apply component-specific force hide selectors
      if (component.forceHide?.selectors) {
        await hideElements(page, component.forceHide.selectors);
      }
      
      // Set viewport if specified
      if (component.viewport) {
        await page.setViewportSize(component.viewport);
      }
      
      // Final element preparation
      await prepareElementForScreenshot(page, component.selector);
      
      // Use locator-based screenshot for precise element targeting
      const locator = page.locator(component.selector);
      const screenshot = await locator.screenshot({
        omitBackground: true
      });
      
      const baselinePath = path.join(process.cwd(), 'screenshots', 'baseline', `${component.id}.png`);
      
      await fs.ensureDir(path.dirname(baselinePath));
      
      await fs.writeFile(baselinePath, screenshot);
      console.log(`✅ Baseline saved: ${component.name}`);
    });
  });
}

export function runVisualTests(components: ComponentConfig[], globalForceHideSelectors: string[] = []) {
  components.forEach((component) => {
    const testOptions = component.tags && component.tags.length > 0 ? { tag: component.tags } : {};
    test(`${component.name}`, testOptions, async ({ page }) => {
      // Comprehensive page preparation
      await prepareForVisualTesting(page, component.selector);
      
      // Run preConditions if provided
      if (component.preConditions) {
        await component.preConditions();
      }
      
      // Apply global force hide selectors
      if (globalForceHideSelectors.length > 0) {
        await hideElements(page, globalForceHideSelectors);
      }
      
      // Apply component-specific force hide selectors
      if (component.forceHide?.selectors) {
        await hideElements(page, component.forceHide.selectors);
      }
      
      // Set viewport if specified
      if (component.viewport) {
        await page.setViewportSize(component.viewport);
      }
      
      // Final element preparation
      await prepareElementForScreenshot(page, component.selector);
      
      // Use locator-based screenshot for precise element targeting
      const locator = page.locator(component.selector);
      const screenshot = await locator.screenshot({
        omitBackground: true
      });
      
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

export function generatePageTags(brandTag: string, pageName: string): string[] {
  return [
    brandTag,
    `@${pageName}`,
    `@${pageName}-regression`,
    `@${pageName}-visual`,
    "@visual-regression"
  ];
}

export function generateComponentTags(brandTag: string, groupName: string, componentName: string): string[] {
  const baseName = componentName.toLowerCase().replace(/\s+/g, '-');
  return [
    brandTag,
    `@${groupName}`,
    `@${groupName}-${baseName}`,
    `@${baseName}`,
    "@component-visual"
  ];
}