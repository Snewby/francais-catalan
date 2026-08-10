import { describe, expect, it } from 'vitest';

import { unrealisedForms } from '../src/text/realised';

/**
 * The cases are the live replies that motivated the check, quoted verbatim.
 *
 * Ten questions were asked against the amended prompt and seven decomposition
 * forms across four replies named Catalan that the reply's own `answer_ca` did
 * not contain. Each of those forms would otherwise have incremented the
 * exposure counter of a component the learner never met.
 */
describe('a form the sentence does not contain', () => {
  it('accepts a decomposition wholly anchored in the sentence', () => {
    expect(
      unrealisedForms(
        ['Barcelona', 'és', 'una', 'ciutat', 'molt', 'gran'],
        'Barcelona és una ciutat molt gran.',
      ),
    ).toEqual([]);
  });

  it('catches forms the reply named and then did not use', () => {
    // The reply argued that `tenir` is right and `haver tingut` wrong, and then
    // keyed both of the words it had just rejected.
    expect(
      unrealisedForms(
        ['una col·lecció', 'col·lecció', 'timbres', 'he', 'tingut'],
        'tinc una col·lecció de timbres',
      ),
    ).toEqual(['he', 'tingut']);
  });

  it('catches a subject pronoun the answer left out', () => {
    expect(unrealisedForms(['cal que', 'jo', 'marxi'], 'cal que marxi demà')).toEqual([
      'jo',
    ]);
  });

  it('catches a decomposition of the French rather than of the Catalan', () => {
    expect(
      unrealisedForms(
        ['del meu germà', 'cotxe', 'més', 'ràpida', 'la meva'],
        'el cotxe del meu germà és més ràpid que el meu',
      ),
    ).toEqual(['ràpida', 'la meva']);
  });

  it('catches prose smuggled into a Catalan form field', () => {
    expect(
      unrealisedForms(
        ['(la notícia - sense pronom antepòsit)'],
        'Fent el sopar, vaig sentir la notícia.',
      ),
    ).toHaveLength(1);
  });
});

describe('what the check must not do', () => {
  it('matches whole words, not substrings', () => {
    // A live reply mangled the enclitic `-nos` to `ns`, which "occurs" inside
    // `sense`. Substring matching passes it for the wrong reason.
    expect(unrealisedForms(['ns'], "Se'n va anar sense dir-nos res")).toEqual(['ns']);
    expect(unrealisedForms(['nos'], "Se'n va anar sense dir-nos res")).toEqual([]);
  });

  it('treats an enclitic pronoun as its own word', () => {
    expect(unrealisedForms(['dir'], "Se'n va anar sense dir-nos res")).toEqual([]);
  });

  it('accepts a discontinuous frame when both halves are present', () => {
    expect(
      unrealisedForms(
        ['més ... que'],
        'el cotxe del meu germà és més ràpid que el meu',
      ),
    ).toEqual([]);
  });

  it('ignores case, sentence punctuation and the two apostrophes', () => {
    expect(unrealisedForms(['se’n', 'Res'], "Se'n va anar sense dir-nos res.")).toEqual(
      [],
    );
  });

  it('keeps the interpunct significant', () => {
    // PHON.grafia keys `l·l` against `ll` deliberately, so a form spelled
    // without it is a different form and not a near miss.
    expect(unrealisedForms(['col·lecció'], 'tinc una col·lecció de segells')).toEqual(
      [],
    );
    expect(unrealisedForms(['colleccio'], 'tinc una col·lecció de segells')).toEqual([
      'colleccio',
    ]);
  });

  it('refuses a form that folds away to nothing', () => {
    expect(unrealisedForms(['...'], 'Barcelona és una ciutat')).toEqual(['...']);
  });
});
