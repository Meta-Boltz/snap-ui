/**
 * Snap UI Test Data Configuration
 * 
 * This file defines the pages and components to test with visual regression testing.
 * 
 * Instructions:
 * 1. Replace "your-page-name" with your actual page names (e.g., "home", "about", "contact")
 * 2. Replace "https://your-website.com" with your actual URLs
 * 3. Replace "@your-project" with your project/brand identifier
 * 4. Add more pages as needed by copying the page structure
 * 5. Customize components for each page with appropriate selectors and names
 * 6. Update ForceHideSelectors to hide dynamic content like ads, chat widgets, etc.
 * 
 * Expected format:
 * export const PageList: PageConfig[] = [...]
 * export const ForceHideSelectors: string[] = [...] (optional)
 */

import { PageConfig, generatePageTags, generateComponentTags } from "@meta-boltz/snap-ui";

const brandTag = "@snap-ui";

export const PageList: PageConfig[] = [
  {
    page: "test-page",
    url: "https://playwright.dev",
    tags: generatePageTags(brandTag, "test-page"),
    components: [
      {
        group: "test-page",
        name: "Hero Section",
        id: "hero-section",
        tags: generateComponentTags(brandTag, "test-page", "Hero Section"),
        selector: "h1",
        forceHide: {
          type: "display",
          selectors: [".announcement-banner"],
          excludes: []
        },
      },
      {
        group: "test-page",
        name: "Navigation",
        id: "navigation",
        tags: generateComponentTags(brandTag, "test-page", "Navigation"),
        selector: "nav",
        forceHide: {
          type: "display",
          selectors: [".mobile-menu"],
          excludes: []
        },
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