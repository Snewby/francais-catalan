/**
 * The review loop.
 *
 * Two invariants carry this phase. The grade is the only source of graded
 * evidence in the application, which is asserted structurally below rather than
 * by walking every code path. And selection is a function, so the `assess`
 * selector lands later without the loop changing, which is asserted by driving
 * the loop with a second implementation written inside this file.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { TrainerDatabase } from '../src/db/dexie';
import { recordQuery } from '../src/db/persist';
import { readComponentState } from '../src/db/read';
import { EVIDENCE_EFFECTS } from '../src/srs/evidence';
import { CONTRAST_STATUSES, LEAVES, leafById, type LeafNode } from '../src/taxonomy';
import { freshMastery } from '../src/srs/fsrs';
import { DEFAULT_RATING } from '../src/srs/elo';
import type { ComponentState } from '../src/srs/apply';
import { CONTRAST_SELECTION_WEIGHT } from '../src/review/weight';
import {
  DUE_BASE_SCORE,
  dueScore,
  dueSelector,
  type SelectionCandidate,
  type Selector,
} from '../src/review/select';
import { buildReviewItem, exampleFor, toGradedQueryLog } from '../src/review/item';
import { INTENT_FOR_DIRECTION } from '../src/srs/evidence';
import {
  NoCurrentItemError,
  ReviewSession,
  selectReviewQueue,
  startReviewSession,
} from '../src/review/session';
import { readSource, sourceFiles, stripComments } from './helpers/source';

const NOW = 1_700_000_000_000;
const DAY_MS = 86_400_000;

/** A real leaf per contrast status, so the ordering test is not hypothetical. */
const EXEMPLAR = Object.fromEntries(
  CONTRAST_STATUSES.map((status) => [
    status,
    LEAVES.find((leaf) => leaf.contrast_fr.status === status),
  ]),
) as Record<(typeof CONTRAST_STATUSES)[number], LeafNode | undefined>;

function stateWith(overrides: Partial<ComponentState['mastery']> = {}): ComponentState {
  return {
    exposure: { exposure_count: 0 },
    mastery: { ...freshMastery(), ...overrides },
    elo: DEFAULT_RATING,
  };
}

function candidate(leaf: LeafNode, state: ComponentState): SelectionCandidate {
  return { leaf, state };
}

let db: TrainerDatabase;
let dbIndex = 0;

beforeEach(async () => {
  dbIndex += 1;
  db = new TrainerDatabase(`test-review-loop-${String(dbIndex)}`);
  await db.open();
});

afterEach(async () => {
  db.close();
  await TrainerDatabase.delete(`test-review-loop-${String(dbIndex)}`);
});

describe('the grade is the only source of graded evidence', () => {
  it('is emitted by exactly one module in src/', () => {
    // Structural rather than behavioural: a behavioural test would have to
    // guess which path was the leaky one. What this cannot see is a caller
    // passing a variable through to the API client's `evidence` option, which
    // is why EVIDENCE_EFFECTS names the producer of each type in prose too.
    const sources = sourceFiles('src');
    expect(sources.length).toBeGreaterThan(0);

    const emitters = sources.filter((file) =>
      /evidence:\s*'graded'/.test(stripComments(readSource(file))),
    );

    expect(emitters).toEqual(['src/review/item.ts']);
  });

  it('names the review loop as the producer of graded evidence', () => {
    // The routing table is authoritative, so a phase that changed where graded
    // events come from without updating it would leave the two disagreeing.
    expect(EVIDENCE_EFFECTS.graded.producer).toContain('review loop');
    expect(EVIDENCE_EFFECTS.graded.requiresRating).toBe(true);
    expect(EVIDENCE_EFFECTS.graded.fsrs).toBe(true);
  });
});

