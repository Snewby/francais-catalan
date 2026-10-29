import { describe, it, expect } from 'vitest';
import { fr, quote } from '../src/i18n/fr';
import {
  INITIAL_DIFFICULTY,
  UngradedEvidenceError,
  assertAdvancesFsrs,
} from '../src/srs/fsrs';
import {
  EVIDENCE_EFFECTS,
  EVIDENCE_TYPES,
  INTENTS,
  INTENT_AVAILABILITY,
  advancesFsrs,
  ratingIsConsistent,
} from '../src/srs/evidence';
import { buildHeaders, buildRequestBody } from '../src/api/anthropic';
import * as generatedSchema from '../src/api/schema';

import { highPunctuationOffenders, NNBSP } from './helpers/typography';

/** Every leaf string in the table, flattened. */
function allStrings(): string[] {
  return Object.values(fr).flatMap((group) => Object.values(group));
}

describe('scaffold', () => {
  it('exposes fake-indexeddb to the test environment', () => {
    expect(typeof indexedDB).toBe('object');
  });

  it('keeps UI copy in French', () => {
    expect(fr.app.title).toBe('Entraîneur de grammaire catalane');
  });
});

describe('French typography', () => {
  it('puts a narrow no-break space before : ; ! ?', () => {
    // Was `not.toMatch(/ [:;!?]/)`, which rejects an ordinary space but accepts
    // punctuation written with no space at all. Asserted positively now, from
    // the same helper the taxonomy prose uses, so UI copy and node prose cannot
    // drift apart on a rule they share.
    for (const value of allStrings()) {
      expect(
        highPunctuationOffenders(value),
        `punctuation spacing in: ${value}`,
      ).toEqual([]);
    }
    // Positive control. The loop above is satisfied vacuously by a table with
    // no colons in it.
    expect(fr.apiKey.prompt).toContain(`${NNBSP}:`);
  });

  it('uses no em-dashes anywhere', () => {
    for (const value of allStrings()) {
      expect(value, `em-dash in: ${value}`).not.toContain('—');
    }
  });

  it('quotes with guillemets and inner narrow no-break spaces', () => {
    expect(quote('vaig cantar')).toBe(`«${NNBSP}vaig cantar${NNBSP}»`);
    for (const value of allStrings()) {
      expect(value, `straight double quote in: ${value}`).not.toContain('"');
      expect(value, `guillemet spacing in: ${value}`).not.toMatch(
        /«(?!\u202f)|(?<!\u202f)»/u,
      );
    }
    // Positive control: the table does quote with guillemets somewhere.
    expect(allStrings().some((value) => value.includes('«'))).toBe(true);
  });

  it('uses the typographic apostrophe in French prose', () => {
    expect(fr.apiKey.missing).toContain('’');
    for (const value of allStrings()) {
      expect(value, `straight apostrophe in French copy: ${value}`).not.toContain("'");
    }
  });
});

describe('contrast status to initial difficulty', () => {
  it('starts only transfer nodes easy', () => {
    expect(INITIAL_DIFFICULTY.transfer).toBe('low');
    expect(INITIAL_DIFFICULTY['near-miss']).toBe('high');
    expect(INITIAL_DIFFICULTY['false-friend']).toBe('high');
    expect(INITIAL_DIFFICULTY.novel).toBe('high');
  });
});

describe('evidence routing: exposure is not mastery', () => {
  it('never advances FSRS from a lookup', () => {
    expect(EVIDENCE_EFFECTS.lookup.fsrs).toBe(false);
    expect(EVIDENCE_EFFECTS.lookup.elo).toBe(false);
    expect(EVIDENCE_EFFECTS.lookup.exposure).toBe(true);
    expect(advancesFsrs('lookup')).toBe(false);
    expect(() => assertAdvancesFsrs('lookup')).toThrow(UngradedEvidenceError);
  });

  it('moves Elo but not FSRS on an ungraded recall attempt', () => {
    expect(EVIDENCE_EFFECTS.recall.exposure).toBe(true);
    expect(EVIDENCE_EFFECTS.recall.elo).toBe(true);
    expect(EVIDENCE_EFFECTS.recall.fsrs).toBe(false);
    expect(() => assertAdvancesFsrs('recall')).toThrow(UngradedEvidenceError);
  });

  it('moves everything on graded evidence', () => {
    expect(EVIDENCE_EFFECTS.graded.exposure).toBe(true);
    expect(EVIDENCE_EFFECTS.graded.elo).toBe(true);
    expect(EVIDENCE_EFFECTS.graded.fsrs).toBe(true);
    expect(() => assertAdvancesFsrs('graded')).not.toThrow();
  });

  it('requires a rating exactly when the evidence type is graded', () => {
    expect(ratingIsConsistent('graded', 'good')).toBe(true);
    expect(ratingIsConsistent('graded', undefined)).toBe(false);
    expect(ratingIsConsistent('lookup', 'good')).toBe(false);
    expect(ratingIsConsistent('recall', undefined)).toBe(true);
  });

  it('makes graded the only FSRS-advancing evidence type', () => {
    const advancing = EVIDENCE_TYPES.filter(advancesFsrs);
    expect(advancing).toEqual(['graded']);
  });

  it('names a producer for every evidence type', () => {
    // Guards against an enum value nothing writes, which gets misused.
    for (const evidence of EVIDENCE_TYPES) {
      expect(EVIDENCE_EFFECTS[evidence].producer.length).toBeGreaterThan(20);
    }
  });

  it('marks every intent as either MVP or a later phase', () => {
    for (const intent of INTENTS) {
      expect(INTENT_AVAILABILITY[intent].phase).not.toBe('');
    }
    const mvp = INTENTS.filter((i) => INTENT_AVAILABILITY[i].mvp);
    expect(mvp).toEqual(['comprehend', 'produce']);
  });
});

describe('api client', () => {
  it('sends the direct browser access header', () => {
    const headers = buildHeaders('test-key');
    expect(headers['anthropic-dangerous-direct-browser-access']).toBe('true');
    expect(headers['x-api-key']).toBe('test-key');
    expect(headers['anthropic-version']).toBe('2023-06-01');
  });

  it('asks the model for the phrase reply and nothing else', () => {
    const body = buildRequestBody('Je ne le fais plus.') as {
      output_config: { format: { schema: { properties: Record<string, unknown> } } };
    };
    expect(Object.keys(body.output_config.format.schema.properties)).toEqual([
      'fr',
      'ca',
      'subject',
      'assumptions',
      'chunks',
    ]);
  });

  it('no longer exports the vanilla decomposition and answer schema', () => {
    expect(Object.keys(generatedSchema)).not.toContain('DECOMPOSITION_SCHEMA');
    expect(Object.keys(generatedSchema)).not.toContain('COMPONENT_ENTRY_SCHEMA');
  });
});
