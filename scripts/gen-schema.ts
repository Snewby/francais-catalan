/**
 * Regenerates src/api/schema.ts, drawing every component-ID enum from the
 * flattened taxonomy leaf IDs and every interaction-model enum from
 * src/srs/evidence.ts.
 *
 * Because the generated enums are sent to the model as a constrained output
 * schema, an out-of-vocabulary tag is impossible at decode time. What the
 * generation test guards is the other failure: the committed schema drifting
 * away from the taxonomy it claims to describe.
 *
 * The rendering is a pure function so the test can compare it against the
 * committed file without running the write. Merging the per-domain fragments
 * under data/ into taxonomy.json is a phase 2a concern; until then the seed
 * taxonomy is hand-authored and this script reads it as it stands.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import { LEAF_IDS } from '../src/taxonomy';
import {
  DIRECTIONS,
  EVIDENCE_EFFECTS,
  EVIDENCE_TYPES,
  INTENTS,
  RATINGS,
} from '../src/srs/evidence';

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const OUTPUT_PATH = path.join(projectDir, 'src/api/schema.ts');

const BANNER = `/**
 * GENERATED FILE. DO NOT EDIT BY HAND.
 *
 * Produced by \`npm run gen-schema\` from src/taxonomy/taxonomy.json and the
 * interaction-model enums in src/srs/evidence.ts.
 *
 * Hand-edits are destroyed on the next generation and, worse, temporarily hide
 * the drift that test/gen-schema.test.ts exists to catch.
 */`;

function literalArray(values: readonly string[]): string {
  return `[${values.map((value) => JSON.stringify(value)).join(', ')}]`;
}

/**
 * The evidence types that must carry a rating, read off EVIDENCE_EFFECTS rather
 * than named here. Marking a second evidence type as graded in that table
 * regenerates a wider conditional with no edit to this script.
 */
function ratingRequiringEvidence(): readonly string[] {
  return EVIDENCE_TYPES.filter((evidence) => EVIDENCE_EFFECTS[evidence].requiresRating);
}

/** The full text of src/api/schema.ts for the current taxonomy. */
export async function renderSchemaModule(): Promise<string> {
  const source = `${BANNER}

/** Every reviewable component, in taxonomy order. */
export const LEAF_IDS = ${literalArray(LEAF_IDS)} as const;

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
 * \`rating\` is required exactly when \`evidence\` is the one type that
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
    intent: { type: 'string', enum: ${literalArray(INTENTS)} },
    direction: { type: 'string', enum: ${literalArray(DIRECTIONS)} },
    evidence: { type: 'string', enum: ${literalArray(EVIDENCE_TYPES)} },
    rating: { type: 'string', enum: ${literalArray(RATINGS)} },
    decomposition: DECOMPOSITION_SCHEMA.properties.decomposition,
    answer: DECOMPOSITION_SCHEMA.properties.answer,
    answer_lang: DECOMPOSITION_SCHEMA.properties.answer_lang,
  },
  allOf: [
    {
      if: {
        properties: { evidence: { enum: ${literalArray(ratingRequiringEvidence())} } },
        required: ['evidence'],
      },
      then: { required: ['rating'] },
      else: { not: { required: ['rating'] } },
    },
  ],
} as const;
`;

  const options = await prettier.resolveConfig(OUTPUT_PATH);
  return prettier.format(source, { ...options, parser: 'typescript' });
}

async function main(): Promise<void> {
  writeFileSync(OUTPUT_PATH, await renderSchemaModule(), 'utf8');
  console.log(
    `gen-schema: wrote src/api/schema.ts with ${LEAF_IDS.length} component IDs.`,
  );
}

// Only run when invoked as a script. Importing this module from the test must
// not write to the repo, or the test would be asserting against its own output.
const invokedDirectly =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) await main();
