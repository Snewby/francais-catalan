/**
 * GENERATED FILE. DO NOT EDIT BY HAND.
 *
 * Produced by `npm run gen-schema` from src/taxonomy/taxonomy.json and the
 * interaction-model enums in src/srs/evidence.ts.
 *
 * Hand-edits are destroyed on the next generation and, worse, temporarily hide
 * the drift that test/gen-schema.test.ts exists to catch.
 */

/** Every reviewable component, in taxonomy order. */
export const LEAF_IDS = [
  'VERB.ind.imperfet',
  'VERB.ind.passat_perifrastic',
  'VERB.perf.present',
  'VERB.conj.3.incoatiu',
  'VERB.mod.obligacio',
  'VERB.ser_estar',
  'PRON.fort.subjecte',
  'PRON.feble.en',
  'PRON.feble.hi',
  'PRON.feble.combinacio.ci_cd',
] as const;

export type ComponentId = (typeof LEAF_IDS)[number];

/**
 * One entry in the decomposition. LANGUAGE-INVARIANT: a component ID, the
 * Catalan surface form, and optionally its pronunciation. No French here; the
 * answer field carries all of it.
 */
export const COMPONENT_ENTRY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'ca'],
  properties: {
    id: { type: 'string', enum: LEAF_IDS },
    ca: { type: 'string', minLength: 1 },
    ipa: { type: 'string', minLength: 1 },
  },
} as const;

/**
 * The decomposition payload. All five intents emit this same shape; only the
 * prompt and the surrounding logged fields differ.
 */
export const DECOMPOSITION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['decomposition', 'answer', 'answer_lang'],
  properties: {
    decomposition: { type: 'array', items: COMPONENT_ENTRY_SCHEMA },
    answer: { type: 'string', minLength: 1 },
    answer_lang: { type: 'string', enum: ['fr'] },
  },
} as const;

/**
 * A logged query: the decomposition payload plus the interaction-model triple.
 *
 * `rating` is required exactly when `evidence` is the one type that
 * EVIDENCE_EFFECTS marks as requiring one, and forbidden otherwise. The
 * conditional is generated from that table rather than written by hand.
 */
export const QUERY_LOG_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'asked_at',
    'question',
    'intent',
    'direction',
    'evidence',
    'decomposition',
    'answer',
    'answer_lang',
  ],
  properties: {
    asked_at: { type: 'integer', minimum: 0 },
    question: { type: 'string', minLength: 1 },
    intent: {
      type: 'string',
      enum: ['comprehend', 'produce', 'teach', 'assess', 'pronounce'],
    },
    direction: { type: 'string', enum: ['ca_to_fr', 'fr_to_ca'] },
    evidence: { type: 'string', enum: ['lookup', 'recall', 'graded'] },
    rating: { type: 'string', enum: ['again', 'hard', 'good', 'easy'] },
    decomposition: DECOMPOSITION_SCHEMA.properties.decomposition,
    answer: DECOMPOSITION_SCHEMA.properties.answer,
    answer_lang: DECOMPOSITION_SCHEMA.properties.answer_lang,
  },
  allOf: [
    {
      if: {
        properties: { evidence: { enum: ['graded'] } },
        required: ['evidence'],
      },
      then: { required: ['rating'] },
      else: { not: { required: ['rating'] } },
    },
  ],
} as const;
