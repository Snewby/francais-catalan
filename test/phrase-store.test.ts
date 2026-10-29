/**
 * The phrase pipeline against a stubbed API and a throwaway catala-v2: the
 * cache key, the stored row, the exposure a translation records, and export
 * and import of the three phase 1 stores.
 */
import type Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MODEL } from '../src/api/anthropic';
import { promptHash } from '../src/api/prompt';
import { backupPort } from '../src/db/backup';
import {
  createCatalaDatabase,
  eventsOf,
  phrasesOf,
  reportsOf,
} from '../src/db/catala-v2';
import { PHRASE_SCHEMA_VERSION } from '../src/db/rows';
import { inputKey, normaliseInput } from '../src/phrase/input';
import {
  addReport,
  findCached,
  recentPhrases,
  translateAndStore,
  type TranslateAndStoreOptions,
} from '../src/phrase/store';
import { applyEvidence, freshState } from '../src/srs/apply';
import { EVIDENCE_EFFECTS, INTENT_FOR_DIRECTION } from '../src/srs/evidence';
import fixture from './fixtures/phrase-response.json';

const SENTENCE = 'Hier, j’ai acheté le pain au marché.';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

let database: Dexie;

beforeEach(() => {
  database = createCatalaDatabase(`phrase-test-${crypto.randomUUID()}`);
});

afterEach(async () => {
  await database.delete();
});

/** The fixture envelope with its reply edited, for replies that must fail. */
function envelopeWith(edit: (reply: Record<string, unknown>) => void): unknown {
  const reply = JSON.parse(fixture.content[0]?.text ?? '{}') as Record<string, unknown>;
  edit(reply);
  return { ...fixture, content: [{ type: 'text', text: JSON.stringify(reply) }] };
}

/** A fetch that answers each call with the next body, the last one repeating. */
function stubFetch(bodies: readonly unknown[] = [fixture], status = 200) {
  let call = 0;
  const fetchFn = vi.fn(async (_url: string, _init: RequestInit) => {
    const body = bodies[Math.min(call, bodies.length - 1)];
    call += 1;
    return { ok: status < 400, status, text: async () => JSON.stringify(body) };
  });
  return fetchFn;
}

function translate(
  input: string,
  fetchFn: ReturnType<typeof stubFetch>,
  extra: Partial<TranslateAndStoreOptions> = {},
) {
  return translateAndStore(database, {
    input,
    apiKey: 'test-key',
    fetchFn: fetchFn as unknown as typeof fetch,
    isOnline: () => true,
    ...extra,
  });
}

describe('the cache key', () => {
  it('trims, collapses spaces, composes accents and makes apostrophes typographic', () => {
    expect(normaliseInput("  Hier,\t j'ai  acheté le pain.  ")).toBe(
      'Hier, j’ai acheté le pain.',
    );
    expect(inputKey('Hier, J’AI acheté')).toBe('hier, j’ai acheté');
  });

  it('makes one API call for a sentence typed twice with other spacing, case or apostrophe', async () => {
    const fetchFn = stubFetch();
    const first = await translate(SENTENCE, fetchFn);
    const second = await translate("  hier,  J'ai acheté le pain au MARCHÉ. ", fetchFn);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(first.status === 'stored' && first.cached).toBe(false);
    expect(second.status === 'stored' && second.cached).toBe(true);
    if (first.status === 'stored' && second.status === 'stored') {
      expect(second.row.id).toBe(first.row.id);
    }
    expect(await phrasesOf(database).count()).toBe(1);
  });

  it('misses a row stored under another prompt or model', async () => {
    const outcome = await translate(SENTENCE, stubFetch());
    if (outcome.status !== 'stored') throw new Error('not stored');
    expect(await findCached(database, SENTENCE)).toBeDefined();
    expect(await findCached(database, SENTENCE, 'claude-other')).toBeUndefined();

    await phrasesOf(database).update(outcome.row.id, { promptHash: 'an older prompt' });
    expect(await findCached(database, SENTENCE)).toBeUndefined();
  });
});

describe('a successful translation', () => {
  it('stores the row the spec lists, with the input as typed', async () => {
    const fetchFn = stubFetch();
    const outcome = await translate(`  ${SENTENCE}`, fetchFn, {
      id: crypto.randomUUID(),
    });
    if (outcome.status !== 'stored') throw new Error('not stored');
    const row = outcome.row;

    expect(await phrasesOf(database).get(row.id)).toEqual(row);
    expect(row.input).toBe(`  ${SENTENCE}`);
    expect(row.inputKey).toBe(inputKey(SENTENCE));
    expect(row.status).toBe('ok');
    expect(row.ca).toBe('Ahir vaig comprar el pa al mercat.');
    expect(row.chunks.map((chunk) => row.ca.slice(chunk.start, chunk.end))).toEqual(
      row.chunks.map((chunk) => chunk.text),
    );
    expect(row.model).toBe(MODEL);
    expect(row.schemaVersion).toBe(PHRASE_SCHEMA_VERSION);
    expect(row.promptHash).toBe(await promptHash());
  });

  it('asks for the one-hour cache', async () => {
    const fetchFn = stubFetch();
    await translate(SENTENCE, fetchFn);
    const body = JSON.parse(String(fetchFn.mock.calls[0]?.[1].body)) as {
      system: { cache_control?: { ttl?: string } }[];
    };
    expect(body.system.at(-1)?.cache_control?.ttl).toBe('1h');
  });

  it('writes one lookup event per linked ID, with intent and direction, and moves no FSRS state', async () => {
    const outcome = await translate(SENTENCE, stubFetch());
    if (outcome.status !== 'stored') throw new Error('not stored');
    const linked = [...new Set(outcome.row.chunks.flatMap((chunk) => chunk.ids))];
    const events = await eventsOf(database).toArray();

    expect(linked.length).toBeGreaterThan(0);
    expect(events.map((event) => event.componentId).sort()).toEqual([...linked].sort());
    for (const event of events) {
      expect(event.evidence).toBe('lookup');
      expect(event.direction).toBe('fr_to_ca');
      expect(event.intent).toBe(INTENT_FOR_DIRECTION.fr_to_ca);
      expect(event.phraseId).toBe(outcome.row.id);
      expect(event).not.toHaveProperty('rating');
      // Read from the table rather than restated: a lookup must not advance FSRS.
      expect(EVIDENCE_EFFECTS[event.evidence].fsrs).toBe(false);
      const before = freshState();
      const after = applyEvidence(before, { evidence: event.evidence, at: event.at });
      expect(JSON.stringify(after.component.mastery)).toBe(
        JSON.stringify(before.mastery),
      );
    }
  });

  it('writes no event when the sentence opens from the cache', async () => {
    const fetchFn = stubFetch();
    await translate(SENTENCE, fetchFn);
    const count = await eventsOf(database).count();
    await translate(SENTENCE, fetchFn);
    expect(await eventsOf(database).count()).toBe(count);
  });
});

