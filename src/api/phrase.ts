/**
 * The closed vocabularies of a phrase reply, other than component IDs.
 *
 * THIS FILE IS AUTHORITATIVE for them. `npm run gen-schema` reads these lists
 * into PHRASE_SCHEMA in src/api/schema.ts, and the French labels in fr.ts are
 * keyed off them, so a value is added here and nowhere else. They are English
 * identifiers on purpose: chunk data stays language-invariant, and the French a
 * learner sees is looked up from the value rather than generated with it.
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
