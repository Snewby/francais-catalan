import { describe, expect, it } from 'vitest';
import type { PhraseReply } from '../src/api/phrase-check';
import { fr } from '../src/i18n/fr';
import {
  ALLOWED_TENSES,
  TENSES,
  TENSE_ID,
  TOURNURES,
  TOURNURE_ID,
  VARIANT_PERSONS,
} from '../src/variants/axes';
import {
  applyTap,
  buttonState,
  comboKey,
  parseComboKey,
  sameCombination,
  startingState,
  timeWordFor,
  type GreyCause,
} from '../src/variants/combination';
import { SWITCH_NOTES } from '../src/variants/notes';
import { recordedReplies, recordedReply } from './helpers/recorded-replies';

/** A one-verb reply carrying the given IDs, for the tenses no recorded row uses. */
function withVerbIds(ids: string[]): PhraseReply {
  return {
    fr: 'Phrase.',
    ca: 'Frase.',
    subject: { person: '1sg', expressed: false },
    assumptions: [],
    chunks: [
      { text: 'Frase', role: 'verb', ids: ids as PhraseReply['chunks'][0]['ids'] },
    ],
  };
}

describe('the axis tables', () => {
  it('back every tense and tournure button with an approved switch note', () => {
    for (const id of [...Object.values(TENSE_ID), ...Object.values(TOURNURE_ID)]) {
      expect(SWITCH_NOTES[id], id).toBeDefined();
    }
  });

  it('let acabar de take présent and imparfait only, every other tournure all six', () => {
    expect(ALLOWED_TENSES.acabar).toEqual(['present', 'imperfet']);
    for (const tournure of ['none', 'haver', 'estar'] as const) {
      expect(ALLOWED_TENSES[tournure]).toEqual(TENSES);
    }
  });
});

describe('the combination key', () => {
  it('reads person·tense·tournure·pronoun·negation', () => {
    expect(
      comboKey({
        person: 'ella',
        tense: 'avui',
        tournure: 'none',
        pronoun: false,
        negation: false,
      }),
    ).toBe('ella·avui·none·0·0');
  });

  it('round-trips every value, and marks a greyed axis with a dash', () => {
    for (const key of [
      'nosaltres·ahir·haver·1·0',
      'jo·-·none·0·1',
      '-·present·estar·0·0',
    ]) {
      expect(comboKey(parseComboKey(key))).toBe(key);
    }
    expect(() => parseComboKey('jo·hier·none·0·0')).toThrow();
    expect(() => parseComboKey('jo·ahir·none·0')).toThrow();
  });
});

describe('the starting state, from the recorded phase 1 replies', () => {
  it('selects the button for each of the six tenses', () => {
    expect(startingState(recordedReply(6)).combination.tense).toBe('present');
    expect(startingState(recordedReply(1)).combination.tense).toBe('ahir');
    expect(startingState(recordedReply(2)).combination.tense).toBe('avui');
    // No recorded row puts its only verb in these three.
    expect(startingState(withVerbIds(['VERB.ind.imperfet'])).combination.tense).toBe(
      'imperfet',
    );
    expect(startingState(withVerbIds(['VERB.ind.futur'])).combination.tense).toBe(
      'futur',
    );
    expect(startingState(withVerbIds(['VERB.ind.condicional'])).combination.tense).toBe(
      'condicional',
    );
  });

  it('selects the button for each of the three tournures', () => {
    expect(startingState(recordedReply(15)).combination.tournure).toBe('haver');
    expect(startingState(recordedReply(16)).combination.tournure).toBe('acabar');
    expect(startingState(recordedReply(17)).combination.tournure).toBe('estar');
    expect(startingState(recordedReply(1)).combination.tournure).toBe('none');
  });

  it('selects Présent for a tournure with no tense ID (sign-off, 22 Oct)', () => {
    // « Has de venir » and « Està preparant » carry no tense ID in any run.
    for (const run of [1, 2, 3]) {
      expect(startingState(recordedReply(18, run)).combination.tense).toBe('present');
      expect(startingState(recordedReply(17, run)).combination.tense).toBe('present');
    }
  });

  it('greys « Quand ? » and « Tournure » for row 8, an imperative', () => {
    const start = startingState(recordedReply(8));
    expect(start.combination.tense).toBeNull();
    expect(start.greyed.tense).toBe('no_tense');
    expect(start.greyed.tournure).toBe('no_tense');
  });

  it('greys them for row 22, whose two verb chunks name no main verb (F5)', () => {
    const start = startingState(recordedReply(22));
    expect(start.greyed.tense).toBe('no_tense');
    expect(start.greyed.tournure).toBe('no_tense');
    expect(start.greyed.person).toBeUndefined();
    expect(comboKey(start.combination)).toBe('jo·-·none·0·0');
  });

  it('greys them for a verb with no tense ID at all, as D9 says (F4)', () => {
    // « La sopa és freda »: VERB.ser_estar alone, in every run.
    expect(startingState(recordedReply(19)).greyed.tense).toBe('no_tense');
  });

  it('greys the pronoun toggle with no object_direct chunk, and only then', () => {
    expect(startingState(recordedReply(12)).greyed.pronoun).toBe('no_object');
    expect(startingState(recordedReply(1)).greyed.pronoun).toBeUndefined();
  });

  it('starts negation at « Oui » for row 12', () => {
    expect(startingState(recordedReply(12)).combination.negation).toBe(true);
    expect(startingState(recordedReply(1)).combination.negation).toBe(false);
  });

  it('reads the person, ell or ella for 3sg, and greys an impersonal sentence', () => {
    expect(startingState(recordedReply(6)).combination.person).toBe('tu');
    expect(startingState(recordedReply(3)).combination.person).toBe('nosaltres');
    expect(startingState(recordedReply(17)).combination.person).toBe('ell');
    const fem = { ...recordedReply(17), assumptions: ['subject_fem' as const] };
    expect(startingState(fem).combination.person).toBe('ella');
    const impersonal = startingState(recordedReply(10));
    expect(impersonal.combination.person).toBeNull();
    expect(impersonal.greyed.person).toBe('no_subject');
  });

  it('greys negation only when there is no verb chunk', () => {
    const verbless = { ...withVerbIds([]), chunks: [] };
    expect(startingState(verbless).greyed.negation).toBe('no_tense');
    expect(startingState(recordedReply(19)).greyed.negation).toBeUndefined();
  });

  it('derives a state from every recorded reply without throwing', () => {
    for (const reply of recordedReplies().values()) {
      expect(() => comboKey(startingState(reply).combination)).not.toThrow();
    }
  });
});

