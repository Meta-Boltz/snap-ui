/**
 * Snap UI Test Data Configuration
 * 
 * This file defines the pages and components to test with visual regression testing.
 * 
 * Expected format:
 * export const PageList: PageConfig[] = [...]
 * export const ForceHideSelectors: string[] = [...] (optional)
 */

export interface ComponentConfig {
  group: string;
  name: string;
  id: string;
  selector: string;
  tags?: string[];
  waitForSelector?: string;
  waitForTimeout?: number;
  viewport?: {
    width: number;
    height: number;
  };
  fullPage?: boolean;
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface PageConfig {
  page: string;
  url: string;
  components: ComponentConfig[];
  beforeScreenshot?: () => Promise<void>;
  afterScreenshot?: () => Promise<void>;
  viewport?: {
    width: number;
    height: number;
  };
  waitForSelector?: string;
  waitForTimeout?: number;
  fullPage?: boolean;
}

export const PageList: PageConfig[] = [
  {
    page: 'homepage',
    url: 'https://your-website.com',
    components: [
      {
        group: 'navigation',
        name: 'Main Navigation',
        id: 'main-nav',
        selector: '[data-test="main-navigation"]',
        tags: ['@navigation', '@header']
      },
      {
        group: 'hero',
        name: 'Hero Section',
        id: 'hero',
        selector: '.hero-section',
        tags: ['@hero', '@homepage']
      },
      {
        group: 'features',
        name: 'Feature Cards',
        id: 'features',
        selector: '.feature-cards',
        tags: ['@features', '@homepage']
      }
    ]
  },
  {
    page: 'about',
    url: 'https://your-website.com/about',
    components: [
      {
        group: 'content',
        name: 'About Content',
        id: 'about-content',
        selector: '.about-content',
        tags: ['@content', '@about']
      },
      {
        group: 'team',
        name: 'Team Section',
        id: 'team',
        selector: '.team-section',
        tags: ['@team', '@about']
      }
    ]
  }
];

// Optional: Selectors to hide before taking screenshots (useful for dynamic content)
export const ForceHideSelectors: string[] = [
  '.cookie-banner',
  '.chat-widget',
  '.live-chat',
  '[data-test="advertisement"]'
];