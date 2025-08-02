export interface PageConfig {
  page: string;
  url: string;
  tags?: string[];
  componentList: ComponentListItem[];
}

import type { PageConfig } from '../src/types/ui-test-config.js';

const brandTag = "@snap-ui";

function generatePageTags(pageName: string): string[] {
  return [
    brandTag,
    `@${pageName}`,
    `@${pageName}-regression`,
    `@${pageName}-visual`,
    "@visual-regression"
  ];
}

function generateComponentTags(pageName: string, componentName: string): string[] {
  const baseName = componentName.toLowerCase().replace(/\s+/g, '-');
  return [
    brandTag,
    `@${pageName}`,
    `@${pageName}-${baseName}`,
    `@${baseName}`,
    "@component-visual"
  ];
}

export const PageList: PageConfig[] = [
  {
    page: "northshore-gosupreme",
    url: "https://northshore-gosupreme.com",
    tags: generatePageTags("northshore-gosupreme"),
    ComponentList: [
      {
        page: "northshore-gosupreme",
        name: "Product Hero Section",
        id: "product-hero",
        tags: generateComponentTags("northshore-gosupreme", "Product Hero Section"),
        forceHide: {
          type: "display",
          selectors: ["#onetrust-consent-sdk", ".cookie-banner", ".notification-banner"],
          excludes: ["#contact-us-button"]
        },
        preConditions: async () => {
          // Wait for product images to load
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      },
      {
        page: "northshore-gosupreme",
        name: "Product Details Section",
        id: "product-details",
        tags: generateComponentTags("northshore-gosupreme", "Product Details Section"),
        forceHide: {
          type: "display",
          selectors: ["#onetrust-consent-sdk", ".cookie-banner", ".notification-banner"],
          excludes: ["#contact-us-button"]
        },
        preConditions: async () => {
          // Scroll to details section
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      },
      {
        page: "northshore-gosupreme",
        name: "Reviews Section",
        id: "reviews-section",
        tags: generateComponentTags("northshore-gosupreme", "Reviews Section"),
        forceHide: {
          type: "display",
          selectors: ["#onetrust-consent-sdk", ".cookie-banner", ".notification-banner"],
          excludes: ["#contact-us-button"]
        },
        preConditions: async () => {
          // Wait for reviews to load
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    ]
  }
];

export const ForceHideSelectors = [
  "#onetrust-consent-sdk",
  ".cookie-banner",
  ".notification-banner",
  ".chat-widget",
  "#sticky-options-bar",
];