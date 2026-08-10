/**
 * The coverage model: two dimensions, and the colour that carries them.
 *
 * TWO DIMENSIONS, NEVER ONE COLOUR. Hue carries mastery, opacity carries
 * exposure. A component known well but rarely met reads as pale green; one met
 * often and still weak reads as solid red. Collapsing them into a single scale
 * would let a log of what the learner looked at pass for a map of what they
 * know, which is the failure the exposure/mastery split exists to prevent.
 *
 * DOM-free and database-free on purpose. The browse view is given plain data by
 * the shell and cannot reach the store at all, which is what lets the
 * no-evidence ban stay in force here rather than be narrowed away; see the
 * header of test/browser-emits-no-evidence.test.ts.
 */
import { CONTRAST_SELECTION_WEIGHT } from '../../review/weight';
import { fr, labelled } from '../../i18n/fr';
import { LEAVES, domainOf } from '../../taxonomy';
import type { DomainCode, LeafNode } from '../../taxonomy';

/**
 * What the heatmap needs about one component, and nothing else.
 *
 * Deliberately its own shape rather than the runtime `ComponentState`: that
 * type lives in src/srs/apply.ts, which the browse view may not import, and
 * three numbers are the whole of what a colour is computed from.
 */
export interface Coverage {
  readonly exposureCount: number;
  readonly gradedReviewCount: number;
  /** FSRS stability in days, or null before the first graded review. */
  readonly stability: number | null;
}

export type CoverageMap = ReadonlyMap<string, Coverage>;

export const NO_COVERAGE: Coverage = {
  exposureCount: 0,
  gradedReviewCount: 0,
  stability: null,
};

/**
 * Days of stability at which mastery reads as half learnt.
 *
 * One `good` review of a new card lands near three days under the ts-fsrs
 * defaults and one `easy` near fifteen, so ten puts a single good review at
 * roughly a quarter and an easy one at about six tenths. Saturating rather than
 * linear because stability grows without bound and a colour does not.
 */
export const MASTERY_HALF_LIFE_DAYS = 10;

/**
 * Mastery in 0 to 1, or null when there is no graded evidence at all.
 *
 * Null is not zero. A component nobody has ever been tested on is unknown, not
 * known badly, and painting it the same red as a failed one would claim
 * evidence that does not exist. The heatmap renders null as neutral grey.
 */
export function masteryOf(coverage: Coverage): number | null {
  if (coverage.gradedReviewCount === 0 || coverage.stability === null) return null;
  const stability = Math.max(coverage.stability, 0);
  return stability / (stability + MASTERY_HALF_LIFE_DAYS);
}

/** Encounters at which the exposure dimension is fully saturated. */
export const EXPOSURE_FULL = 8;

/** The floor, so an unexplored node is faint rather than invisible. */
export const MIN_OPACITY = 0.15;

export function exposureOpacity(exposureCount: number): number {
  if (exposureCount <= 0) return MIN_OPACITY;
  const share = Math.min(Math.log1p(exposureCount) / Math.log1p(EXPOSURE_FULL), 1);
  return MIN_OPACITY + (1 - MIN_OPACITY) * share;
}

/** Red at nothing mastered, green at everything. */
export const MASTERED_HUE = 140;

export function masteryHue(mastery: number): number {
  return MASTERED_HUE * Math.min(Math.max(mastery, 0), 1);
}

/** The one place the two dimensions are combined, so neither can be dropped. */
export function coverageColour(coverage: Coverage): string {
  const opacity = exposureOpacity(coverage.exposureCount).toFixed(3);
  const mastery = masteryOf(coverage);
  if (mastery === null) return `hsl(0 0% 62% / ${opacity})`;
  return `hsl(${masteryHue(mastery).toFixed(0)} 62% 44% / ${opacity})`;
}

export function coverageOf(map: CoverageMap, componentId: string): Coverage {
  return map.get(componentId) ?? NO_COVERAGE;
}

function formatCount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * What a cell's colour says, in words.
 *
 * Not a nicety. There is no hover on a touch screen, so a heatmap whose two
 * dimensions are only readable as paint is a heatmap with no key on the device
 * it is actually used on. Both numbers appear here and in the detail pane.
 */
