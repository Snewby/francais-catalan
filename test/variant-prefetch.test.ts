import type Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MODEL } from '../src/api/anthropic';
import { checkPhraseReply } from '../src/api/phrase-check';
import { createCatalaDatabase, eventsOf, variantsOf } from '../src/db/catala-v2';
import { PHRASE_SCHEMA_VERSION, type PhraseRow } from '../src/db/rows';
import { comboKey, startingState, type Combination } from '../src/variants/combination';
import { nearest, prefetchTargets } from '../src/variants/prefetch';
import { VariantSession } from '../src/variants/session.svelte';
import { recordedReply } from './helpers/recorded-replies';

function phraseRow(n: number): PhraseRow {
  const check = checkPhraseReply(recordedReply(n));
  if (!check.valid) throw new Error(`case ${String(n)}`);
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
    input: '',
    inputKey: '',
    status: 'ok',
    model: MODEL,
    schemaVersion: PHRASE_SCHEMA_VERSION,
    promptHash: 'x',
    usage: {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
    },
    latencyMs: 0,
    ...check.phrase,
  };
}

const keys = (targets: readonly Combination[]) => targets.map(comboKey);

describe('what is fetched ahead (F1)', () => {
  it('takes the nearest buttons in panel order, the next two along at an end', () => {
    expect(nearest(['a', 'b', 'c', 'd', 'e'], 'c', 2)).toEqual(['b', 'd']);
    expect(nearest(['a', 'b', 'c', 'd', 'e'], 'a', 2)).toEqual(['b', 'c']);
    expect(nearest(['a', 'b', 'c', 'd', 'e'], 'e', 2)).toEqual(['d', 'c']);
  });

  it('asks for two neighbouring tenses and two neighbouring persons of the original', () => {
    expect(keys(prefetchTargets(startingState(recordedReply(1))))).toEqual([
      'jo·present·none·0·0',
      'jo·avui·none·0·0',
      'tu·ahir·none·0·0',
      'ell·ahir·none·0·0',
    ]);
  });

  it('keeps to the tenses the tournure allows', () => {
    // « Acabo d'arribar »: acabar de takes présent and imparfait only.
    expect(keys(prefetchTargets(startingState(recordedReply(16))))).toEqual([
      'jo·imperfet·acabar·0·0',
      'tu·present·acabar·0·0',
      'ell·present·acabar·0·0',
    ]);
  });

  it('skips a greyed axis', () => {
    // Row 22 greys the tense axis; row 10 is impersonal and greys the person.
    expect(keys(prefetchTargets(startingState(recordedReply(22))))).toEqual([
      'tu·-·none·0·0',
      'ell·-·none·0·0',
    ]);
    expect(
      prefetchTargets(startingState(recordedReply(10))).every((t) => t.person === null),
    ).toBe(true);
  });
});

describe('the prefetch run', () => {
  let database: Dexie;
  let calls: string[];
  let held: (() => void) | null;

  const fetchFn = (async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as { messages: { content: string }[] };
    const { target } = JSON.parse(body.messages[0]?.content ?? '{}') as {
      target: Combination;
    };
    calls.push(comboKey(target));
    if (held !== null) await new Promise<void>((resolve) => (held = resolve));
    const text = JSON.stringify({
      content: [{ type: 'text', text: '{"status":"not_applicable","reason":"other"}' }],
    });
    return { ok: true, status: 200, text: () => Promise.resolve(text) } as Response;
  }) as typeof fetch;

  beforeEach(() => {
    database = createCatalaDatabase(`prefetch-test-${crypto.randomUUID()}`);
    calls = [];
    held = null;
  });

  afterEach(async () => {
    await database.delete();
  });

  function session(online = true, key: string | null = 'test-key'): VariantSession {
    return new VariantSession(database, phraseRow(1), {
      apiKey: () => key,
      fetchFn,
      isOnline: () => online,
    });
  }

  it('stores each neighbour once and writes no event', async () => {
    const panel = session();
    await panel.prefetch();
    expect(calls).toHaveLength(4);
    expect(await variantsOf(database).count()).toBe(4);
    expect(await eventsOf(database).count()).toBe(0);
    await session().prefetch();
    expect(calls).toHaveLength(4);
  });

  it('serves a tap on a prefetched combination from the cache', async () => {
    const panel = session();
    await panel.prefetch();
    await panel.tap('tense', 'avui');
    expect(calls).toHaveLength(4);
    expect(panel.button('tense', 'avui').kind).toBe('not_applicable');
  });

  it('shares a call still in flight with a tap on the same combination', async () => {
    held = () => undefined;
    const panel = session();
    const running = panel.prefetch();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(calls).toEqual(['jo·present·none·0·0']);
    const tapped = panel.tap('tense', 'present');
    await new Promise((resolve) => setTimeout(resolve, 20));
    const release = held;
    held = null;
    release();
    await tapped;
    await running;
    expect(calls.filter((key) => key === 'jo·present·none·0·0')).toHaveLength(1);
  });

  it('stops at the first failure: no key or offline makes no call', async () => {
    await session(true, null).prefetch();
    await session(false).prefetch();
    expect(calls).toEqual([]);
  });
});
