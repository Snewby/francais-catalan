/**
 * The coverage heatmap and the gaps list.
 *
 * The load-bearing claim is that exposure and mastery are TWO DIMENSIONS. A
 * test that only checked "a colour comes out" would pass just as happily for a
 * single scale, so the assertions below vary one dimension with the other held
 * fixed, in both directions, and check that the legend names both.
 *
 * IDs are drawn from LEAVES at runtime rather than written as literals, on the
 * same grounds as test/taxonomy-browser.test.ts: test/closed-vocabulary.test.ts
 * scans test/ for component-ID literals, and a hardcoded ID pins a test to a
 * domain a later pass may re-axe.
 */
import { describe, expect, it } from 'vitest';
import { DOMAIN_CODES, LEAVES, domainOf } from '../src/taxonomy';
import type { ContrastStatus, LeafNode } from '../src/taxonomy';
import { fr } from '../src/i18n/fr';
import { CONTRAST_SELECTION_WEIGHT } from '../src/review/weight';
import {
  EXPOSURE_FULL,
  MIN_OPACITY,
  aggregate,
  coverageColour,
  coverageStance,
  coverageSummary,
  exposureOpacity,
  gapKindOf,
  gapsOfKind,
  masteryHue,
  masteryOf,
  type Coverage,
  type CoverageMap,
} from '../src/ui/browse/coverage';
import {
  DOMAIN_CELL,
  LEAF_CELL,
  MAX_DOMAIN_COLUMNS,
  columnsFor,
  renderHeatmap,
  renderLegend,
} from '../src/ui/browse/heatmap';
import { GAP_LIMIT, renderGaps } from '../src/ui/browse/gaps';

/** A phone and a laptop, the two widths TASKS.md requires this to work at. */
const PHONE = 360;
const DESKTOP = 1180;

function coverage(overrides: Partial<Coverage> = {}): Coverage {
  return {
    exposureCount: 0,
    gradedReviewCount: 0,
    stability: null,
    ...overrides,
  };
}

function opacityOf(colour: string): number {
  const match = /\/\s*([\d.]+)\)/.exec(colour);
  expect(match, colour).not.toBeNull();
  return Number(match?.[1]);
}

