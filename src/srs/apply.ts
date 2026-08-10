/**
 * Applying an evidence event to a component's state.
 *
 * This is the one place that reads EVIDENCE_EFFECTS and acts on it. The routing
 * rules are not restated here, in the tests, or anywhere else: every branch
 * below asks the table what it is allowed to move.
 */
import {
  EVIDENCE_EFFECTS,
  ratingIsConsistent,
  type Evidence,
  type Rating,
} from './evidence';
import { DEFAULT_RATING, nextRatings } from './elo';
import {
  INITIAL_DIFFICULTY_VALUE,
  advanceFsrs,
  freshMastery,
  type MasteryState,
} from './fsrs';
import type { LeafNode } from '../taxonomy';

/**
 * A component's runtime state: the taxonomy's exposure/mastery split, plus the
 * Elo rating, which is a runtime signal and so has no place in the seed data.
 * That rating is the component's DIFFICULTY, higher meaning harder; see
 * src/srs/elo.ts for why a two-sided update forces that reading.
 */
export interface ComponentState {
  readonly exposure: { readonly exposure_count: number };
  readonly mastery: MasteryState;
  readonly elo: number;
}

export interface EvidenceEvent {
  readonly evidence: Evidence;
  /** Present if and only if the evidence type requires a rating. */
  readonly rating?: Rating | undefined;
  /**
   * Objective outcome of an ungraded attempt: did the typed answer match the
   * reference. Required for evidence that moves Elo without a rating, because
   * the alternative is asking the learner to grade themselves, which is the
   * self-report the exposure/mastery split exists to avoid.
   */
  readonly correct?: boolean | undefined;
  /** When this happened, epoch milliseconds. Injectable so a test is reproducible. */
  readonly at?: number | undefined;
}

/** Thrown when an event does not carry what its evidence type needs. */
export class MalformedEvidenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MalformedEvidenceError';
  }
}

/** A never-encountered component. */
export function freshState(): ComponentState {
  return {
    exposure: { exposure_count: 0 },
    mastery: freshMastery(),
    elo: DEFAULT_RATING,
  };
}

/** The starting state for a leaf, with difficulty seeded from its contrast status. */
export function initialStateFor(leaf: LeafNode): ComponentState {
  return {
    exposure: { ...leaf.state.exposure },
    mastery: freshMastery(
      leaf.state.mastery.difficulty ??
        INITIAL_DIFFICULTY_VALUE[leaf.contrast_fr.status],
    ),
    elo: DEFAULT_RATING,
  };
}

const GRADE_SCORE: Record<Rating, number> = {
  again: 0,
  hard: 1 / 3,
  good: 2 / 3,
  easy: 1,
};

function outcomeScore(event: EvidenceEvent): number {
  if (event.rating !== undefined) return GRADE_SCORE[event.rating];
  if (event.correct !== undefined) return event.correct ? 1 : 0;
  throw new MalformedEvidenceError(
    `${event.evidence} evidence moves Elo but the event carries neither a ` +
      'rating nor an objective outcome. See EVIDENCE_EFFECTS in src/srs/evidence.ts.',
  );
}

/**
 * Both sides of one event. The learner's rating is global rather than
 * per-component, so it has to come in and go back out; returning only the
 * component would leave the other half of a two-sided update on the floor.
 */
export interface EvidenceOutcome {
  readonly component: ComponentState;
  readonly learnerElo: number;
}

/**
 * Returns new state; the inputs are never mutated, so a caller that drops the
 * result has changed nothing rather than half-applied an event.
 */
export function applyEvidence(
  state: ComponentState,
  event: EvidenceEvent,
  learnerElo: number = DEFAULT_RATING,
): EvidenceOutcome {
  if (!ratingIsConsistent(event.evidence, event.rating)) {
    throw new MalformedEvidenceError(
      `${event.evidence} evidence ${
        EVIDENCE_EFFECTS[event.evidence].requiresRating ? 'requires' : 'must not carry'
      } a rating.`,
    );
  }

  const effect = EVIDENCE_EFFECTS[event.evidence];

  const exposure = effect.exposure
    ? { exposure_count: state.exposure.exposure_count + 1 }
    : { ...state.exposure };

  const ratings = effect.elo
    ? nextRatings({ learner: learnerElo, component: state.elo }, outcomeScore(event))
    : { learner: learnerElo, component: state.elo };

  // The rating is guaranteed present here: requiresRating and fsrs are both
  // true only for graded evidence, and ratingIsConsistent has already run.
  const mastery =
    effect.fsrs && event.rating !== undefined
      ? advanceFsrs(
          state.mastery,
          event.evidence,
          event.rating,
          event.at === undefined ? undefined : new Date(event.at),
        )
      : { ...state.mastery };

  return {
    component: { exposure, mastery, elo: ratings.component },
    learnerElo: ratings.learner,
  };
}
