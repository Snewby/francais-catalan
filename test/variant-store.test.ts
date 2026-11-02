/**
 * The variant pipeline against a stubbed API and a throwaway catala-v2: the
 * cache, the stored row, exposure at first sight, the tombstone cascade, and
 * export and import of the store. Replies are the recorded Opus round 1 ones.
 */
import type Dexie from 'dexie';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { backupPort } from '../src/db/backup';
import {
  createCatalaDatabase,
  eventsOf,
  phrasesOf,
  variantsOf,
} from '../src/db/catala-v2';
import { VARIANT_SCHEMA_VERSION, type PhraseRow } from '../src/db/rows';
import type { VariantRecording } from '../src/eval/variants';
import { tombstonePhrase } from '../src/phrase/store';
import { VARIANT_MODEL } from '../src/variants/client';
import { parseComboKey, startingState } from '../src/variants/combination';
import { variantPromptHash } from '../src/variants/prompt';
import {
  fetchAndStoreVariant,
  findVariant,
  recordFirstSight,
  variantsOfPhrase,
  type FetchVariantOptions,
} from '../src/variants/store';
import { recordedReply } from './helpers/recorded-replies';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const RECORDING = JSON.parse(
  readFileSync(
    path.resolve(
      __dirname,
      'fixtures/variants-v1/recordings/claude-opus-5-5/run-1.json',
    ),
    'utf8',
  ),
) as VariantRecording;

/** The recorded API response for one combination, as the API sent it. */
function responseFor(id: string): unknown {
  const fetched = RECORDING.cases.find((c) => c.combination === id)?.fetches[0];
  if (fetched === undefined || !('body' in fetched)) throw new Error(id);
  return fetched.body;
}

const ROW1 = recordedReply(1);
const ORIGINAL = { ...ROW1, combination: startingState(ROW1).combination };
const PHRASE_ID = 'b4f1c2d0-0000-4000-8000-000000000001';

let database: Dexie;

beforeEach(() => {
  database = createCatalaDatabase(`variant-test-${crypto.randomUUID()}`);
});

afterEach(async () => {
  await database.delete();
});

function stubFetch(bodies: readonly unknown[], status = 200) {
  let call = 0;
  return vi.fn(async (_url: string, _init: RequestInit) => {
    const body = bodies[Math.min(call, bodies.length - 1)];
    call += 1;
    return { ok: status < 400, status, text: async () => JSON.stringify(body) };
  });
}

function fetchOptions(
  target: string,
  fetchFn: ReturnType<typeof stubFetch>,
): FetchVariantOptions {
  return {
    phraseId: PHRASE_ID,
    original: ORIGINAL,
    target: parseComboKey(target),
    apiKey: 'test-key',
    fetchFn: fetchFn as unknown as typeof fetch,
    isOnline: () => true,
    now: 1_000,
  };
}

describe('a fetched variant', () => {
  it('is stored with its combination, the model, the prompt hash and the sync fields', async () => {
    const outcome = await fetchAndStoreVariant(
      database,
      fetchOptions('jo·avui·none·0·0', stubFetch([responseFor('1a')])),
    );
    expect(outcome.status).toBe('stored');
    const [row] = await variantsOf(database).toArray();
    expect(row).toMatchObject({
      phraseId: PHRASE_ID,
      comboKey: 'jo·avui·none·0·0',
      status: 'ok',
      ca: 'Avui he comprat el pa al mercat.',
      reason: null,
      model: VARIANT_MODEL,
      schemaVersion: VARIANT_SCHEMA_VERSION,
      promptHash: await variantPromptHash(),
      seenAt: null,
      createdAt: 1_000,
      deletedAt: null,
    });
    expect(row?.id).toMatch(UUID);
    expect(row?.chunks[0]).toMatchObject({ text: 'Avui', start: 0, end: 4 });
  });

  it('writes no event when fetched, only when first seen', async () => {
    await fetchAndStoreVariant(
      database,
      fetchOptions('jo·avui·none·0·0', stubFetch([responseFor('1a')])),
    );
    expect(await eventsOf(database).count()).toBe(0);
  });

  it('stores not_applicable with its reason and no Catalan', async () => {
    const fetchFn = stubFetch([responseFor('22a')]);
    await fetchAndStoreVariant(database, fetchOptions('tu·-·none·0·0', fetchFn));
    const row = await findVariant(database, PHRASE_ID, 'tu·-·none·0·0');
    expect(row).toMatchObject({
      status: 'not_applicable',
      reason: 'subordinate_affected',
    });
    expect(row?.ca).toBeNull();
    expect(row?.chunks).toEqual([]);
  });

  it('stores nothing after two failed checks, and nothing on an HTTP error', async () => {
    const broken = { content: [{ type: 'text', text: '{"status":"ok"}' }] };
    expect(
      await fetchAndStoreVariant(
        database,
        fetchOptions('jo·avui·none·0·0', stubFetch([broken])),
      ),
    ).toEqual({ status: 'unavailable' });
    const failed = await fetchAndStoreVariant(
      database,
      fetchOptions('jo·avui·none·0·0', stubFetch([{}], 529)),
    );
    expect(failed).toMatchObject({ status: 'error', kind: 'overloaded' });
    expect(await variantsOf(database).count()).toBe(0);
  });
});

