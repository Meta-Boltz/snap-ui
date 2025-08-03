import { PageConfig } from '@meta-boltz/snap-ui';

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

function generateComponentTags(groupName: string, componentName: string): string[] {
  const baseName = componentName.toLowerCase().replace(/\s+/g, '-');
  return [
    brandTag,
    `@${groupName}`,
    `@${groupName}-${baseName}`,
    `@${baseName}`,
    "@component-visual"
  ];
}

export const PageList: PageConfig[] = [
  {
    page: "your-page-name",
    url: "https://your-website.com",
    tags: generatePageTags("your-page-name"),
    components: [
      {
        group: "your-page-name",
        name: "Component Name",
        id: "component-id",
        tags: generateComponentTags("your-page-name", "Component Name"),
        selector: "[data-testid='component-selector']",
        forceHide: {
          type: "display",
          selectors: [".cookie-banner", ".notification-banner"],
          excludes: []
        },
        preConditions: async () => {
          // Add any pre-conditions here
          // await page.waitForSelector('[data-testid="main-content"]');
        }
      }
    ]
  }
];

export const ForceHideSelectors = [
  "[data-testid='should-hide-component-selector-1']",
  "[data-testid='should-hide-component-selector-2']",
]