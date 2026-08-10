/**
 * The taxonomy build, in two stages.
 *
 *   data/<domain>.fragment.json  -> stage 1 -> src/taxonomy/taxonomy.json
 *                                -> stage 2 -> src/api/schema.ts
 *
 * The fragments are the only editable source. Splitting by domain is what keeps
 * a seeding subagent's context to one domain, and what stops two domains being
 * authored into the same file and conflicting.
 *
 * Because the generated enums are sent to the model as a constrained output
 * schema, an out-of-vocabulary tag is impossible at decode time. What the
 * generation tests guard is the other failure: a committed artefact drifting
 * away from the fragments it claims to describe.
 *
 * Both renderings are pure functions of the fragments, so the tests can compare
 * them against the committed files without running the write.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import {
  DOMAIN_CODES,
  isLeaf,
  type DomainCode,
  type TaxonomyNode,
} from '../src/taxonomy';
import {
  DIRECTIONS,
  EVIDENCE_EFFECTS,
  EVIDENCE_TYPES,
  INTENTS,
  RATINGS,
} from '../src/srs/evidence';

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const FRAGMENT_DIR = path.join(projectDir, 'data');
const TAXONOMY_PATH = path.join(projectDir, 'src/taxonomy/taxonomy.json');
const OUTPUT_PATH = path.join(projectDir, 'src/api/schema.ts');

/** The shape of the taxonomy document. taxonomy.schema.json is authoritative. */
export interface MergedTaxonomy {
  readonly $generated: string;
  readonly version: number;
  readonly nodes: readonly TaxonomyNode[];
}

export interface Fragment {
  /** Repo-relative, forward-slashed, for messages that read the same everywhere. */
  readonly file: string;
  readonly domain: string;
  readonly nodes: readonly TaxonomyNode[];
}

const TAXONOMY_VERSION = 1;

const TAXONOMY_BANNER =
  'GENERATED FILE. DO NOT EDIT BY HAND. Rebuilt by `npm run gen-schema` from ' +
  'data/*.fragment.json. Hand-edits here are destroyed on the next generation; ' +
  'edit the fragment for the domain instead.';

const BANNER = `/**
 * GENERATED FILE. DO NOT EDIT BY HAND.
 *
 * Produced by \`npm run gen-schema\` from data/*.fragment.json and the
 * interaction-model enums in src/srs/evidence.ts.
 *
 * Hand-edits are destroyed on the next generation and, worse, temporarily hide
 * the drift that test/gen-schema.test.ts exists to catch.
 */`;

/** Every per-domain fragment on disk, in filename order. */
export function readFragments(): Fragment[] {
  return readdirSync(FRAGMENT_DIR)
    .filter((entry) => entry.endsWith('.fragment.json'))
    .sort()
    .map((entry) => {
      const parsed = JSON.parse(
        readFileSync(path.join(FRAGMENT_DIR, entry), 'utf8'),
      ) as { domain: string; nodes: TaxonomyNode[] };
      return { file: `data/${entry}`, domain: parsed.domain, nodes: parsed.nodes };
    });
}

/**
 * Stage 1. Concatenates the fragments in the order of the closed domain list,
 * so that adding a fragment later appends rather than reshuffling the file.
 */
export function mergeFragments(fragments = readFragments()): MergedTaxonomy {
  const seenDomains = new Set<string>();
  for (const fragment of fragments) {
    if (!DOMAIN_CODES.includes(fragment.domain as DomainCode)) {
      throw new Error(`${fragment.file}: ${fragment.domain} is not a domain code.`);
    }
    if (seenDomains.has(fragment.domain)) {
      throw new Error(`${fragment.file}: a second fragment claims ${fragment.domain}.`);
    }
    seenDomains.add(fragment.domain);
  }

  const ordered = [...fragments].sort(
    (a, b) =>
      DOMAIN_CODES.indexOf(a.domain as DomainCode) -
      DOMAIN_CODES.indexOf(b.domain as DomainCode),
  );

  const nodes: TaxonomyNode[] = [];
  const seenIds = new Set<string>();

  for (const fragment of ordered) {
    for (const node of fragment.nodes) {
      const domain = node.id.split('.')[0];
      if (domain !== fragment.domain) {
        throw new Error(
          `${fragment.file}: ${node.id} belongs to ${String(domain)}, not ` +
            `${fragment.domain}. A node lives in its own domain's fragment.`,
        );
      }
      if (seenIds.has(node.id)) {
        throw new Error(`${fragment.file}: duplicate node ID ${node.id}.`);
      }
      seenIds.add(node.id);
      nodes.push(node);
    }
  }

  return { $generated: TAXONOMY_BANNER, version: TAXONOMY_VERSION, nodes };
}

