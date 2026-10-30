/**
 * The closed vocabularies of a phrase reply, other than component IDs.
 *
 * THIS FILE IS AUTHORITATIVE for them. `npm run gen-schema` reads these lists
 * into PHRASE_SCHEMA and VARIANT_SCHEMA in src/api/schema.ts, and the French
 * labels in fr.ts are keyed off them, so a value is added here and nowhere
 * else. They are English identifiers on purpose: chunk data stays
 * language-invariant, and the French a learner sees is looked up from the value
 * rather than generated with it.
 */

/** Grammatical person of the main verb; `none` for impersonal sentences. */
export type Person = '1sg' | '2sg' | '3sg' | '1pl' | '2pl' | '3pl' | 'none';

/** Choices French leaves open, which the model must name when it made one. */
export type Assumption =
  'addressee_tu' | 'addressee_formal' | 'speaker_fem' | 'subject_fem' | 'plural_fem';

/** What a chunk does in the sentence. Colour and caption are chosen from this. */
export type ChunkRole =
  | 'subject'
  | 'verb'
  | 'object_direct'
  | 'object_indirect'
  | 'clitic'
  | 'negation'
  | 'time'
  | 'place'
  | 'manner'
  | 'quantity'
  | 'connector'
  | 'complement'
  | 'other';

/**
 * Why a chunk links no ID. `outside_taxonomy` marks a real grammar point with
 * no leaf, and feeds the taxonomy gap list; `no_notion` is plain vocabulary.
 */
export type UnlinkedReason = 'no_notion' | 'outside_taxonomy';

export const PERSONS: readonly Person[] = [
  '1sg',
  '2sg',
  '3sg',
  '1pl',
  '2pl',
  '3pl',
  'none',
];

export const ASSUMPTIONS: readonly Assumption[] = [
  'addressee_tu',
  'addressee_formal',
  'speaker_fem',
  'subject_fem',
  'plural_fem',
];

export const CHUNK_ROLES: readonly ChunkRole[] = [
  'subject',
  'verb',
  'object_direct',
  'object_indirect',
  'clitic',
  'negation',
  'time',
  'place',
  'manner',
  'quantity',
  'connector',
  'complement',
  'other',
];

export const UNLINKED_REASONS: readonly UnlinkedReason[] = [
  'no_notion',
  'outside_taxonomy',
];

/** Most specific leaf first; a short accurate list beats an approximate one. */
export const MAX_IDS_PER_CHUNK = 3;

/**
 * Whether a variant was produced. `not_applicable` is a valid reply, not a
 * failure: the combination is grammatical in general but wrong for this
 * sentence, and the button is greyed with the reason (phase 2, D5).
 */
export type VariantStatus = 'ok' | 'not_applicable';

/**
 * Why a combination does not apply to this sentence. The French a learner
 * reads for each is in fr.ts, keyed off these values; the reply carries none.
 */
export type NotApplicableReason =
  'aspect_incompatible' | 'subordinate_affected' | 'no_pronoun_form' | 'other';

export const VARIANT_STATUSES: readonly VariantStatus[] = ['ok', 'not_applicable'];

export const NOT_APPLICABLE_REASONS: readonly NotApplicableReason[] = [
  'aspect_incompatible',
  'subordinate_affected',
  'no_pronoun_form',
  'other',
];
