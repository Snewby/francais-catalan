/**
 * Phase 1 smoke at 390 × 844 for Home and the Phrase screen, on the production
 * build: no horizontal scroll and every tap target at least 44 × 44 px, with
 * a real translation flow answered by a recorded Opus 5.5 reply.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const RECORDING = path.resolve(
  import.meta.dirname,
  '../test/fixtures/golden-v2/recordings/claude-opus-5-5/run-1.json',
);

/** The recorded API response for golden case 1. */
function recordedReply(): string {
  const recording = JSON.parse(readFileSync(RECORDING, 'utf8')) as {
    cases: { n: number; fetches: { body?: unknown }[] }[];
  };
  const body = recording.cases.find((golden) => golden.n === 1)?.fetches.at(-1)?.body;
  if (body === undefined) throw new Error('no recorded reply for case 1');
  return JSON.stringify(body);
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
};

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

/** Visible buttons and links smaller than 44 × 44 px. */
async function smallTargets(page: Page): Promise<string[]> {
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

test('Home and the Phrase screen fit 390 px with full-size targets', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.addInitScript(() => localStorage.setItem('anthropic-api-key', 'e2e-key'));
  const reply = recordedReply();
  await page.route('https://api.anthropic.com/**', (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers: CORS })
      : route.fulfill({
          status: 200,
          headers: { ...CORS, 'content-type': 'application/json' },
          body: reply,
        }),
  );

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

  // Back on Home, the phrase is in « Récentes » and reopens with no call.
  await page.getByRole('link', { name: 'Retour à l’accueil' }).click();
  await page.unroute('https://api.anthropic.com/**');
  await page.getByRole('link', { name: /Ahir vaig comprar/ }).click();
  await expect(page.getByText('Verbe · vaig cantar')).toBeVisible();

  expect(errors).toEqual([]);
});
