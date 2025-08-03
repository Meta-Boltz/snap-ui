# @meta-boltz/snap-ui

A comprehensive visual testing tool for Playwright that simplifies screenshot-based regression testing with advanced configuration options.

## Installation

```bash
npm install @meta-boltz/snap-ui
```

## Quick Start

### Initialize a new project

```bash
npx snap-ui init
```

This command will:
- Create the necessary screenshot directories (`screenshots/baseline`, `screenshots/actual`, `screenshots/diff`)
- Generate the `data/ui-test-data.ts` file with a comprehensive template
- Set up the project structure for visual testing

### Generate baseline screenshots

```bash
npx snap-ui generate
```

This command will:
- Generate baseline test files based on your configuration
- Create `.baseline.spec.ts` files for each page
- Run baseline screenshot generation

### Run visual regression tests

```bash
npx snap-ui run
```

This command will:
- Generate comparison test files
- Run visual regression tests against existing baselines
- Generate diff images when visual differences are detected

## Configuration

Edit `data/ui-test-data.ts` to define your pages and components:

```typescript
import { PageConfig } from '@meta-boltz/snap-ui';

const brandTag = "@your-brand";

function generatePageTags(pageName: string): string[] {
  return [
    brandTag,
    `@${pageName}`,
    `@${pageName}-regression`,
    `@${pageName}-visual`
  ];
}

function generateComponentTags(groupName: string, componentName: string): string[] {
  const baseName = componentName.toLowerCase().replace(/\s+/g, '-');
  return [
    brandTag,
    `@${groupName}`,
    `@${groupName}-${baseName}`,
    `@${baseName}`
  ];
}

export const PageList: PageConfig[] = [
  {
    page: "homepage",
    url: "https://your-website.com",
    tags: generatePageTags("homepage"),
    components: [
      {
        group: "homepage",
        name: "Hero Section",
        id: "hero-section",
        tags: generateComponentTags("homepage", "hero-section"),
        selector: "[data-testid='hero-section']",
        forceHide: {
          type: "display",
          selectors: [".cookie-banner", ".notification-banner"],
          excludes: []
        },
        preConditions: async () => {
          // Add any pre-conditions here
        }
      }
    ]
  },
  {
    page: "product-detail",
    url: "https://your-website.com/products/example",
    tags: generatePageTags("product-detail"),
    components: [
      {
        group: "product-detail",
        name: "Product Images",
        id: "product-images",
        tags: generateComponentTags("product-detail", "product-images"),
        selector: "[data-testid='product-images']"
      },
      {
        group: "product-detail",
        name: "Add to Cart",
        id: "add-to-cart",
        tags: generateComponentTags("product-detail", "add-to-cart"),
        selector: "[data-testid='add-to-cart-button']"
      }
    ]
  }
];

export const ForceHideSelectors = [
  "[data-testid='cookie-banner']",
  "[data-testid='notification-banner']",
  "[data-testid='live-chat-widget']"
];
```

## API Reference

### Functions

#### `updateVisualBaseline(components, forceHideSelectors)`
Generates baseline screenshots for visual testing.

```typescript
import { updateVisualBaseline } from '@meta-boltz/snap-ui';

updateVisualBaseline(components, ['.cookie-banner']);
```

#### `runVisualTests(components, forceHideSelectors)`
Runs visual regression tests against existing baselines.

```typescript
import { runVisualTests } from '@meta-boltz/snap-ui';

runVisualTests(components, ['.cookie-banner']);
```

## Test File Structure

Generated test files follow this pattern:
- **Baseline tests**: `tests/ui/{page-name}.baseline.spec.ts`
- **Regression tests**: `tests/ui/{page-name}.spec.ts`

## Environment Variables

### TEST_URL
Override the base URL for testing different environments:

```bash
# Test staging environment
TEST_URL=https://staging.your-website.com npx snap-ui run

# Test local development
TEST_URL=http://localhost:3000 npx snap-ui run
```

## Directory Structure

```
your-project/
├── data/
│   └── ui-test-data.ts          # Configuration file
├── tests/
│   └── ui/
│       ├── homepage.baseline.spec.ts
│       ├── homepage.spec.ts
│       ├── product-detail.baseline.spec.ts
│       └── product-detail.spec.ts
├── screenshots/
│   ├── baseline/                # Baseline screenshots
│   ├── actual/                  # Current test screenshots
│   └── diff/                    # Visual difference images
└── playwright.config.ts
```

## Advanced Configuration

### Component Configuration Options

```typescript
{
  group: string;           // Group identifier for organization
  name: string;            // Human-readable component name
  id: string;              // Unique identifier
  selector: string;        // CSS selector for the component
  tags?: string[];         // Test tags for filtering
  forceHide?: {           // Elements to hide during screenshots
    type: "display" | "visibility" | "opacity";
    selectors: string[];
    excludes?: string[];
  };
  preConditions?: () => Promise<void>;  // Async setup before screenshot
  viewport?: { width: number; height: number };  // Custom viewport
  fullPage?: boolean;      // Capture full page instead of component
}
```

## Commands

| Command | Description |
|---------|-------------|
| `npx snap-ui init` | Initialize project structure |
| `npx snap-ui generate` | Generate baseline test files and screenshots |
| `npx snap-ui run` | Run visual regression tests |
| `npx playwright test tests/ui/*.baseline.spec.ts` | Run baseline generation only |
| `npx playwright test tests/ui/*.spec.ts` | Run regression tests only |

## Examples

### Basic Usage
```bash
# 1. Initialize project
npx snap-ui init

# 2. Configure your components in data/ui-test-data.ts

# 3. Generate baseline screenshots
npx snap-ui generate

# 4. Make changes to your website

# 5. Run regression tests
npx snap-ui run
```

### CI/CD Integration
```yaml
# GitHub Actions example
- name: Visual Regression Tests
  run: |
    npm ci
    npx snap-ui generate
    npx snap-ui run
```

## Troubleshooting

### Common Issues

1. **Test files always named "northshore-gosupreme"**
   - Ensure your `ui-test-data.ts` file has proper `PageList` configuration
   - Check that the `page` attribute is correctly defined

2. **Import errors**
   - Ensure you're using the correct package name: `@meta-boltz/snap-ui`
   - Check that TypeScript is properly configured in your project

3. **Baseline screenshots not found**
   - Run `npx snap-ui generate` to create baseline screenshots first
   - Verify the `screenshots/baseline` directory exists and contains images

## Support

For issues and feature requests, please visit:
- [GitHub Issues](https://github.com/Meta-Boltz/snap-ui/issues)
- [Documentation](https://github.com/Meta-Boltz/snap-ui#readme)