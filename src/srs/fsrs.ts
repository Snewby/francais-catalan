/**
 * ts-fsrs wrapper for per-component mastery. Implemented in phase 5.
 *
 * Two things belong here rather than in phase 5, because both are structural
 * decisions that are painful to retrofit:
 *
 * 1. The mapping from contrast_fr.status to initial difficulty, which is the
 *    reason contrast_fr has to land in phase 1.
 * 2. The gate rejecting evidence that must not advance FSRS.
 */
import { advancesFsrs, type Evidence, type Rating } from './evidence';
import type { LeafState } from '../taxonomy';

export type ContrastStatus = 'transfer' | 'near-miss' | 'false-friend' | 'novel';

/**
 * A structure that transfers cleanly from French starts easy. Everything else
 * starts hard, including near-miss: a partial analogue is more dangerous than
 * no analogue, because the learner does not know they are wrong.
 */
export const INITIAL_DIFFICULTY: Record<ContrastStatus, 'low' | 'high'> = {
  transfer: 'low',
  'near-miss': 'high',
  'false-friend': 'high',
  novel: 'high',
};

/**
 * Thrown when something tries to advance FSRS from evidence that does not carry
 * a grade. Loud on purpose: silently accepting a lookup here would still
 * produce a plausible-looking heatmap, so nothing else would catch it.
 */
export class UngradedEvidenceError extends Error {
  constructor(evidence: Evidence) {
    super(
      `FSRS cannot be advanced by ${evidence} evidence. Only graded evidence ` +
        'carries a rating. See EVIDENCE_EFFECTS in src/srs/evidence.ts.',
    );
    this.name = 'UngradedEvidenceError';
  }
}

/** Gate every FSRS update through this. Phase 5 implements the update itself. */
export function assertAdvancesFsrs(evidence: Evidence): void {
  if (!advancesFsrs(evidence)) throw new UngradedEvidenceError(evidence);
}

/**
 * Numeric difficulty seeded from the contrast status, on the FSRS 1 to 10 scale.
 * Only transfer nodes start easy; see INITIAL_DIFFICULTY for why.
 */
export const INITIAL_DIFFICULTY_VALUE: Record<ContrastStatus, number> = {
  transfer: 3,
  'near-miss': 7,
  'false-friend': 7,
  novel: 7,
};

/**
 * PLACEHOLDER SCHEDULING. Phase 5 replaces the arithmetic below with ts-fsrs.
 *
 * What is not a placeholder is the gate: the wrapper refuses evidence that
 * EVIDENCE_EFFECTS does not mark FSRS-advancing, and it refuses it here rather
 * than in the caller, so a future caller cannot route around it.
 */
const STABILITY_FACTOR: Record<Rating, number> = {
  again: 0.5,
  hard: 1.2,
  good: 2,
  easy: 3,
};

const DIFFICULTY_DELTA: Record<Rating, number> = {
  again: 1,
  hard: 0.5,
  good: 0,
  easy: -0.5,
};

const DEFAULT_STABILITY = 1;
const DEFAULT_DIFFICULTY = 5;

export function advanceFsrs(
  state: LeafState['mastery'],
  evidence: Evidence,
  rating: Rating,
): LeafState['mastery'] {
  assertAdvancesFsrs(evidence);

  const difficulty =
    (state.difficulty ?? DEFAULT_DIFFICULTY) + DIFFICULTY_DELTA[rating];

  return {
    stability: (state.stability ?? DEFAULT_STABILITY) * STABILITY_FACTOR[rating],
    difficulty: Math.min(10, Math.max(1, difficulty)),
    graded_review_count: state.graded_review_count + 1,
  };
}