function hueOf(colour: string): number {
  const match = /^hsl\((\d+)/.exec(colour);
  expect(match, colour).not.toBeNull();
  return Number(match?.[1]);
}

/** A real leaf per contrast status, so the ranking test is not hypothetical. */
function exemplar(status: ContrastStatus): LeafNode | undefined {
  return LEAVES.find((leaf) => leaf.contrast_fr.status === status);
}

function mapOf(entries: readonly (readonly [string, Coverage])[]): CoverageMap {
  return new Map(entries);
}

describe('mastery and exposure are two dimensions', () => {
  it('moves the hue with mastery and leaves the opacity alone', () => {
    const met = 3;
    const weak = coverageColour(
      coverage({ exposureCount: met, gradedReviewCount: 1, stability: 1 }),
    );
    const strong = coverageColour(
      coverage({ exposureCount: met, gradedReviewCount: 1, stability: 200 }),
    );

    expect(hueOf(strong)).toBeGreaterThan(hueOf(weak));
    expect(opacityOf(strong)).toBeCloseTo(opacityOf(weak), 5);
  });

  it('moves the opacity with exposure and leaves the hue alone', () => {
    const stability = 12;
    const rare = coverageColour(
      coverage({ exposureCount: 1, gradedReviewCount: 1, stability }),
    );
    const often = coverageColour(
      coverage({ exposureCount: EXPOSURE_FULL, gradedReviewCount: 1, stability }),
    );

    expect(opacityOf(often)).toBeGreaterThan(opacityOf(rare));
    expect(hueOf(often)).toBe(hueOf(rare));
  });

  it('makes neither dimension recoverable from the other', () => {
    // The point of two dimensions: a node known well but rarely met and one met
    // often and still weak are different colours, and neither is a step along a
    // single scale.
    const paleGreen = coverageColour(
      coverage({ exposureCount: 1, gradedReviewCount: 2, stability: 200 }),
    );
    const solidRed = coverageColour(
      coverage({ exposureCount: EXPOSURE_FULL, gradedReviewCount: 2, stability: 0.2 }),
    );

    expect(hueOf(paleGreen)).toBeGreaterThan(hueOf(solidRed));
    expect(opacityOf(paleGreen)).toBeLessThan(opacityOf(solidRed));
  });

  it('never lets an unexplored node vanish', () => {
    expect(exposureOpacity(0)).toBe(MIN_OPACITY);
    expect(MIN_OPACITY).toBeGreaterThan(0);
  });

  it('reports no mastery at all rather than zero mastery, before any grading', () => {
    // Null is not zero. A component nobody has been tested on is unknown, not
    // known badly, and painting it the failed-review red would claim evidence
    // that does not exist.
    expect(masteryOf(coverage({ exposureCount: 9 }))).toBeNull();
    expect(hueOf(coverageColour(coverage({ exposureCount: 9 })))).toBe(0);
    expect(coverageColour(coverage({ exposureCount: 9 }))).toContain('0%');
    expect(
      coverageColour(coverage({ gradedReviewCount: 1, stability: 0 })),
    ).not.toContain('0%');
  });

  it('saturates rather than growing without bound', () => {
    expect(masteryOf(coverage({ gradedReviewCount: 1, stability: 1e9 }))).toBeLessThan(
      1,
    );
    expect(masteryHue(2)).toBe(masteryHue(1));
    expect(exposureOpacity(1000)).toBeLessThanOrEqual(1);
  });
});

describe('the legend labels both dimensions', () => {
  it('names the hue and the opacity separately, and says which is which', () => {
    const legend = renderLegend();
    const text = legend.textContent ?? '';
    expect(text).toContain(fr.heatmap.legendHue);
    expect(text).toContain(fr.heatmap.legendOpacity);
    expect(text).toContain(fr.heatmap.legendUngraded);
    // Two scales, not one.
    expect(legend.querySelectorAll('.tb-legend-row')).toHaveLength(2);
  });

  it('varies exactly one dimension per scale', () => {
    // jsdom serialises an inline background to rgb()/rgba(), so the swatches are
    // read as a colour and an alpha rather than parsed back as hsl().
    const parse = (value: string): { colour: string; alpha: number } => {
      const parts = /rgba?\(([^)]*)\)/.exec(value);
      expect(parts, value).not.toBeNull();
      const fields = (parts?.[1] ?? '').split(',').map((field) => field.trim());
      return {
        colour: fields.slice(0, 3).join(','),
        alpha: fields[3] === undefined ? 1 : Number(fields[3]),
      };
    };

    const rows = renderLegend().querySelectorAll('.tb-legend-row');
    const swatches = (row: Element): { colour: string; alpha: number }[] =>
      [...row.querySelectorAll<HTMLElement>('.tb-swatch')].map((swatch) =>
        parse(swatch.style.background),
      );

    const hues = swatches(rows[0]!);
    const opacities = swatches(rows[1]!);

    // The mastery row varies in colour and holds the alpha fixed.
    expect(new Set(hues.map((entry) => entry.colour)).size).toBe(hues.length);
    expect(new Set(hues.map((entry) => entry.alpha)).size).toBe(1);

    // The exposure row is one colour throughout and varies only in alpha. A row
    // that also changed colour would be a second single scale.
    expect(new Set(opacities.map((entry) => entry.colour)).size).toBe(1);
    expect(new Set(opacities.map((entry) => entry.alpha)).size).toBe(opacities.length);
  });
});

describe('the map says why it is grey, and only while it is', () => {
  function options(map: CoverageMap) {
    return {
      coverage: map,
      domain: null,
      selectedId: null,
      width: PHONE,
      onSelectDomain: () => undefined,
      onSelectLeaf: () => undefined,
    };
  }

  const someLeaf = LEAVES[0]!.id;

  it('distinguishes a learner who has done nothing from one who has only asked', () => {
    // The same grey for two different reasons, and one sentence cannot be true
    // of both: telling somebody with 9 encounters that nothing is recorded is
    // false, and it is the half of the population most likely to read the grey
    // as a broken feature.
    expect(coverageStance(new Map())).toBe('empty');
    expect(coverageStance(new Map([[someLeaf, coverage({ exposureCount: 9 })]]))).toBe(
      'ungraded',
    );
  });

  it('counts a graded review rather than an exposure as what colours the map', () => {
    const graded = new Map([
      [someLeaf, coverage({ exposureCount: 0, gradedReviewCount: 1, stability: 4 })],
    ]);
    expect(coverageStance(graded)).toBe('graded');
    // A graded_review_count with no stability is not evidence of mastery, and
    // masteryOf already refuses it; the stance must refuse it on the same terms
    // rather than counting the raw number, or a half-written row would silence
    // the explanation on a map that is still entirely grey.
    expect(
      coverageStance(
        new Map([[someLeaf, coverage({ exposureCount: 2, gradedReviewCount: 1 })]]),
      ),
    ).toBe('ungraded');
  });

  it('explains the grey to the learner who only asks questions', () => {
    const section = renderHeatmap(
      options(new Map([[someLeaf, coverage({ exposureCount: 3 })]])),
    );
    const why = section.querySelector('.tb-why-grey');
    expect(why).not.toBeNull();
    expect(why?.getAttribute('data-stance')).toBe('ungraded');

    const text = why?.textContent ?? '';
    expect(text).toContain(fr.heatmap.whyGreyUngraded);
    // The two dimensions named in words. Both hints were authored for this and
    // had no call site anywhere in src until it was built.
    expect(text).toContain(fr.heatmap.exposureHint);
    expect(text).toContain(fr.heatmap.masteryHint);
  });

  it('says the other thing on a fresh install', () => {
    const why = renderHeatmap(options(new Map())).querySelector('.tb-why-grey');
    expect(why?.getAttribute('data-stance')).toBe('empty');
    expect(why?.textContent).toContain(fr.heatmap.whyGreyEmpty);
  });

  it('takes itself off the screen once the map has colour to read', () => {
    // Not permanent furniture. Once anything is graded the map explains itself
    // in hue, and 390 px of vertical space is worth more than the paragraph.
    const graded = new Map([
      [someLeaf, coverage({ exposureCount: 3, gradedReviewCount: 1, stability: 4 })],
    ]);
    expect(renderHeatmap(options(graded)).querySelector('.tb-why-grey')).toBeNull();
  });

  it('leaves the legend at two rows', () => {
    // The legend is the two dimensions and nothing else. This paragraph explains
    // the grid, so it must not arrive as a third scale beside them.
    const section = renderHeatmap(options(new Map()));
    expect(section.querySelectorAll('.tb-legend-row')).toHaveLength(2);
  });
});

