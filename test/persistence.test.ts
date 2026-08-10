import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LEARNER_ID, TrainerDatabase, type QueryLog } from '../src/db/dexie';
import {
  SnapshotError,
  componentIdsOf,
  importSnapshot,
  recordQuery,
  toRow,
} from '../src/db/persist';
import {
  SNAPSHOT_VERSION,
  UnknownComponentError,
  exportSnapshot,
  fromRow,
  readComponentState,
  readLearnerElo,
  seedStateFor,
} from '../src/db/read';
import { DEFAULT_RATING } from '../src/srs/elo';
import { INITIAL_DIFFICULTY_VALUE } from '../src/srs/fsrs';
import { CONTRAST_STATUSES, LEAVES, leafById } from '../src/taxonomy';
import type { QueryLog as DecomposedQuery } from '../src/api/anthropic';
import type { Evidence, Rating } from '../src/srs/evidence';

/** A real leaf per contrast status, so the seeding test is not hypothetical. */
const EXEMPLAR = Object.fromEntries(
  CONTRAST_STATUSES.map((status) => [
    status,
    LEAVES.find((leaf) => leaf.contrast_fr.status === status)?.id ?? '',
  ]),
) as Record<(typeof CONTRAST_STATUSES)[number], string>;

const ASKED_AT = 1_700_000_000_000;

function query(
  componentIds: readonly string[],
  evidence: Evidence,
  rating?: Rating,
): DecomposedQuery {
  return {
    asked_at: ASKED_AT,
    question: "L'home acaba d'arribar",
    intent: 'comprehend',
    direction: 'ca_to_fr',
    evidence,
    ...(rating === undefined ? {} : { rating }),
    answer_ca: "L'home acaba d'arribar",
    decomposition: componentIds.map((id) => ({
      id: id as DecomposedQuery['decomposition'][number]['id'],
      ca: 'forme',
    })),
    answer: 'Une réponse française.',
    answer_lang: 'fr',
  };
}

let db: TrainerDatabase;
let dbIndex = 0;

beforeEach(async () => {
  dbIndex += 1;
  db = new TrainerDatabase(`test-francais-catalan-${String(dbIndex)}`);
  await db.open();
});

afterEach(async () => {
  db.close();
  await TrainerDatabase.delete(`test-francais-catalan-${String(dbIndex)}`);
});

describe('initial difficulty comes from contrast_fr', () => {
  it('starts only transfer components easy, on real leaves', () => {
    for (const status of CONTRAST_STATUSES) {
      const componentId = EXEMPLAR[status];
      expect(componentId, `no seeded leaf is ${status}`).not.toBe('');
      expect(seedStateFor(componentId).mastery.difficulty).toBe(
        INITIAL_DIFFICULTY_VALUE[status],
      );
    }
  });

  it('seeds every leaf in the taxonomy from its own status', () => {
    for (const leaf of LEAVES) {
      expect(seedStateFor(leaf.id).mastery.difficulty).toBe(
        INITIAL_DIFFICULTY_VALUE[leaf.contrast_fr.status],
      );
    }
  });

  it('refuses a component the taxonomy does not have', () => {
    expect(() => seedStateFor(['VERB', 'invented'].join('.'))).toThrow(
      UnknownComponentError,
    );
  });
});

describe('the row is a projection, not a second state', () => {
  it('round-trips every field', () => {
    const componentId = EXEMPLAR['near-miss'];
    const before = seedStateFor(componentId);
    expect(fromRow(toRow(componentId, before))).toEqual(before);
  });

  it('round-trips a reviewed component too', async () => {
    const componentId = EXEMPLAR.transfer;
    await recordQuery({ queryLog: query([componentId], 'graded', 'good') }, db);
    const stored = await readComponentState(componentId, db);
    expect(fromRow(toRow(componentId, stored))).toEqual(stored);
  });
});

