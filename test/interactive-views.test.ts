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
import type { signalReply } from '../src/db/persist';
import { readComponentState } from '../src/db/read';
import { LEAVES, type LeafNode } from '../src/taxonomy';
import { fr } from '../src/i18n/fr';
import { INTENT_FOR_DIRECTION, RATINGS } from '../src/srs/evidence';
import { compareAttempt, foldAttempt } from '../src/text/attempt';
import { mountQueryView } from '../src/ui/query-view';
import { mountReviewView } from '../src/ui/review-view';
import { renderApiKeyPanel } from '../src/ui/api-key';
import { startReviewSession } from '../src/review/session';
import type { CallOptions, CallResult } from '../src/api/anthropic';

const NOW = 1_700_000_000_000;

/** What the stub reports the cache read. Any non-zero value would do. */
const CACHE_READ_TOKENS = 13_104;

/**
 * What the stub reports as the detected direction. The caller no longer sends
 * one, so this is the model's answer rather than an echo of the request.
 */
const DETECTED_DIRECTION = 'fr_to_ca' as const;

/** Two paragraphs, blank-line separated, which is the shape the prompt asks for. */
const TWO_PARAGRAPHS = ['Premier point.', 'Second point.'].join('\n\n');

/**
 * The French half of the pair, deliberately unlike anything else in the reply.
 * Sharing a string with `answer` would let a test that means "the French
 * sentence is on screen" pass on the explanation being on screen.
 */
const FRENCH_UTTERANCE = 'La phrase française correspondante.';

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
      direction: DETECTED_DIRECTION,
      answer: leaf.glosses.fr,
      answer_ca: leaf.ca,
      answer_fr: FRENCH_UTTERANCE,
      answer_lang: 'fr' as const,
    };
    return Promise.resolve({
      decomposition,
      queryLog: {
        asked_at: NOW,
        question: options.question,
        intent: INTENT_FOR_DIRECTION[DETECTED_DIRECTION],
        evidence: options.evidence,
        ...decomposition,
      },
      unverified: [],
      // Non-zero on purpose. A stub reporting zeros would let the view drop the
      // usage entirely and still pass, which is exactly what shipped once.
      usage: {
        inputTokens: 120,
        outputTokens: 45,
        cacheCreationTokens: 0,
        cacheReadTokens: CACHE_READ_TOKENS,
      },
    });
  };
}

/** A reply of the real shape, with the fields a single test cares about overridden. */
function replyWith(
  leaf: LeafNode,
  overrides: {
    answer?: string;
    cacheReadTokens?: number;
    cacheCreationTokens?: number;
    unverified?: readonly string[];
    /** Overrides the decomposition entries, for the repeated-component case. */
    entries?: readonly { id: string; ca: string }[];
  } = {},
): CallResult {
  const decomposition = {
    decomposition: (overrides.entries ?? [{ id: leaf.id, ca: leaf.ca }]).map(
      (entry) => ({ id: entry.id as never, ca: entry.ca }),
    ),
    direction: DETECTED_DIRECTION,
    answer: overrides.answer ?? leaf.glosses.fr,
    answer_ca: leaf.ca,
    answer_fr: FRENCH_UTTERANCE,
    answer_lang: 'fr' as const,
  };
  return {
    decomposition,
    queryLog: {
      asked_at: NOW,
      question: leaf.ca,
      intent: INTENT_FOR_DIRECTION[DETECTED_DIRECTION],
      evidence: 'lookup' as const,
      ...decomposition,
    },
    unverified: overrides.unverified ?? [],
    usage: {
      inputTokens: 120,
      outputTokens: 45,
      cacheCreationTokens: overrides.cacheCreationTokens ?? 0,
      cacheReadTokens: overrides.cacheReadTokens ?? CACHE_READ_TOKENS,
    },
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
  values: { question: string; attempt?: string },
): Promise<void> {
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

  it('matches the whole utterance the reply gave', () => {
    const outcome = compareAttempt('Vaig cantar.', 'vaig cantar');
    expect(outcome.exact).toBe(true);
    expect(outcome.correct).toBe(true);
  });

  it('still credits a different wording that produces every named form', () => {
    // The model's phrasing is one option, not the only one. Marking a valid
    // alternative wrong is what teaches a learner to distrust the tool.
    const outcome = compareAttempt('ahir vaig cantar molt', 'vaig cantar ahir', [
      'vaig cantar',
      'ahir',
    ]);
    expect(outcome.exact).toBe(false);
    expect(outcome.correct).toBe(true);
  });

  it('reports what is missing when neither test passes', () => {
    const partial = compareAttempt('vaig cantar', 'vaig cantar ahir', [
      'vaig cantar',
      'ahir',
    ]);
    expect(partial.correct).toBe(false);
    expect(partial.missing).toEqual(['ahir']);
    expect(partial.found).toEqual(['vaig cantar']);
  });

  it('refuses to call an empty attempt, or an empty reference, correct', () => {
    // Both would hand out a free objective outcome, one for typing nothing and
    // one for a reply that named no Catalan at all.
    expect(compareAttempt('', 'vaig cantar').correct).toBe(false);
    expect(compareAttempt('vaig cantar', '').correct).toBe(false);
  });
});

