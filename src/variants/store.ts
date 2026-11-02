/**
 * The variant pipeline around the client (phase 2 spec, « Pipeline », steps 3
 * and 8 to 9): the cache lookup, the call, the stored row, and the exposure a
 * variant records.
 *
 * EXPOSURE, NOT MASTERY. A variant writes `lookup` events only, one per linked
 * ID it has that the state before it did not, and EVIDENCE_EFFECTS decides
 * what a lookup may move. They are written when the learner first sees the
 * variant, not when it is fetched: a variant fetched ahead (prefetch) and
 * never shown has not been looked at.
 */
import type Dexie from 'dexie';
import type { CacheUsage, FailureKind } from '../api/anthropic';
import type { SpannedChunk } from '../api/phrase-check';
import type { ComponentId } from '../api/schema';
import { eventsOf, variantsOf } from '../db/catala-v2';
import { VARIANT_SCHEMA_VERSION, type EventRow, type VariantRow } from '../db/rows';
import { newSyncFields } from '../db/sync';
import { APP_CACHE_TTL } from '../phrase/store';
import { INTENT_FOR_DIRECTION, type Direction } from '../srs/evidence';
import { VARIANT_MODEL, requestVariant, type VariantResult } from './client';
import { comboKey, type Combination } from './combination';
import { buildVariantRequest, variantPromptHash, type VariantBase } from './prompt';

/** A variant is still Catalan produced from French input (decided 29 Oct, F9). */
const DIRECTION: Direction = 'fr_to_ca';

function current(row: VariantRow, model: string, hash: string): boolean {
  return (
    row.deletedAt === null &&
    row.schemaVersion === VARIANT_SCHEMA_VERSION &&
    row.model === model &&
    row.promptHash === hash
  );
}

/** The stored reply for this phrase and combination, if made under this model and prompt. */
export async function findVariant(
  database: Dexie,
  phraseId: string,
  key: string,
  model: string = VARIANT_MODEL,
): Promise<VariantRow | undefined> {
  const hash = await variantPromptHash();
  const rows = await variantsOf(database)
    .where('[phraseId+comboKey]')
    .equals([phraseId, key])
    .toArray();
  return rows
    .filter((row) => current(row, model, hash))
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

/** Every current variant of a phrase, so a reopen greys its not_applicable buttons. */
export async function variantsOfPhrase(
  database: Dexie,
  phraseId: string,
  model: string = VARIANT_MODEL,
): Promise<VariantRow[]> {
  const hash = await variantPromptHash();
  const rows = await variantsOf(database).where('phraseId').equals(phraseId).toArray();
  return rows.filter((row) => current(row, model, hash));
}

export type VariantOutcome =
  | { readonly status: 'stored'; readonly row: VariantRow }
  /** Two replies failed the check: nothing stored, « Variante indisponible ». */
  | { readonly status: 'unavailable' }
  | { readonly status: 'error'; readonly kind: FailureKind; readonly detail: string };

export interface FetchVariantOptions {
  readonly phraseId: string;
  /** The original sentence and where it sits on the axes: every request starts here (D2). */
  readonly original: VariantBase & { readonly combination: Combination };
  readonly target: Combination;
  readonly apiKey: string | null;
  readonly model?: string;
  readonly signal?: AbortSignal;
  readonly fetchFn?: typeof fetch;
  readonly isOnline?: () => boolean;
  readonly now?: number;
}

function summedUsage(result: VariantResult): CacheUsage {
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

/** One call for one combination, stored when it passes the check. Writes no event. */
export async function fetchAndStoreVariant(
  database: Dexie,
  options: FetchVariantOptions,
): Promise<VariantOutcome> {
  const model = options.model ?? VARIANT_MODEL;
  const { request, context } = buildVariantRequest(options.original, options.target);
  const result = await requestVariant({
    apiKey: options.apiKey,
    model,
    request,
    context,
    cacheTtl: APP_CACHE_TTL,
    ...(options.signal && { signal: options.signal }),
    ...(options.fetchFn && { fetchFn: options.fetchFn }),
    ...(options.isOnline && { isOnline: options.isOnline }),
  });
  if (result.status === 'error') {
    return { status: 'error', kind: result.kind, detail: result.detail };
  }
  if (result.status === 'unavailable') return { status: 'unavailable' };

  const now = options.now ?? Date.now();
  const { variant } = result;
  const row: VariantRow = {
    ...newSyncFields(now),
    phraseId: options.phraseId,
    comboKey: comboKey(options.target),
    status: variant.status,
    fr: variant.status === 'ok' ? variant.fr : null,
    ca: variant.status === 'ok' ? variant.phrase.ca : null,
    subject: variant.status === 'ok' ? variant.phrase.subject : null,
    assumptions: variant.status === 'ok' ? variant.phrase.assumptions : [],
    chunks: variant.status === 'ok' ? variant.phrase.chunks : [],
    reason: variant.status === 'not_applicable' ? variant.reason : null,
    model,
    schemaVersion: VARIANT_SCHEMA_VERSION,
    promptHash: await variantPromptHash(),
    usage: summedUsage(result),
    latencyMs: result.attempts.reduce((sum, attempt) => sum + attempt.latencyMs, 0),
    seenAt: null,
  };
  await variantsOf(database).put(row);
  return { status: 'stored', row };
}

function linkedIds(chunks: readonly SpannedChunk[]): ComponentId[] {
  return [...new Set(chunks.flatMap((chunk) => chunk.ids))];
}

/**
 * The learner sees `row` for the first time, coming from `previous`: one
 * `lookup` event per ID the variant links and `previous` did not, and the row
 * marked seen, together. A second showing writes nothing.
 */
export async function recordFirstSight(
  database: Dexie,
  row: VariantRow,
  previous: readonly SpannedChunk[],
  now: number = Date.now(),
): Promise<VariantRow> {
  if (row.seenAt !== null || row.status !== 'ok') return row;
  const before = new Set(linkedIds(previous));
  const events: EventRow[] = linkedIds(row.chunks)
    .filter((id) => !before.has(id))
    .map((componentId) => ({
      ...newSyncFields(now),
      componentId,
      evidence: 'lookup',
      intent: INTENT_FOR_DIRECTION[DIRECTION],
      direction: DIRECTION,
      phraseId: row.phraseId,
      at: now,
    }));
  const seen: VariantRow = { ...row, seenAt: now, updatedAt: now };
  await database.transaction('rw', ['variants', 'events'], async () => {
    await variantsOf(database).put(seen);
    if (events.length > 0) await eventsOf(database).bulkAdd(events);
  });
  return seen;
}
