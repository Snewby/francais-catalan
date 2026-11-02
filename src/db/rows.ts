/**
 * The rows phase 1 stores, as the spec's « Stores » table lists them.
 *
 * Chunk data stays language-invariant: `fr` is the one French field, the
 * model's understanding of the input, and `input` is the learner's own text.
 */
import type { CacheUsage } from '../api/anthropic';
import type {
  Assumption,
  NotApplicableReason,
  Person,
  VariantStatus,
} from '../api/phrase';
import type { SpannedChunk } from '../api/phrase-check';
import type { ReportKind, ReportSnapshot } from '../phrase/report';
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

/** The shape of a stored variant, bumped like PHRASE_SCHEMA_VERSION. */
export const VARIANT_SCHEMA_VERSION = 1;

/**
 * One variant of a phrase for one target combination (phase 2 spec, « Store »),
 * either a checked variant or a `not_applicable` reply, which is stored too so
 * the button stays greyed on reopen with no call. Chunk data stays
 * language-invariant: `fr` is the one French field.
 */
export interface VariantRow extends SyncFields {
  readonly phraseId: string;
  /** person·tense·tournure·pronoun·negation (src/variants/combination.ts). */
  readonly comboKey: string;
  readonly status: VariantStatus;
  /** Null for `not_applicable`, as are `ca` and `subject`. */
  readonly fr: string | null;
  readonly ca: string | null;
  readonly subject: { readonly person: Person; readonly expressed: boolean } | null;
  readonly assumptions: readonly Assumption[];
  readonly chunks: readonly SpannedChunk[];
  /** Set only for `not_applicable`. */
  readonly reason: NotApplicableReason | null;
  readonly model: string;
  readonly schemaVersion: number;
  /** variantPromptHash: a prompt change makes the row stale without a migration. */
  readonly promptHash: string;
  readonly usage: CacheUsage;
  readonly latencyMs: number;
  /**
   * When the learner first saw it. Null for a variant fetched ahead and never
   * shown, which is why exposure is recorded at the first showing rather than
   * at the call (src/variants/store.ts).
   */
  readonly seenAt: number | null;
}

/**
 * « Signaler une erreur »: the learner's report on a phrase or one of its
 * variants, stored locally. `kind`, `variantId` and `snapshot` arrived in
 * phase 2 and are absent from rows written before it.
 */
export interface ReportRow extends SyncFields {
  readonly phraseId: string;
  /** May be empty when a kind says it all. */
  readonly text: string;
  readonly at: number;
  readonly kind?: ReportKind | null;
  /** The variant on screen, or null for the original sentence (spec, « Signaler une erreur »). */
  readonly variantId?: string | null;
  readonly snapshot?: ReportSnapshot;
}
