/**
 * The views that are allowed to write.
 *
 * The claim under test is the evidence typing, not the markup. An attempt typed
 * before the reveal is compared automatically and logged as `recall`; a reveal
 * with no attempt is a `lookup`; a grade is `graded` and comes only from the
 * review loop. Getting that wrong is invisible: every one of them produces a
 * plausible-looking heatmap, and only the FSRS schedule and the mastery half of
 * the map would be quietly wrong.
 *
 * THE LEARNER IS NEVER ASKED TO RATE THEMSELVES IN THE QUERY VIEW, which is
 * asserted here rather than left to a comment, because it is the whole
 * distinction between recall and graded.
 *
 * IDs come from LEAVES at runtime; test/closed-vocabulary.test.ts scans test/
 * for component-ID literals.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { TrainerDatabase } from '../src/db/dexie';
import { readComponentState } from '../src/db/read';
import { LEAVES, type LeafNode } from '../src/taxonomy';
import { fr } from '../src/i18n/fr';
import { RATINGS } from '../src/srs/evidence';
import { compareAttempt, foldAttempt } from '../src/text/attempt';
import { mountQueryView } from '../src/ui/query-view';
import { mountReviewView } from '../src/ui/review-view';
import { renderApiKeyPanel } from '../src/ui/api-key';
import { startReviewSession } from '../src/review/session';
import type { CallOptions, CallResult } from '../src/api/anthropic';

const NOW = 1_700_000_000_000;

let db: TrainerDatabase;
let dbIndex = 0;

beforeEach(async () => {
  dbIndex += 1;
  db = new TrainerDatabase(`test-views-${String(dbIndex)}`);
  await db.open();
});

afterEach(async () => {
  db.close();
  await TrainerDatabase.delete(`test-views-${String(dbIndex)}`);
  localStorage.clear();
});

/** The leaf the stub reply decomposes to, taken from the data rather than named. */
function subject(): LeafNode {
  const leaf = LEAVES[0];
  expect(leaf).toBeDefined();
  return leaf!;
}

/**
 * A stub in place of the API, returning a reply of the real shape.
 *
 * It records the evidence it was asked for, which is the field under test: the
 * view decides it and passes it to the client, and the client puts it in the
 * logged record unchanged.
 */
function stubCall(seen: CallOptions[]): (options: CallOptions) => Promise<CallResult> {
  const leaf = subject();
  return (options: CallOptions) => {
    seen.push(options);
    const decomposition = {
      decomposition: [{ id: leaf.id as never, ca: leaf.ca }],
      answer: leaf.glosses.fr,
      answer_lang: 'fr' as const,
    };
    return Promise.resolve({
      decomposition,
      queryLog: {
        asked_at: NOW,
        question: options.question,
        intent: options.intent,
        direction: options.direction,
        evidence: options.evidence,
        ...decomposition,
      },
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
      },
    });
  };
}

function mountQuery(seen: CallOptions[]): HTMLElement {
  const host = document.createElement('div');
  document.body.replaceChildren(host);
  localStorage.setItem('anthropic-api-key', 'test-key');
  mountQueryView(host, { call: stubCall(seen) });
  return host;
}

/**
 * Waits for a condition rather than for a fixed number of microtasks.
 *
 * Both views write through a Dexie transaction, which resolves on IndexedDB
 * events and not on the microtask queue, so a `for` loop of `await
 * Promise.resolve()` returns before anything has been recorded and the
 * assertions pass or fail for the wrong reason.
 */
async function until(
  condition: () => boolean | Promise<boolean>,
  what: string,
): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (await condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  expect.fail(`timed out waiting for ${what}`);
}

async function ask(
  host: HTMLElement,
  values: { direction: string; question: string; attempt?: string },
): Promise<void> {
  const select = host.querySelector<HTMLSelectElement>('.ac-select')!;
  select.value = values.direction;
  select.dispatchEvent(new Event('change'));

  host.querySelector<HTMLTextAreaElement>('.ac-textarea')!.value = values.question;

  const attempt = host.querySelector<HTMLInputElement>('input[lang="ca"]')!;
  attempt.value = values.attempt ?? '';
  attempt.dispatchEvent(new Event('input'));

  host.querySelector<HTMLButtonElement>('.ac-button--primary')!.click();
  await until(
    () => host.querySelector('.ac-status')?.textContent !== fr.query.pending,
    'the query to settle',
  );
}

