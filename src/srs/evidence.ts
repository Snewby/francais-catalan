/**
 * The interaction model: intent-typed calls, and the routing from evidence type
 * to learning signal.
 *
 * THIS FILE IS AUTHORITATIVE for that routing. CLAUDE.md, the skills and the
 * design docs reference it and must not restate its content. Exposure and
 * mastery are separate dimensions, and the whole point of the table below is
 * that there is exactly one place to check what feeds what.
 */

/** What the user is trying to do. All five emit the same decomposition payload. */
export type Intent = 'comprehend' | 'produce' | 'teach' | 'assess' | 'pronounce';

/** Which way the translation runs. Language-invariant data either way. */
export type Direction = 'ca_to_fr' | 'fr_to_ca';

/** How much the interaction tells us about what the user actually knows. */
export type Evidence = 'lookup' | 'recall' | 'graded';

/** Grades, matching the ts-fsrs Rating scale. Present only when evidence is graded. */
export type Rating = 'again' | 'hard' | 'good' | 'easy';

export const INTENTS: readonly Intent[] = [
  'comprehend',
  'produce',
  'teach',
  'assess',
  'pronounce',
];
export const DIRECTIONS: readonly Direction[] = ['ca_to_fr', 'fr_to_ca'];
export const EVIDENCE_TYPES: readonly Evidence[] = ['lookup', 'recall', 'graded'];
export const RATINGS: readonly Rating[] = ['again', 'hard', 'good', 'easy'];

/**
 * Which signals each evidence type is allowed to move.
 *
 * The distinction this encodes: a lookup tells us the user was curious, not
 * that they know anything. Feeding it to FSRS would turn the coverage heatmap
 * into a log of interests presented as a skill map.
 */
export interface EvidenceEffect {
  /** Increments the per-component exposure counter. */
  readonly exposure: boolean;
  /** Moves the component's Elo rating. */
  readonly elo: boolean;
  /** Advances FSRS stability and difficulty. */
  readonly fsrs: boolean;
  /** Whether a rating must accompany the event. */
  readonly requiresRating: boolean;
  /** Where events of this type come from. Every entry must name a real producer. */
  readonly producer: string;
}

export const EVIDENCE_EFFECTS: Record<Evidence, EvidenceEffect> = {
  lookup: {
    exposure: true,
    elo: false,
    fsrs: false,
    requiresRating: false,
    producer: 'Any comprehend or produce query answered without a prior attempt.',
  },
  recall: {
    exposure: true,
    elo: true,
    fsrs: false,
    requiresRating: false,
    producer:
      'The produce flow attempt-then-reveal affordance (phase 6). The typed ' +
      'attempt is auto-compared against the reference answer, which yields an ' +
      'objective outcome for Elo without ever asking the user to rate ' +
      'themselves. No rating means no FSRS.',
  },
  graded: {
    exposure: true,
    elo: true,
    fsrs: true,
    requiresRating: true,
    producer: 'The review loop (phase 5b), under either selection function.',
  },
};

/**
 * The intent a direction implies.
 *
 * Reading a Catalan énoncé is comprehension; producing Catalan from a French
 * description is production. It lives here rather than in a caller because the
 * direction is now REPORTED BY THE MODEL: the API client derives the intent
 * from the detected direction, and so does the review loop, and two copies of
 * this mapping would be two things to disagree.
 *
 * A caller may still override it, which is how `pronounce` will arrive.
 */
export const INTENT_FOR_DIRECTION: Record<Direction, Intent> = {
  ca_to_fr: 'comprehend',
  fr_to_ca: 'produce',
};

/** Intent availability. The MVP ships two; the rest are representable from phase 1. */
export const INTENT_AVAILABILITY: Record<
  Intent,
  { readonly mvp: boolean; readonly phase: string }
> = {
  comprehend: { mvp: true, phase: 'MVP' },
  produce: { mvp: true, phase: 'MVP' },
  teach: { mvp: false, phase: 'later phase' },
  assess: {
    mvp: false,
    // Not a subsystem: a second selection function over the phase 5b review
    // machinery, weighting unpractised and unexplored nodes where an ordinary
    // review weights FSRS-due ones.
    phase: 'later phase, as a selector over the phase 5b review loop',
  },
  pronounce: { mvp: false, phase: 'phase 6b' },
};

/** True when this evidence type may advance FSRS. The FSRS wrapper gates on this. */
export function advancesFsrs(evidence: Evidence): boolean {
  return EVIDENCE_EFFECTS[evidence].fsrs;
}

/** A rating must be present exactly when the evidence type requires one. */
export function ratingIsConsistent(
  evidence: Evidence,
  rating: Rating | undefined,
): boolean {
  return EVIDENCE_EFFECTS[evidence].requiresRating === (rating !== undefined);
}
