import AjvModule from 'ajv';
import { describe, expect, it } from 'vitest';
import { renderSchemaModule } from '../scripts/gen-schema';
import { toStructuredOutputSchema } from '../src/api/anthropic';
import {
  ASSUMPTIONS,
  CHUNK_ROLES,
  MAX_IDS_PER_CHUNK,
  NOT_APPLICABLE_REASONS,
  PERSONS,
  UNLINKED_REASONS,
  VARIANT_STATUSES,
} from '../src/api/phrase';
import { promptHash } from '../src/api/prompt';
import {
  CHUNK_SCHEMA,
  LEAF_IDS,
  PHRASE_SCHEMA,
  QUERY_LOG_SCHEMA,
  VARIANT_SCHEMA,
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

  it('constrains the logged decomposition entry ID to that enum', () => {
    expect(QUERY_LOG_SCHEMA.properties.decomposition.items.properties.id.enum).toEqual(
      LEAF_IDS,
    );
  });
});

describe('the vanilla reply schema is gone', () => {
  it('emits no decomposition or component-entry schema', async () => {
    // Removed in phase 1 step 3. The phrase reply is the only model output.
    const schema: Record<string, unknown> = await import('../src/api/schema');
    expect(schema['DECOMPOSITION_SCHEMA']).toBeUndefined();
    expect(schema['COMPONENT_ENTRY_SCHEMA']).toBeUndefined();
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

describe('the generated variant schema', () => {
  const validateVariant = new Ajv({ allErrors: true, strict: true }).compile(
    VARIANT_SCHEMA,
  );

  it('draws status and reason from src/api/phrase.ts', () => {
    expect(VARIANT_SCHEMA.properties.status.enum).toEqual(VARIANT_STATUSES);
    expect(VARIANT_SCHEMA.properties.reason.enum).toEqual(NOT_APPLICABLE_REASONS);
  });

  it('reuses the phase 1 fields themselves rather than a copy', () => {
    expect(VARIANT_SCHEMA.properties.chunks).toBe(PHRASE_SCHEMA.properties.chunks);
    expect(VARIANT_SCHEMA.properties.subject).toBe(PHRASE_SCHEMA.properties.subject);
    expect(VARIANT_SCHEMA.properties.assumptions).toBe(
      PHRASE_SCHEMA.properties.assumptions,
    );
    expect(VARIANT_SCHEMA.properties.ca).toBe(PHRASE_SCHEMA.properties.ca);
    expect(VARIANT_SCHEMA.properties.fr).toBe(PHRASE_SCHEMA.properties.fr);
  });

  it('has fr as its single French field and no prose field', () => {
    expect(Object.keys(VARIANT_SCHEMA.properties).sort()).toEqual([
      'assumptions',
      'ca',
      'chunks',
      'fr',
      'reason',
      'status',
      'subject',
    ]);
    expect(VARIANT_SCHEMA.additionalProperties).toBe(false);
  });

  it('requires only status, because decoding has no conditional', () => {
    expect([...VARIANT_SCHEMA.required]).toEqual(['status']);
  });

  it('accepts both shapes and rejects an invented reason or an explanation', () => {
    const ok = { ...SPEC_REPLY, status: 'ok' };
    expect(validateVariant(ok), JSON.stringify(validateVariant.errors)).toBe(true);
    expect(validateVariant({ status: 'not_applicable', reason: 'other' })).toBe(true);
    expect(validateVariant({ status: 'not_applicable', reason: 'too_hard' })).toBe(
      false,
    );
    expect(validateVariant({ ...ok, explanation: 'Parce que.' })).toBe(false);
  });

  it('survives the request stripper with its enums intact', () => {
    const sent = toStructuredOutputSchema(VARIANT_SCHEMA) as typeof VARIANT_SCHEMA;
    expect(sent.properties.reason.enum).toEqual(NOT_APPLICABLE_REASONS);
    expect(sent.properties.chunks.items.properties.ids.items.enum).toEqual(LEAF_IDS);
  });
});

describe('the phase 1 prompt is unchanged by phase 2', () => {
  it('still hashes to the value the Opus recordings were made under', async () => {
    // Adding the variant schema must not touch the phase 1 prefix or reply
    // schema (decided 29 Oct, F2): a new hash would make every phase 1
    // recording stale and \`npm run eval\` fail.
    const recording = JSON.parse(
      readRepoFile('test/fixtures/golden-v2/recordings/claude-opus-5-5/run-1.json'),
    ) as { promptHash: string };
    expect(await promptHash()).toBe(recording.promptHash);
  });
});
