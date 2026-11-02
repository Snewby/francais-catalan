/**
 * The reports triage sheet, from a backup exported from a throwaway catala-v2
 * holding a phrase, a variant and reports old and new.
 */
import type Dexie from 'dexie';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderTriage } from '../scripts/lib/triage';
import { promptHash } from '../src/api/prompt';
import { parseBackup, backupPort } from '../src/db/backup';
import { createCatalaDatabase, reportsOf } from '../src/db/catala-v2';
import { newSyncFields } from '../src/db/sync';
import type { VariantRecording } from '../src/eval/variants';
import { addReport, translateAndStore } from '../src/phrase/store';
import { parseComboKey, startingState } from '../src/variants/combination';
import { variantPromptHash } from '../src/variants/prompt';
import { fetchAndStoreVariant } from '../src/variants/store';
import { recordedReply } from './helpers/recorded-replies';
import fixture from './fixtures/phrase-response.json';

const VARIANTS = JSON.parse(
  readFileSync(
    path.resolve(
      __dirname,
      'fixtures/variants-v1/recordings/claude-opus-5-5/run-1.json',
    ),
    'utf8',
  ),
) as VariantRecording;

const answer = (body: unknown) =>
  (async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  })) as unknown as typeof fetch;

let database: Dexie;

beforeEach(() => {
  database = createCatalaDatabase(`triage-test-${crypto.randomUUID()}`);
});

afterEach(async () => {
  await database.delete();
});

async function sheet(): Promise<string> {
  const phrase = await translateAndStore(database, {
    input: 'Hier, j’ai acheté le pain au marché.',
    apiKey: 'test-key',
    fetchFn: answer(fixture),
    isOnline: () => true,
  });
  if (phrase.status !== 'stored') throw new Error('phrase not stored');
  const reply = recordedReply(1);
  const recorded = VARIANTS.cases.find((c) => c.combination === '1c')?.fetches[0];
  const variant = await fetchAndStoreVariant(database, {
    phraseId: phrase.row.id,
    original: { ...reply, combination: startingState(reply).combination },
    target: parseComboKey('ella·ahir·none·0·0'),
    apiKey: 'test-key',
    fetchFn: answer(recorded !== undefined && 'body' in recorded ? recorded.body : {}),
    isOnline: () => true,
  });
  if (variant.status !== 'stored') throw new Error('variant not stored');

  // A report written before phase 2: no kind, no variant, no snapshot.
  await reportsOf(database).add({
    ...newSyncFields(1_000),
    phraseId: phrase.row.id,
    text: 'Ancienne note.',
    at: 1_000,
  });
  await addReport(
    database,
    {
      phraseId: phrase.row.id,
      text: '',
      kind: 'wrong_change',
      variantId: variant.row.id,
      snapshot: {
        input: phrase.row.input,
        ca: variant.row.ca ?? '',
        fr: variant.row.fr ?? '',
        comboKey: 'ella·ahir·none·0·0',
      },
    },
    2_000,
  );

  const backup = parseBackup((await backupPort(database).exportFile()).text);
  return renderTriage(backup, {
    phrase: await promptHash(),
    variant: await variantPromptHash(),
  });
}

describe('the reports triage sheet', () => {
  it('counts the reports by kind', async () => {
    const text = await sheet();
    expect(text).toContain('2 open reports, newest first.');
    expect(text).toContain('| Not the change asked for | 1 |');
    expect(text).toContain('| No kind given | 1 |');
  });

  it('puts the newest first, with what was shown and what made it', async () => {
    const text = await sheet();
    const first = text.indexOf('## 1. Not the change asked for');
    const second = text.indexOf('## 2. No kind given');
    expect(first).toBeGreaterThan(0);
    expect(second).toBeGreaterThan(first);
    const card = text.slice(first, second);
    expect(card).toContain('- Catalan shown: « Ahir va comprar el pa al mercat. »');
    expect(card).toContain('- Combination: ella·ahir·none·0·0');
    expect(card).toContain('- Made by: claude-opus-5-5');
    expect(card).toContain('(current)');
    expect(card).toContain('« va comprar » verb: VERB.ind.passat_perifrastic');
    expect(card).toContain('- Becomes: a variant-eval combination for this row');
  });

  it('reads a report from before phase 2 off its phrase', async () => {
    const text = await sheet();
    const card = text.slice(text.indexOf('## 2. No kind given'));
    expect(card).toContain('- Note: « Ancienne note. »');
    expect(card).toContain('- Combination: the original sentence');
    expect(card).toContain('- Becomes: a golden-set case for the phrase prompt');
  });
});
