/**
 * ts-fsrs wrapper for per-component mastery. Implemented in phase 5.
 *
 * The one decision that belongs here rather than in phase 5 is the mapping from
 * contrast_fr.status to initial difficulty, because it is the reason the
 * contrast status has to land in phase 1 rather than being retrofitted later.
 */

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