describe('the cache', () => {
  it('finds a stored variant by phrase and combination, under this model only', async () => {
    await fetchAndStoreVariant(
      database,
      fetchOptions('jo·avui·none·0·0', stubFetch([responseFor('1a')])),
    );
    expect(await findVariant(database, PHRASE_ID, 'jo·avui·none·0·0')).toBeDefined();
    expect(
      await findVariant(database, PHRASE_ID, 'ella·avui·none·0·0'),
    ).toBeUndefined();
    expect(
      await findVariant(database, PHRASE_ID, 'jo·avui·none·0·0', 'claude-haiku-5-5'),
    ).toBeUndefined();
  });

  it('treats a row made under another prompt or schema as stale', async () => {
    await fetchAndStoreVariant(
      database,
      fetchOptions('jo·avui·none·0·0', stubFetch([responseFor('1a')])),
    );
    const [row] = await variantsOf(database).toArray();
    await variantsOf(database).update(row!.id, { promptHash: 'old' });
    expect(await findVariant(database, PHRASE_ID, 'jo·avui·none·0·0')).toBeUndefined();
    await variantsOf(database).update(row!.id, {
      promptHash: await variantPromptHash(),
      schemaVersion: 0,
    });
    expect(await variantsOfPhrase(database, PHRASE_ID)).toEqual([]);
  });
});

describe('first sight', () => {
  it('writes one lookup per ID new since the previous state, then marks the row seen', async () => {
    const outcome = await fetchAndStoreVariant(
      database,
      fetchOptions('jo·avui·none·0·0', stubFetch([responseFor('1a')])),
    );
    if (outcome.status !== 'stored') throw new Error('not stored');
    const seen = await recordFirstSight(
      database,
      outcome.row,
      ROW1.chunks as never,
      2_000,
    );
    const events = await eventsOf(database).toArray();
    const before = new Set(ROW1.chunks.flatMap((chunk) => chunk.ids));
    const fresh = [...new Set(outcome.row.chunks.flatMap((chunk) => chunk.ids))].filter(
      (id) => !before.has(id),
    );
    expect(events.map((event) => event.componentId).sort()).toEqual(fresh.sort());
    expect(events.every((event) => event.evidence === 'lookup')).toBe(true);
    expect(events.every((event) => event.intent === 'produce')).toBe(true);
    expect(events.every((event) => event.direction === 'fr_to_ca')).toBe(true);
    expect(events.every((event) => event.phraseId === PHRASE_ID)).toBe(true);
    expect(seen.seenAt).toBe(2_000);

    await recordFirstSight(database, seen, ROW1.chunks as never, 3_000);
    expect(await eventsOf(database).count()).toBe(events.length);
  });

  it('writes nothing for not_applicable', async () => {
    const outcome = await fetchAndStoreVariant(
      database,
      fetchOptions('tu·-·none·0·0', stubFetch([responseFor('22a')])),
    );
    if (outcome.status !== 'stored') throw new Error('not stored');
    await recordFirstSight(database, outcome.row, [], 2_000);
    expect(await eventsOf(database).count()).toBe(0);
  });
});

describe('the tombstone cascade and backup', () => {
  async function storeOne(): Promise<void> {
    const phrase = {
      id: PHRASE_ID,
      deletedAt: null,
      updatedAt: 1,
      createdAt: 1,
    } as PhraseRow;
    await phrasesOf(database).put(phrase);
    await fetchAndStoreVariant(
      database,
      fetchOptions('jo·avui·none·0·0', stubFetch([responseFor('1a')])),
    );
  }

  it('tombstones a phrase’s variants with it, never hard-deleting either', async () => {
    await storeOne();
    await tombstonePhrase(database, PHRASE_ID, 5_000);
    expect((await phrasesOf(database).get(PHRASE_ID))?.deletedAt).toBe(5_000);
    const [row] = await variantsOf(database).toArray();
    expect(row?.deletedAt).toBe(5_000);
    expect(await findVariant(database, PHRASE_ID, 'jo·avui·none·0·0')).toBeUndefined();
  });

  it('round-trips the variants store through export and import', async () => {
    await storeOne();
    const file = await backupPort(database).exportFile();
    const copy = createCatalaDatabase(`variant-copy-${crypto.randomUUID()}`);
    try {
      await backupPort(copy).importFile(file.text);
      expect(await variantsOf(copy).toArray()).toEqual(
        await variantsOf(database).toArray(),
      );
    } finally {
      await copy.delete();
    }
  });
});
