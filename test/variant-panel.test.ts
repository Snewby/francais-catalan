/**
 * The variation panel on the Phrase screen, rendered through the app shell
 * against a throwaway catala-v2 and a fetch answering each target with the
 * recorded Opus round 1 reply for it.
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type Dexie from 'dexie';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { storeApiKey } from '../src/api/anthropic';
import { createCatalaDatabase } from '../src/db/catala-v2';
import type { Recording } from '../src/eval/golden';
import type { VariantRecording } from '../src/eval/variants';
import { fr } from '../src/i18n/fr';
import { resetTranslations } from '../src/phrase/session.svelte';
import { translateAndStore } from '../src/phrase/store';
import { leafById } from '../src/taxonomy/index';
import App from '../src/ui/App.svelte';
import { comboKey, type Combination } from '../src/variants/combination';

const FIXTURES = path.resolve(import.meta.dirname, 'fixtures');

const PHRASES = JSON.parse(
  readFileSync(
    path.join(FIXTURES, 'golden-v2/recordings/claude-opus-5-5/run-1.json'),
    'utf8',
  ),
) as Recording;
const VARIANTS = JSON.parse(
  readFileSync(
    path.join(FIXTURES, 'variants-v1/recordings/claude-opus-5-5/run-1.json'),
    'utf8',
  ),
) as VariantRecording;

function phraseResponse(n: number): { input: string; body: unknown } {
  const recorded = PHRASES.cases.find((c) => c.n === n);
  const last = recorded?.fetches.at(-1);
  if (recorded === undefined || last === undefined || !('body' in last))
    throw new Error();
  return { input: recorded.input, body: last.body };
}

function notApplicable(reason: string): unknown {
  return {
    content: [
      { type: 'text', text: JSON.stringify({ status: 'not_applicable', reason }) },
    ],
  };
}

/** The variant fetch: recorded replies by target, a stand-in otherwise. */
function variantFetch(n: number, answer?: (key: string) => unknown) {
  let hold: Promise<void> | null = null;
  let release: () => void = () => undefined;
  const targets: string[] = [];
  const fetchFn = vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as { messages: { content: string }[] };
    const { target } = JSON.parse(body.messages[0]?.content ?? '{}') as {
      target: Combination;
    };
    const key = comboKey(target);
    targets.push(key);
    if (hold !== null) await hold;
    const recorded = VARIANTS.cases.find((c) => c.n === n && c.target === key)
      ?.fetches[0];
    const reply =
      answer?.(key) ??
      (recorded !== undefined && 'body' in recorded
        ? recorded.body
        : notApplicable('other'));
    return { ok: true, status: 200, text: async () => JSON.stringify(reply) };
  });
  return {
    fetchFn,
    targets,
    hold: () => {
      hold = new Promise<void>((resolve) => (release = resolve));
    },
    release: () => {
      hold = null;
      release();
    },
  };
}

let database: Dexie;

beforeEach(() => {
  database = createCatalaDatabase(`panel-test-${crypto.randomUUID()}`);
  localStorage.clear();
  storeApiKey('test-key');
});

afterEach(async () => {
  cleanup();
  resetTranslations();
  await new Promise((resolve) => setTimeout(resolve, 20));
  vi.unstubAllGlobals();
  await database.delete();
  localStorage.clear();
  window.location.hash = '';
});

async function openPhrase(n: number, answer?: (key: string) => unknown) {
  const { input, body } = phraseResponse(n);
  const outcome = await translateAndStore(database, {
    input,
    apiKey: 'test-key',
    fetchFn: (async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(body),
    })) as unknown as typeof fetch,
    isOnline: () => true,
  });
  if (outcome.status !== 'stored') throw new Error('not stored');
  const stub = variantFetch(n, answer);
  vi.stubGlobal('fetch', stub.fetchFn);
  window.location.hash = `#/phrase/${outcome.row.id}`;
  render(App, { database, prefetch: false });
  await screen.findByRole('heading', { name: fr.variants.heading });
  return { stub, user: userEvent.setup() };
}

const group = (name: string) => screen.getByRole('group', { name });
const catalan = () => document.querySelector('.ac-pinned .ac-ca')?.textContent;

describe('the panel before any tap', () => {
  it('shows the four groups with the starting state selected', async () => {
    await openPhrase(1);
    expect(
      within(group(fr.variants.who))
        .getByRole('button', { name: 'jo' })
        ?.getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      within(group(fr.variants.when))
        .getByRole('button', { name: fr.tenses.ahir })
        ?.getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      within(group(fr.variants.tournure))
        .getByRole('button', {
          name: fr.tournures.none,
        })
        ?.getAttribute('aria-pressed'),
    ).toBe('true');
    const transform = within(group(fr.variants.transform)).getAllByRole('button');
    expect(transform[0]?.textContent).toContain('el pa');
    expect(transform[0]?.getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByText(fr.variants.revert)).toBeNull();
    expect(
      screen.queryByRole('heading', { name: fr.variants.changedHeading }),
    ).toBeNull();
  });
});

