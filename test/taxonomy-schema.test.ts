import { describe, expect, it } from 'vitest';
import AjvModule from 'ajv';
import type { ErrorObject, ValidateFunction } from 'ajv';
import { TAXONOMY_PATH, TAXONOMY_SCHEMA_PATH, readRepoJson } from './helpers/taxonomy';

// ajv v8 ships CommonJS, so the ESM default export is the module namespace in
// some bundler configurations and the class itself in others. Normalising here
// keeps the test from breaking on an unrelated toolchain change.
const Ajv =
  (AjvModule as unknown as { default?: typeof AjvModule }).default ?? AjvModule;

const schema = readRepoJson<Record<string, unknown>>(TAXONOMY_SCHEMA_PATH);
const taxonomy = readRepoJson<Record<string, unknown>>(TAXONOMY_PATH);

function compile(): ValidateFunction {
  // strict is off because the schema carries $comment annotations explaining
  // the invariants, which ajv's strict mode reports as unknown keywords.
  const ajv = new Ajv({ allErrors: true, strict: false });
  return ajv.compile(schema);
}

function explain(errors: ErrorObject[] | null | undefined): string {
  return (errors ?? [])
    .map((error) => `${error.instancePath || '/'} ${error.message ?? ''}`)
    .join('\n');
}

/** A structurally valid leaf, used as the base for the negative cases below. */
function sampleLeaf(): Record<string, unknown> {
  return {
    id: 'VERB.ind.imperfet',
    kind: 'leaf',
    parent: 'VERB.ind',
    ca: 'cantava',
    glosses: { fr: 'l’imparfait de l’indicatif' },
    cefr: 'A2',
    examples: ['Quan era petit, cantava cada dia.'],
    contrast_fr: {
      status: 'transfer',
      note: 'Même valeur aspectuelle qu’en français.',
    },
    state: {
      exposure: { exposure_count: 0 },
      mastery: { stability: null, difficulty: null, graded_review_count: 0 },
    },
  };
}

/** Wrap a single node in an otherwise valid document. */
function documentWith(node: Record<string, unknown>): Record<string, unknown> {
  return {
    version: 1,
    nodes: [
      { id: 'VERB', kind: 'branch', parent: null, label_fr: 'Le verbe' },
      { id: 'VERB.ind', kind: 'branch', parent: 'VERB', label_fr: 'L’indicatif' },
      node,
    ],
  };
}

describe('taxonomy.schema.json', () => {
  it('compiles', () => {
    expect(() => compile()).not.toThrow();
  });

  it('accepts the committed taxonomy', () => {
    const validate = compile();
    const valid = validate(taxonomy);
    expect(explain(validate.errors)).toBe('');
    expect(valid).toBe(true);
  });

  it('accepts a well-formed leaf', () => {
    const validate = compile();
    expect(validate(documentWith(sampleLeaf()))).toBe(true);
  });

  it('rejects a flat gloss string instead of the keyed map', () => {
    // The keyed map is the invariant that is expensive to retrofit, so the
    // schema has to reject the flat form rather than merely discouraging it.
    const validate = compile();
    const leaf = { ...sampleLeaf(), glosses: 'l’imparfait' };
    expect(validate(documentWith(leaf))).toBe(false);
  });

  it('rejects a leaf with no French gloss', () => {
    const validate = compile();
    const leaf = { ...sampleLeaf(), glosses: { ca: 'imperfet' } };
    expect(validate(documentWith(leaf))).toBe(false);
  });

  it('rejects an empty French gloss', () => {
    const validate = compile();
    const leaf = { ...sampleLeaf(), glosses: { fr: '' } };
    expect(validate(documentWith(leaf))).toBe(false);
  });

  it('rejects a leaf with no contrast_fr', () => {
    const validate = compile();
    const leaf = sampleLeaf();
    delete leaf.contrast_fr;
    expect(validate(documentWith(leaf))).toBe(false);
  });

  it('rejects a contrast status outside the four allowed values', () => {
    const validate = compile();
    const leaf = {
      ...sampleLeaf(),
      contrast_fr: { status: 'tricky', note: 'Une note.' },
    };
    expect(validate(documentWith(leaf))).toBe(false);
  });

  it('rejects an ID outside the closed domain vocabulary', () => {
    const validate = compile();
    const leaf = { ...sampleLeaf(), id: 'MORPH.ind.imperfet' };
    expect(validate(documentWith(leaf))).toBe(false);
  });

  it('rejects an ID segment that is not lower-case snake_case ASCII', () => {
    const validate = compile();
    // Assembled from parts rather than written out, because a literal
    // malformed ID here is close enough to a real one that the
    // closed-vocabulary scan would pick up its valid prefix and fail.
    const malformed = ['VERB', 'Ind', 'imperfet'].join('.');
    const hyphenated = ['VERB', 'ind', 'passat-perifrastic'].join('.');
    const accented = ['VERB', 'ind', 'imperfèt'].join('.');
    for (const id of [malformed, hyphenated, accented]) {
      expect(validate(documentWith({ ...sampleLeaf(), id })), id).toBe(false);
    }
  });

  it('rejects an unknown property on a leaf', () => {
    const validate = compile();
    const leaf = { ...sampleLeaf(), gloss: 'l’imparfait' };
    expect(validate(documentWith(leaf))).toBe(false);
  });

  it('keeps exposure and mastery in separate objects', () => {
    // A single flat state object is how the two dimensions get conflated, so
    // the schema fixes the split structurally.
    const validate = compile();
    const leaf = {
      ...sampleLeaf(),
      state: {
        exposure_count: 0,
        stability: null,
        difficulty: null,
        graded_review_count: 0,
      },
    };
    expect(validate(documentWith(leaf))).toBe(false);
  });
});
// Uniqueness of IDs and referential integrity of `parent` are not expressible
// in draft-07 without a bespoke keyword; test/closed-vocabulary.test.ts asserts
// both structurally instead.