describe('the answer comparator', () => {
  it('folds case and accents', () => {
    expect(foldAttempt('Això')).toBe(foldAttempt('aixo'));
  });

  it('folds the typographic apostrophe onto the straight one', () => {
    // A phone keyboard substitutes it without asking, and Catalan forms are
    // authored with the straight one. Marking that wrong would be marking the
    // keyboard wrong.
    expect(foldAttempt('s’ha')).toBe(foldAttempt("s'ha"));
  });

  it('does not drop the apostrophe, which the search normaliser does', () => {
    // The search box folds "sha" onto `s'ha` deliberately. Doing it here would
    // accept a form that is not Catalan.
    expect(foldAttempt('sha')).not.toBe(foldAttempt("s'ha"));
  });

  it('leaves the interpunct alone, because it is a taught contrast', () => {
    expect(foldAttempt('col·lecció')).not.toBe(foldAttempt('colleccio'));
  });

  it('counts an attempt correct only when every reference form is produced', () => {
    expect(compareAttempt('vaig cantar ahir', ['vaig cantar']).correct).toBe(true);
    const partial = compareAttempt('vaig cantar', ['vaig cantar', 'ahir']);
    expect(partial.correct).toBe(false);
    expect(partial.missing).toEqual(['ahir']);
    expect(partial.found).toEqual(['vaig cantar']);
  });

  it('refuses to call an empty attempt, or an empty reference, correct', () => {
    // Both would hand out a free objective outcome, one for typing nothing and
    // one for a reply that named no Catalan at all.
    expect(compareAttempt('', ['vaig cantar']).correct).toBe(false);
    expect(compareAttempt('vaig cantar', []).correct).toBe(false);
  });
});

describe('the query view types its own evidence', () => {
  it('logs a reveal without an attempt as a lookup', async () => {
    const seen: CallOptions[] = [];
    const host = mountQuery(seen);
    await ask(host, { direction: 'ca_to_fr', question: subject().ca });

    expect(seen).toHaveLength(1);
    expect(seen[0]?.evidence).toBe('lookup');
    expect(seen[0]?.intent).toBe('comprehend');
  });

  it('logs a typed attempt as a recall, with an objective outcome', async () => {
    const seen: CallOptions[] = [];
    const host = mountQuery(seen);
    await ask(host, {
      direction: 'fr_to_ca',
      question: subject().glosses.fr,
      attempt: subject().ca,
    });

    expect(seen[0]?.evidence).toBe('recall');
    expect(seen[0]?.intent).toBe('produce');
    // The rating field is what separates recall from graded, and an attempt
    // never carries one.
    expect(seen[0]?.rating).toBeUndefined();
    expect(host.querySelector('.ac-attempt-result')?.getAttribute('data-correct')).toBe(
      'true',
    );
  });

  it('marks an attempt that missed a form, without asking the learner', async () => {
    const seen: CallOptions[] = [];
    const host = mountQuery(seen);
    await ask(host, {
      direction: 'fr_to_ca',
      question: subject().glosses.fr,
      attempt: 'zzz',
    });

    expect(seen[0]?.evidence).toBe('recall');
    expect(host.querySelector('.ac-attempt-result')?.getAttribute('data-correct')).toBe(
      'false',
    );
  });

  it('never offers the learner a self-rating', async () => {
    const seen: CallOptions[] = [];
    const host = mountQuery(seen);
    await ask(host, {
      direction: 'fr_to_ca',
      question: subject().glosses.fr,
      attempt: subject().ca,
    });

    expect(host.querySelectorAll('[data-rating]')).toHaveLength(0);
    for (const rating of RATINGS) {
      expect(host.textContent).not.toContain(fr.review[`rating${capitalise(rating)}`]);
    }
  });

  it('offers no attempt field at all on the comprehend side', () => {
    const host = mountQuery([]);
    const attempt = host.querySelector<HTMLInputElement>('input[lang="ca"]');
    expect(attempt?.closest('.ac-control')?.hasAttribute('hidden')).toBe(true);
  });

  it('asks for a key rather than calling without one', async () => {
    const seen: CallOptions[] = [];
    const host = document.createElement('div');
    document.body.replaceChildren(host);
    localStorage.clear();
    mountQueryView(host, { call: stubCall(seen) });
    await ask(host, { direction: 'ca_to_fr', question: subject().ca });

    expect(seen).toHaveLength(0);
    expect(host.querySelector('.ac-status')?.textContent).toBe(fr.apiKey.prompt);
  });
});