describe('the combination table on the buttons', () => {
  const start = startingState(recordedReply(16));

  it('greys the four other tenses while acabar de is selected', () => {
    const greyed = TENSES.filter(
      (tense) =>
        buttonState(start, start.combination, 'tense', tense).kind === 'greyed',
    );
    expect(greyed).toEqual(['ahir', 'avui', 'futur', 'condicional']);
    expect(buttonState(start, start.combination, 'tense', 'ahir')).toEqual({
      kind: 'greyed',
      cause: 'acabar_tense',
    });
  });

  it('greys acabar de while one of those tenses is selected', () => {
    const ahir = startingState(recordedReply(1));
    expect(buttonState(ahir, ahir.combination, 'tournure', 'acabar')).toEqual({
      kind: 'greyed',
      cause: 'acabar_tense',
    });
    expect(buttonState(ahir, ahir.combination, 'tournure', 'haver').kind).toBe(
      'available',
    );
  });

  it('marks the current value selected and greys every button on a greyed axis', () => {
    const row1 = startingState(recordedReply(1));
    expect(buttonState(row1, row1.combination, 'person', 'jo').kind).toBe('selected');
    expect(buttonState(row1, row1.combination, 'person', 'ella').kind).toBe(
      'available',
    );
    const row8 = startingState(recordedReply(8));
    for (const tense of TENSES) {
      expect(buttonState(row8, row8.combination, 'tense', tense).kind).toBe('greyed');
    }
    for (const tournure of TOURNURES) {
      expect(buttonState(row8, row8.combination, 'tournure', tournure).kind).toBe(
        'greyed',
      );
    }
  });
});

describe('a tap', () => {
  const original = startingState(recordedReply(1)).combination;

  it('changes one value and keeps the rest', () => {
    expect(comboKey(applyTap(original, 'person', 'ella'))).toBe('ella·ahir·none·0·0');
  });

  it('reaches the same combination by two paths', () => {
    const viaPerson = applyTap(applyTap(original, 'person', 'ella'), 'tense', 'avui');
    const viaTense = applyTap(applyTap(original, 'tense', 'avui'), 'person', 'ella');
    expect(sameCombination(viaPerson, viaTense)).toBe(true);
  });

  it('can come back to the original combination', () => {
    const back = applyTap(applyTap(original, 'person', 'tu'), 'person', 'jo');
    expect(sameCombination(back, original)).toBe(true);
  });

  it('offers every person on the panel', () => {
    expect(VARIANT_PERSONS).toHaveLength(7);
  });
});

describe('the time word', () => {
  const row1 = startingState(recordedReply(1)).combination;

  it('sends the table word when the tense changes', () => {
    const original = { combination: row1, hasTimeChunk: true };
    expect(timeWordFor(original, { ...row1, tense: 'avui' })).toBe('Avui');
    expect(timeWordFor(original, { ...row1, tense: 'imperfet' })).toBe('Abans');
    expect(timeWordFor(original, { ...row1, tense: 'futur' })).toBe('Demà');
    expect(timeWordFor(original, { ...row1, tense: 'present' })).toBe('drop');
    expect(timeWordFor(original, { ...row1, tense: 'condicional' })).toBe('drop');
  });

  it('sends none when the tense stays the original one', () => {
    const row6 = startingState(recordedReply(6)).combination;
    expect(
      timeWordFor({ combination: row6, hasTimeChunk: true }, { ...row6, person: 'jo' }),
    ).toBeUndefined();
  });

  it('gives a base with no time chunk none, whatever the tense', () => {
    const row9 = startingState(recordedReply(9)).combination;
    expect(
      timeWordFor(
        { combination: row9, hasTimeChunk: false },
        { ...row9, tense: 'ahir' },
      ),
    ).toBeUndefined();
  });
});

describe('the reason copy', () => {
  it('has French text for every cause the panel derives', () => {
    const causes: GreyCause[] = ['no_subject', 'no_tense', 'no_object', 'acabar_tense'];
    for (const cause of causes) {
      expect(fr.variantReasons[cause].trim(), cause).not.toBe('');
    }
  });
});
