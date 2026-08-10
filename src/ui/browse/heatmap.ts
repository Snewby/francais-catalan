/**
 * The coverage heatmap.
 *
 * Two decisions here were taken before the first screenshot rather than after,
 * and both are recorded in TASKS.md.
 *
 * IT DRILLS DOWN BY DOMAIN. Three hundred leaves at a thumb's width do not fit
 * a 390 px screen, and shrinking them until they do produces a decorative
 * texture nobody can touch. The overview is twelve labelled domain tiles;
 * choosing one shows that domain's leaves. The phone is the primary surface, so
 * the phone case is the design rather than the fallback.
 *
 * IT IS DRAWN AT 1:1 AND RE-LAID-OUT ON RESIZE, not scaled by a viewBox. A
 * viewBox scales its text with it, so a label legible at 1280 px is unreadable
 * at 390 px and a touch target sized for a thumb stops being one. The column
 * count is computed from the measured width instead, and the cells keep their
 * size at both.
 *
 * NO HOVER ANYWHERE. There is none on a touch screen. Every cell is a button,
 * and what a colour says is said again in words in the detail pane.
 */
import { DOMAIN_CODES } from '../../taxonomy';
import type { DomainCode, LeafNode } from '../../taxonomy';
import { fr, labelled } from '../../i18n/fr';
import {
  MASTERED_HUE,
  coverageColour,
  coverageOf,
  coverageSummary,
  domainCoverage,
  exposureOpacity,
  leavesOfDomain,
  masteryHue,
  type CoverageMap,
} from './coverage';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Domain tile, big enough for a code and a count. */
export const DOMAIN_CELL = 104;

/** Leaf cell, at roughly a thumb's width rather than a pointer's. */
export const LEAF_CELL = 44;

/** The gap inside a cell, so adjacent colours do not read as one block. */
const CELL_GAP = 3;

/**
 * Widest the domain overview goes.
 *
 * At 1280 px an uncapped grid gave eleven columns and left the twelfth domain
 * alone on a second row, which reads as a strip with a mistake at the end
 * rather than as a map. Six is two clean rows there and does not affect the
 * phone, which fits three.
 */
export const MAX_DOMAIN_COLUMNS = 6;

export function columnsFor(width: number, cell: number, cap = Infinity): number {
  return Math.max(1, Math.min(Math.floor(width / cell), cap));
}

function svg(width: number, height: number): SVGSVGElement {
  const element = document.createElementNS(SVG_NS, 'svg');
  element.setAttribute('width', String(width));
  element.setAttribute('height', String(height));
  element.classList.add('tb-heatmap-grid');
  return element;
}

function cellRect(x: number, y: number, size: number, colour: string): SVGRectElement {
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', String(x + CELL_GAP / 2));
  rect.setAttribute('y', String(y + CELL_GAP / 2));
  rect.setAttribute('width', String(size - CELL_GAP));
  rect.setAttribute('height', String(size - CELL_GAP));
  rect.setAttribute('rx', '4');
  rect.setAttribute('fill', colour);
  return rect;
}

function cellText(
  x: number,
  y: number,
  text: string,
  className: string,
): SVGTextElement {
  const label = document.createElementNS(SVG_NS, 'text');
  label.setAttribute('x', String(x));
  label.setAttribute('y', String(y));
  label.setAttribute('text-anchor', 'middle');
  label.classList.add(className);
  label.textContent = text;
  return label;
}

/**
 * A cell is a button, not a decorated rectangle.
 *
 * `role="button"` plus a tabindex rather than a real <button>, because an HTML
 * button cannot be a child of <svg>. The accessible name comes from <title>,
 * which is also what a pointer would show; on the primary device there is no
 * pointer, which is why the detail pane repeats it in words.
 */
function cellGroup(name: string, onActivate: () => void): SVGGElement {
  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('role', 'button');
  group.setAttribute('tabindex', '0');
  group.setAttribute('aria-label', name);
  group.classList.add('tb-heatmap-cell');

  const title = document.createElementNS(SVG_NS, 'title');
  title.textContent = name;
  group.append(title);

  group.addEventListener('click', onActivate);
  group.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate();
    }
  });
  return group;
}

function swatch(colour: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = 'tb-swatch';
  span.style.background = colour;
  return span;
}

function legendRow(caption: string, colours: readonly string[]): HTMLDivElement {
  const row = document.createElement('div');
  row.className = 'tb-legend-row';

  const label = document.createElement('span');
  label.className = 'tb-legend-caption';
  label.textContent = caption;

  const scale = document.createElement('span');
  scale.className = 'tb-legend-scale';

  const low = document.createElement('span');
  low.className = 'tb-legend-end';
  low.textContent = fr.heatmap.legendLow;

  const high = document.createElement('span');
  high.className = 'tb-legend-end';
  high.textContent = fr.heatmap.legendHigh;

  scale.append(low, ...colours.map(swatch), high);
  row.append(label, scale);
  return row;
}

