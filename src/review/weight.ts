/**
 * How far a contrast status lifts a component that has never been graded.
 *
 * Deliberately not `INITIAL_DIFFICULTY_VALUE` from src/srs/fsrs.ts, which
 * collapses near-miss, false-friend and novel to one number. That is the right
 * prior for FSRS, which only needs to know whether a card starts easy or hard,
 * and it is the wrong ranking here: a ranking reusing it could not put a novel
 * node above a near-miss one, which is the ordering this weight exists to
 * produce.
 *
 * It lives in a module of its own because two things now rank gaps by it: the
 * review selector in ./select.ts, and the phase 6 gaps list. The alternative
 * was a second table in src/ui/, which is the failure mode the
 * ART.personal.absencia finding is about. It carries no imports beyond a
 * taxonomy type on purpose, so the browse view can reach it without reaching
 * the scheduler.
 */
import type { ContrastStatus } from '../taxonomy';

export const CONTRAST_SELECTION_WEIGHT: Record<ContrastStatus, number> = {
  transfer: 0,
  'near-miss': 2,
  'false-friend': 3,
  novel: 3,
};
