/**
 * The variation panel's logic against a throwaway catala-v2 and a fetch that
 * answers each target with the recorded Opus round 1 reply for it.
 */
import type Dexie from 'dexie';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MODEL } from '../src/api/anthropic';
import { checkPhraseReply } from '../src/api/phrase-check';
import { createCatalaDatabase, eventsOf } from '../src/db/catala-v2';
import { PHRASE_SCHEMA_VERSION, type PhraseRow } from '../src/db/rows';
import type { VariantRecording } from '../src/eval/variants';
import { fr } from '../src/i18n/fr';
import { anatomyOf } from '../src/phrase/anatomy';
import { comboKey } from '../src/variants/combination';
import { changeLine, changedKeys, frenchProse } from '../src/variants/display';
import { VariantSession } from '../src/variants/session.svelte';
import { recordedReply } from './helpers/recorded-replies';

const RECORDING = JSON.parse(
  readFileSync(
    path.resolve(
      __dirname,
      'fixtures/variants-v1/recordings/claude-opus-5-5/run-1.json',
    ),
    'utf8',
  ),
) as VariantRecording;

function phraseRow(n: number): PhraseRow {
  const check = checkPhraseReply(recordedReply(n));
  if (!check.valid) throw new Error(`case ${String(n)} does not check`);
  const { phrase } = check;
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
    input: phrase.fr,
    inputKey: phrase.fr,
    fr: phrase.fr,
    ca: phrase.ca,
    subject: phrase.subject,
    assumptions: phrase.assumptions,
    chunks: phrase.chunks,
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
  };
}

/** The recorded response for a target on row `n`, or a not_applicable stand-in. */
function respond(n: number, target: string): unknown {
  const recorded = RECORDING.cases.find((c) => c.n === n && c.target === target);
  const fetched = recorded?.fetches[0];
  if (fetched !== undefined && 'body' in fetched) return fetched.body;
  return {
    content: [{ type: 'text', text: '{"status":"not_applicable","reason":"other"}' }],
  };
}

interface Stub {
  readonly fetchFn: typeof fetch;
  readonly targets: string[];
  /** Hold the next call until `release` is called. */
  hold(): void;
  release(): void;
}

function stubFor(
  n: number,
  override?: unknown,
  extra: Readonly<Record<string, unknown>> = {},
): Stub {
  const targets: string[] = [];
  let gate: Promise<void> | null = null;
  let open: () => void = () => undefined;
  const fetchFn = (async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as { messages: { content: string }[] };
    const request = JSON.parse(body.messages[0]?.content ?? '{}') as {
      target: Parameters<typeof comboKey>[0];
    };
    const key = comboKey(request.target);
    targets.push(key);
    if (gate !== null) {
      const waiting = gate;
      gate = null;
      await new Promise<void>((resolve, reject) => {
        void waiting.then(resolve);
        init.signal?.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError')),
        );
      });
    }
    const text = JSON.stringify(override ?? extra[key] ?? respond(n, key));
    return { ok: true, status: 200, text: () => Promise.resolve(text) } as Response;
  }) as typeof fetch;
  return {
    fetchFn,
    targets,
    hold: () => {
      gate = new Promise<void>((resolve) => (open = resolve));
    },
    release: () => open(),
  };
}

let database: Dexie;

beforeEach(() => {
  database = createCatalaDatabase(`session-test-${crypto.randomUUID()}`);
});

afterEach(async () => {
  await database.delete();
});

function session(n: number, stub: Stub, online = true): VariantSession {
  return new VariantSession(database, phraseRow(n), {
    apiKey: () => 'test-key',
    fetchFn: stub.fetchFn,
    isOnline: () => online,
    now: () => 5_000,
  });
}

describe('before any tap', () => {
  it('shows the original, with no rings, no change line and no cards', () => {
    const panel = session(1, stubFor(1));
    expect(panel.isOriginal).toBe(true);
    expect(panel.shown.ca).toBe('Ahir vaig comprar el pa al mercat.');
    expect(panel.rings.size).toBe(0);
    expect(panel.changeLine).toBeNull();
    expect(panel.changeCards).toEqual([]);
    expect(panel.button('person', 'jo').kind).toBe('selected');
    expect(panel.button('tense', 'ahir').kind).toBe('selected');
  });
});

