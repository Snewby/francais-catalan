/**
 * Phase 2 smoke at 390 × 844 for the variation panel, on the production
 * build: the pinned Catalan card and at least the first panel row on screen
 * together, no horizontal scroll, every target at least 44 × 44 px, and a tap
 * that changes the sentence (spec, « Acceptance criteria », Screen).
 */
import { expect, test } from '@playwright/test';
import { routeApi } from './api';
import { horizontalOverflow, smallTargets, watchErrors } from './checks';

test('the panel fits 390 px, keeps the card pinned over its first row, and varies the sentence', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.addInitScript(() => localStorage.setItem('anthropic-api-key', 'e2e-key'));
  const calls = await routeApi(page);

  await page.goto('#/');
  await page
    .getByLabel('Une phrase en français')
    .fill('Hier, j’ai acheté le pain au marché.');
  await page.getByRole('button', { name: 'Traduire en catalan' }).click();
  const panel = page.getByRole('region', { name: 'Variantes' });
  await expect(panel).toBeVisible();

  const who = page.getByRole('group', { name: 'Qui ?' });
  await who.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 120));
  const card = page.locator('.ac-pinned .ac-card');
  const cardBox = await card.boundingBox();
  const rowBox = await who.getByRole('button', { name: 'jo' }).boundingBox();
  expect(cardBox).not.toBeNull();
  expect(rowBox).not.toBeNull();
  if (cardBox !== null && rowBox !== null) {
    // The card is pinned at the top, and the first row sits below it, in view.
    expect(cardBox.y).toBeGreaterThanOrEqual(0);
    expect(cardBox.y).toBeLessThan(20);
    expect(rowBox.y).toBeGreaterThanOrEqual(cardBox.y + cardBox.height);
    expect(rowBox.y + rowBox.height).toBeLessThanOrEqual(844);
  }
  expect(await horizontalOverflow(page)).toBe(0);
  expect(await smallTargets(page)).toEqual([]);

  await who.getByRole('button', { name: 'ella' }).click();
  await expect(card.locator('.ac-ca')).toHaveText('Ahir va comprar el pa al mercat.');
  await expect(page.getByRole('button', { name: 'Revenir à ma phrase' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Ce qui a changé, et pourquoi' }),
  ).toBeVisible();
  expect(await horizontalOverflow(page)).toBe(0);
  expect(await smallTargets(page)).toEqual([]);
  expect(calls().variants).toContain('ella·ahir·none·0·0');

  await page.getByRole('button', { name: 'Revenir à ma phrase' }).click();
  await expect(card.locator('.ac-ca')).toHaveText('Ahir vaig comprar el pa al mercat.');

  expect(errors).toEqual([]);
});
