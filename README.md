# snap-ui

A visual testing tool for Playwright that simplifies screenshot-based regression testing.

## Installation

```bash
npm install snap-ui
```

## Usage

### Initialize the project

```bash
npx snap-ui init
```

This command will:
- Create the necessary directories (`screenshots/actual`, `screenshots/baseline`, `screenshots/diff`)
- Generate the `data/ui-test-data.ts` file with default configuration

### Run visual tests

```bash
npx snap-ui run
```

This command will:
- Generate test files based on the components defined in `data/ui-test-data.ts`
- Take screenshots of the specified components
- Compare them with baseline images
- Report any visual differences

## Configuration

Edit `data/ui-test-data.ts` to define your components:

```typescript
export const ComponentList = [
  {
    page: "pdp",
    name: "PDP top section",
    id: "pdp-top-section",
    forceHide: {
      type: "display",
      selectors: ["#one-trust-banner-container"],
      excludes: ["#contact-us-button"]
    }
  }
];

export const ForceHideSelectors = [
  "#one-trust-banner-container",
  "#contact-us-button",
  "#sticky-options-bar",
];
```

## Test URLs

Set the `TEST_URL` environment variable to test different pages:

```bash
TEST_URL=https://example.com npx snap-ui run
```

## Commands

- `npx snap-ui init` - Initialize the project
- `npx snap-ui run` - Run visual tests
- `npx playwright test tests/ui/pdp-baseline.spec.ts` - Generate baseline screenshots
- `npx playwright test tests/ui/pdp.spec.ts` - Run visual regression tests

## Example

The package includes an example test for the NorthShore GoSupreme product page:
`https://www.northshorecare.com/adult-diapers/adult-pull-ups/northshore-gosupreme-pull-on-underwear`