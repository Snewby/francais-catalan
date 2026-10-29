/**
 * Home and the Phrase screen, rendered through the app shell against a
 * throwaway catala-v2 and a stubbed API. Replies are the recorded Opus 5.5
 * ones from the golden set, so the screen is tested on what the chosen model
 * actually returns.
 */
import {
  cleanup,
  getDefaultNormalizer,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type Dexie from 'dexie';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { storeApiKey } from '../src/api/anthropic';
import {
  createCatalaDatabase,
  eventsOf,
  phrasesOf,
  reportsOf,
} from '../src/db/catala-v2';
import type { Recording } from '../src/eval/golden';
import { fr } from '../src/i18n/fr';
import { resetTranslations } from '../src/phrase/session.svelte';
import { translateAndStore } from '../src/phrase/store';
import { leafById } from '../src/taxonomy/index';
import App from '../src/ui/App.svelte';

/**
 * French copy carries narrow no-break spaces, which the default normaliser
 * collapses to ordinary spaces before comparing against the unnormalised query.
 */
const exact = { normalizer: getDefaultNormalizer({ collapseWhitespace: false }) };

const RECORDINGS = path.resolve(import.meta.dirname, 'fixtures/golden-v2/recordings');

/** The API response Opus 5.5 gave for golden case `n` in run `run`. */
function recorded(run: number, n: number): { input: string; body: unknown } {
  const recording = JSON.parse(
    readFileSync(
      path.join(RECORDINGS, 'claude-opus-5-5', `run-${String(run)}.json`),
      'utf8',
    ),
  ) as Recording;
  const found = recording.cases.find((golden) => golden.n === n);
  const last = found?.fetches.at(-1);
  if (found === undefined || last === undefined || !('body' in last)) {
    throw new Error(`no recorded reply for case ${String(n)}, run ${String(run)}`);
  }
  return { input: found.input, body: last.body };
}

const HIER = recorded(1, 1); // « Ahir vaig comprar el pa al mercat. », subject dropped
const CONTENTE = recorded(1, 28); // assumes addressee_tu and speaker_fem
const FLEMME = recorded(2, 29); // « mandra » unlinked, no_notion
const LAIT = recorded(3, 10); // « hi ha » unlinked, outside_taxonomy

interface Reply {
  readonly status: number;
  readonly body: unknown;
}

/** A fetch answering each call with the next reply, the last one repeating. */
function stubFetch(...replies: Reply[]) {
  let call = 0;
  return vi.fn(async (_url: string, _init: RequestInit) => {
    const reply = replies[Math.min(call, replies.length - 1)] ?? {
      status: 500,
      body: {},
    };
    call += 1;
    return {
      ok: reply.status < 400,
      status: reply.status,
      text: async () => JSON.stringify(reply.body),
    };
  });
}

const ok = (body: unknown): Reply => ({ status: 200, body });

/** A reply whose first chunk is not in its Catalan, so the anatomy fails. */
function brokenAnatomy(body: unknown): unknown {
  const envelope = body as { content: { type: string; text: string }[] };
  const reply = JSON.parse(envelope.content[0]?.text ?? '{}') as {
    chunks: { text: string }[];
  };
  reply.chunks[0] = { ...reply.chunks[0], text: 'Avui' } as { text: string };
  return { ...envelope, content: [{ type: 'text', text: JSON.stringify(reply) }] };
}

let database: Dexie;

beforeEach(() => {
  database = createCatalaDatabase(`screen-test-${crypto.randomUUID()}`);
  localStorage.clear();
  storeApiKey('test-key');
});

afterEach(async () => {
  cleanup();
  resetTranslations();
  // Let reads started by the screens settle before their database goes.
  await new Promise((resolve) => setTimeout(resolve, 20));
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await database.delete();
  localStorage.clear();
  window.location.hash = '';
});

async function seed(reply: { input: string; body: unknown }, now?: number) {
  const outcome = await translateAndStore(database, {
    input: reply.input,
    apiKey: 'test-key',
    fetchFn: stubFetch(ok(reply.body)) as unknown as typeof fetch,
    isOnline: () => true,
    ...(now !== undefined && { now }),
  });
  if (outcome.status !== 'stored') throw new Error('not stored');
  return outcome.row;
}

function renderAt(hash: string) {
  window.location.hash = hash;
  return render(App, { database });
}

async function submitFromHome(text: string) {
  const user = userEvent.setup();
  renderAt('#/');
  await user.type(screen.getByLabelText(fr.home.inputLabel), text);
  await user.click(screen.getByRole('button', { name: fr.home.submit }));
  return user;
}

/** The screen's French, Catalan elements removed: it must hold no English. */
function expectNoEnglish(): void {
  const copy = document.body.cloneNode(true) as HTMLElement;
  for (const element of copy.querySelectorAll('[lang="ca"]')) element.remove();
  const text = copy.textContent ?? '';
  expect(text.trim().length).toBeGreaterThan(0);
  expect(text).not.toMatch(
    /\b(the|and|loading|error|retry|cancel|back|close|settings|report|translat\w*|submit|save|not found|undefined|null|NaN)\b/i,
  );
  expect(text).not.toContain('"');
}

describe('the Phrase screen, from a recorded reply', () => {
  it('shows the input, the Catalan in Catalan, the French and the chunks in order', async () => {
    const row = await seed(HIER);
    renderAt(`#/phrase/${row.id}`);

    const yours = await screen.findByRole('region', { name: fr.phrase.yourPhrase });
    expect(within(yours).getByText(HIER.input)).toBeTruthy();
    const card = screen.getByRole('region', { name: fr.phrase.inCatalan });
    expect(within(card).getByText(row.ca).getAttribute('lang')).toBe('ca');
    expect(within(card).getByText(row.fr)).toBeTruthy();

    const anatomy = screen.getByRole('region', { name: fr.phrase.anatomy });
    const texts = within(anatomy)
      .getAllByRole('listitem')
      .map((item) => item.querySelector('.ac-chunk__text')?.textContent);
    // Catalan drops « jo », so the app adds it, dashed, before the model's chunks.
    expect(texts).toEqual(['(jo)', ...row.chunks.map((chunk) => chunk.text)]);
    expect(within(anatomy).getByText('Verbe · vaig cantar')).toBeTruthy();
    expect(
      within(anatomy).getByRole('button', {
        name: `vaig comprar, verbe, ${leafById('VERB.ind.passat_perifrastic')?.glosses.fr ?? ''}`,
      }),
    ).toBeTruthy();
    expectNoEnglish();
  });

  it('names what the model assumed, in one line', async () => {
    const row = await seed(CONTENTE);
    renderAt(`#/phrase/${row.id}`);
    expect(await screen.findByText(/^On a supposé/)).toBeTruthy();
    expect(screen.getByText(/^On a supposé/).textContent).toBe(
      `On a supposé\u202f: tu, locutrice.`,
    );
  });

  it('draws unlinked chunks as plain text with their caption, never as buttons', async () => {
    const flemme = await seed(FLEMME);
    const { unmount } = renderAt(`#/phrase/${flemme.id}`);
    const mandra = await screen.findByText('mandra');
    expect(mandra.closest('button')).toBeNull();
    expect(mandra.closest('[tabindex]')).toBeNull();
    expect(mandra.parentElement?.textContent).toContain(fr.unlinked.no_notion);
    unmount();

    const lait = await seed(LAIT);
    renderAt(`#/phrase/${lait.id}`);
    const hiHa = await screen.findByText('hi ha');
    expect(hiHa.closest('button')).toBeNull();
    expect(hiHa.parentElement?.textContent).toContain(fr.unlinked.outside_taxonomy);
  });

  it('opens a sheet with the gloss, badge and contrast note for each ID, and writes no event', async () => {
    const user = userEvent.setup();
    const row = await seed(HIER);
    const events = await eventsOf(database).count();
    renderAt(`#/phrase/${row.id}`);

    const verb = row.chunks.find((chunk) => chunk.text === 'vaig comprar');
    await user.click(
      await screen.findByRole('button', { name: /^vaig comprar, verbe/ }),
    );
    const sheet = screen.getByRole('dialog');
    for (const id of verb?.ids ?? []) {
      const leaf = leafById(id);
      if (leaf === undefined) throw new Error(id);
      expect(within(sheet).getByText(leaf.glosses.fr, exact)).toBeTruthy();
      expect(within(sheet).getByText(leaf.contrast_fr.note, exact)).toBeTruthy();
      expect(
        within(sheet).getAllByText(fr.badge[leaf.contrast_fr.status]).length,
      ).toBeGreaterThan(0);
    }
    expectNoEnglish();

    await user.click(within(sheet).getByRole('button', { name: fr.chunkSheet.close }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(await eventsOf(database).count()).toBe(events);
  });

  it('stores a report from « Signaler une erreur »', async () => {
    const user = userEvent.setup();
    const row = await seed(HIER);
    renderAt(`#/phrase/${row.id}`);

    await user.click(await screen.findByRole('button', { name: fr.phrase.report }));
    await user.type(screen.getByLabelText(fr.report.label, exact), 'Le mot est faux.');
    await user.click(screen.getByRole('button', { name: fr.report.save }));
    expect(await screen.findByText(fr.report.saved)).toBeTruthy();
    expectNoEnglish();
    const reports = await reportsOf(database).toArray();
    expect(reports).toMatchObject([{ phraseId: row.id, text: 'Le mot est faux.' }]);
  });

  it('says so when the phrase is not on this device', async () => {
    renderAt('#/phrase/nowhere');
    expect(await screen.findByText(fr.phrase.notFound)).toBeTruthy();
  });
});

describe('failure states', () => {
  it('asks for a key, with a button to the settings sheet, before any call', async () => {
    localStorage.clear();
    const fetchFn = stubFetch(ok(HIER.body));
    vi.stubGlobal('fetch', fetchFn);
    const user = await submitFromHome(HIER.input);

    expect(await screen.findByText(fr.failure.noKey)).toBeTruthy();
    expect(fetchFn).not.toHaveBeenCalled();
    expectNoEnglish();
    await user.click(screen.getByRole('button', { name: fr.failure.openSettings }));
    expect(screen.getByRole('dialog', { name: fr.settings.heading })).toBeTruthy();
  });

  const SHOWN: readonly { name: string; reply: Reply; text: string; retry: boolean }[] =
    [
      {
        name: 'a rejected key',
        reply: { status: 401, body: {} },
        text: fr.failure.keyRejected,
        retry: false,
      },
      {
        name: 'a rate limit',
        reply: { status: 429, body: {} },
        text: fr.failure.overloaded,
        retry: true,
      },
      {
        name: 'an overload',
        reply: { status: 529, body: {} },
        text: fr.failure.overloaded,
        retry: true,
      },
      {
        name: 'a refusal',
        reply: ok({ content: [], stop_reason: 'refusal' }),
        text: fr.failure.refused,
        retry: false,
      },
    ];

  for (const { name, reply, text, retry } of SHOWN) {
    it(`shows ${name} in French${retry ? ', with Réessayer' : ''}`, async () => {
      vi.stubGlobal('fetch', stubFetch(reply));
      await submitFromHome(HIER.input);
      expect(await screen.findByText(text)).toBeTruthy();
      expect(screen.queryByRole('button', { name: fr.failure.retry }) !== null).toBe(
        retry,
      );
      expectNoEnglish();
      expect(await phrasesOf(database).count()).toBe(0);
    });
  }

  it('shows « Pas de connexion. » offline, and Réessayer translates once back online', async () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    vi.stubGlobal('fetch', stubFetch(ok(HIER.body)));
    const user = await submitFromHome(HIER.input);
    expect(await screen.findByText(fr.failure.offline)).toBeTruthy();

    online.mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: fr.failure.retry }));
    expect(await screen.findByText('Ahir vaig comprar el pa al mercat.')).toBeTruthy();
  });

  it('shows the Catalan without anatomy after two bad replies, and Réessayer rebuilds it', async () => {
    const fetchFn = stubFetch(
      ok(brokenAnatomy(HIER.body)),
      ok(brokenAnatomy(HIER.body)),
      ok(HIER.body),
    );
    vi.stubGlobal('fetch', fetchFn);
    const user = await submitFromHome(HIER.input);

    expect(await screen.findByText(fr.failure.analysisFailed)).toBeTruthy();
    expect(screen.getByText('Ahir vaig comprar el pa al mercat.')).toBeTruthy();
    expectNoEnglish();

    await user.click(screen.getByRole('button', { name: fr.failure.retry }));
    expect(await screen.findByText('Verbe · vaig cantar')).toBeTruthy();
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(await phrasesOf(database).count()).toBe(1);
  });
});