describe('evidence routing survives the round trip to IndexedDB', () => {
  const componentId = () => EXEMPLAR['near-miss'];

  it('leaves FSRS state byte-identical after a lookup', async () => {
    const seeded = seedStateFor(componentId());
    await recordQuery({ queryLog: query([componentId()], 'lookup') }, db);
    const after = await readComponentState(componentId(), db);

    expect(JSON.stringify(after.mastery)).toBe(JSON.stringify(seeded.mastery));
    expect(after.elo).toBe(seeded.elo);
    expect(after.exposure.exposure_count).toBe(1);
    expect(await readLearnerElo(db)).toBe(DEFAULT_RATING);
  });

  it('moves Elo but not FSRS after a recall', async () => {
    const seeded = seedStateFor(componentId());
    await recordQuery(
      { queryLog: query([componentId()], 'recall'), correct: true },
      db,
    );
    const after = await readComponentState(componentId(), db);

    expect(JSON.stringify(after.mastery)).toBe(JSON.stringify(seeded.mastery));
    expect(after.elo).toBeLessThan(seeded.elo);
    expect(await readLearnerElo(db)).toBeGreaterThan(DEFAULT_RATING);
    expect(after.mastery.graded_review_count).toBe(0);
  });

  it('moves both after a graded review', async () => {
    const seeded = seedStateFor(componentId());
    await recordQuery({ queryLog: query([componentId()], 'graded', 'good') }, db);
    const after = await readComponentState(componentId(), db);

    expect(after.elo).not.toBe(seeded.elo);
    expect(after.mastery.graded_review_count).toBe(1);
    expect(after.mastery.stability).not.toBeNull();
    expect(after.mastery.due).not.toBeNull();
    expect(after.mastery.scheduling_state).not.toBe('new');
  });

  it('keeps exposure and graded review counts apart across many queries', async () => {
    const id = componentId();
    for (let index = 0; index < 10; index += 1) {
      await recordQuery({ queryLog: query([id], 'lookup') }, db);
    }
    await recordQuery({ queryLog: query([id], 'graded', 'good') }, db);

    const after = await readComponentState(id, db);
    expect(after.exposure.exposure_count).toBe(11);
    expect(after.mastery.graded_review_count).toBe(1);
  });
});

describe('recording a query', () => {
  it('writes one row per query and touches every component once', async () => {
    const ids = [EXEMPLAR.transfer, EXEMPLAR['near-miss'], EXEMPLAR.novel];
    const outcome = await recordQuery({ queryLog: query(ids, 'lookup') }, db);

    expect(outcome.components).toHaveLength(3);
    expect(await db.queries.count()).toBe(1);
    const stored = (await db.queries.toArray())[0] as QueryLog;
    expect(stored.componentIds).toEqual(ids);
    expect(stored.evidence).toBe('lookup');
    expect(stored.rating).toBeUndefined();
  });

  it('counts a component realised twice in one sentence as one encounter', async () => {
    const id = EXEMPLAR.transfer;
    await recordQuery({ queryLog: query([id, id], 'lookup') }, db);
    expect((await readComponentState(id, db)).exposure.exposure_count).toBe(1);
    expect(componentIdsOf(query([id, id], 'lookup'))).toEqual([id]);
  });

  it('carries the learner rating across the components of one query', async () => {
    const ids = [EXEMPLAR.transfer, EXEMPLAR['near-miss'], EXEMPLAR.novel];
    await recordQuery({ queryLog: query(ids, 'recall'), correct: true }, db);

    // Three opponents, three outcomes. Re-reading the stored rating per
    // component would apply the first result three times instead.
    const learner = await readLearnerElo(db);
    expect(learner).toBeGreaterThan(DEFAULT_RATING);
    const single = new TrainerDatabase('test-single');
    await single.open();
    await recordQuery(
      { queryLog: query([EXEMPLAR.transfer], 'recall'), correct: true },
      single,
    );
    const oneOnly = await readLearnerElo(single);
    single.close();
    await TrainerDatabase.delete('test-single');
    expect(learner).toBeGreaterThan(oneOnly);
  });

  it('writes nothing at all when a component is out of vocabulary', async () => {
    await expect(
      recordQuery(
        {
          queryLog: query(
            [EXEMPLAR.transfer, ['VERB', 'invented'].join('.')],
            'lookup',
          ),
        },
        db,
      ),
    ).rejects.toThrow(UnknownComponentError);
    expect(await db.queries.count()).toBe(0);
    expect(await db.mastery.count()).toBe(0);
  });

  it('stores the rating when the evidence carries one', async () => {
    await recordQuery({ queryLog: query([EXEMPLAR.novel], 'graded', 'hard') }, db);
    const stored = (await db.queries.toArray())[0] as QueryLog;
    expect(stored.rating).toBe('hard');
  });
});

