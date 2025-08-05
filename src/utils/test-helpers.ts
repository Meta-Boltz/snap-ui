import { test, Page, TestInfo } from '@playwright/test';
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


export async function takeScreenshot(page: Page, component: ComponentConfig, projectName: string, globalForceHideSelectors: string[] = []): Promise<Buffer> {
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
  return locator.screenshot({
    omitBackground: true
  });
}

export async function updateVisualBaseline({ page, testInfo, component, forceHideSelectors: globalForceHideSelectors = [] }: { page: Page; testInfo: TestInfo; component: ComponentConfig; forceHideSelectors?: string[]; }) {
  const projectName = testInfo.project.name;
  const screenshot = await takeScreenshot(page, component, projectName, globalForceHideSelectors);
  const baselinePath = path.join(process.cwd(), 'screenshots', 'baseline', `${component.id}-${projectName}.png`);
  await fs.ensureDir(path.dirname(baselinePath));
  await fs.writeFile(baselinePath, screenshot);
  console.log(`✅ Baseline saved: ${component.name}`);
}

export async function runVisualTests({ page, testInfo, component, forceHideSelectors: globalForceHideSelectors = [] }: { page: Page; testInfo: TestInfo; component: ComponentConfig; forceHideSelectors?: string[]; }) {
  const projectName = testInfo.project.name;
  const actualScreenshot = await takeScreenshot(page, component, projectName, globalForceHideSelectors);

  const baselinePath = path.join(process.cwd(), 'screenshots', 'baseline', `${component.id}-${projectName}.png`);
  const actualPath = path.join(process.cwd(), 'screenshots', 'actual', `${component.id}-${projectName}.png`);
  const diffPath = path.join(process.cwd(), 'screenshots', 'diff', `${component.id}-${projectName}.png`);

  await fs.ensureDir(path.dirname(actualPath));
  await fs.writeFile(actualPath, actualScreenshot);

  if (!fs.existsSync(baselinePath)) {
    test.fail(true, `Baseline image not found at ${baselinePath}. Please run baseline tests first.`);
    return; // test.fail throws, but for clarity
  }

  const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
  const actual = PNG.sync.read(actualScreenshot);

  console.log(`[${projectName}] Component: ${component.name} - Baseline dimensions: ${baseline.width}x${baseline.height}`);
  console.log(`[${projectName}] Component: ${component.name} - Actual dimensions: ${actual.width}x${actual.height}`);

  if (baseline.width !== actual.width || baseline.height !== actual.height) {
    test.fail(true, `Screenshot dimensions do not match for ${component.name}. Baseline: ${baseline.width}x${baseline.height}, Actual: ${actual.width}x${actual.height}`);
    return;
  }

  const { width, height } = baseline;

  // Create a blended image for the background of the diff
  const blended = new PNG({ width, height });
  for (let i = 0; i < baseline.data.length; i += 4) {
    const alpha = 0.2; // 20% opacity for the actual image
    blended.data[i] = baseline.data[i] * (1 - alpha) + actual.data[i] * alpha;
    blended.data[i + 1] = baseline.data[i + 1] * (1 - alpha) + actual.data[i + 1] * alpha;
    blended.data[i + 2] = baseline.data[i + 2] * (1 - alpha) + actual.data[i + 2] * alpha;
    blended.data[i + 3] = Math.max(baseline.data[i + 3], actual.data[i + 3]);
  }

  // Create a diff mask
  const diff = new PNG({ width, height });
  console.log(`[${projectName}] Component: ${component.name} - Running pixelmatch...`);
  const numDiffPixels = pixelmatch(baseline.data, actual.data, diff.data, width, height, {
    threshold: 0.1,
    diffMask: true, // Create a mask with only the differing pixels
  });
  console.log(`[${projectName}] Component: ${component.name} - Pixelmatch complete.`);

  console.log(`[${projectName}] Component: ${component.name} - Diff pixels: ${numDiffPixels}`);

  if (numDiffPixels > 0) {
    console.log(`[${projectName}] Component: ${component.name} - Mismatch detected. Saving diff image to ${diffPath}`);

    // Composite the diff mask over the blended image
    for (let i = 0; i < diff.data.length; i += 4) {
      if (diff.data[i + 3] > 0) { // If the diff pixel is not transparent
        blended.data[i] = diff.data[i];
        blended.data[i + 1] = diff.data[i + 1];
        blended.data[i + 2] = diff.data[i + 2];
        blended.data[i + 3] = diff.data[i + 3];
      }
    }

    try {
      console.log(`[${projectName}] Component: ${component.name} - Attempting to save diff image...`);
      fs.ensureDirSync(path.dirname(diffPath));
      fs.writeFileSync(diffPath, PNG.sync.write(blended));
      console.log(`[${projectName}] Component: ${component.name} - Diff image saved successfully to ${diffPath}`);
    } catch (error) {
      console.error(`[${projectName}] Component: ${component.name} - FAILED to save diff image:`, error);
    }
    test.fail(true, `Visual regression failed: ${numDiffPixels} pixels differ.`);
  } else {
    // Test passed, cleanup screenshots
    if (fs.existsSync(actualPath)) {
      fs.unlinkSync(actualPath);
      console.log(`[${projectName}] Component: ${component.name} - Test passed. Cleaned up actual screenshot.`);
    }
    if (fs.existsSync(diffPath)) {
      fs.unlinkSync(diffPath);
      console.log(`[${projectName}] Component: ${component.name} - Test passed. Cleaned up old diff screenshot.`);
    }
  }
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