export function coverageSummary(coverage: Coverage): string {
  return [
    labelled(fr.heatmap.exposureCount, formatCount(coverage.exposureCount)),
    labelled(fr.heatmap.gradedCount, formatCount(coverage.gradedReviewCount)),
  ].join(', ');
}

/**
 * A domain's coverage, as the mean of its leaves.
 *
 * The mean rather than the sum on both dimensions, so that a twelve-leaf domain
 * and a thirty-nine-leaf one are read on the same scale. Mastery averages only
 * over the leaves that have been graded, because averaging in the ungraded ones
 * as zero would say a domain is known badly when it is merely untested.
 */
export function aggregate(coverages: readonly Coverage[]): Coverage {
  if (coverages.length === 0) return NO_COVERAGE;

  const graded = coverages.filter((entry) => masteryOf(entry) !== null);
  const exposure =
    coverages.reduce((total, entry) => total + entry.exposureCount, 0) /
    coverages.length;

  if (graded.length === 0) {
    return { exposureCount: exposure, gradedReviewCount: 0, stability: null };
  }

  return {
    exposureCount: exposure,
    gradedReviewCount: graded.reduce(
      (total, entry) => total + entry.gradedReviewCount,
      0,
    ),
    stability:
      graded.reduce((total, entry) => total + (entry.stability ?? 0), 0) /
      graded.length,
  };
}

export function leavesOfDomain(domain: DomainCode): readonly LeafNode[] {
  return LEAVES.filter((leaf) => domainOf(leaf.id) === domain);
}

export function domainCoverage(domain: DomainCode, map: CoverageMap): Coverage {
  return aggregate(leavesOfDomain(domain).map((leaf) => coverageOf(map, leaf.id)));
}

/**
 * Why the map looks the way it does, as three states rather than two.
 *
 * The map is grey until a graded review happens, which is the design working
 * and reads as a defect to anyone who only asks questions. Explaining that needs
 * to know WHICH grey is on screen: `empty` is a learner who has done nothing
 * yet, `ungraded` is one who has been asking questions and has earned exposure
 * that the hue deliberately refuses to credit. The same sentence cannot be true
 * of both, so the interface picks. `graded` needs no explanation at all, because
 * by then the map has colour and says it itself.
 */
export type CoverageStance = 'empty' | 'ungraded' | 'graded';

export function coverageStance(map: CoverageMap): CoverageStance {
  let anyExposure = false;
  for (const entry of map.values()) {
    if (masteryOf(entry) !== null) return 'graded';
    if (entry.exposureCount > 0) anyExposure = true;
  }
  return anyExposure ? 'ungraded' : 'empty';
}

/**
 * The two kinds of gap, which are not the same thing and are not ranked
 * together.
 *
 * UNEXPLORED is zero exposure: never met in any way. UNPRACTISED is exposure
 * above zero with no graded review: met in an answer and never tested. The
 * second is the more actionable of the two, and merging them would hide that.
 */
export type GapKind = 'unexplored' | 'unpractised';

export interface Gap {
  readonly leaf: LeafNode;
  readonly kind: GapKind;
  readonly coverage: Coverage;
}

export function gapKindOf(coverage: Coverage): GapKind | null {
  if (coverage.exposureCount <= 0) return 'unexplored';
  if (coverage.gradedReviewCount === 0) return 'unpractised';
  return null;
}

/**
 * Gaps of one kind, novel and false-friend first.
 *
 * Ranked by CONTRAST_SELECTION_WEIGHT, which the review selector already uses,
 * rather than by a second table written here. Ties keep taxonomy order, because
 * Array.prototype.sort is stable and LEAVES is in taxonomy order, so siblings
 * stay beside each other instead of being scattered by an arbitrary tie-break.
 */
export function gapsOfKind(kind: GapKind, map: CoverageMap): readonly Gap[] {
  return LEAVES.flatMap((leaf) => {
    const coverage = coverageOf(map, leaf.id);
    return gapKindOf(coverage) === kind ? [{ leaf, kind, coverage }] : [];
  }).sort(
    (left, right) =>
      CONTRAST_SELECTION_WEIGHT[right.leaf.contrast_fr.status] -
      CONTRAST_SELECTION_WEIGHT[left.leaf.contrast_fr.status],
  );
}
