/**
 * The rows phase 1 stores, as the spec's « Stores » table lists them.
 *
 * Chunk data stays language-invariant: `fr` is the one French field, the
 * model's understanding of the input, and `input` is the learner's own text.
 */
import type { CacheUsage } from '../api/anthropic';
import type { Assumption, Person } from '../api/phrase';
import type { SpannedChunk } from '../api/phrase-check';
import type { ComponentId } from '../api/schema';
import type { Direction, Evidence, Intent } from '../srs/evidence';
import type { SyncFields } from './sync';

/**
 * The shape of a stored phrase. Bumped when `chunks` or `subject` change
 * shape, so a row written by an older build is re-fetched rather than misread.
 */
export const PHRASE_SCHEMA_VERSION = 1;

export type PhraseStatus = 'ok' | 'analysis_failed';

export interface PhraseRow extends SyncFields {
  /** Exactly as typed, for « Votre phrase ». */
  readonly input: string;
  /** The normalised, lower-cased input: the cache key (src/phrase/input.ts). */
  readonly inputKey: string;
  readonly fr: string;
  readonly ca: string;
  /** Null when the anatomy failed and only `fr` and `ca` survived. */
  readonly subject: { readonly person: Person; readonly expressed: boolean } | null;
  readonly assumptions: readonly Assumption[];
  /** Empty when the anatomy failed. */
  readonly chunks: readonly SpannedChunk[];
  readonly status: PhraseStatus;
  readonly model: string;
  readonly schemaVersion: number;
  /** A prompt change makes the row stale without a migration. */
  readonly promptHash: string;
  /** Summed over the call and its retry. */
  readonly usage: CacheUsage;
  /** The learner's whole wait, retry included. */
  readonly latencyMs: number;
}

/**
 * One piece of evidence about one component. `intent` and `direction` are on
 * every row because the exposure/mastery split depends on them; `rating` is
 * absent here because phase 1 writes only `lookup`, which takes none.
 */
export interface EventRow extends SyncFields {
  readonly componentId: ComponentId;
  readonly evidence: Evidence;
  readonly intent: Intent;
  readonly direction: Direction;
  readonly phraseId: string;
  readonly at: number;
}

/** « Signaler une erreur »: the learner's note on a phrase, stored locally. */
export interface ReportRow extends SyncFields {
  readonly phraseId: string;
  readonly text: string;
  readonly at: number;
}