describe('a review item is built from the authored taxonomy', () => {
  it('needs no API call, because every leaf carries examples and a form', () => {
    for (const leaf of LEAVES) {
      expect(leaf.examples.length, `${leaf.id} has no example`).toBeGreaterThan(0);
      expect(leaf.ca.trim(), `${leaf.id} has no Catalan form`).not.toBe('');
    }
  });

  it('asks in Catalan and answers in French, one way round', () => {
    const leaf = LEAVES[0];
    expect(leaf).toBeDefined();
    if (leaf === undefined) return;

    const item = buildReviewItem(leaf, { direction: 'ca_to_fr' });
    expect(item.intent).toBe('comprehend');
    expect(item.prompt).toBe(leaf.examples[0]);
    expect(item.reference).toBe(leaf.glosses.fr);
    expect(item.answer).toBe(leaf.glosses.fr);
  });

  it('asks in French and answers with the Catalan form, the other way round', () => {
    const leaf = LEAVES[0];
    expect(leaf).toBeDefined();
    if (leaf === undefined) return;

    const item = buildReviewItem(leaf, { direction: 'fr_to_ca' });
    expect(item.intent).toBe('produce');
    expect(item.prompt).toBe(leaf.glosses.fr);
    expect(item.reference).toBe(leaf.ca);
    // The Catalan form still travels in the decomposition, never in `answer`:
    // the logged answer field is French by definition.
    expect(item.answer).toBe(leaf.glosses.fr);
  });

  it('ships the two MVP intents and no others by default', () => {
    expect(Object.values(INTENT_FOR_DIRECTION).sort()).toEqual([
      'comprehend',
      'produce',
    ]);
  });

  it('rotates through the authored examples across repetitions', () => {
    const leaf = LEAVES.find((node) => node.examples.length >= 2);
    expect(leaf).toBeDefined();
    if (leaf === undefined) return;

    expect(exampleFor(leaf, 0)).toBe(leaf.examples[0]);
    expect(exampleFor(leaf, 1)).toBe(leaf.examples[1]);
    expect(exampleFor(leaf, leaf.examples.length)).toBe(leaf.examples[0]);
  });

  it('logs exactly one component, not everything the sentence realises', () => {
    const leaf = LEAVES[0];
    expect(leaf).toBeDefined();
    if (leaf === undefined) return;

    const log = toGradedQueryLog(buildReviewItem(leaf), 'good', NOW);
    expect(log.decomposition).toEqual([{ id: leaf.id, ca: leaf.ca }]);
    expect(log.evidence).toBe('graded');
    expect(log.rating).toBe('good');
    expect(log.answer_lang).toBe('fr');
  });
});

describe('the due selector', () => {
  it('puts novel and false-friend gaps above transfer gaps', () => {
    const novel = EXEMPLAR.novel;
    const falseFriend = EXEMPLAR['false-friend'];
    const nearMiss = EXEMPLAR['near-miss'];
    const transfer = EXEMPLAR.transfer;
    expect([novel, falseFriend, nearMiss, transfer].every(Boolean)).toBe(true);
    if (
      novel === undefined ||
      falseFriend === undefined ||
      nearMiss === undefined ||
      transfer === undefined
    )
      return;

    const ranked = dueSelector.select({
      now: NOW,
      candidates: [transfer, nearMiss, falseFriend, novel].map((leaf) =>
        candidate(leaf, stateWith()),
      ),
    });

    expect(ranked.indexOf(novel.id)).toBeLessThan(ranked.indexOf(nearMiss.id));
    expect(ranked.indexOf(falseFriend.id)).toBeLessThan(ranked.indexOf(nearMiss.id));
    expect(ranked.indexOf(nearMiss.id)).toBeLessThan(ranked.indexOf(transfer.id));
  });

  it('does not reuse the FSRS difficulty prior, which cannot make that ordering', () => {
    // INITIAL_DIFFICULTY_VALUE collapses the three non-transfer statuses to one
    // number, which is right for FSRS and wrong for a ranking.
    expect(CONTRAST_SELECTION_WEIGHT.novel).toBeGreaterThan(
      CONTRAST_SELECTION_WEIGHT['near-miss'],
    );
    expect(CONTRAST_SELECTION_WEIGHT['near-miss']).toBeGreaterThan(
      CONTRAST_SELECTION_WEIGHT.transfer,
    );
  });

  it('puts anything FSRS calls due above every gap', () => {
    const novel = EXEMPLAR.novel;
    const transfer = EXEMPLAR.transfer;
    if (novel === undefined || transfer === undefined) return;

    const due = candidate(
      transfer,
      stateWith({ graded_review_count: 1, due: NOW - DAY_MS, stability: 3 }),
    );
    const gap = candidate(novel, stateWith());

    expect(dueSelector.select({ now: NOW, candidates: [gap, due] })[0]).toBe(
      transfer.id,
    );
    expect(dueScore(due, NOW)).toBeGreaterThanOrEqual(DUE_BASE_SCORE);
  });

  it('sorts a longer overdue card above a shorter one', () => {
    const [first, second] = LEAVES;
    if (first === undefined || second === undefined) return;

    const ranked = dueSelector.select({
      now: NOW,
      candidates: [
        candidate(first, stateWith({ graded_review_count: 1, due: NOW - DAY_MS })),
        candidate(second, stateWith({ graded_review_count: 1, due: NOW - 9 * DAY_MS })),
      ],
    });
    expect(ranked[0]).toBe(second.id);
  });

  it('never offers a reviewed card before it falls due', () => {
    const leaf = LEAVES[0];
    if (leaf === undefined) return;

    const scheduled = candidate(
      leaf,
      stateWith({ graded_review_count: 1, due: NOW + 3 * DAY_MS, stability: 9 }),
    );
    expect(dueScore(scheduled, NOW)).toBeNull();
    expect(dueSelector.select({ now: NOW, candidates: [scheduled] })).toEqual([]);
  });

  it('lifts an unpractised gap above an unexplored one of the same status', () => {
    const pair = LEAVES.filter((leaf) => leaf.contrast_fr.status === 'near-miss').slice(
      0,
      2,
    );
    const [unexplored, unpractised] = pair;
    if (unexplored === undefined || unpractised === undefined) return;

    const ranked = dueSelector.select({
      now: NOW,
      candidates: [
        candidate(unexplored, stateWith()),
        {
          leaf: unpractised,
          state: { ...stateWith(), exposure: { exposure_count: 4 } },
        },
      ],
    });
    expect(ranked[0]).toBe(unpractised.id);
  });

  it('ranks every leaf in an untouched taxonomy, so a first session is possible', () => {
    const ranked = dueSelector.select({
      now: NOW,
      candidates: LEAVES.map((leaf) => candidate(leaf, stateWith())),
    });
    expect(ranked).toHaveLength(LEAVES.length);
  });
});

