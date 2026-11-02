/** What every phone-width smoke checks, in one place. */
import type { Page } from '@playwright/test';

export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

/** Visible buttons and links smaller than 44 × 44 px. */
export async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('a, button')]
      .filter((element) => element.getClientRects().length > 0)
      .map((element) => ({ element, box: element.getBoundingClientRect() }))
      .filter(({ box }) => box.width < 44 || box.height < 44)
      .map(
        ({ element, box }) =>
          `${element.textContent?.trim() ?? ''} ${String(box.width)}×${String(box.height)}`,
      ),
  );
}