describe('export and import', () => {
  it('round-trips the whole rolodex', async () => {
    await recordQuery({ queryLog: query([EXEMPLAR.transfer], 'graded', 'good') }, db);
    await recordQuery({ queryLog: query([EXEMPLAR.novel], 'lookup') }, db);

    const snapshot = await exportSnapshot(db, ASKED_AT);
    expect(snapshot.version).toBe(SNAPSHOT_VERSION);
    expect(snapshot.exportedAt).toBe(ASKED_AT);
    expect(snapshot.mastery).toHaveLength(2);
    expect(snapshot.queries).toHaveLength(2);

    // Survives serialisation: an export nobody can write to a file is not one.
    const reloaded = JSON.parse(JSON.stringify(snapshot)) as typeof snapshot;

    await db.mastery.clear();
    await db.queries.clear();
    await db.learner.clear();
    await importSnapshot(reloaded, db);

    expect(await exportSnapshot(db, ASKED_AT)).toEqual(snapshot);
  });

  it('replaces rather than merges', async () => {
    await recordQuery({ queryLog: query([EXEMPLAR.transfer], 'lookup') }, db);
    const snapshot = await exportSnapshot(db, ASKED_AT);

    await recordQuery({ queryLog: query([EXEMPLAR.novel], 'lookup') }, db);
    expect(await db.mastery.count()).toBe(2);

    await importSnapshot(snapshot, db);
    expect(await db.mastery.count()).toBe(1);
    expect((await db.mastery.toArray())[0]?.componentId).toBe(EXEMPLAR.transfer);
  });

  it('restores the learner rating alongside the components it was computed against', async () => {
    await recordQuery(
      { queryLog: query([EXEMPLAR['near-miss']], 'recall'), correct: false },
      db,
    );
    const snapshot = await exportSnapshot(db, ASKED_AT);
    expect(snapshot.learnerElo).toBeLessThan(DEFAULT_RATING);

    await db.learner.clear();
    await importSnapshot(snapshot, db);
    expect((await db.learner.get(LEARNER_ID))?.elo).toBe(snapshot.learnerElo);
  });

  it('refuses a snapshot in an unknown format, without touching the store', async () => {
    await recordQuery({ queryLog: query([EXEMPLAR.transfer], 'lookup') }, db);
    const snapshot = await exportSnapshot(db, ASKED_AT);

    await expect(
      importSnapshot({ ...snapshot, version: SNAPSHOT_VERSION + 1 }, db),
    ).rejects.toThrow(SnapshotError);
    expect(await db.mastery.count()).toBe(1);
  });

  it('refuses a snapshot naming a component the taxonomy does not have', async () => {
    const snapshot = await exportSnapshot(db, ASKED_AT);
    const row = toRow(['VERB', 'invented'].join('.'), seedStateFor(EXEMPLAR.transfer));

    await expect(importSnapshot({ ...snapshot, mastery: [row] }, db)).rejects.toThrow(
      UnknownComponentError,
    );
    expect(await db.mastery.count()).toBe(0);
  });
});

describe('scheduling is real ts-fsrs, not the phase 1 placeholder', () => {
  it('gives a later due date for easy than for again', async () => {
    const id = EXEMPLAR['near-miss'];
    const other = EXEMPLAR.novel;
    await recordQuery({ queryLog: query([id], 'graded', 'easy') }, db);
    await recordQuery({ queryLog: query([other], 'graded', 'again') }, db);

    const easy = await readComponentState(id, db);
    const again = await readComponentState(other, db);
    expect(easy.mastery.due).not.toBeNull();
    expect(again.mastery.due).not.toBeNull();
    expect(Number(easy.mastery.due)).toBeGreaterThan(Number(again.mastery.due));
  });

  it('counts a lapse when a reviewed component is failed', async () => {
    const id = EXEMPLAR.transfer;
    await recordQuery({ queryLog: query([id], 'graded', 'easy') }, db);
    await recordQuery({ queryLog: query([id], 'graded', 'again') }, db);
    const after = await readComponentState(id, db);
    expect(after.mastery.lapses).toBeGreaterThan(0);
    expect(after.mastery.reps).toBe(2);
  });

  it('lets FSRS own difficulty once a real review has happened', async () => {
    // The contrast-seeded value is a prior for the weeks before any review.
    // FSRS initialises difficulty from the first rating, which is evidence.
    const id = EXEMPLAR.transfer;
    const seeded = seedStateFor(id);
    expect(seeded.mastery.difficulty).toBe(INITIAL_DIFFICULTY_VALUE.transfer);

    await recordQuery({ queryLog: query([id], 'graded', 'again') }, db);
    const after = await readComponentState(id, db);
    expect(after.mastery.difficulty).not.toBe(seeded.mastery.difficulty);
    expect(leafById(id)?.contrast_fr.status).toBe('transfer');
  });
});
