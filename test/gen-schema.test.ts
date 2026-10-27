import AjvModule from 'ajv';
import { describe, expect, it } from 'vitest';
import { renderSchemaModule } from '../scripts/gen-schema';
import { toStructuredOutputSchema } from '../src/api/anthropic';
import {
  ASSUMPTIONS,
  CHUNK_ROLES,
  MAX_IDS_PER_CHUNK,
  PERSONS,
  UNLINKED_REASONS,
} from '../src/api/phrase';
import {
  CHUNK_SCHEMA,
  COMPONENT_ENTRY_SCHEMA,
  DECOMPOSITION_SCHEMA,
  LEAF_IDS,
  PHRASE_SCHEMA,
  QUERY_LOG_SCHEMA,
} from '../src/api/schema';
import { LEAVES } from '../src/taxonomy';
import {
  DIRECTIONS,
  EVIDENCE_TYPES,
  INTENTS,
  RATINGS,
  EVIDENCE_EFFECTS,
} from '../src/srs/evidence';
import { GENERATED_SCHEMA_PATH, readRepoFile } from './helpers/taxonomy';

describe('gen-schema output matches the committed schema', () => {
  it('regenerates src/api/schema.ts byte for byte', async () => {
    // Drift here means the committed enums no longer describe the taxonomy the
    // model is constrained by, which is invisible until a decode fails.
    const regenerated = await renderSchemaModule();
    expect(regenerated).toBe(readRepoFile(GENERATED_SCHEMA_PATH));
  });

  it('carries the do-not-edit banner', () => {
    expect(readRepoFile(GENERATED_SCHEMA_PATH)).toContain('DO NOT EDIT BY HAND');
  });
});

describe('the generated component enum', () => {
  it('lists exactly the taxonomy leaves, in taxonomy order', () => {
    expect([...LEAF_IDS]).toEqual(LEAVES.map((leaf) => leaf.id));
  });

  it('constrains the component entry ID to that enum', () => {
    expect(COMPONENT_ENTRY_SCHEMA.properties.id.enum).toEqual(LEAF_IDS);
  });

  it('accepts an optional language-invariant ipa on a component entry', () => {
    expect(COMPONENT_ENTRY_SCHEMA.properties.ipa.type).toBe('string');
    expect([...COMPONENT_ENTRY_SCHEMA.required]).toEqual(['id', 'ca']);
  });

  it('admits no extra properties on a component entry', () => {
    expect(COMPONENT_ENTRY_SCHEMA.additionalProperties).toBe(false);
  });
});

describe('the decomposition payload is language-invariant', () => {
  it('holds component IDs and Catalan forms only', () => {
    const entry = DECOMPOSITION_SCHEMA.properties.decomposition.items.properties;
    expect(Object.keys(entry).sort()).toEqual(['ca', 'id', 'ipa']);
  });

  it('keeps French to the answer field alone', () => {
    expect(DECOMPOSITION_SCHEMA.properties.answer_lang.enum).toEqual(['fr']);
  });
});

describe('the logged-query schema', () => {
  it('draws intent, direction and evidence from src/srs/evidence.ts', () => {
    expect(QUERY_LOG_SCHEMA.properties.intent.enum).toEqual(INTENTS);
    expect(QUERY_LOG_SCHEMA.properties.direction.enum).toEqual(DIRECTIONS);
    expect(QUERY_LOG_SCHEMA.properties.evidence.enum).toEqual(EVIDENCE_TYPES);
    expect(QUERY_LOG_SCHEMA.properties.rating.enum).toEqual(RATINGS);
  });

  it('accepts all five intents from phase 1, not just the two the MVP ships', () => {
    // Retrofitting intent across a live query log is unrecoverable, so the
    // schema has to be wide before the UI is.
    expect(QUERY_LOG_SCHEMA.properties.intent.enum).toHaveLength(5);
  });

  it('requires intent, direction and evidence on every logged query', () => {
    for (const field of ['intent', 'direction', 'evidence']) {
      expect([...QUERY_LOG_SCHEMA.required]).toContain(field);
    }
  });

  it('never requires rating unconditionally', () => {
    expect([...QUERY_LOG_SCHEMA.required]).not.toContain('rating');
  });

  it('emits the same decomposition payload whatever the intent', () => {
    // All five intents differ in prompt and surrounding fields only.
    expect(QUERY_LOG_SCHEMA.properties.decomposition).toEqual(
      DECOMPOSITION_SCHEMA.properties.decomposition,
    );
  });
});

describe('the logged-query schema validates rating against evidence', () => {
  it('ties the conditional to EVIDENCE_EFFECTS.requiresRating', async () => {
    const { validateQueryLog } = await import('../src/api/validate');
    const base = {
      asked_at: 1_700_000_000_000,
      question: 'Que vol dir « vaig cantar »',
      intent: 'comprehend' as const,
      direction: 'ca_to_fr' as const,
      decomposition: [{ id: 'VERB.ind.passat_perifrastic', ca: 'vaig cantar' }],
      answer: 'Il s’agit du passé périphrastique.',
      answer_ca: 'Vaig cantar.',
      answer_lang: 'fr' as const,
    };

    for (const evidence of EVIDENCE_TYPES) {
      const requires = EVIDENCE_EFFECTS[evidence].requiresRating;
      expect(
        validateQueryLog({ ...base, evidence }).valid,
        `${evidence} without rating`,
      ).toBe(!requires);
      expect(
        validateQueryLog({ ...base, evidence, rating: 'good' }).valid,
        `${evidence} with rating`,
      ).toBe(requires);
    }
  });

  it('rejects an out-of-vocabulary component ID at decode time', async () => {
    const { validateQueryLog } = await import('../src/api/validate');
    const invented = ['VERB', 'ind', 'plusquamperfet_inventat'].join('.');
    const result = validateQueryLog({
      asked_at: 1_700_000_000_000,
      question: 'Test',
      intent: 'comprehend',
      direction: 'ca_to_fr',
      evidence: 'lookup',
      decomposition: [{ id: invented, ca: 'inventat' }],
      answer: 'Réponse.',
      answer_lang: 'fr',
    });
    expect(result.valid).toBe(false);
  });
});

