/**
 * The gaps list.
 *
 * UNEXPLORED and UNPRACTISED are two lists, not one list with a badge. Zero
 * exposure means the learner has never met the notion at all; exposure above
 * zero with no graded review means they have met it and never been tested on
 * it. The second is the more actionable, and a merged list ranked by contrast
 * would bury it under three hundred untouched leaves.
 *
 * The ranking within each is CONTRAST_SELECTION_WEIGHT, the same table the
 * review selector uses, so the two cannot disagree about which gap matters. It
 * is not the FSRS difficulty prior, which collapses three statuses to one
 * number and could not produce this ordering.
 */
import { fr } from '../../i18n/fr';
import { gapsOfKind, type CoverageMap, type Gap, type GapKind } from './coverage';

/**
 * How many of each kind are listed.
 *
 * An untouched taxonomy has three hundred unexplored leaves, and a list of
 * three hundred is not a list. What is dropped is stated in the interface
 * rather than silently truncated, because a cut-off that says nothing reads as
 * complete coverage.
 */
export const GAP_LIMIT = 12;

const HINT: Record<GapKind, string> = {
  unexplored: fr.gaps.unexploredHint,
  unpractised: fr.gaps.unpractisedHint,
};

const TITLE: Record<GapKind, string> = {
  unexplored: fr.heatmap.unexplored,
  unpractised: fr.heatmap.unpractised,
};

function renderGap(gap: Gap, onSelect: (id: string) => void): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'tb-gap';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tb-gap-button';
  button.dataset['nodeId'] = gap.leaf.id;
  button.addEventListener('click', () => {
    onSelect(gap.leaf.id);
  });

  const form = document.createElement('span');
  form.className = 'tb-form';
  form.lang = 'ca';
  form.textContent = gap.leaf.ca;

  const status = document.createElement('span');
  status.className = 'tb-gap-status';
  status.dataset['status'] = gap.leaf.contrast_fr.status;
  status.textContent = fr.contrast[gap.leaf.contrast_fr.status];

  button.append(form, status);
  item.append(button);
  return item;
}

function renderColumn(
  kind: GapKind,
  coverage: CoverageMap,
  onSelect: (id: string) => void,
): HTMLElement {
  const column = document.createElement('div');
  column.className = 'tb-gap-column';
  column.dataset['gapKind'] = kind;

  const heading = document.createElement('h4');
  heading.className = 'tb-gap-heading';
  heading.textContent = TITLE[kind];

  const hint = document.createElement('p');
  hint.className = 'tb-hint';
  hint.textContent = HINT[kind];

  column.append(heading, hint);

  const gaps = gapsOfKind(kind, coverage);
  if (gaps.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'tb-hint';
    empty.textContent = fr.gaps.none;
    column.append(empty);
    return column;
  }

  const list = document.createElement('ul');
  list.className = 'tb-gap-list';
  for (const gap of gaps.slice(0, GAP_LIMIT)) list.append(renderGap(gap, onSelect));
  column.append(list);

  const hidden = gaps.length - Math.min(gaps.length, GAP_LIMIT);
  if (hidden > 0) {
    const note = document.createElement('p');
    note.className = 'tb-hint';
    note.textContent = `${String(hidden)} ${fr.gaps.hidden}`;
    column.append(note);
  }

  return column;
}

export interface GapsOptions {
  readonly coverage: CoverageMap;
  readonly onSelect: (id: string) => void;
}

export function renderGaps(options: GapsOptions): HTMLElement {
  const section = document.createElement('section');
  section.className = 'tb-gaps';

  const heading = document.createElement('h3');
  heading.className = 'tb-subheading';
  heading.textContent = fr.gaps.heading;

  const ranking = document.createElement('p');
  ranking.className = 'tb-hint';
  ranking.textContent = fr.gaps.ranking;

  const columns = document.createElement('div');
  columns.className = 'tb-gap-columns';
  columns.append(
    renderColumn('unexplored', options.coverage, options.onSelect),
    renderColumn('unpractised', options.coverage, options.onSelect),
  );

  section.append(heading, ranking, columns);
  return section;
}
