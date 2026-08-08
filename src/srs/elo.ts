/**
 * Elo signal running alongside FSRS. Implemented in phase 5.
 *
 * FSRS models when a component is due; Elo models relative standing across
 * components, which is what the coverage heatmap and the gaps ranking read.
 */

export const DEFAULT_RATING = 1200;
