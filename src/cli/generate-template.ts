import fs from 'fs-extra';
import * as path from 'path';

export async function generateTemplate() {
  const templateContent = `import type { ComponentConfig, PageConfig, UITestConfig } from '../../../packages/snap-ui/src/types/ui-test-config.js';

export const uiTestData: UITestConfig = {
  PageList: [
    {
      page: 'home',
      url: 'https://example.com/',
      components: [
        {
          name: 'Hero Banner',
          id: 'hero-banner',
          selector: '.hero-banner'
        },
        {
          name: 'Navigation Menu',
          id: 'main-nav',
          selector: '#main-navigation',
          forceHide: {
            type: 'display',
            selectors: ['.cookie-banner', '.notification-bar'],
            excludes: ['.user-menu']
          }
        }
      ]
    },
    {
      page: 'product',
      url: 'https://example.com/products/sample-product',
      components: [
        {
          name: 'Product Images',
          id: 'product-images',
          selector: '.product-gallery'
        },
        {
          name: 'Add to Cart Button',
          id: 'add-to-cart',
          selector: '[data-testid="add-to-cart"]',
          forceHide: {
            type: 'visibility',
            selectors: ['.chat-widget', '.promo-popup']
          },
          preConditions: async () => {
            // Example: Select size before taking screenshot
            // await page.selectOption('#size-select', 'medium');
            // await page.click('#color-variant');
            console.log('Add your pre-conditions here');
          }
        }
      ]
    }
  ],
  ForceHideSelectors: [
    '.cookie-banner',
    '.notification-bar',
    '.chat-widget',
    '.promo-popup',
    '#onetrust-consent-sdk'
  ]
};
`;

  const outputPath = path.join(process.cwd(), 'data', 'ui-test-data.ts');
  
  if (await fs.pathExists(outputPath)) {
    console.log('ui-test-data.ts already exists. Use --force to overwrite.');
    return;
  }

  await fs.ensureDir(path.dirname(outputPath));
  await fs.writeFile(outputPath, templateContent);
  console.log(`Template generated at: ${outputPath}`);
}