/**
 * Elo signal running alongside FSRS.
 *
 * FSRS models when a component is due; Elo models relative standing across
 * components, which is what the coverage heatmap and the gaps ranking read.
 * Unlike FSRS, Elo may be moved by an ungraded recall attempt, because a typed
 * attempt compared against the reference answer is an objective outcome even
 * though the learner never rated themselves.
 *
 * The update is two-sided: the learner has a rating and so does every
 * component, and an outcome moves both. A one-sided update against a flat 0.5
 * expectation (which is what phase 1 shipped as a placeholder) says the same
 * thing about a first attempt at `PHON.accent.diacritic` as about a hundredth
 * attempt at `NOM.number.regular`, which is the opposite of what a ranking is
 * for.
 */

/** Where a learner and an unmet component both start. */
export const DEFAULT_RATING = 1200;

/** How far a single outcome can move a rating. */
export const K_FACTOR = 24;

/** The two ratings an outcome moves. A higher component rating means harder. */
export interface RatingPair {
  readonly learner: number;
  readonly component: number;
}

/**
 * The probability the learner gets this component right, on the standard
 * logistic curve: 400 points of advantage is roughly ten-to-one.
 */
export function expectedScore(learner: number, component: number): number {
  return 1 / (1 + 10 ** ((component - learner) / 400));
}

/**
 * Both ratings after one outcome, from the learner's point of view.
 *
 * The two moves are equal and opposite, so the total rating in the system is
 * conserved and a component only looks hard relative to the learner who met it.
 * Beating an easy component barely moves anything; failing one moves a lot.
 *
 * @param score 1 for a correct outcome, 0 for a wrong one, fractions between.
 */
export function nextRatings(pair: RatingPair, score: number): RatingPair {
  const expected = expectedScore(pair.learner, pair.component);
  const delta = K_FACTOR * (score - expected);
  return {
    learner: Math.round(pair.learner + delta),
    component: Math.round(pair.component - delta),
  };
}
