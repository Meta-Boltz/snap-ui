/**
 * Snap UI Test Data Configuration
 * 
 * This file defines the pages and components to test with visual regression testing.
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