describe('a tap', () => {
  it('spins the button and keeps the card until the variant lands, then rings and explains it', async () => {
    const { stub, user } = await openPhrase(1);
    stub.hold();
    await user.click(
      within(group(fr.variants.who)).getByRole('button', { name: 'ella' }),
    );
    await waitFor(() =>
      expect(
        document.querySelector('.ac-pinned .ac-card')?.getAttribute('aria-busy'),
      ).toBe('true'),
    );
    expect(document.querySelector('.ac-spinner')).not.toBeNull();
    expect(catalan()).toBe('Ahir vaig comprar el pa al mercat.');
    stub.release();

    await waitFor(() => expect(catalan()).toBe('Ahir va comprar el pa al mercat.'));
    expect(
      screen.getByText('(jo) vaig comprar → (ella) va comprar', {
        selector: '.ac-pinned *',
      }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: fr.variants.revert })).toBeTruthy();
    const ringed = [
      ...document.querySelectorAll('.ac-chunk--ringed .ac-chunk__text'),
    ].map((element) => element.textContent);
    expect(ringed).toEqual(['(ella)', 'va comprar']);
    const cards = screen.getByRole('heading', {
      name: fr.variants.changedHeading,
    }).parentElement!;
    expect(
      within(cards).getByText(leafById('PRON.fort.subjecte')!.glosses.fr, {
        exact: false,
      }),
    ).toBeTruthy();
  });

  it('restores the original with « Revenir à ma phrase », with no call', async () => {
    const { stub, user } = await openPhrase(1);
    await user.click(
      within(group(fr.variants.when)).getByRole('button', { name: fr.tenses.avui }),
    );
    await waitFor(() => expect(catalan()).toBe('Avui he comprat el pa al mercat.'));
    await user.click(screen.getByRole('button', { name: fr.variants.revert }));
    expect(catalan()).toBe('Ahir vaig comprar el pa al mercat.');
    expect(document.querySelector('.ac-chunk--ringed')).toBeNull();
    expect(
      screen.queryByRole('heading', { name: fr.variants.changedHeading }),
    ).toBeNull();
    expect(stub.targets).toEqual(['jo·avui·none·0·0']);
  });

  it('opens the notion sheet from « Voir la notion »', async () => {
    const { user } = await openPhrase(1);
    await user.click(
      within(group(fr.variants.when)).getByRole('button', { name: fr.tenses.avui }),
    );
    await waitFor(() => expect(catalan()).toBe('Avui he comprat el pa al mercat.'));
    await user.click(
      screen.getAllByRole('button', { name: fr.variants.seeNotion })[0]!,
    );
    expect(screen.getByRole('dialog').textContent).toContain(
      leafById('VERB.perf.present')!.glosses.fr,
    );
  });
});

describe('greyed buttons', () => {
  it('stay focusable with aria-disabled, and say why under their group', async () => {
    const { stub, user } = await openPhrase(1);
    const acabar = within(group(fr.variants.tournure)).getByRole('button', {
      name: fr.tournures.acabar,
    });
    expect(acabar?.getAttribute('aria-disabled')).toBe('true');
    expect((acabar as HTMLButtonElement).disabled).toBe(false);
    acabar.focus();
    expect(document.activeElement).toBe(acabar);
    await user.click(acabar);
    expect(
      within(group(fr.variants.tournure)).getByText(fr.variantReasons.acabar_tense),
    ).toBeTruthy();
    expect(stub.targets).toEqual([]);
  });
});

describe('each reason in the copy table renders', () => {
  it.each([
    ['no_subject', 10, fr.variants.who, 'tu'],
    ['no_tense', 8, fr.variants.when, fr.tenses.futur],
  ] as const)('%s, from row %i', async (cause, n, label, button) => {
    const { user } = await openPhrase(n);
    await user.click(within(group(label)).getByRole('button', { name: button }));
    expect(within(group(label)).getByText(fr.variantReasons[cause])).toBeTruthy();
  });

  it('no_object, from row 12', async () => {
    const { user } = await openPhrase(12);
    await user.click(within(group(fr.variants.transform)).getAllByRole('button')[0]!);
    expect(
      within(group(fr.variants.transform)).getByText(fr.variantReasons.no_object),
    ).toBeTruthy();
  });

  it.each([
    'aspect_incompatible',
    'subordinate_affected',
    'no_pronoun_form',
    'other',
  ] as const)('%s, from a stubbed not_applicable reply', async (reason) => {
    const { user } = await openPhrase(1, () => notApplicable(reason));
    await user.click(
      within(group(fr.variants.who)).getByRole('button', { name: 'tu' }),
    );
    await waitFor(() =>
      expect(
        within(group(fr.variants.who)).getByText(fr.variantReasons[reason]),
      ).toBeTruthy(),
    );
    expect(
      within(group(fr.variants.who))
        .getByRole('button', { name: 'tu' })
        ?.getAttribute('aria-disabled'),
    ).toBe('true');
    expect(document.querySelector('[aria-live="polite"]')?.textContent).toContain(
      fr.variantReasons[reason],
    );
  });
});

describe('copy', () => {
  it('shows no English after a tap', async () => {
    const { user } = await openPhrase(1);
    await user.click(
      within(group(fr.variants.who)).getByRole('button', { name: 'ella' }),
    );
    await waitFor(() => expect(catalan()).toBe('Ahir va comprar el pa al mercat.'));
    const copy = document.body.cloneNode(true) as HTMLElement;
    for (const element of copy.querySelectorAll('[lang="ca"]')) element.remove();
    expect(copy.textContent).not.toMatch(
      /\b(the|and|loading|error|retry|back|close|settings|report|pending|waiting|undefined|null|NaN)\b/i,
    );
  });
});