describe('a tap', () => {
  it('shows the variant, rings what changed and explains it', async () => {
    const stub = stubFor(1);
    const panel = session(1, stub);
    await panel.tap('person', 'ella');
    expect(stub.targets).toEqual(['ella·ahir·none·0·0']);
    expect(panel.shown.ca).toBe('Ahir va comprar el pa al mercat.');
    expect(panel.isOriginal).toBe(false);
    const ringed = panel.anatomy.filter((chunk) => panel.rings.has(chunk.key));
    expect(ringed.map((chunk) => chunk.text)).toEqual(['(ella)', 'va comprar']);
    expect(panel.changeLine).toBe('(jo) vaig comprar → (ella) va comprar');
    expect(panel.changeCards.map((card) => card.id)).toEqual(['PRON.fort.subjecte']);
    expect(panel.button('person', 'ella').kind).toBe('selected');
  });

  it('records exposure once, for the IDs new since the original', async () => {
    const panel = session(1, stubFor(1));
    await panel.tap('tense', 'avui');
    const ids = (await eventsOf(database).toArray()).map((event) => event.componentId);
    expect(ids).toContain('VERB.perf.present');
    expect(ids).not.toContain('VERB.ind.passat_perifrastic');
    const count = ids.length;
    await panel.tap('tense', 'ahir');
    await panel.tap('tense', 'avui');
    expect(await eventsOf(database).count()).toBe(count);
  });

  it('makes no call for the original combination or for a cached one', async () => {
    const stub = stubFor(1);
    const panel = session(1, stub);
    await panel.tap('tense', 'avui');
    await panel.tap('tense', 'ahir');
    expect(panel.isOriginal).toBe(true);
    await panel.tap('tense', 'avui');
    expect(stub.targets).toEqual(['jo·avui·none·0·0']);
  });

  it('reaches one combination by two paths with one call', async () => {
    // ella·avui is not in the approved list, so its reply is written here.
    const reply = {
      status: 'ok',
      fr: 'Aujourd’hui, elle a acheté le pain au marché.',
      ca: 'Avui ha comprat el pa al mercat.',
      subject: { person: '3sg', expressed: false },
      assumptions: [],
      chunks: [
        { text: 'Avui', role: 'time', ids: ['ADV.temps.dixi'] },
        { text: 'ha comprat', role: 'verb', ids: ['VERB.perf.present'] },
        { text: 'el pa', role: 'object_direct', ids: ['ART.def.forma.paradigma'] },
        { text: 'al mercat', role: 'place', ids: ['ART.contract.a_de'] },
      ],
    };
    const extra = {
      'ella·avui·none·0·0': {
        content: [{ type: 'text', text: JSON.stringify(reply) }],
      },
    };
    const stub = stubFor(1, undefined, extra);
    const byPerson = session(1, stub);
    await byPerson.tap('person', 'ella');
    await byPerson.tap('tense', 'avui');
    const byTense = session(1, stub);
    await byTense.tap('tense', 'avui');
    await byTense.tap('person', 'ella');
    expect(stub.targets.filter((key) => key === 'ella·avui·none·0·0')).toHaveLength(1);
    expect(byTense.shown.ca).toBe('Avui ha comprat el pa al mercat.');
    expect(byPerson.shown.ca).toBe(byTense.shown.ca);
  });

  it('compares the rings with the state before the last tap, not the original', async () => {
    const panel = session(1, stubFor(1));
    await panel.tap('tense', 'avui');
    await panel.tap('pronoun', true);
    expect(panel.changeLine).toBe("he comprat el pa → l'he comprat");
    expect(panel.changeCards.map((card) => card.id)).toContain('PRON.feble.cd_3a');
  });

  it('keeps the original on screen and spins the tapped button until the reply lands', async () => {
    const stub = stubFor(1);
    const panel = session(1, stub);
    stub.hold();
    const pending = panel.tap('person', 'ella');
    await vi.waitFor(() => expect(panel.button('person', 'ella').kind).toBe('waiting'));
    expect(panel.isOriginal).toBe(true);
    expect(panel.rings.size).toBe(0);
    stub.release();
    await pending;
    expect(panel.isOriginal).toBe(false);
  });

  it('lets a second tap abort the first, and the latest tap wins', async () => {
    const stub = stubFor(1);
    const panel = session(1, stub);
    stub.hold();
    const first = panel.tap('person', 'ella');
    await vi.waitFor(() => expect(panel.waiting).not.toBeNull());
    await panel.tap('tense', 'avui');
    await first;
    expect(panel.shown.ca).toBe('Avui he comprat el pa al mercat.');
    expect(panel.waiting).toBeNull();
    expect(panel.line).toBeNull();
  });
});

