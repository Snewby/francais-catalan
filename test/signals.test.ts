import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { TrainerDatabase, type SignalledReply } from '../src/db/dexie';
import { recordQuery, signalReply } from '../src/db/persist';
import { exportSnapshot, readSignalledReplies, SNAPSHOT_VERSION } from '../src/db/read';
import { renderSignalPack } from '../src/text/signal-pack';
import { LEAVES, leafById } from '../src/taxonomy';
import type { QueryLog as DecomposedQuery } from '../src/api/anthropic';

const ASKED_AT = 1_700_000_000_000;
const SIGNALLED_AT = 1_700_000_100_000;

let db: TrainerDatabase;
let dbIndex = 0;

beforeEach(async () => {
  dbIndex += 1;
  db = new TrainerDatabase(`test-signals-${String(dbIndex)}`);
  await db.open();
});

afterEach(async () => {
  db.close();
  await TrainerDatabase.delete(`test-signals-${String(dbIndex)}`);
});

/** The leaf a signalled reply cites, taken from the data rather than named. */
function subject() {
  const leaf = LEAVES[0];
  expect(leaf).toBeDefined();
  return leaf!;
}

function reply(overrides: Partial<DecomposedQuery> = {}): DecomposedQuery {
  const leaf = subject();
  return {
    asked_at: ASKED_AT,
    question: leaf.ca,
    intent: 'comprehend',
    direction: 'ca_to_fr',
    evidence: 'lookup',
    decomposition: [
      { id: leaf.id as DecomposedQuery['decomposition'][number]['id'], ca: leaf.ca },
    ],
    answer: 'Première remarque.\n\nSeconde remarque.',
    answer_ca: leaf.ca,
    answer_fr: 'La phrase française correspondante.',
    answer_lang: 'fr',
    ...overrides,
  };
}

describe('signalling a reply', () => {
  it('stores the reply whole, not a reference to it', async () => {
    const decomposition = reply();
    await signalReply(
      { question: decomposition.question, decomposition, queryId: 7 },
      db,
      SIGNALLED_AT,
    );

    const [stored] = await readSignalledReplies(db);
    expect(stored?.signalledAt).toBe(SIGNALLED_AT);
    expect(stored?.queryId).toBe(7);
    // The explanation and the realising forms are the whole point: `queries`
    // keeps neither, and a signal nobody can look at is not worth writing.
    expect(stored?.answer).toBe(decomposition.answer);
    expect(stored?.answerCa).toBe(decomposition.answer_ca);
    expect(stored?.answerFr).toBe(decomposition.answer_fr);
    expect(stored?.components).toEqual([{ id: subject().id, ca: subject().ca }]);
  });

  it('MOVES NO EVIDENCE AT ALL', async () => {
    // The invariant this feature turns on. A learner who marks an answer wrong
    // has told us about the model, not about what they know; recording it as an
    // outcome would put their opinion of a paragraph into a skill map.
    const decomposition = reply();
    await signalReply({ question: decomposition.question, decomposition }, db);

    expect(await db.mastery.count()).toBe(0);
    expect(await db.learner.count()).toBe(0);
    expect(await db.queries.count()).toBe(0);
  });

  it('leaves an already-recorded query untouched', async () => {
    const decomposition = reply();
    const recorded = await recordQuery({ queryLog: decomposition }, db);
    const before = await db.mastery.toArray();

    await signalReply(
      { question: decomposition.question, decomposition, queryId: recorded.queryId },
      db,
    );

    expect(await db.mastery.toArray()).toEqual(before);
    expect(await db.queries.count()).toBe(1);
  });

  it('records the forms the gate could not anchor, when there were any', async () => {
    const decomposition = reply({ decomposition: [] });
    await signalReply(
      {
        question: decomposition.question,
        decomposition,
        unverified: ['he cantat'],
      },
      db,
    );

    const [stored] = await readSignalledReplies(db);
    expect(stored?.unverified).toEqual(['he cantat']);
    expect(stored?.components).toEqual([]);
  });
});

describe('the snapshot', () => {
  it('carries signalled replies out and back', async () => {
    const decomposition = reply();
    await signalReply({ question: decomposition.question, decomposition }, db);

    const snapshot = await exportSnapshot(db, SIGNALLED_AT);
    expect(snapshot.version).toBe(SNAPSHOT_VERSION);
    expect(snapshot.signals).toHaveLength(1);
  });
});

describe('the pack given to a reader', () => {
  function packOf(overrides: Partial<SignalledReply> = {}): string {
    const leaf = subject();
    return renderSignalPack([
      {
        signalledAt: SIGNALLED_AT,
        question: leaf.ca,
        direction: 'ca_to_fr',
        answer: 'Première remarque.\n\nSeconde remarque.',
        answerCa: leaf.ca,
        answerFr: 'La phrase française correspondante.',
        components: [{ id: leaf.id, ca: leaf.ca }],
        unverified: [],
        ...overrides,
      },
    ]);
  }

  it('gives the reader the authored gloss beside the form it was attached to', () => {
    const pack = packOf();
    const leaf = subject();
    expect(pack).toContain(leaf.id);
    // Sent so the reader can judge whether the model applied the vocabulary
    // correctly, without being sent the vocabulary and reviewing it instead.
    expect(pack).toContain(leafById(leaf.id)?.glosses.fr ?? 'missing');
  });

  it('shows both halves of the pair and the explanation', () => {
    const pack = packOf();
    expect(pack).toContain('La phrase française correspondante.');
    expect(pack).toContain('> Première remarque.');
    expect(pack).toContain('> Seconde remarque.');
  });

  it('says so when the analysis was dropped rather than showing an empty table', () => {
    const pack = packOf({ components: [], unverified: ['he cantat'] });
    expect(pack).toContain('Aucun point de grammaire');
    expect(pack).toContain('he cantat');
  });

  it('files no verdict of its own', () => {
    // A pack that says which replies we think are wrong gets agreement back.
    // Six reviews have depended on the reader forming its own view.
    const pack = packOf().toLowerCase();
    for (const word of ['faux', 'erreur', 'incorrect', 'suspect']) {
      expect(pack, `the pack should not prejudge: ${word}`).not.toContain(word);
    }
  });

  it('escapes a pipe so one Catalan form cannot break the table', () => {
    const pack = packOf({ components: [{ id: subject().id, ca: 'a | b' }] });
    expect(pack).toContain('a \\| b');
  });
});