describe('the query view types its own evidence', () => {
  it('logs a reveal without an attempt as a lookup', async () => {
    const seen: CallOptions[] = [];
    const host = mountQuery(seen);
    await ask(host, { question: subject().ca });

    expect(seen).toHaveLength(1);
    expect(seen[0]?.evidence).toBe('lookup');
    // The view sends no intent and no direction at all now: the model reads the
    // direction off the question and the client derives the intent from it.
    expect(seen[0]?.intent).toBeUndefined();
    expect('direction' in seen[0]!).toBe(false);
  });

  it('logs a typed attempt as a recall, with an objective outcome', async () => {
    const seen: CallOptions[] = [];
    const host = mountQuery(seen);
    await ask(host, {
      question: subject().glosses.fr,
      attempt: subject().ca,
    });

    expect(seen[0]?.evidence).toBe('recall');
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
      question: subject().glosses.fr,
      attempt: subject().ca,
    });

    expect(host.querySelectorAll('[data-rating]')).toHaveLength(0);
    for (const rating of RATINGS) {
      expect(host.textContent).not.toContain(fr.review[`rating${capitalise(rating)}`]);
    }
  });

  it('offers the attempt field without asking which way round the query runs', () => {
    // The direction selector is gone: it asked the learner to declare something
    // the question already showed. The attempt field is therefore always
    // available, and filling it in is what makes the event a recall.
    const host = mountQuery([]);
    expect(host.querySelector('.ac-select')).toBeNull();
    const attempt = host.querySelector<HTMLInputElement>('input[lang="ca"]');
    expect(attempt?.closest('.ac-control')?.hasAttribute('hidden')).toBe(false);
  });

  it('shows the Catalan to say, and names the direction it detected', async () => {
    const host = mountQuery([]);
    await ask(host, { question: subject().glosses.fr });

    const utterance = host.querySelector('.ac-utterance');
    expect(utterance?.textContent).toBe(subject().ca);
    expect(utterance?.getAttribute('lang')).toBe('ca');
    expect(host.querySelector('[data-direction]')?.getAttribute('data-direction')).toBe(
      DETECTED_DIRECTION,
    );
  });

  it('shows the pair in both languages, each tagged as its own language', async () => {
    const host = mountQuery([]);
    await ask(host, { question: subject().glosses.fr });

    const lines = [...host.querySelectorAll('.ac-utterance')];
    expect(lines.map((line) => line.getAttribute('lang'))).toEqual(['ca', 'fr']);
    expect(lines.map((line) => line.textContent)).toEqual([
      subject().ca,
      FRENCH_UTTERANCE,
    ]);

    // The French line is the sentence, not the explanation. Before 6c the only
    // French in the reply was the explanation, and the meaning of a Catalan
    // énoncé was buried inside it.
    const headings = [...host.querySelectorAll('.ac-subheading')].map(
      (node) => node.textContent,
    );
    expect(headings).toContain(fr.query.answerFrHeading);
    expect(host.querySelector('.ac-answer')?.textContent).not.toContain(
      FRENCH_UTTERANCE,
    );
  });

  it('breaks the explanation into paragraphs rather than one block', async () => {
    const host = document.createElement('div');
    document.body.replaceChildren(host);
    localStorage.setItem('anthropic-api-key', 'test-key');
    const leaf = subject();
    mountQueryView(host, {
      call: () => Promise.resolve(replyWith(leaf, { answer: TWO_PARAGRAPHS })),
    });
    await ask(host, { question: leaf.glosses.fr });

    expect(host.querySelectorAll('.ac-answer p')).toHaveLength(2);
  });

  it('puts the authored examples and the contrast behind each grammar point', async () => {
    // One instance is not a rule. The examples array is the two to eight Catalan
    // sentences authored to hold this rule constant while everything else
    // varies, and the contrast note is the authored statement of whether the
    // French intuition carries. Both were reachable from the reply and rendered
    // nowhere near it.
    const host = mountQuery([]);
    const leaf = subject();
    await ask(host, { question: leaf.glosses.fr });

    const disclosure = host.querySelector(`.ac-component[data-node-id="${leaf.id}"]`);
    expect(disclosure).not.toBeNull();

    // Collapsed by default: the answer is what was asked for.
    expect(disclosure?.hasAttribute('open')).toBe(false);

    const examples = [
      ...(disclosure?.querySelectorAll('.ac-component-examples li') ?? []),
    ];
    expect(examples.map((node) => node.textContent)).toEqual([...leaf.examples]);
    expect(
      disclosure?.querySelector('.ac-component-examples')?.getAttribute('lang'),
    ).toBe('ca');

    const contrast = disclosure?.querySelector('.ac-contrast');
    expect(contrast?.getAttribute('data-status')).toBe(leaf.contrast_fr.status);
    expect(contrast?.textContent).toContain(leaf.contrast_fr.note);
    // The shared French table rather than a second wording written here.
    expect(contrast?.textContent).toContain(fr.contrast[leaf.contrast_fr.status]);

    // Said out loud, because under « Points de grammaire relevés » these would
    // otherwise read as variants of the learner's own sentence.
    expect(disclosure?.textContent).toContain(fr.query.componentExamples);
  });

  it('mints one block per notion when a reply names the same one twice', async () => {
    // Two reasons a reply repeats a component, and the display owes the same
    // answer to both: two forms in the sentence genuinely realising one rule,
    // and the padding that golden fixture 01 records. Rendering the list raw
    // duplicated the whole block, which is wrong for the first case and doubly
    // wrong now a block carries the leaf's entire example set.
    const host = document.createElement('div');
    document.body.replaceChildren(host);
    localStorage.setItem('anthropic-api-key', 'test-key');
    const leaf = subject();
    const other = 'una altra forma';
    mountQueryView(host, {
      call: () =>
        Promise.resolve(
          replyWith(leaf, {
            entries: [
              { id: leaf.id, ca: leaf.ca },
              { id: leaf.id, ca: other },
            ],
          }),
        ),
    });
    await ask(host, { question: leaf.glosses.fr });

    expect(
      host.querySelectorAll(`.ac-component[data-node-id="${leaf.id}"]`),
    ).toHaveLength(1);
    expect(host.querySelectorAll('.ac-component-examples')).toHaveLength(1);
    // Neither form is dropped to achieve it.
    const form = host.querySelector('.ac-component-form')?.textContent ?? '';
    expect(form).toContain(leaf.ca);
    expect(form).toContain(other);
  });

  it('says why the grammar points are missing rather than showing none', async () => {
    // A dropped analysis and a sentence with no grammar in it look identical if
    // the section simply disappears, and only one of those is true.
    const host = document.createElement('div');
    document.body.replaceChildren(host);
    localStorage.setItem('anthropic-api-key', 'test-key');
    const leaf = subject();
    mountQueryView(host, {
      call: () => Promise.resolve(replyWith(leaf, { unverified: ['he cantat'] })),
    });
    await ask(host, { question: leaf.ca });

    const notice = host.querySelector<HTMLElement>('[data-unverified]');
    expect(notice?.textContent).toBe(fr.query.componentsUnverified);
    expect(host.querySelector('.ac-components')).toBeNull();
    expect(host.textContent).not.toContain(fr.query.componentsHeading);

    // The translation is not what failed and is still on screen.
    const lines = [...host.querySelectorAll('.ac-utterance')].map((n) => n.textContent);
    expect(lines).toEqual([leaf.ca, FRENCH_UTTERANCE]);
  });

  it('files a signal with the whole reply, and grades nobody for it', async () => {
    const filed: Parameters<typeof signalReply>[0][] = [];
    const host = document.createElement('div');
    document.body.replaceChildren(host);
    localStorage.setItem('anthropic-api-key', 'test-key');
    const leaf = subject();
    mountQueryView(host, {
      call: () => Promise.resolve(replyWith(leaf)),
      signal: (request) => {
        filed.push(request);
        return Promise.resolve(1);
      },
    });
    await ask(host, { question: leaf.ca });

    const button = host.querySelector<HTMLButtonElement>('.ac-signal button');
    expect(button?.textContent).toBe(fr.query.signal);
    button?.click();
    await until(() => filed.length === 1, 'the signal to be filed');

    expect(filed[0]?.question).toBe(leaf.ca);
    expect(filed[0]?.decomposition.answer_ca).toBe(leaf.ca);
    expect(filed[0]?.decomposition.answer_fr).toBe(FRENCH_UTTERANCE);

    // Signalling is a judgement about the model, so the only write it may cause
    // is the signal itself. That it emits no evidence is asserted directly
    // against a database in test/signals.test.ts; what this checks is that the
    // view routes the press there and nowhere else.
    expect(filed).toHaveLength(1);
    expect(host.querySelector('[data-signalled]')).not.toBeNull();
    expect(host.textContent).toContain(fr.query.signalled);
  });

  it('reports what the prompt cache did, which nothing else can', async () => {
    // The only check on whether the cached prefix is actually hit is a second
    // live call, and a miss reports as silence rather than as an error. The
    // client has carried `usage` since phase 4; until this landed, the one
    // caller dropped it and the check was available to nobody.
    const host = mountQuery([]);
    await ask(host, { question: subject().ca });

    const usage = host.querySelector<HTMLElement>('.ac-usage');
    expect(usage).not.toBeNull();
    expect(usage?.dataset['cacheRead']).toBe(String(CACHE_READ_TOKENS));
    expect(usage?.textContent).toContain(String(CACHE_READ_TOKENS));
    expect(usage?.textContent).toContain(fr.query.usageRead);
    expect(usage?.textContent).toContain(fr.query.usageWritten);
    // A hit needs no caveat about what a miss would have meant.
    expect(usage?.textContent).not.toContain(fr.query.usageHint);
  });

  it('explains a zero, because that is the failure it exists to catch', async () => {
    const host = document.createElement('div');
    document.body.replaceChildren(host);
    localStorage.setItem('anthropic-api-key', 'test-key');
    const leaf = subject();
    mountQueryView(host, {
      call: () =>
        Promise.resolve(
          replyWith(leaf, { cacheReadTokens: 0, cacheCreationTokens: 37_000 }),
        ),
    });
    await ask(host, { question: leaf.ca });

    expect(host.querySelector('.ac-usage')?.textContent).toContain(fr.query.usageHint);
  });

  it('asks for a key rather than calling without one', async () => {
    const seen: CallOptions[] = [];
    const host = document.createElement('div');
    document.body.replaceChildren(host);
    localStorage.clear();
    mountQueryView(host, { call: stubCall(seen) });
    await ask(host, { question: subject().ca });

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
      // Forwards what the view asks for rather than dropping it. A stub that
      // ignores its options passes every assertion about what the view renders
      // and none about what it requested, which is how the direction reached
      // the session as a default for a whole phase.
      start: (options) =>
        startReviewSession({ ...options, database: db, limit: 2, now: () => NOW }),
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

  it('keeps the rest of the notion behind the reveal, and below the grade', async () => {
    const host = mountReview();
    host.querySelector<HTMLButtonElement>('.ac-button--primary')!.click();
    await until(() => host.querySelector('.ac-card-prompt') !== null, 'the first card');

    // Before the reveal it would give the answer away.
    expect(host.querySelector('.ac-card-more')).toBeNull();

    host.querySelector<HTMLButtonElement>('.ac-reveal')!.click();
    const more = host.querySelector('.ac-card-more');
    expect(more).not.toBeNull();

    const graded = host.querySelector<HTMLElement>('.ac-ratings')!.dataset['nodeId']!;
    const leaf = LEAVES.find((entry) => entry.id === graded)!;

    // Catalan first, then the French account of it.
    const shown = [...more!.querySelectorAll('.ac-card-examples li')].map(
      (node) => node.textContent,
    );
    expect(more!.querySelector('.ac-card-examples')?.getAttribute('lang')).toBe('ca');
    expect(more!.textContent).toContain(leaf.contrast_fr.note);
    expect(more!.textContent).toContain(fr.contrast[leaf.contrast_fr.status]);

    // The example that was tested is not repeated underneath it, and the rest
    // are all there. Taken from the item's own index rather than by matching on
    // the prompt string, which returns everything under fr_to_ca.
    expect(shown).toHaveLength(leaf.examples.length - 1);
    expect(shown).not.toContain(host.querySelector('.ac-card-prompt')?.textContent);

    // notes stays out: it carries bare component IDs and a card has nowhere to
    // send them.
    if (leaf.notes !== undefined) {
      expect(more!.textContent).not.toContain(leaf.notes);
    }

    // THE ORDERING THAT MATTERS. The four grade buttons are the only source of
    // graded evidence in the application, and a few hundred pixels of reading
    // above them puts them off a 390 px screen.
    const ratings = host.querySelector('.ac-ratings')!;
    expect(
      ratings.compareDocumentPosition(more!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('can ask for the Catalan rather than only for the rule', async () => {
    // buildReviewItem implemented both directions from 5b and fr.review.askFrToCa
    // was authored the whole time, and no caller ever passed a direction, so
    // half the deck was unreachable. Recognising the rule a sentence illustrates
    // and producing the Catalan form of a rule are different skills.
    const host = mountReview();
    const select = host.querySelector<HTMLSelectElement>('.ac-review .ac-select');
    expect(select).not.toBeNull();

    select!.value = 'fr_to_ca';
    select!.dispatchEvent(new Event('change'));
    host.querySelector<HTMLButtonElement>('.ac-button--primary')!.click();
    await until(() => host.querySelector('.ac-card-prompt') !== null, 'the first card');

    // The prompt is the French gloss and the expected answer is the Catalan.
    expect(host.querySelector('.ac-card-prompt')?.getAttribute('lang')).toBe('fr');
    expect(host.textContent).toContain(fr.review.askFrToCa);

    host.querySelector<HTMLButtonElement>('.ac-reveal')!.click();
    const reference = host.querySelector('.ac-card-reference');
    expect(reference?.getAttribute('lang')).toBe('ca');

    const graded = host.querySelector<HTMLElement>('.ac-ratings')!.dataset['nodeId']!;
    expect(reference?.textContent).toBe(LEAVES.find((l) => l.id === graded)!.ca);
  });

  it('does not let the direction move once the queue is frozen', async () => {
    const host = mountReview();
    host.querySelector<HTMLButtonElement>('.ac-button--primary')!.click();
    await until(() => host.querySelector('.ac-card-prompt') !== null, 'the first card');

    // The queue is built at session start, so a control still on screen would
    // promise to relabel cards that have already been answered.
    expect(host.querySelector<HTMLElement>('.ac-review .ac-control')?.hidden).toBe(
      true,
    );
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
