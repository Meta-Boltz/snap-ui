import { Page } from '@playwright/test';

export async function waitForLazyComponents(page: Page): Promise<void> {
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      let lastScrollTop = 0;
      let attempts = 0;
      const maxAttempts = 10;

      function scrollAndCheck() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = document.documentElement.clientHeight;

        if (scrollTop + clientHeight >= scrollHeight - 100) {
          setTimeout(() => {
            attempts++;
            if (attempts >= maxAttempts) {
              resolve();
              return;
            }
            
            if (Math.abs(scrollTop - lastScrollTop) < 10) {
              resolve();
              return;
            }
            
            lastScrollTop = scrollTop;
            setTimeout(scrollAndCheck, 1000);
          }, 1000);
        } else {
          window.scrollBy(0, 100);
          setTimeout(scrollAndCheck, 500);
        }
      }

      scrollAndCheck();
    });
  });

  await page.waitForLoadState('networkidle');
}

export async function hideElements(page: Page, selectors: string[]): Promise<void> {
  for (const selector of selectors) {
    await page.evaluate((sel: string) => {
      const elements = document.querySelectorAll(sel);
      elements.forEach(el => {
        (el as HTMLElement).style.display = 'none';
      });
    }, selector);
  }
}