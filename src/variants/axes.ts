/**
 * The variation axes and the fixed tables that govern them.
 *
 * THIS FILE IS AUTHORITATIVE for the axis values, the taxonomy ID behind each
 * tense and tournure button, the combination table and the time-word table
 * (phase 2 spec, « Starting state », « Combination table », « Time-word
 * table »; decisions D3 and D4, 22 Oct). The request, the validator, the eval
 * and the panel all read them from here. Values are identifiers, not copy: the
 * Catalan person labels are Catalan forms, and the French tense labels live in
 * fr.ts.
 */
import type { Person } from '../api/phrase';
import type { ComponentId } from '../api/schema';

/** « Qui ? », in panel order. */
export type VariantPerson =
  'jo' | 'tu' | 'ell' | 'ella' | 'nosaltres' | 'vosaltres' | 'ells';

/** « Quand ? », in panel order. */
export type Tense = 'present' | 'ahir' | 'avui' | 'imperfet' | 'futur' | 'condicional';

/** « Tournure », in panel order; `none` is « Aucune ». */
export type Tournure = 'none' | 'haver' | 'acabar' | 'estar';

export const VARIANT_PERSONS: readonly VariantPerson[] = [
  'jo',
  'tu',
  'ell',
  'ella',
  'nosaltres',
  'vosaltres',
  'ells',
];

export const TENSES: readonly Tense[] = [
  'present',
  'ahir',
  'avui',
  'imperfet',
  'futur',
  'condicional',
];

export const TOURNURES: readonly Tournure[] = ['none', 'haver', 'acabar', 'estar'];

/** The phase 1 reply's grammatical person for each button; ell and ella share 3sg. */
export const PERSON_OF: Readonly<Record<VariantPerson, Exclude<Person, 'none'>>> = {
  jo: '1sg',
  tu: '2sg',
  ell: '3sg',
  ella: '3sg',
  nosaltres: '1pl',
  vosaltres: '2pl',
  ells: '3pl',
};

export const TENSE_ID: Readonly<Record<Tense, ComponentId>> = {
  present: 'VERB.ind.present',
  ahir: 'VERB.ind.passat_perifrastic',
  avui: 'VERB.perf.present',
  imperfet: 'VERB.ind.imperfet',
  futur: 'VERB.ind.futur',
  condicional: 'VERB.ind.condicional',
};

export const TOURNURE_ID: Readonly<Record<Exclude<Tournure, 'none'>, ComponentId>> = {
  haver: 'VERB.mod.obligacio',
  acabar: 'VERB.perifrasi.acabar_de',
  estar: 'VERB.perifrasi.progressiva',
};

/** The combination table: which tenses each tournure takes. Any other pair is greyed in both rows. */
export const ALLOWED_TENSES: Readonly<Record<Tournure, readonly Tense[]>> = {
  none: TENSES,
  haver: TENSES,
  estar: TENSES,
  acabar: ['present', 'imperfet'],
};

/** What a tense change sends as `timeWord`. `drop` removes the time chunk. */
export type TimeWord = string;
export const DROP = 'drop';

export const TIME_WORD: Readonly<Record<Tense, TimeWord>> = {
  present: DROP,
  ahir: 'Ahir',
  avui: 'Avui',
  imperfet: 'Abans',
  futur: 'Demà',
  condicional: DROP,
};

export function tenseOfId(id: string): Tense | undefined {
  return TENSES.find((tense) => TENSE_ID[tense] === id);
}

export function tournureOfId(id: string): Exclude<Tournure, 'none'> | undefined {
  return (['haver', 'acabar', 'estar'] as const).find(
    (tournure) => TOURNURE_ID[tournure] === id,
  );
}