describe('failures', () => {
  const brokenAnatomy = envelopeWith((reply) => {
    (reply.chunks as { text: string }[])[0] = {
      ...(reply.chunks as { text: string }[])[0],
      text: 'Avui',
    };
  });

  it('stores the Catalan without anatomy after two bad replies, and writes no event', async () => {
    const fetchFn = stubFetch([brokenAnatomy]);
    const outcome = await translate(SENTENCE, fetchFn);
    if (outcome.status !== 'stored') throw new Error('not stored');

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(outcome.row.status).toBe('analysis_failed');
    expect(outcome.row.ca).toBe('Ahir vaig comprar el pa al mercat.');
    expect(outcome.row.chunks).toEqual([]);
    expect(await eventsOf(database).count()).toBe(0);
  });

  it('retries past the cache on « Réessayer » and rewrites the same row', async () => {
    const failed = await translate(SENTENCE, stubFetch([brokenAnatomy]));
    if (failed.status !== 'stored') throw new Error('not stored');
    const retried = await translate(SENTENCE, stubFetch(), { force: true });
    if (retried.status !== 'stored') throw new Error('not stored');

    expect(retried.row.id).toBe(failed.row.id);
    expect(retried.row.createdAt).toBe(failed.row.createdAt);
    expect(retried.row.status).toBe('ok');
    expect(await phrasesOf(database).count()).toBe(1);
    expect(await eventsOf(database).count()).toBeGreaterThan(0);
  });

  it('stores nothing when the call fails', async () => {
    const rejected = await translate(SENTENCE, stubFetch([{}], 401));
    expect(rejected).toMatchObject({ status: 'error', kind: 'key_rejected' });

    const fetchFn = stubFetch();
    const noKey = await translate(SENTENCE, fetchFn, { apiKey: null });
    expect(noKey).toMatchObject({ status: 'error', kind: 'no_key' });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(await phrasesOf(database).count()).toBe(0);
  });
});

describe('recents and reports', () => {
  it('lists the five newest phrases, newest first, skipping tombstones', async () => {
    const ids: string[] = [];
    for (let index = 0; index < 7; index += 1) {
      const outcome = await translate(`Phrase ${String(index)}`, stubFetch(), {
        now: 1_000 + index,
      });
      if (outcome.status === 'stored') ids.push(outcome.row.id);
    }
    await phrasesOf(database).update(ids[6] ?? '', { deletedAt: 2_000 });

    const recent = await recentPhrases(database);
    expect(recent.map((row) => row.id)).toEqual([
      ids[5],
      ids[4],
      ids[3],
      ids[2],
      ids[1],
    ]);
  });

  it('stores a report against its phrase', async () => {
    const report = await addReport(database, 'phrase-id', 'Le verbe est faux.', 5_000);
    expect(await reportsOf(database).get(report.id)).toEqual(report);
    expect(report).toMatchObject({ phraseId: 'phrase-id', at: 5_000 });
  });
});

describe('the phase 1 stores', () => {
  async function fill(): Promise<void> {
    const outcome = await translate(SENTENCE, stubFetch());
    if (outcome.status !== 'stored') throw new Error('not stored');
    await addReport(database, outcome.row.id, 'Une note.');
  }

  it('give every row a UUID and the three sync fields', async () => {
    await fill();
    for (const table of database.tables) {
      const rows = (await table.toArray()) as Record<string, unknown>[];
      expect(rows.length, table.name).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.id, table.name).toMatch(UUID);
        expect(typeof row.createdAt).toBe('number');
        expect(typeof row.updatedAt).toBe('number');
        expect(row.deletedAt).toBeNull();
      }
    }
  });

  it('round-trip through export and import', async () => {
    await fill();
    const file = await backupPort(database).exportFile();
    const copy = createCatalaDatabase(`phrase-copy-${crypto.randomUUID()}`);
    try {
      await backupPort(copy).importFile(file.text);
      for (const name of ['phrases', 'events', 'reports']) {
        expect(await copy.table(name).toArray(), name).toEqual(
          await database.table(name).toArray(),
        );
      }
    } finally {
      await copy.delete();
    }
  });
});
