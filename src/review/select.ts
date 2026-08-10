/**
 * Which component to review next.
 *
 * Selection is a function rather than a branch inside the loop. `assess` is a
 * second selector over the same asking, answering and grading machinery,
 * weighting unpractised and unexplored nodes where `due` weights scheduled
 * ones, and it must land without the loop changing. Everything a selector is
 * allowed to know is on `SelectionContext`, which is plain data read by the
 * caller: a selector does no I/O, so a second one is a pure function and a test
 * can drive it without a database.
 */
import type { LeafNode } from '../taxonomy';
import type { ComponentState } from '../srs/apply';
import { isDue } from '../srs/fsrs';
import { CONTRAST_SELECTION_WEIGHT } from './weight';

export interface SelectionCandidate {
  readonly leaf: LeafNode;
  readonly state: ComponentState;
}

export interface SelectionContext {
  readonly candidates: readonly SelectionCandidate[];
  /** Epoch milliseconds. Injected rather than read, so a selector is reproducible. */
  readonly now: number;
}

export interface Selector {
  readonly name: string;
  /**
   * Component IDs, best first. May be shorter than the candidate list: a
   * selector that has nothing worth asking should return nothing rather than
   * pad the queue.
   */
  select(context: SelectionContext): readonly string[];
}

/** Milliseconds in a day, for reading a due date as an overdueness. */
const DAY_MS = 86_400_000;

/**
 * Where a scheduled review starts, set above any gap score the weights below
 * can reach. A gap has never been forgotten, because it has never been learnt;
 * a card FSRS calls due is about to be. The first outranks the second only once
 * the schedule is empty.
 */
export const DUE_BASE_SCORE = 100;

/** Per day of overdueness, capped so a card forgotten a year ago cannot monopolise. */
export const OVERDUE_PER_DAY = 1;
export const OVERDUE_DAYS_CAP = 30;

/** Multiplies the contrast weight, leaving room for the exposure bonus below. */
export const GAP_CONTRAST_FACTOR = 2;

/**
 * Lifts a gap the learner has actually met over one they have not.
 *
 * A component with exposure and no graded review is unpractised: it has been
 * seen in an answer and never tested. One with neither is unexplored, and
 * asking for a grade on it is closer to assessment than to review, which is
 * what the second selector is for.
 */
export const UNPRACTISED_BONUS = 1;

/** The score `due` gives one candidate, exported so a test can assert the ordering. */
export function dueScore(candidate: SelectionCandidate, now: number): number | null {
  const { mastery } = candidate.state;

  if (isDue(mastery, now)) {
    const overdueDays = Math.min(
      Math.max((now - (mastery.due ?? now)) / DAY_MS, 0),
      OVERDUE_DAYS_CAP,
    );
    return DUE_BASE_SCORE + overdueDays * OVERDUE_PER_DAY;
  }

  // Scheduled and not yet due. Asking for it early is what FSRS exists to stop.
  if (mastery.graded_review_count > 0) return null;

  return (
    CONTRAST_SELECTION_WEIGHT[candidate.leaf.contrast_fr.status] * GAP_CONTRAST_FACTOR +
    (candidate.state.exposure.exposure_count > 0 ? UNPRACTISED_BONUS : 0)
  );
}

/**
 * The shipped selector: what FSRS says is due, then the gaps, novel and
 * false-friend first.
 *
 * Ties break by the order the candidates arrived, which is taxonomy order when
 * the caller passes every leaf. Array.prototype.sort is stable, so that
 * ordering is a property of the language rather than of this implementation.
 */
export const dueSelector: Selector = {
  name: 'due',
  select(context: SelectionContext): readonly string[] {
    const scored = context.candidates
      .map((candidate) => ({ candidate, score: dueScore(candidate, context.now) }))
      .filter(
        (entry): entry is { candidate: SelectionCandidate; score: number } =>
          entry.score !== null,
      );

    return scored
      .sort((left, right) => right.score - left.score)
      .map((entry) => entry.candidate.leaf.id);
  },
};