// ajv v8 is CommonJS; see src/api/validate.ts for why both shapes are handled.
const Ajv =
  (AjvModule as unknown as { default?: typeof AjvModule }).default ?? AjvModule;

/** The spec's worked example, « Phase 1: model response schema ». */
const SPEC_REPLY = {
  fr: 'Hier, j’ai acheté le pain au marché.',
  ca: 'Ahir vaig comprar el pa al mercat.',
  subject: { person: '1sg', expressed: false },
  assumptions: [],
  chunks: [
    { text: 'Ahir', role: 'time', ids: [], unlinked: 'no_notion' },
    {
      text: 'vaig comprar',
      role: 'verb',
      ids: ['VERB.ind.passat_perifrastic'],
      lemma: 'comprar',
    },
    { text: 'el pa', role: 'object_direct', ids: ['ART.def.forma.paradigma'] },
    { text: 'al mercat', role: 'place', ids: ['ART.contract.a_de'] },
  ],
};

describe('the generated phrase schema', () => {
  // Strict mode, so a misspelt keyword in the generator fails here rather than
  // being silently ignored by the validator that guards every reply.
  const validatePhrase = new Ajv({ allErrors: true, strict: true }).compile(
    PHRASE_SCHEMA,
  );

  it('draws its closed enums from src/api/phrase.ts', () => {
    expect(PHRASE_SCHEMA.properties.subject.properties.person.enum).toEqual(PERSONS);
    expect(PHRASE_SCHEMA.properties.assumptions.items.enum).toEqual(ASSUMPTIONS);
    expect(CHUNK_SCHEMA.properties.role.enum).toEqual(CHUNK_ROLES);
    expect(CHUNK_SCHEMA.properties.unlinked.enum).toEqual(UNLINKED_REASONS);
  });

  it('constrains chunk IDs to the generated component enum, at most three', () => {
    expect(CHUNK_SCHEMA.properties.ids.items.enum).toEqual(LEAF_IDS);
    expect(CHUNK_SCHEMA.properties.ids.maxItems).toBe(MAX_IDS_PER_CHUNK);
  });

  it('keeps chunks language-invariant: text, enums and IDs only', () => {
    expect(Object.keys(CHUNK_SCHEMA.properties).sort()).toEqual([
      'ids',
      'lemma',
      'role',
      'text',
      'unlinked',
    ]);
    expect(PHRASE_SCHEMA.properties.chunks.items).toBe(CHUNK_SCHEMA);
  });

  it('has fr as its single French field and no explanation field', () => {
    expect(Object.keys(PHRASE_SCHEMA.properties).sort()).toEqual([
      'assumptions',
      'ca',
      'chunks',
      'fr',
      'subject',
    ]);
  });

  it('carries no offsets, because spans are derived from the text', () => {
    const serialised = JSON.stringify(PHRASE_SCHEMA);
    expect(serialised).not.toMatch(/"(start|end|offset)"/);
  });

  it('admits no extra properties at any level', () => {
    expect(PHRASE_SCHEMA.additionalProperties).toBe(false);
    expect(PHRASE_SCHEMA.properties.subject.additionalProperties).toBe(false);
    expect(CHUNK_SCHEMA.additionalProperties).toBe(false);
  });

  it('leaves only unlinked and lemma optional on a chunk', () => {
    expect([...CHUNK_SCHEMA.required].sort()).toEqual(['ids', 'role', 'text']);
  });

  it('accepts the worked example from the spec', () => {
    expect(validatePhrase(SPEC_REPLY), JSON.stringify(validatePhrase.errors)).toBe(
      true,
    );
  });

  it('rejects an out-of-vocabulary ID, a fourth ID, an extra field and an empty ca', () => {
    const invented = ['VERB', 'ind', 'plusquamperfet_inventat'].join('.');
    const [first, ...rest] = SPEC_REPLY.chunks;
    const withChunk = (chunk: object) => ({ ...SPEC_REPLY, chunks: [chunk, ...rest] });

    expect(validatePhrase(withChunk({ ...first, ids: [invented] }))).toBe(false);
    expect(
      validatePhrase(
        withChunk({
          ...first,
          ids: [
            'VERB.ind.passat_perifrastic',
            'VERB.conj.1',
            'VERB.ind.present',
            'VERB.perf.present',
          ],
        }),
      ),
    ).toBe(false);
    expect(validatePhrase(withChunk({ ...first, gloss: 'Le temps.' }))).toBe(false);
    expect(validatePhrase({ ...SPEC_REPLY, answer: 'Explication.' })).toBe(false);
    expect(validatePhrase({ ...SPEC_REPLY, ca: '' })).toBe(false);
  });

  it('survives the request stripper with its enums intact', () => {
    // The decoder is sent the stripped copy, so the closed vocabulary has to be
    // there after stripping, not only in the copy Ajv sees.
    const sent = toStructuredOutputSchema(PHRASE_SCHEMA) as typeof PHRASE_SCHEMA;
    expect(JSON.stringify(sent)).not.toMatch(/"(minLength|maxItems|minItems)"/);
    expect(sent.properties.chunks.items.properties.ids.items.enum).toEqual(LEAF_IDS);
    expect(sent.properties.chunks.items.properties.role.enum).toEqual(CHUNK_ROLES);
  });
});