/**
 * Both dimensions, each on its own row.
 *
 * One row would be a single scale, and a single scale is the thing this
 * component exists not to be.
 */
export function renderLegend(): HTMLElement {
  const legend = document.createElement('div');
  legend.className = 'tb-legend';

  const steps = [0, 0.25, 0.5, 0.75, 1];

  legend.append(
    legendRow(
      fr.heatmap.legendHue,
      steps.map((step) => `hsl(${masteryHue(step).toFixed(0)} 62% 44%)`),
    ),
    legendRow(
      fr.heatmap.legendOpacity,
      // One hue throughout, so the row varies in exposure and in nothing else.
      [0, 1, 2, 4, 8].map(
        (met) =>
          `hsl(${String(MASTERED_HUE)} 62% 44% / ${exposureOpacity(met).toFixed(3)})`,
      ),
    ),
  );

  const ungraded = document.createElement('p');
  ungraded.className = 'tb-legend-note';
  ungraded.textContent = fr.heatmap.legendUngraded;
  legend.append(ungraded);

  return legend;
}

export interface HeatmapOptions {
  readonly coverage: CoverageMap;
  /** null shows the twelve domains; a code shows that domain's leaves. */
  readonly domain: DomainCode | null;
  readonly selectedId: string | null;
  /** Measured pixels available for the grid. Passed in so a test can fix it. */
  readonly width: number;
  readonly onSelectDomain: (domain: DomainCode | null) => void;
  readonly onSelectLeaf: (id: string) => void;
}

function renderDomainGrid(options: HeatmapOptions): SVGSVGElement {
  const columns = columnsFor(options.width, DOMAIN_CELL, MAX_DOMAIN_COLUMNS);
  const rows = Math.ceil(DOMAIN_CODES.length / columns);
  const grid = svg(columns * DOMAIN_CELL, rows * DOMAIN_CELL);

  DOMAIN_CODES.forEach((domain, index) => {
    const x = (index % columns) * DOMAIN_CELL;
    const y = Math.floor(index / columns) * DOMAIN_CELL;
    const coverage = domainCoverage(domain, options.coverage);
    const count = leavesOfDomain(domain).length;

    const group = cellGroup(`${domain}, ${coverageSummary(coverage)}`, () => {
      options.onSelectDomain(domain);
    });
    group.dataset['domain'] = domain;
    group.append(
      cellRect(x, y, DOMAIN_CELL, coverageColour(coverage)),
      cellText(x + DOMAIN_CELL / 2, y + DOMAIN_CELL / 2, domain, 'tb-heatmap-code'),
      cellText(
        x + DOMAIN_CELL / 2,
        y + DOMAIN_CELL / 2 + 18,
        `${String(count)} ${fr.browser.leafCountLabel}`,
        'tb-heatmap-sub',
      ),
    );
    grid.append(group);
  });

  return grid;
}

function renderLeafGrid(domain: DomainCode, options: HeatmapOptions): SVGSVGElement {
  const leaves: readonly LeafNode[] = leavesOfDomain(domain);
  const columns = columnsFor(options.width, LEAF_CELL);
  const rows = Math.ceil(leaves.length / columns);
  const grid = svg(columns * LEAF_CELL, Math.max(rows, 1) * LEAF_CELL);

  leaves.forEach((leaf, index) => {
    const x = (index % columns) * LEAF_CELL;
    const y = Math.floor(index / columns) * LEAF_CELL;
    const coverage = coverageOf(options.coverage, leaf.id);

    const group = cellGroup(`${leaf.ca}, ${coverageSummary(coverage)}`, () => {
      options.onSelectLeaf(leaf.id);
    });
    group.dataset['nodeId'] = leaf.id;
    if (options.selectedId === leaf.id) {
      group.classList.add('tb-heatmap-cell--selected');
      group.setAttribute('aria-current', 'true');
    }
    group.append(cellRect(x, y, LEAF_CELL, coverageColour(coverage)));
    grid.append(group);
  });

  return grid;
}

export function renderHeatmap(options: HeatmapOptions): HTMLElement {
  const section = document.createElement('section');
  section.className = 'tb-heatmap';

  const heading = document.createElement('h3');
  heading.className = 'tb-subheading';
  heading.textContent = fr.heatmap.heading;

  section.append(heading, renderLegend());

  if (options.domain === null) {
    const hint = document.createElement('p');
    hint.className = 'tb-hint';
    hint.textContent = fr.heatmap.domainsHint;
    section.append(hint, renderDomainGrid(options));
    return section;
  }

  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'tb-toggle tb-back';
  back.textContent = fr.heatmap.back;
  back.addEventListener('click', () => {
    options.onSelectDomain(null);
  });

  const current = document.createElement('p');
  current.className = 'tb-hint';
  current.textContent = labelled(
    options.domain,
    `${String(leavesOfDomain(options.domain).length)} ${fr.browser.leafCountLabel}`,
  );

  section.append(back, current, renderLeafGrid(options.domain, options));
  return section;
}
