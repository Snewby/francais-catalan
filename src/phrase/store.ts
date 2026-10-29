/**
 * The phrase pipeline around the API client: cache lookup, the call, the
 * stored row and the exposure it records (spec, « Pipeline », steps 2 and 7).
 *
 * EXPOSURE, NOT MASTERY. A translation writes one `lookup` event per linked
 * ID and nothing else: no FSRS state is read or written here, and which
 * signal a lookup may move is decided by EVIDENCE_EFFECTS, not by this file.
 */
import type Dexie from 'dexie';
import {
  MODEL,
  translatePhrase,
  type CacheUsage,
  type FailureKind,
  type TranslateResult,
} from '../api/anthropic';
import { promptHash, type CacheTtl } from '../api/prompt';
import type { ComponentId } from '../api/schema';
import { eventsOf, phrasesOf, reportsOf } from '../db/catala-v2';
import {
  PHRASE_SCHEMA_VERSION,
  type EventRow,
  type PhraseRow,
  type ReportRow,
} from '../db/rows';
import { newSyncFields } from '../db/sync';
import { INTENT_FOR_DIRECTION, type Direction } from '../srs/evidence';
import { inputKey, normaliseInput } from './input';

/**
 * One hour, not the default five minutes: a learner typing a sentence now and
 * then misses five minutes, and with the chosen model one warm hit an hour pays
 * for the dearer cache write (decided 29 Oct). Outside the prompt hash, so it
 * changes no recording.
 */
export const APP_CACHE_TTL: CacheTtl = '1h';

/** Phase 1 input is French only (spec Q3). */
const DIRECTION: Direction = 'fr_to_ca';

/** The current row for this input, if one was stored under this model and prompt. */
export async function findCached(
  database: Dexie,
  input: string,
  model: string = MODEL,
): Promise<PhraseRow | undefined> {
  const hash = await promptHash();
  const rows = await phrasesOf(database)
    .where('inputKey')
    .equals(inputKey(input))
    .toArray();
  return rows
    .filter(
      (row) =>
        row.deletedAt === null &&
        row.schemaVersion === PHRASE_SCHEMA_VERSION &&
        row.model === model &&
        row.promptHash === hash,
    )
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

export async function getPhrase(
  database: Dexie,
  id: string,
): Promise<PhraseRow | undefined> {
  const row = await phrasesOf(database).get(id);
  return row?.deletedAt === null ? row : undefined;
}

/** The newest phrases first, for « Récentes ». */
export async function recentPhrases(database: Dexie, limit = 5): Promise<PhraseRow[]> {
  return phrasesOf(database)
    .orderBy('createdAt')
    .reverse()
    .filter((row) => row.deletedAt === null)
    .limit(limit)
    .toArray();
}

export async function addReport(
  database: Dexie,
  phraseId: string,
  text: string,
  now: number = Date.now(),
): Promise<ReportRow> {
  const row: ReportRow = { ...newSyncFields(now), phraseId, text, at: now };
  await reportsOf(database).add(row);
  return row;
}

export type PhraseOutcome =
  | { readonly status: 'stored'; readonly row: PhraseRow; readonly cached: boolean }
  | { readonly status: 'error'; readonly kind: FailureKind; readonly detail: string };

export interface TranslateAndStoreOptions {
  readonly input: string;
  readonly apiKey: string | null;
  /** The new row's id, so the screen can route to it before the reply arrives. */
  readonly id?: string;
  /** Skip the cache: « Réessayer » after the anatomy failed. */
  readonly force?: boolean;
  readonly signal?: AbortSignal;
  readonly fetchFn?: typeof fetch;
  readonly isOnline?: () => boolean;
  readonly now?: number;
}

function summedUsage(result: TranslateResult): CacheUsage {
  const total = {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
  };
  for (const { usage } of result.attempts) {
    if (usage === undefined) continue;
    total.inputTokens += usage.inputTokens;
    total.outputTokens += usage.outputTokens;
    total.cacheCreationTokens += usage.cacheCreationTokens;
    total.cacheReadTokens += usage.cacheReadTokens;
  }
  return total;
}

/** Each linked ID once, in sentence order. */
function linkedIds(row: PhraseRow): ComponentId[] {
  return [...new Set(row.chunks.flatMap((chunk) => chunk.ids))];
}

export async function translateAndStore(
  database: Dexie,
  options: TranslateAndStoreOptions,
): Promise<PhraseOutcome> {
  const sentence = normaliseInput(options.input);
  const existing = await findCached(database, sentence);
  if (existing !== undefined && options.force !== true) {
    return { status: 'stored', row: existing, cached: true };
  }

  const result = await translatePhrase({
    sentence,
    apiKey: options.apiKey,
    cacheTtl: APP_CACHE_TTL,
    ...(options.signal && { signal: options.signal }),
    ...(options.fetchFn && { fetchFn: options.fetchFn }),
    ...(options.isOnline && { isOnline: options.isOnline }),
  });
  if (result.status === 'error') {
    return { status: 'error', kind: result.kind, detail: result.detail };
  }

  const now = options.now ?? Date.now();
  const sync = newSyncFields(now);
  const shared = {
    // A retry rewrites the row it retried, so recents and links keep one entry.
    id: existing?.id ?? options.id ?? sync.id,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    deletedAt: null,
    input: options.input,
    inputKey: inputKey(sentence),
    model: result.model,
    schemaVersion: PHRASE_SCHEMA_VERSION,
    promptHash: await promptHash(),
    usage: summedUsage(result),
    latencyMs: result.attempts.reduce((sum, attempt) => sum + attempt.latencyMs, 0),
  };
  const row: PhraseRow =
    result.status === 'ok'
      ? {
          ...shared,
          fr: result.phrase.fr,
          ca: result.phrase.ca,
          subject: result.phrase.subject,
          assumptions: result.phrase.assumptions,
          chunks: result.phrase.chunks,
          status: 'ok',
        }
      : {
          ...shared,
          fr: result.fr,
          ca: result.ca,
          subject: null,
          assumptions: [],
          chunks: [],
          status: 'analysis_failed',
        };

  const events: EventRow[] = linkedIds(row).map((componentId) => ({
    ...newSyncFields(now),
    componentId,
    evidence: 'lookup',
    intent: INTENT_FOR_DIRECTION[DIRECTION],
    direction: DIRECTION,
    phraseId: row.id,
    at: now,
  }));

  await database.transaction('rw', ['phrases', 'events'], async () => {
    await phrasesOf(database).put(row);
    if (events.length > 0) await eventsOf(database).bulkAdd(events);
  });
  return { status: 'stored', row, cached: false };
}
