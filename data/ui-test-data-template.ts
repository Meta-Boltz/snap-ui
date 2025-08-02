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

export const PageList = [
  {
    page: "your-page-name",
    url: "https://your-website.com",
    tags: generatePageTags("your-page-name"),
    ComponentList: [
      {
        page: "your-page-name",
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