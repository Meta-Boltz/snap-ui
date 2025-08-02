import { UITestConfig } from 'snap-ui';

export const uiTestData: UITestConfig = {
  PageList: [
    {
      page: 'home',
      url: 'https://example.com',
      components: [
        {
          name: 'header',
          id: 'header',
          selector: '[data-testid="header"]',
          preConditions: () => Promise.resolve()
        },
        {
          name: 'hero',
          id: 'hero',
          selector: '.hero-section',
          preConditions: () => Promise.resolve()
        },
        {
          name: 'footer',
          id: 'footer',
          selector: '[data-testid="footer"]',
          preConditions: () => Promise.resolve()
        }
      ]
    },
    {
      page: 'product',
      url: 'https://example.com/product/123',
      components: [
        {
          name: 'product-image',
          id: 'product-image',
          selector: '[data-testid="product-image"]',
          preConditions: () => Promise.resolve()
        },
        {
          name: 'product-info',
          id: 'product-info',
          selector: '.product-info',
          preConditions: () => Promise.resolve()
        },
        {
          name: 'add-to-cart',
          id: 'add-to-cart',
          selector: '[data-testid="add-to-cart"]',
          preConditions: () => Promise.resolve()
        }
      ]
    }
  ],
  ForceHideSelectors: [
    '.advertisement',
    '[data-testid="chat-widget"]',
    '.cookie-banner'
  ]
};