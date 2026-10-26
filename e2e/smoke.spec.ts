/**
 * Phase 0 smoke at 390 × 844: every route loads under /francais-catalan/ with
 * no console errors, nothing scrolls sideways, every nav target is at least
 * 44 × 44 px, and a reload keeps the screen.
 */
import { expect, test, type Page } from '@playwright/test';

const ROUTES: readonly { hash: string; heading: string }[] = [
  { hash: '#/', heading: 'Entraîneur de grammaire catalane' },
  { hash: '#/carnet', heading: 'Carnet' },
  { hash: '#/reviser', heading: 'Réviser' },
  { hash: '#/carte', heading: 'Carte' },
  { hash: '#/phrase/smoke', heading: 'Phrase' },
  { hash: '#/notion/VERB.ind.passat_perifrastic', heading: 'Notion' },
];

/** Collects console errors and uncaught exceptions for the life of the page. */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

for (const { hash, heading } of ROUTES) {
  test(`${hash} loads with no console errors and no horizontal scroll`, async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto(hash);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);

    expect(await horizontalOverflow(page)).toBe(0);

    // Reload on the same hash route draws the same screen.
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);

    expect(errors).toEqual([]);
  });
}

test('every nav target is at least 44 × 44 px', async ({ page }) => {
  await page.goto('#/');
  const links = page.getByRole('navigation').getByRole('link');
  await expect(links).toHaveCount(4);
  for (const link of await links.all()) {
    const box = await link.boundingBox();
    expect(box, (await link.textContent()) ?? '').not.toBeNull();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});

test('the settings sheet opens without horizontal scroll or errors', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.goto('#/');
  await page.getByRole('button', { name: 'Réglages' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await horizontalOverflow(page)).toBe(0);
  expect(errors).toEqual([]);
});
