/**
 * Elo signal running alongside FSRS.
 *
 * FSRS models when a component is due; Elo models relative standing across
 * components, which is what the coverage heatmap and the gaps ranking read.
 * Unlike FSRS, Elo may be moved by an ungraded recall attempt, because a typed
 * attempt compared against the reference answer is an objective outcome even
 * though the learner never rated themselves.
 */

export const DEFAULT_RATING = 1200;

/** How far a single outcome can move a rating. */
export const K_FACTOR = 24;

/**
 * PLACEHOLDER UPDATE. Phase 5 replaces this with a two-sided update against a
 * learner rating; for now the expected score is a flat 0.5, which is the right
 * prior for a component that has never been attempted and a poor one after
 * that. What phase 1 fixes is which evidence types are allowed to call it.
 *
 * @param score 1 for a correct outcome, 0 for a wrong one, fractions between.
 */
export function nextRating(current: number, score: number): number {
  return Math.round(current + K_FACTOR * (score - 0.5));
}