describe('a completed review', () => {
  it('writes exactly one graded event, carrying a rating', async () => {
    const session = await startReviewSession({
      database: db,
      limit: 1,
      now: () => NOW,
    });
    const item = session.current();
    expect(item).toBeDefined();
    if (item === undefined) return;

    await session.grade('good');

    const logged = await db.queries.toArray();
    expect(logged).toHaveLength(1);
    expect(logged[0]?.evidence).toBe('graded');
    expect(logged[0]?.rating).toBe('good');
    expect(logged[0]?.componentIds).toEqual([item.componentId]);
    expect(session.finished).toBe(true);
    expect(session.completed).toBe(1);
  });

  it('advances FSRS, which nothing in the application did before', async () => {
    const session = await startReviewSession({
      database: db,
      limit: 1,
      now: () => NOW,
    });
    const item = session.current();
    if (item === undefined) return;

    const before = await readComponentState(item.componentId, db);
    expect(before.mastery.graded_review_count).toBe(0);
    expect(before.mastery.due).toBeNull();

    await session.grade('good');

    const after = await readComponentState(item.componentId, db);
    expect(after.mastery.graded_review_count).toBe(1);
    expect(after.mastery.due).not.toBeNull();
    expect(after.mastery.stability).not.toBeNull();
    expect(after.exposure.exposure_count).toBe(1);
  });

  it('makes no network call', async () => {
    // The items come from the authored taxonomy, so a review is offline. A
    // fetch here would mean an item was being generated rather than read.
    const original = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error('the review loop must not call the API');
    }) as typeof fetch;
    try {
      const session = await startReviewSession({
        database: db,
        limit: 2,
        now: () => NOW,
      });
      while (!session.finished) await session.grade('easy');
      expect(session.completed).toBe(2);
    } finally {
      globalThis.fetch = original;
    }
  });

  it('refuses a grade with nothing left to grade', async () => {
    const session = new ReviewSession([], db, () => NOW);
    await expect(session.grade('good')).rejects.toThrow(NoCurrentItemError);
  });

  it('leaves a component that was never asked about untouched', async () => {
    const session = await startReviewSession({
      database: db,
      limit: 1,
      now: () => NOW,
    });
    const asked = session.current()?.componentId;
    await session.grade('again');

    const untouched = LEAVES.find((leaf) => leaf.id !== asked);
    if (untouched === undefined) return;
    const state = await readComponentState(untouched.id, db);
    expect(state.mastery.graded_review_count).toBe(0);
    expect(state.exposure.exposure_count).toBe(0);
  });
});