describe('Home', () => {
  it('keeps « Traduire en catalan » disabled until there is text, and counts past 250 characters', async () => {
    const user = userEvent.setup();
    renderAt('#/');
    const submit = screen.getByRole('button', { name: fr.home.submit });
    const field = screen.getByLabelText(fr.home.inputLabel);
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    await user.type(field, '   ');
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    expect(field.getAttribute('maxlength')).toBe('300');

    await user.clear(field);
    await user.click(field);
    await user.paste('a'.repeat(250));
    expect(screen.queryByText(/^Caractères/)).toBeNull();
    await user.type(field, 'b');
    expect(screen.getByText(/^Caractères/).textContent?.trim()).toBe(
      'Caractères\u202f: 251 / 300',
    );
    expect((submit as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows the empty state, then routes at once to « Traduction… » on submit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    const user = userEvent.setup();
    renderAt('#/');
    expect(screen.getByText(fr.home.recentsEmpty)).toBeTruthy();
    await user.type(screen.getByLabelText(fr.home.inputLabel), HIER.input);
    await user.click(screen.getByRole('button', { name: fr.home.submit }));
    expect(await screen.findAllByText(fr.phrase.translating)).toBeTruthy();
    expect(window.location.hash).toMatch(/^#\/phrase\//);
  });

  it('lists the five newest phrases, Catalan over French, and reopens one with no call', async () => {
    const replies = [HIER, CONTENTE, FLEMME, LAIT, recorded(1, 2), recorded(1, 3)];
    for (const [index, reply] of replies.entries()) await seed(reply, 1_000 + index);
    const fetchFn = stubFetch(ok(HIER.body));
    vi.stubGlobal('fetch', fetchFn);

    const user = userEvent.setup();
    renderAt('#/');
    const recents = screen.getByRole('region', { name: fr.home.recentsHeading });
    await waitFor(() => expect(within(recents).getAllByRole('link')).toHaveLength(5));
    const links = within(recents).getAllByRole('link');
    const newest = await phrasesOf(database).orderBy('createdAt').reverse().first();
    expect(links[0]?.firstElementChild?.textContent).toBe(newest?.ca);
    expect(links[0]?.lastElementChild?.textContent).toBe(newest?.fr);
    expectNoEnglish();

    await user.click(links[0] as HTMLElement);
    expect(await screen.findByText(newest?.input ?? '')).toBeTruthy();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('reopens a sentence typed again with other spacing and case, with no call', async () => {
    await seed(HIER);
    const fetchFn = stubFetch(ok(HIER.body));
    vi.stubGlobal('fetch', fetchFn);
    await submitFromHome(`  ${HIER.input.toUpperCase()}`);
    expect(await screen.findByText('Ahir vaig comprar el pa al mercat.')).toBeTruthy();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('cancels the request when the learner goes back, and stores nothing', async () => {
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            signal = init.signal ?? undefined;
            signal?.addEventListener('abort', () => {
              reject(new DOMException('aborted', 'AbortError'));
            });
          }),
      ),
    );
    const user = await submitFromHome(HIER.input);
    expect(await screen.findByText(fr.phrase.translating)).toBeTruthy();

    await user.click(screen.getByRole('link', { name: fr.phrase.back }));
    await screen.findByLabelText(fr.home.inputLabel);
    expect(signal?.aborted).toBe(true);
    expect(await phrasesOf(database).count()).toBe(0);
  });
});