function capitalise(value: string): 'Again' | 'Hard' | 'Good' | 'Easy' {
  return (value.charAt(0).toUpperCase() + value.slice(1)) as
    'Again' | 'Hard' | 'Good' | 'Easy';
}

describe('the review screen drives the existing loop', () => {
  function mountReview(): HTMLElement {
    const host = document.createElement('div');
    document.body.replaceChildren(host);
    mountReviewView(host, {
      start: () => startReviewSession({ database: db, limit: 2, now: () => NOW }),
    });
    return host;
  }

  it('reveals before it grades, and grades through the session', async () => {
    const host = mountReview();
    host.querySelector<HTMLButtonElement>('.ac-button--primary')!.click();
    await until(() => host.querySelector('.ac-card-prompt') !== null, 'the first card');

    // Nothing to grade until the answer has been shown: a grade is a judgement
    // of a recalled answer, so it cannot precede the recall.
    expect(host.querySelectorAll('[data-rating]')).toHaveLength(0);
    expect(host.querySelector('.ac-card-prompt')?.textContent).not.toBe('');

    host.querySelector<HTMLButtonElement>('.ac-reveal')!.click();
    expect(host.querySelectorAll('[data-rating]')).toHaveLength(RATINGS.length);

    const graded = host.querySelector<HTMLElement>('.ac-ratings')!.dataset['nodeId'];
    host.querySelector<HTMLButtonElement>('[data-rating="good"]')!.click();
    await until(async () => (await db.queries.count()) > 0, 'the grade to be written');

    const logged = await db.queries.toArray();
    expect(logged).toHaveLength(1);
    expect(logged[0]?.evidence).toBe('graded');
    expect(logged[0]?.rating).toBe('good');
    expect(logged[0]?.componentIds).toEqual([graded]);

    const state = await readComponentState(graded ?? '', db);
    expect(state.mastery.graded_review_count).toBe(1);
  });

  it('says a card is about a rule rather than about a translation', () => {
    // The authored data holds no French translation of any example, so copy
    // promising one would promise something the data cannot supply.
    expect(mountReview().textContent).toContain(fr.review.ruleRecall);
  });
});

describe('the API key pane', () => {
  it('stores a key and never echoes it back', () => {
    const panel = renderApiKeyPanel();
    const field = panel.querySelector<HTMLInputElement>('.ac-input')!;
    // A password field, so it is not readable over a shoulder or in a
    // screenshot of this pane.
    expect(field.type).toBe('password');

    field.value = 'sk-secret';
    panel.querySelector<HTMLButtonElement>('.ac-button--primary')!.click();

    expect(localStorage.getItem('anthropic-api-key')).toBe('sk-secret');
    expect(field.value).toBe('');
    expect(panel.textContent).not.toContain('sk-secret');
    expect(panel.querySelector('.ac-status')?.textContent).toBe(fr.apiKey.saved);
  });

  it('forgets a key on request', () => {
    localStorage.setItem('anthropic-api-key', 'sk-secret');
    const panel = renderApiKeyPanel();
    const forget = [...panel.querySelectorAll<HTMLButtonElement>('.ac-button')].find(
      (button) => button.textContent === fr.apiKey.forget,
    )!;
    forget.click();
    expect(localStorage.getItem('anthropic-api-key')).toBeNull();
  });
});
