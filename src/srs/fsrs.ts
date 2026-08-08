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
import { advancesFsrs, type Evidence } from './evidence';

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
