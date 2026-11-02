/**
 * Phase 1 smoke at 390 × 844 for Home and the Phrase screen, on the production
 * build: no horizontal scroll and every tap target at least 44 × 44 px, with
 * a real translation flow answered by a recorded Opus 5.5 reply (e2e/api.ts).
 */
import { expect, test } from '@playwright/test';
import { routeApi } from './api';
import { horizontalOverflow, smallTargets, watchErrors } from './checks';

test('Home and the Phrase screen fit 390 px with full-size targets', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.addInitScript(() => localStorage.setItem('anthropic-api-key', 'e2e-key'));
  const calls = await routeApi(page);

  await page.goto('#/');
  expect(await horizontalOverflow(page)).toBe(0);
  expect(await smallTargets(page)).toEqual([]);

  await page
    .getByLabel('Une phrase en français')
    .fill('Hier, j’ai acheté le pain au marché.');
  await page.getByRole('button', { name: 'Traduire en catalan' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Phrase');
  await expect(page.getByText('Verbe · vaig cantar')).toBeVisible();
  expect(await horizontalOverflow(page)).toBe(0);
  expect(await smallTargets(page)).toEqual([]);

  await page.getByRole('button', { name: /^vaig comprar, verbe/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await horizontalOverflow(page)).toBe(0);
  expect(await smallTargets(page)).toEqual([]);
  await page.getByRole('button', { name: 'Fermer' }).click();

  // Back on Home, the phrase is in « Récentes » and reopens with no phrase
  // call. Variant prefetch may call; it is answered offline.
  await page.getByRole('link', { name: 'Retour à l’accueil' }).click();
  await page.getByRole('link', { name: /Ahir vaig comprar/ }).click();
  await expect(page.getByText('Verbe · vaig cantar')).toBeVisible();
  expect(calls().phrase).toBe(1);

  expect(errors).toEqual([]);
});
