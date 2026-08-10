import { describe, expect, it } from 'vitest';
import {
  EVIDENCE_EFFECTS,
  EVIDENCE_TYPES,
  type Evidence,
  type Rating,
} from '../src/srs/evidence';
import { UngradedEvidenceError, advanceFsrs } from '../src/srs/fsrs';
import { applyEvidence, freshState, type ComponentState } from '../src/srs/apply';

/**
 * The FSRS half of a component's state, serialised. "Byte-identical" is the
 * claim under test for non-advancing evidence, so compare the serialisation
 * rather than field by field.
 */
function fsrsFingerprint(state: ComponentState): string {
  return JSON.stringify(state.mastery);
}

/** A minimal well-formed event for the given evidence type. */
function eventFor(evidence: Evidence): {
  evidence: Evidence;
  rating?: Rating;
  correct?: boolean;
} {
  const effect = EVIDENCE_EFFECTS[evidence];
  return {
    evidence,
    ...(effect.requiresRating ? { rating: 'good' as Rating } : {}),
    ...(effect.elo && !effect.requiresRating ? { correct: true } : {}),
  };
}

describe('evidence routing follows EVIDENCE_EFFECTS', () => {
  // The routing rules are not restated here. Each assertion reads the table and
  // checks the implementation agrees with it, so changing the table changes
  // what this test demands.
  for (const evidence of EVIDENCE_TYPES) {
    const effect = EVIDENCE_EFFECTS[evidence];

    it(`moves exactly the signals ${evidence} is allowed to move`, () => {
      const before = freshState();
      const { component: after } = applyEvidence(before, eventFor(evidence));

      expect(after.exposure.exposure_count > before.exposure.exposure_count).toBe(
        effect.exposure,
      );
      expect(after.elo !== before.elo).toBe(effect.elo);
      expect(fsrsFingerprint(after) !== fsrsFingerprint(before)).toBe(effect.fsrs);
    });

    it(`leaves the input state untouched for ${evidence}`, () => {
      const before = freshState();
      const snapshot = JSON.stringify(before);
      applyEvidence(before, eventFor(evidence));
      expect(JSON.stringify(before)).toBe(snapshot);
    });
  }
});

describe('a lookup leaves FSRS state byte-identical', () => {
  it('changes nothing but the exposure counter', () => {
    const before = freshState();
    const { component: after } = applyEvidence(before, { evidence: 'lookup' });

    expect(fsrsFingerprint(after)).toBe(fsrsFingerprint(before));
    expect(after.elo).toBe(before.elo);
    expect(after.exposure.exposure_count).toBe(before.exposure.exposure_count + 1);
  });

  it('refuses to be forced through the FSRS gate', () => {
    expect(() =>
      applyEvidence(freshState(), { evidence: 'lookup', rating: 'good' }),
    ).toThrow();
  });
});

describe('a recall moves Elo but not FSRS', () => {
  it('moves both ratings, in opposite directions, and neither FSRS field', () => {
    // The component's rating is its DIFFICULTY, so a correct attempt lowers it
    // and raises the learner's. Phase 1 asserted the opposite sign, because
    // its placeholder update was one-sided and the single number stood for the
    // learner's strength at this component. A two-sided update cannot have both
    // sides mean strength; the learner's strength here is now `learner - elo`.
    const before = freshState();
    const correct = applyEvidence(before, { evidence: 'recall', correct: true });
    const wrong = applyEvidence(before, { evidence: 'recall', correct: false });

    expect(correct.component.elo).toBeLessThan(before.elo);
    expect(correct.learnerElo).toBeGreaterThan(wrong.learnerElo);
    expect(wrong.component.elo).toBeGreaterThan(before.elo);

    expect(fsrsFingerprint(correct.component)).toBe(fsrsFingerprint(before));
    expect(fsrsFingerprint(wrong.component)).toBe(fsrsFingerprint(before));
    expect(correct.component.mastery.graded_review_count).toBe(0);
  });

  it('conserves the total rating, so difficulty is relative to the learner', () => {
    const before = freshState();
    const after = applyEvidence(before, { evidence: 'recall', correct: true }, 1200);
    expect(after.learnerElo + after.component.elo).toBe(1200 + before.elo);
  });

  it('needs an objective outcome rather than a self-rating', () => {
    // No rating is asked for, so the attempt has to be compared against the
    // reference answer. An event with neither is a bug, not a default.
    expect(() => applyEvidence(freshState(), { evidence: 'recall' })).toThrow();
    expect(() =>
      applyEvidence(freshState(), { evidence: 'recall', rating: 'good' }),
    ).toThrow();
  });
});

describe('a graded event moves both', () => {
  it('advances Elo, FSRS and the graded review counter', () => {
    const before = freshState();
    const { component: after } = applyEvidence(before, {
      evidence: 'graded',
      rating: 'good',
    });

    expect(after.elo).not.toBe(before.elo);
    expect(fsrsFingerprint(after)).not.toBe(fsrsFingerprint(before));
    expect(after.mastery.graded_review_count).toBe(
      before.mastery.graded_review_count + 1,
    );
    expect(after.mastery.stability).not.toBeNull();
  });

  it('requires a rating', () => {
    expect(() => applyEvidence(freshState(), { evidence: 'graded' })).toThrow();
  });

  it('separates the exposure and mastery counters', () => {
    // Ten lookups and one graded review must not read as eleven reviews.
    let state = freshState();
    for (let index = 0; index < 10; index += 1) {
      state = applyEvidence(state, { evidence: 'lookup' }).component;
    }
    state = applyEvidence(state, { evidence: 'graded', rating: 'good' }).component;

    expect(state.exposure.exposure_count).toBe(11);
    expect(state.mastery.graded_review_count).toBe(1);
  });
});

describe('the FSRS gate', () => {
  it('rejects every evidence type the table does not mark FSRS-advancing', () => {
    // The gate lives on the wrapper itself, not on its caller, so a future
    // caller that bypasses applyEvidence still cannot advance FSRS.
    for (const evidence of EVIDENCE_TYPES) {
      if (EVIDENCE_EFFECTS[evidence].fsrs) continue;
      expect(
        () => advanceFsrs(freshState().mastery, evidence, 'good'),
        evidence,
      ).toThrow(UngradedEvidenceError);
    }
  });

  it('lets graded evidence through', () => {
    expect(() => advanceFsrs(freshState().mastery, 'graded', 'good')).not.toThrow();
  });
});
