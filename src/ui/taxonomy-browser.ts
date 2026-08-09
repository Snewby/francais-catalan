/**
 * The read-only taxonomy browser.
 *
 * BROWSING EMITS NO EVIDENCE. Nothing under src/ui/ may reach src/db/dexie.ts
 * or src/srs/apply.ts, and nothing here writes exposure_count. Scrolling a tree
 * is not an encounter, and an exposure counter that browsing could move is
 * precisely the failure EVIDENCE_EFFECTS in src/srs/evidence.ts exists to
 * prevent: the coverage heatmap would become a log of what was clicked on,
 * presented as a map of what is known. Enforced by
 * test/browser-emits-no-evidence.test.ts.
 *
 * Phase 6 extends this component into the heatmap. It will need to READ
 * per-component state, which is legitimate; the ban is on the write path.
 */
import { CONTRAST_STATUSES, LEAVES, NODES, leafById } from '../taxonomy';
import type { Cefr, ContrastStatus } from '../taxonomy';
import { fr } from '../i18n/fr';
import { NO_FILTERS, matchingLeaves } from './filter';
import type { BrowserFilters } from './filter';
import { renderTree } from './tree';
import { renderDetail } from './detail';
import './browser.css';

/** The levels actually present in the taxonomy, rather than a second copy of the CEFR scale. */
function cefrLevels(): readonly Cefr[] {
  return [...new Set(LEAVES.map((leaf) => leaf.cefr))].sort();
}

function labelledControl(labelText: string, control: HTMLElement): HTMLLabelElement {
  const label = document.createElement('label');
  label.className = 'tb-control';
  const caption = document.createElement('span');
  caption.className = 'tb-control-label';
  caption.textContent = labelText;
  label.append(caption, control);
  return label;
}

function select(
  options: readonly { value: string; label: string }[],
): HTMLSelectElement {
  const element = document.createElement('select');
  element.className = 'tb-select';
  const any = document.createElement('option');
  any.value = '';
  any.textContent = fr.browser.filterAny;
  element.append(any);
  for (const option of options) {
    const item = document.createElement('option');
    item.value = option.value;
    item.textContent = option.label;
    element.append(item);
  }
  return element;
}

export function mountTaxonomyBrowser(host: HTMLElement): void {
  let filters: BrowserFilters = NO_FILTERS;
  let selectedId: string | null = null;

  const root = document.createElement('section');
  root.className = 'tb';

  const heading = document.createElement('h2');
  heading.className = 'tb-heading';
  heading.textContent = fr.browser.heading;

  const readOnly = document.createElement('p');
  readOnly.className = 'tb-readonly';
  readOnly.textContent = fr.browser.readOnly;

  const search = document.createElement('input');
  search.type = 'search';
  search.className = 'tb-search';
  search.placeholder = fr.browser.searchPlaceholder;

  const cefr = select(cefrLevels().map((level) => ({ value: level, label: level })));
  const status = select(
    CONTRAST_STATUSES.map((value) => ({ value, label: fr.contrast[value] })),
  );

  const expand = document.createElement('button');
  expand.type = 'button';
  expand.className = 'tb-toggle';
  expand.textContent = fr.browser.expandAll;

  const collapse = document.createElement('button');
  collapse.type = 'button';
  collapse.className = 'tb-toggle';
  collapse.textContent = fr.browser.collapseAll;

  const toolbar = document.createElement('div');
  toolbar.className = 'tb-toolbar';
  toolbar.append(
    labelledControl(fr.browser.searchLabel, search),
    labelledControl(fr.browser.filterCefr, cefr),
    labelledControl(fr.browser.contrast, status),
    expand,
    collapse,
  );

  const results = document.createElement('p');
  results.className = 'tb-results';

  const treePane = document.createElement('div');
  treePane.className = 'tb-pane tb-pane--tree';

  const detailPane = document.createElement('div');
  detailPane.className = 'tb-pane tb-pane--detail';

  const panes = document.createElement('div');
  panes.className = 'tb-panes';
  panes.append(treePane, detailPane);

  function setAllOpen(open: boolean): void {
    for (const details of treePane.querySelectorAll('details')) details.open = open;
  }

  /**
   * Selection moves the highlight and swaps the detail pane, and deliberately
   * does NOT rebuild the tree. Rebuilding resets every <details> to its
   * filter-derived default, so the tree collapsed under the reviewer on every
   * click. Reading a domain means opening a branch and working down its leaves,
   * which that made impossible.
   */
  function renderSelection(): void {
    for (const button of treePane.querySelectorAll<HTMLElement>('.tb-leaf-button')) {
      const selected = button.dataset['nodeId'] === selectedId;
      button.classList.toggle('tb-leaf-button--selected', selected);
      if (selected) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    }

    detailPane.replaceChildren(
      renderDetail(selectedId === null ? undefined : leafById(selectedId)),
    );
  }

  /** Rebuilds the tree. Only a filter change needs this. */
  function render(): void {
    const matched = matchingLeaves(NODES, filters);
    results.textContent = `${matched.length} ${fr.browser.resultsLabel}`;

    treePane.replaceChildren(
      renderTree({
        nodes: NODES,
        filters,
        selectedId,
        onSelect: (id) => {
          selectedId = id;
          renderSelection();
        },
      }),
    );

    if (matched.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'tb-no-results';
      empty.textContent = fr.browser.noResults;
      treePane.append(empty);
    }

    renderSelection();
  }

  search.addEventListener('input', () => {
    filters = { ...filters, query: search.value };
    render();
  });
  cefr.addEventListener('change', () => {
    filters = { ...filters, cefr: cefr.value === '' ? null : (cefr.value as Cefr) };
    render();
  });
  status.addEventListener('change', () => {
    filters = {
      ...filters,
      status: status.value === '' ? null : (status.value as ContrastStatus),
    };
    render();
  });
  expand.addEventListener('click', () => {
    setAllOpen(true);
  });
  collapse.addEventListener('click', () => {
    setAllOpen(false);
  });

  root.append(heading, readOnly, toolbar, results, panes);
  host.replaceChildren(root);
  render();
}