describe('the heatmap drills down by domain', () => {
  function options(width: number, domain: (typeof DOMAIN_CODES)[number] | null) {
    return {
      coverage: new Map(),
      domain,
      selectedId: null,
      width,
      onSelectDomain: () => undefined,
      onSelectLeaf: () => undefined,
    };
  }

  it('shows twelve domains rather than three hundred leaves', () => {
    // The decision recorded in TASKS.md: three hundred cells at a thumb's width
    // do not fit a telephone, so the overview is the twelve domains.
    const section = renderHeatmap(options(PHONE, null));
    expect(section.querySelectorAll('[data-domain]')).toHaveLength(DOMAIN_CODES.length);
    expect(section.querySelectorAll('[data-node-id]')).toHaveLength(0);
  });

  it('shows one domain worth of leaves once one is chosen', () => {
    const domain = DOMAIN_CODES[0]!;
    const section = renderHeatmap(options(PHONE, domain));
    const expected = LEAVES.filter((leaf) => domainOf(leaf.id) === domain).length;
    expect(expected).toBeGreaterThan(0);
    expect(section.querySelectorAll('[data-node-id]')).toHaveLength(expected);
    expect(section.textContent).toContain(fr.heatmap.back);
  });

  it('re-lays-out rather than scaling, so a cell is the same size at both widths', () => {
    // A viewBox would scale the text with the grid, and a label legible at
    // 1180 px would be unreadable at 360 px. The column count moves instead.
    expect(columnsFor(PHONE, LEAF_CELL)).toBeLessThan(columnsFor(DESKTOP, LEAF_CELL));
    expect(columnsFor(PHONE, DOMAIN_CELL)).toBeGreaterThanOrEqual(1);
    // The overview is capped, so a wide screen gets rows rather than one strip
    // with the twelfth domain stranded on its own.
    expect(columnsFor(DESKTOP, DOMAIN_CELL, MAX_DOMAIN_COLUMNS)).toBe(
      MAX_DOMAIN_COLUMNS,
    );

    const phone = renderHeatmap(options(PHONE, null)).querySelector('svg');
    const desktop = renderHeatmap(options(DESKTOP, null)).querySelector('svg');
    expect(phone?.getAttribute('viewBox')).toBeNull();
    expect(Number(phone?.getAttribute('width'))).toBeLessThanOrEqual(PHONE);
    expect(Number(desktop?.getAttribute('width'))).toBeGreaterThan(
      Number(phone?.getAttribute('width')),
    );
  });

  it('gives every cell a name and a key, because there is no hover', () => {
    const cells = renderHeatmap(options(PHONE, null)).querySelectorAll(
      '.tb-heatmap-cell',
    );
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      expect(cell.getAttribute('role')).toBe('button');
      expect(cell.getAttribute('tabindex')).toBe('0');
      expect(cell.getAttribute('aria-label')).toContain(fr.heatmap.exposureCount);
    }
  });

  it('says the two numbers in words, not only in paint', () => {
    const summary = coverageSummary(
      coverage({ exposureCount: 4, gradedReviewCount: 2, stability: 3 }),
    );
    expect(summary).toContain(fr.heatmap.exposureCount);
    expect(summary).toContain(fr.heatmap.gradedCount);
    expect(summary).toContain('4');
    expect(summary).toContain('2');
  });
});

