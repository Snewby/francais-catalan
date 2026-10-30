/**
 * A sentence's position on the five axes, where it starts, and what each
 * button may do from there. Pure functions of a phase 1 reply: no call, no
 * store.
 */
import type { Assumption, Person } from '../api/phrase';
import type { Chunk } from '../api/phrase-check';
import {
  ALLOWED_TENSES,
  TIME_WORD,
  TENSES,
  TOURNURES,
  VARIANT_PERSONS,
  tenseOfId,
  tournureOfId,
  type Tense,
  type TimeWord,
  type Tournure,
  type VariantPerson,
} from './axes';

/**
 * A full target. `null` marks an axis the sentence does not offer: no subject
 * to change, or no single verb in one of the six tenses. A greyed axis is held
 * as it is and sent as null, so the request still names all five.
 */
export interface Combination {
  readonly person: VariantPerson | null;
  readonly tense: Tense | null;
  readonly tournure: Tournure;
  readonly pronoun: boolean;
  readonly negation: boolean;
}

export type Axis = keyof Combination;

/** Why a button is greyed before any call. The French for each is in fr.ts. */
export type GreyCause = 'no_subject' | 'no_tense' | 'no_object' | 'acabar_tense';

export interface StartingState {
  readonly combination: Combination;
  /** Axes greyed outright, every button on them, with the reason shown on a tap. */
  readonly greyed: Readonly<Partial<Record<Axis, GreyCause>>>;
}

export type ButtonState =
  | { readonly kind: 'selected' }
  | { readonly kind: 'available' }
  | { readonly kind: 'greyed'; readonly cause: GreyCause };

export interface ReplyAxes {
  readonly subject: { readonly person: Person };
  readonly assumptions: readonly Assumption[];
  readonly chunks: readonly Pick<Chunk, 'role' | 'ids'>[];
}

const SEPARATOR = '·';
const GREYED = '-';

/** `person·tense·tournure·pronoun·negation`, e.g. `ella·avui·none·0·0`. */
export function comboKey(combination: Combination): string {
  return [
    combination.person ?? GREYED,
    combination.tense ?? GREYED,
    combination.tournure,
    combination.pronoun ? '1' : '0',
    combination.negation ? '1' : '0',
  ].join(SEPARATOR);
}

export function parseComboKey(key: string): Combination {
  const [person, tense, tournure, pronoun, negation, ...rest] = key.split(SEPARATOR);
  const flag = (value: string | undefined): boolean => {
    if (value !== '0' && value !== '1') throw new Error(`Bad flag in ${key}`);
    return value === '1';
  };
  const member = <T extends string>(
    values: readonly T[],
    value: string | undefined,
  ) => {
    if (value === GREYED) return null;
    if (!values.includes(value as T))
      throw new Error(`Bad value ${String(value)} in ${key}`);
    return value as T;
  };
  if (rest.length > 0) throw new Error(`Too many fields in ${key}`);
  const parsedTournure = member(TOURNURES, tournure);
  if (parsedTournure === null) throw new Error(`Tournure cannot be greyed in ${key}`);
  return {
    person: member(VARIANT_PERSONS, person),
    tense: member(TENSES, tense),
    tournure: parsedTournure,
    pronoun: flag(pronoun),
    negation: flag(negation),
  };
}

export function sameCombination(a: Combination, b: Combination): boolean {
  return comboKey(a) === comboKey(b);
}

const PERSON_BUTTON: Readonly<Record<Exclude<Person, 'none' | '3sg'>, VariantPerson>> =
  {
    '1sg': 'jo',
    '2sg': 'tu',
    '1pl': 'nosaltres',
    '2pl': 'vosaltres',
    '3pl': 'ells',
  };

/**
 * Where the panel starts, read off the phase 1 reply (spec « Starting state »).
 *
 * « Quand ? » and « Tournure » need exactly one verb chunk (decided 29 Oct,
 * F5): nothing in a reply marks which of two verbs is the main one, and
 * changing the main verb alone is all D5 allows. A tournure with no tense ID
 * selects Présent (decided at sign-off, 22 Oct); a verb with neither is outside
 * the six tenses and greys both rows (D9, kept for a missing tense ID on 29
 * Oct, F4).
 */
export function startingState(reply: ReplyAxes): StartingState {
  const greyed: Partial<Record<Axis, GreyCause>> = {};
  const verbs = reply.chunks.filter((chunk) => chunk.role === 'verb');

  const { person } = reply.subject;
  let variantPerson: VariantPerson | null;
  if (person === 'none') {
    variantPerson = null;
    greyed.person = 'no_subject';
  } else if (person === '3sg') {
    variantPerson = reply.assumptions.includes('subject_fem') ? 'ella' : 'ell';
  } else {
    variantPerson = PERSON_BUTTON[person];
  }

  let tense: Tense | null = null;
  let tournure: Tournure = 'none';
  const [verb] = verbs;
  if (verbs.length === 1 && verb !== undefined) {
    const ownTense = verb.ids.map(tenseOfId).find((found) => found !== undefined);
    tournure =
      verb.ids.map(tournureOfId).find((found) => found !== undefined) ?? 'none';
    tense = ownTense ?? (tournure === 'none' ? null : 'present');
  }
  if (tense === null) {
    tournure = 'none';
    greyed.tense = 'no_tense';
    greyed.tournure = 'no_tense';
  }

  if (!reply.chunks.some((chunk) => chunk.role === 'object_direct')) {
    greyed.pronoun = 'no_object';
  }
  if (verbs.length === 0) greyed.negation = 'no_tense';

  return {
    combination: {
      person: variantPerson,
      tense,
      tournure,
      pronoun: false,
      negation: reply.chunks.some((chunk) => chunk.role === 'negation'),
    },
    greyed,
  };
}

/**
 * One button's state from the current combination. A reply's own
 * `not_applicable`, cached per combination, greys further buttons; the caller
 * layers that on, since it needs the store.
 */
export function buttonState<A extends Axis>(
  start: StartingState,
  current: Combination,
  axis: A,
  value: NonNullable<Combination[A]>,
): ButtonState {
  const axisCause = start.greyed[axis];
  if (axisCause !== undefined) return { kind: 'greyed', cause: axisCause };
  if (current[axis] === value) return { kind: 'selected' };
  if (axis === 'tense' && !ALLOWED_TENSES[current.tournure].includes(value as Tense)) {
    return { kind: 'greyed', cause: 'acabar_tense' };
  }
  if (
    axis === 'tournure' &&
    current.tense !== null &&
    !ALLOWED_TENSES[value as Tournure].includes(current.tense)
  ) {
    return { kind: 'greyed', cause: 'acabar_tense' };
  }
  return { kind: 'available' };
}

/** The target a tap asks for: the current combination with one value changed. */
export function applyTap<A extends Axis>(
  current: Combination,
  axis: A,
  value: Combination[A],
): Combination {
  return { ...current, [axis]: value };
}

/**
 * The `timeWord` a request carries (spec « Time-word table », D4). Absent when
 * the original has no time chunk, which never gains one, and when the target
 * keeps the original's tense, so the time chunk stays as it is (decided 22 Oct:
 * « Hi vas demà ? » keeps « demà » on a person change).
 */
export function timeWordFor(
  original: { readonly combination: Combination; readonly hasTimeChunk: boolean },
  target: Combination,
): TimeWord | undefined {
  if (!original.hasTimeChunk) return undefined;
  if (target.tense === null || target.tense === original.combination.tense) {
    return undefined;
  }
  return TIME_WORD[target.tense];
}
