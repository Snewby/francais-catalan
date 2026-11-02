/**
 * What to fetch ahead (decided 29 Oct, F1, and triggered because Opus 5.5
 * misses the 2 s target: docs/variant-eval.md): the two neighbouring tenses
 * and the two neighbouring persons of the original sentence, about $0.05 a
 * sentence warm.
 *
 * « Neighbouring » is panel order: the nearest buttons on either side, and at
 * the end of a row the next two along, so it is always two of each where the
 * axis offers them. Only one axis changes per target, so each is a first tap.
 */
import { ALLOWED_TENSES, TENSES, VARIANT_PERSONS } from './axes';
import { applyTap, type Combination, type StartingState } from './combination';

export const PREFETCH_PER_AXIS = 2;

/** The `count` values nearest `current` in `order`, nearest first, ties to the left. */
export function nearest<T>(order: readonly T[], current: T, count: number): T[] {
  const at = order.indexOf(current);
  return order
    .map((value, index) => ({ value, distance: Math.abs(index - at), index }))
    .filter(({ index }) => index !== at)
    .sort((a, b) => a.distance - b.distance || a.index - b.index)
    .slice(0, count)
    .map(({ value }) => value);
}

export function prefetchTargets(start: StartingState): Combination[] {
  const { combination } = start;
  const targets: Combination[] = [];
  if (start.greyed.tense === undefined && combination.tense !== null) {
    const allowed = TENSES.filter((tense) =>
      ALLOWED_TENSES[combination.tournure].includes(tense),
    );
    for (const tense of nearest(allowed, combination.tense, PREFETCH_PER_AXIS)) {
      targets.push(applyTap(combination, 'tense', tense));
    }
  }
  if (start.greyed.person === undefined && combination.person !== null) {
    for (const person of nearest(
      VARIANT_PERSONS,
      combination.person,
      PREFETCH_PER_AXIS,
    )) {
      targets.push(applyTap(combination, 'person', person));
    }
  }
  return targets;
}