describe('selection is pluggable', () => {
  /**
   * A stand-in for the `assess` selector, written here rather than shipped:
   * unexplored first, and logged under a different intent. If this needs the
   * loop to change, the interface is wrong.
   */
  const unexploredFirst: Selector = {
    name: 'unexplored-first',
    select: (context) =>
      context.candidates
        .filter((entry) => entry.state.exposure.exposure_count === 0)
        .map((entry) => entry.leaf.id)
        .reverse(),
  };

  it('drives the loop from a second implementation', async () => {
    const session = await startReviewSession({
      database: db,
      selector: unexploredFirst,
      intent: 'assess',
      limit: 2,
      now: () => NOW,
    });

    const last = LEAVES[LEAVES.length - 1];
    expect(session.current()?.componentId).toBe(last?.id);
    expect(session.current()?.intent).toBe('assess');

    await session.grade('hard');
    const logged = await db.queries.toArray();
    expect(logged).toHaveLength(1);
    expect(logged[0]?.intent).toBe('assess');
    expect(logged[0]?.evidence).toBe('graded');
  });

  it('keeps the schema open to all five intents, MVP or not', () => {
    const leaf = LEAVES[0];
    if (leaf === undefined) return;
    const item = buildReviewItem(leaf, { intent: 'assess' });
    expect(() => toGradedQueryLog(item, 'good', NOW)).not.toThrow();
  });

  it('reads the database once, so a selector stays a pure function', async () => {
    // The queue is built from state the caller read. A selector that had to
    // reach for Dexie itself could not be tested without one, and the second
    // implementation above is proof that it does not.
    const queue = await selectReviewQueue({ database: db, limit: 3, now: () => NOW });
    expect(queue).toHaveLength(3);
    for (const item of queue) expect(leafById(item.componentId)).toBeDefined();
  });
});

describe('the queue reflects what has already been reviewed', () => {
  it('does not offer back a component reviewed a moment ago', async () => {
    const first = await startReviewSession({
      database: db,
      limit: 1,
      now: () => NOW,
    });
    const asked = first.current()?.componentId;
    await first.grade('good');

    const second = await selectReviewQueue({
      database: db,
      limit: 5,
      now: () => NOW,
    });
    expect(second.map((item) => item.componentId)).not.toContain(asked);
  });

  it('offers it again once it falls due', async () => {
    const first = await startReviewSession({
      database: db,
      limit: 1,
      now: () => NOW,
    });
    const asked = first.current()?.componentId;
    if (asked === undefined) return;
    await first.grade('again');

    const state = await readComponentState(asked, db);
    const due = state.mastery.due;
    expect(due).not.toBeNull();
    if (due === null) return;

    const later = await selectReviewQueue({
      database: db,
      limit: 5,
      now: () => due + 1,
    });
    expect(later[0]?.componentId).toBe(asked);
  });

  it('shows the next authored example on the second repetition', async () => {
    const first = await startReviewSession({
      database: db,
      limit: 1,
      now: () => NOW,
    });
    const item = first.current();
    if (item === undefined) return;
    await first.grade('good');

    const leaf = leafById(item.componentId);
    if (leaf === undefined) return;
    const state = await readComponentState(item.componentId, db);
    const due = state.mastery.due;
    if (due === null) return;

    const later = await selectReviewQueue({
      database: db,
      limit: 1,
      now: () => due + 1,
    });
    expect(later[0]?.prompt).toBe(exampleFor(leaf, 1));
    expect(later[0]?.prompt).not.toBe(item.prompt);
  });

  it('counts a lookup as exposure without ever making a component due', async () => {
    // The other half of the split, asserted from the loop's side: an ordinary
    // query moves exposure and leaves the schedule empty, so the queue treats
    // it as an unpractised gap rather than as a review that has come round.
    const leaf = LEAVES[0];
    if (leaf === undefined) return;

    await recordQuery(
      {
        queryLog: {
          asked_at: NOW,
          question: leaf.examples[0] ?? leaf.ca,
          intent: 'comprehend',
          direction: 'ca_to_fr',
          evidence: 'lookup',
          decomposition: [{ id: leaf.id as never, ca: leaf.ca }],
          answer: leaf.glosses.fr,
          answer_ca: leaf.ca,
          answer_lang: 'fr',
        },
      },
      db,
    );

    const state = await readComponentState(leaf.id, db);
    expect(state.exposure.exposure_count).toBe(1);
    expect(state.mastery.due).toBeNull();
    expect(state.mastery.graded_review_count).toBe(0);
  });
});