/** Stage 1 output: the full text of src/taxonomy/taxonomy.json. */
export async function renderTaxonomy(
  taxonomy: MergedTaxonomy = mergeFragments(),
): Promise<string> {
  const options = await prettier.resolveConfig(TAXONOMY_PATH);
  return prettier.format(JSON.stringify(taxonomy), { ...options, parser: 'json' });
}

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

/**
 * Stage 2 output: the full text of src/api/schema.ts.
 *
 * Takes the merged taxonomy rather than importing src/taxonomy, because within
 * a single run stage 1 has already rewritten taxonomy.json and the import would
 * still hold the version loaded at startup.
 */
export async function renderSchemaModule(
  taxonomy: MergedTaxonomy = mergeFragments(),
): Promise<string> {
  const leafIds = taxonomy.nodes.filter(isLeaf).map((leaf) => leaf.id);

  const source = `${BANNER}

/** Every reviewable component, in taxonomy order. */
export const LEAF_IDS = ${literalArray(leafIds)} as const;

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
 *
 * \`answer_ca\` is the whole Catalan utterance, and it is a SIBLING of the
 * decomposition rather than a field inside it, so the language-invariance rule
 * on \`decomposition\` is untouched and \`answer\` stays the single French field.
 * Without it the reply had no field holding the Catalan the learner is being
 * told to say: the only Catalan was the per-component \`ca\`, which is a
 * fragment realising one grammar point, and joining those does not reconstruct
 * a sentence. That is the shape phase 6b's audio needs and the shape the
 * attempt comparison needs.
 *
 * \`answer_fr\` is its mirror: the same utterance in French, one line, no
 * commentary. \`answer\` is NOT that, and the two must not be conflated:
 * \`answer\` explains the structure and \`answer_fr\` renders the sentence. With
 * both siblings present the reply shows the pair whichever way the question
 * ran, and every logged query carries a matched French/Catalan pair in the
 * learner's own vocabulary, about something they actually wanted to say. The
 * authored taxonomy holds no translation of any example, so that pair is the
 * only translation material this application will ever have that it did not
 * invent.
 *
 * \`direction\` is reported BY THE MODEL rather than asserted by the caller. A
 * learner types a Catalan sentence or a French one; which way round it is, is
 * evident from the question, and making them declare it was an interface asking
 * for something it could already see.
 */
export const DECOMPOSITION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'decomposition',
    'direction',
    'answer',
    'answer_ca',
    'answer_fr',
    'answer_lang',
  ],
  properties: {
    decomposition: { type: 'array', items: COMPONENT_ENTRY_SCHEMA },
    direction: { type: 'string', enum: ${literalArray(DIRECTIONS)} },
    answer: { type: 'string', minLength: 1 },
    answer_ca: { type: 'string', minLength: 1 },
    answer_fr: { type: 'string', minLength: 1 },
    answer_lang: { type: 'string', enum: ['fr'] },
  },
} as const;

/**
 * A logged query: the decomposition payload plus the interaction-model triple.
 *
 * \`rating\` is required exactly when \`evidence\` is the one type that
 * EVIDENCE_EFFECTS marks as requiring one, and forbidden otherwise. The
 * conditional is generated from that table rather than written by hand.
 *
 * \`answer_fr\` is REQUIRED of the model and OPTIONAL on the logged record. A
 * review item is built from the taxonomy, which holds no French translation of
 * any example, so a review record has no pair to carry and supplying the gloss
 * instead would put a rule description into a translation corpus. Phase 9 reads
 * that corpus, so a row either carries a real pair or carries none.
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
    'answer_ca',
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
    answer_ca: DECOMPOSITION_SCHEMA.properties.answer_ca,
    answer_fr: DECOMPOSITION_SCHEMA.properties.answer_fr,
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
  const fragments = readFragments();
  const taxonomy = mergeFragments(fragments);

  writeFileSync(TAXONOMY_PATH, await renderTaxonomy(taxonomy), 'utf8');
  writeFileSync(OUTPUT_PATH, await renderSchemaModule(taxonomy), 'utf8');

  const leaves = taxonomy.nodes.filter(isLeaf).length;
  console.log(
    `gen-schema: merged ${fragments.length} fragment(s) into ` +
      `${taxonomy.nodes.length} nodes, and wrote src/api/schema.ts with ` +
      `${leaves} component IDs.`,
  );
}

// Only run when invoked as a script. Importing this module from the test must
// not write to the repo, or the test would be asserting against its own output.
const invokedDirectly =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) await main();