describe('a domain aggregates its leaves', () => {
  it('averages mastery over the graded leaves only', () => {
    // Averaging the ungraded ones in as zero would say a domain is known badly
    // when it is merely untested.
    const graded = coverage({ exposureCount: 2, gradedReviewCount: 1, stability: 40 });
    const untested = coverage({ exposureCount: 2 });
    expect(masteryOf(aggregate([graded, untested]))).toBeCloseTo(
      masteryOf(graded) ?? 0,
      5,
    );
  });

  it('reports no mastery for a domain nobody has been graded on', () => {
    expect(masteryOf(aggregate([coverage({ exposureCount: 5 })]))).toBeNull();
  });

  it('averages exposure rather than summing it, so domain sizes compare', () => {
    const mixed = aggregate([
      coverage({ exposureCount: 0 }),
      coverage({ exposureCount: 4 }),
    ]);
    expect(mixed.exposureCount).toBe(2);
  });
});

describe('the gaps list', () => {
  it('separates unexplored from unpractised', () => {
    expect(gapKindOf(coverage())).toBe('unexplored');
    expect(gapKindOf(coverage({ exposureCount: 3 }))).toBe('unpractised');
    // Graded at least once is no longer a gap at all.
    expect(
      gapKindOf(coverage({ exposureCount: 3, gradedReviewCount: 1, stability: 2 })),
    ).toBeNull();
  });

  it('ranks novel and false-friend gaps above transfer ones', () => {
    const ranked = gapsOfKind('unexplored', new Map());
    const weights = ranked.map(
      (gap) => CONTRAST_SELECTION_WEIGHT[gap.leaf.contrast_fr.status],
    );
    expect(weights.length).toBe(LEAVES.length);
    // Monotone non-increasing: the ranking really is by contrast weight.
    for (let index = 1; index < weights.length; index += 1) {
      expect(weights[index]!).toBeLessThanOrEqual(weights[index - 1]!);
    }
    const novel = exemplar('novel');
    const transfer = exemplar('transfer');
    if (novel === undefined || transfer === undefined) return;
    const ids = ranked.map((gap) => gap.leaf.id);
    expect(ids.indexOf(novel.id)).toBeLessThan(ids.indexOf(transfer.id));
  });

  it('does not reuse a status as a second ordering, because it cannot rank', () => {
    // The DET and PREP finding: near-miss covers two thirds of some domains, so
    // it discriminates nothing within them. The weights are a separate table,
    // and this is what makes the two orderings distinguishable at all.
    expect(CONTRAST_SELECTION_WEIGHT.novel).toBeGreaterThan(
      CONTRAST_SELECTION_WEIGHT['near-miss'],
    );
  });

  it('puts a leaf in exactly one of the two lists', () => {
    const met = LEAVES[0];
    if (met === undefined) return;
    const map = mapOf([[met.id, coverage({ exposureCount: 2 })]]);

    const unexplored = gapsOfKind('unexplored', map).map((gap) => gap.leaf.id);
    const unpractised = gapsOfKind('unpractised', map).map((gap) => gap.leaf.id);

    expect(unpractised).toEqual([met.id]);
    expect(unexplored).not.toContain(met.id);
    expect(unexplored.length + unpractised.length).toBe(LEAVES.length);
  });

  it('says how many it left out rather than truncating silently', () => {
    const section = renderGaps({ coverage: new Map(), onSelect: () => undefined });
    const column = section.querySelector('[data-gap-kind="unexplored"]');
    expect(column?.querySelectorAll('.tb-gap-button')).toHaveLength(GAP_LIMIT);
    expect(column?.textContent).toContain(
      `${String(LEAVES.length - GAP_LIMIT)} ${fr.gaps.hidden}`,
    );
  });

  it('says in French when a list is empty rather than showing nothing', () => {
    const section = renderGaps({ coverage: new Map(), onSelect: () => undefined });
    // Nothing has been met, so the unpractised column is empty by construction.
    expect(
      section.querySelector('[data-gap-kind="unpractised"]')?.textContent,
    ).toContain(fr.gaps.none);
  });

  it('names both kinds from the shared copy table', () => {
    const section = renderGaps({ coverage: new Map(), onSelect: () => undefined });
    const text = section.textContent ?? '';
    expect(text).toContain(fr.heatmap.unexplored);
    expect(text).toContain(fr.heatmap.unpractised);
  });
});