describe('greyed and not_applicable buttons', () => {
  it('explains a greyed button and makes no call', async () => {
    const stub = stubFor(1);
    const panel = session(1, stub);
    await panel.tap('tournure', 'acabar');
    expect(panel.line).toEqual({
      group: 'tournure',
      text: fr.variantReasons.acabar_tense,
    });
    expect(stub.targets).toEqual([]);
  });

  it('greys a not_applicable combination with its reason, and keeps it greyed on reopen', async () => {
    const stub = stubFor(22);
    const panel = session(22, stub);
    await panel.tap('person', 'tu');
    expect(panel.line).toEqual({
      group: 'who',
      text: fr.variantReasons.subordinate_affected,
    });
    expect(panel.isOriginal).toBe(true);
    expect(panel.button('person', 'tu')).toEqual({
      kind: 'not_applicable',
      reason: 'subordinate_affected',
    });

    const reopened = session(22, stub);
    await reopened.load();
    expect(reopened.button('person', 'tu').kind).toBe('not_applicable');
    await reopened.tap('person', 'tu');
    expect(stub.targets).toEqual(['tu·-·none·0·0']);
  });
});

describe('failures', () => {
  it('offers « Réessayer » under the group after two failed checks, and stores nothing', async () => {
    const broken = { content: [{ type: 'text', text: '{"status":"ok"}' }] };
    const panel = session(1, stubFor(1, broken));
    await panel.tap('person', 'ella');
    expect(panel.line).toEqual({
      group: 'who',
      text: fr.variants.unavailable,
      retry: { axis: 'person', value: 'ella' },
    });
    expect(panel.isOriginal).toBe(true);
    expect(panel.button('person', 'ella').kind).toBe('available');
  });

  it('says « Pas de connexion. » offline, while cached variants still open', async () => {
    const stub = stubFor(1);
    const online = session(1, stub);
    await online.tap('tense', 'avui');
    const offline = session(1, stub, false);
    await offline.tap('tense', 'avui');
    expect(offline.shown.ca).toBe('Avui he comprat el pa al mercat.');
    await offline.tap('person', 'ella');
    expect(offline.line).toMatchObject({ group: 'who', text: fr.failure.offline });
  });
});

describe('« Revenir à ma phrase »', () => {
  it('restores the original with no call and clears rings and notes', async () => {
    const stub = stubFor(1);
    const panel = session(1, stub);
    await panel.tap('negation', true);
    panel.revert();
    expect(panel.isOriginal).toBe(true);
    expect(panel.rings.size).toBe(0);
    expect(panel.changeCards).toEqual([]);
    expect(panel.changeLine).toBeNull();
    expect(stub.targets).toHaveLength(1);
  });
});

describe('the display rules', () => {
  it('rings by role in order, and reads the verb on both sides of the change line', () => {
    const before = anatomyOf(phraseRow(9));
    const after = anatomyOf({
      ...phraseRow(9),
      chunks: [
        { text: 'No', role: 'negation', ids: ['NEG.simple.no'], start: 0, end: 2 },
        ...phraseRow(9).chunks.map((chunk) => ({
          ...chunk,
          text: chunk.text === 'He comprat' ? 'he comprat' : chunk.text,
        })),
      ],
    });
    expect([...changedKeys(before, after)]).toEqual(['0']);
    expect(
      changeLine(
        { ca: 'He comprat pa.', chunks: phraseRow(9).chunks, anatomy: before },
        {
          ca: 'No he comprat pa.',
          chunks: [
            { text: 'No', role: 'negation', ids: ['NEG.simple.no'], start: 0, end: 2 },
            { ...phraseRow(9).chunks[0]!, text: 'he comprat', start: 3, end: 13 },
            { ...phraseRow(9).chunks[1]!, start: 14, end: 16 },
          ],
          anatomy: after,
        },
      ),
    ).toBe('He comprat → No he comprat');
  });

  it('gives French its typographic apostrophe', () => {
    expect(frenchProse("Aujourd'hui, j'ai acheté le pain.")).toBe(
      'Aujourd’hui, j’ai acheté le pain.',
    );
  });
});
