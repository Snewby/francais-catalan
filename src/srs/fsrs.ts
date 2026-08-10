/**
 * ts-fsrs wrapper for per-component mastery.
 *
 * Two things here are older than the scheduling and are the load-bearing part,
 * because both are painful to retrofit:
 *
 * 1. The mapping from contrast_fr.status to initial difficulty, which is the
 *    reason contrast_fr has to land in phase 1.
 * 2. The gate rejecting evidence that must not advance FSRS. It lives on the
 *    wrapper rather than on its caller, so a future caller cannot route around
 *    it.
 */
import {
  fsrs,
  Rating as FsrsRating,
  State as FsrsState,
  type Card,
  type Grade,
} from 'ts-fsrs';
import { advancesFsrs, type Evidence, type Rating } from './evidence';

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
 * Numeric difficulty seeded from the contrast status, on the FSRS 1 to 10 scale.
 * Only transfer nodes start easy; see INITIAL_DIFFICULTY for why.
 *
 * This is a prior, and FSRS replaces it with its own estimate at the first
 * graded review: a New card's difficulty is initialised from the rating, which
 * is real evidence where this is a guess from the contrast status. What the
 * seed buys is the weeks before that review, which is when every component is
 * unreviewed and the gaps list has nothing else to sort on.
 */
export const INITIAL_DIFFICULTY_VALUE: Record<ContrastStatus, number> = {
  transfer: 3,
  'near-miss': 7,
  'false-friend': 7,
  novel: 7,
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

/** Gate every FSRS update through this. */
export function assertAdvancesFsrs(evidence: Evidence): void {
  if (!advancesFsrs(evidence)) throw new UngradedEvidenceError(evidence);
}

/** ts-fsrs card states, named rather than numbered so an export stays readable. */
export const SCHEDULING_STATES = ['new', 'learning', 'review', 'relearning'] as const;

export type SchedulingState = (typeof SCHEDULING_STATES)[number];

const STATE_VALUE: Record<SchedulingState, FsrsState> = {
  new: FsrsState.New,
  learning: FsrsState.Learning,
  review: FsrsState.Review,
  relearning: FsrsState.Relearning,
};

function stateName(value: FsrsState): SchedulingState {
  const found = SCHEDULING_STATES.find((name) => STATE_VALUE[name] === value);
  if (found === undefined) throw new Error(`Unknown FSRS state ${String(value)}.`);
  return found;
}

const GRADE: Record<Rating, Grade> = {
  again: FsrsRating.Again,
  hard: FsrsRating.Hard,
  good: FsrsRating.Good,
  easy: FsrsRating.Easy,
};

/**
 * The mastery half of a component's state.
 *
 * `stability`, `difficulty` and `graded_review_count` are the fields the
 * taxonomy seed and the heatmap know about; the rest is the ts-fsrs card,
 * carried so scheduling survives a reload. Dates are epoch milliseconds rather
 * than Date objects, so the JSON export is lossless and IndexedDB stores the
 * same thing the export file holds.
 */
export interface MasteryState {
  readonly stability: number | null;
  readonly difficulty: number | null;
  readonly graded_review_count: number;
  readonly due: number | null;
  readonly last_review: number | null;
  readonly elapsed_days: number;
  readonly scheduled_days: number;
  readonly reps: number;
  readonly lapses: number;
  readonly scheduling_state: SchedulingState;
}

/** A component never yet reviewed, optionally carrying its seeded difficulty. */
export function freshMastery(difficulty: number | null = null): MasteryState {
  return {
    stability: null,
    difficulty,
    graded_review_count: 0,
    due: null,
    last_review: null,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    scheduling_state: 'new',
  };
}

/**
 * The shared scheduler. ts-fsrs default parameters, deliberately: docs/01 is
 * explicit that optimising them needs on the order of a thousand reviews, and
 * this application has none.
 */
const scheduler = fsrs();

function toCard(state: MasteryState, now: Date): Card {
  return {
    due: state.due === null ? now : new Date(state.due),
    stability: state.stability ?? 0,
    difficulty: state.difficulty ?? 0,
    elapsed_days: state.elapsed_days,
    scheduled_days: state.scheduled_days,
    reps: state.reps,
    lapses: state.lapses,
    state: STATE_VALUE[state.scheduling_state],
    ...(state.last_review === null ? {} : { last_review: new Date(state.last_review) }),
  };
}

function fromCard(card: Card, gradedReviewCount: number): MasteryState {
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    graded_review_count: gradedReviewCount,
    due: card.due.getTime(),
    last_review: card.last_review === undefined ? null : card.last_review.getTime(),
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    scheduling_state: stateName(card.state),
  };
}

/** Whether this component is due for review at the given moment. */
export function isDue(state: MasteryState, now: number): boolean {
  return state.due !== null && state.due <= now;
}

/**
 * One graded review. Returns a new state; the input is never mutated, so a
 * caller that drops the result has changed nothing rather than half-applied it.
 */
export function advanceFsrs(
  state: MasteryState,
  evidence: Evidence,
  rating: Rating,
  now: Date = new Date(),
): MasteryState {
  assertAdvancesFsrs(evidence);
  const { card } = scheduler.next(toCard(state, now), now, GRADE[rating]);
  return fromCard(card, state.graded_review_count + 1);
}
