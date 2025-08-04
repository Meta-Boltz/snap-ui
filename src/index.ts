export { init } from './commands/init.js';
export { run } from './commands/run.js';
export { runVisualTests, updateVisualBaseline, generatePageTags, generateComponentTags } from './utils/test-helpers.js';

// Export types
export type { ComponentConfig, PageConfig, UITestConfig } from './types/ui-test-config.js';