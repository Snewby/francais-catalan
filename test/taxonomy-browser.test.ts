/**
 * The taxonomy browser.
 *
 * IDs are drawn from LEAVES at runtime rather than written as literals.
 * test/closed-vocabulary.test.ts scans test/ for component-ID literals, and a
 * hardcoded ID would also pin this file to a domain that a later seeding pass
 * may re-axe. See the DET section of TASKS.md, where an axis was re-cut after
 * the leaves under it were already authored.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DOMAIN_CODES,
  LEAVES,
  NODES,
  domainOf,
  isLeaf,
  nodeById,
} from '../src/taxonomy';
import type { LeafNode } from '../src/taxonomy';
import { fr } from '../src/i18n/fr';
import { NO_FILTERS, matchesLeaf, normalise, visibleIds } from '../src/ui/filter';
import { mountTaxonomyBrowser } from '../src/ui/taxonomy-browser';
import { renderTree } from '../src/ui/tree';
import type { TreeOptions } from '../src/ui/tree';

/** The first leaf carrying every optional field, so the detail panel is fully exercised. */
function richLeaf(): LeafNode {
  const withNotes = LEAVES.find((leaf) => leaf.notes !== undefined);
  expect(withNotes, 'no leaf carries notes').toBeDefined();
  return withNotes!;
}

function mount(): HTMLElement {
  const host = document.createElement('div');
  document.body.replaceChildren(host);
  mountTaxonomyBrowser(host);
  return host;
}

/**
 * Tree options over a taxonomy with one domain removed, so that the unseeded
 * rendering can still be exercised now that all twelve domains have nodes. The
 * domain is taken from the data rather than named, on the same grounds as the
 * note at the top of this file.
 */
function treeWithoutOneDomain(): TreeOptions {
  const dropped = domainOf(NODES[0]!.id);
  expect(dropped, 'no domain to drop').toBeDefined();
  return {
    nodes: NODES.filter((node) => domainOf(node.id) !== dropped),
    filters: NO_FILTERS,
    selectedId: null,
    onSelect: () => undefined,
  };
}

describe('search and filter predicates', () => {
  it('folds case, diacritics and both apostrophes for search only', () => {
    expect(normalise('Français')).toBe('francais');
    expect(normalise('s’ha')).toBe(normalise("s'ha"));
  });

  it('shows every node when nothing is filtered', () => {
    expect(visibleIds(NODES, NO_FILTERS).size).toBe(NODES.length);
  });

  it('keeps the ancestors of every matching leaf', () => {
    // This is the one-tree rule. A filtered view is the same hierarchy with
    // non-matching leaves hidden, never a flat result list and never a
    // regrouping under status or CEFR headings.
    const filters = { ...NO_FILTERS, status: 'novel' as const };
    const visible = visibleIds(NODES, filters);

    for (const id of visible) {
      const node = nodeById(id);
      expect(node, id).toBeDefined();
      if (node!.parent === null) continue;
      expect(visible.has(node!.parent), `${id} is shown without its parent`).toBe(true);
    }
  });

  it('shows no leaf that fails the filter', () => {
    const filters = { ...NO_FILTERS, status: 'novel' as const };
    const visible = visibleIds(NODES, filters);
    const wrong = NODES.filter(isLeaf)
      .filter((leaf) => visible.has(leaf.id))
      .filter((leaf) => leaf.contrast_fr.status !== 'novel');
    expect(wrong.map((leaf) => leaf.id)).toEqual([]);
  });

  it('searches the Catalan form and the French gloss alike', () => {
    const leaf = LEAVES[0];
    expect(leaf).toBeDefined();
    expect(matchesLeaf(leaf!, { ...NO_FILTERS, query: leaf!.ca })).toBe(true);
    const glossWord = leaf!.glosses.fr.split(' ')[0] ?? '';
    expect(matchesLeaf(leaf!, { ...NO_FILTERS, query: glossWord })).toBe(true);
  });

  it('combines the filters conjunctively', () => {
    const leaf = richLeaf();
    expect(
      matchesLeaf(leaf, {
        query: '',
        cefr: leaf.cefr,
        status: leaf.contrast_fr.status,
      }),
    ).toBe(true);
    const otherStatus = leaf.contrast_fr.status === 'novel' ? 'transfer' : 'novel';
    expect(matchesLeaf(leaf, { query: '', cefr: leaf.cefr, status: otherStatus })).toBe(
      false,
    );
  });
});

describe('the tree pane', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = mount();
  });

  it('shows all twelve domains, seeded or not', () => {
    // Built from DOMAIN_CODES rather than from the domains present in the data.
    // Six have no nodes at all, and a tree showing only the seeded six would
    // read as the whole language.
    expect(host.querySelectorAll('.tb-domain')).toHaveLength(DOMAIN_CODES.length);
  });

  // These two used to assert against the live taxonomy, which worked only while
  // some domain was unseeded. All twelve are seeded now, so that form of the
  // assertion passes vacuously or fails outright, and deleting it would drop
  // the only cover on a code path that still exists in renderTree. They drive
  // renderTree with a node set that omits one domain instead. Do not restore
  // the live-data form: the next seeding pass would break it again, and there
  // is no next seeding pass.
  it('says in French that a domain is not yet seeded', () => {
    const list = renderTree(treeWithoutOneDomain());
    const unseeded = list.querySelectorAll('[data-unseeded="true"]');
    expect(unseeded).toHaveLength(1);
    expect(unseeded[0]?.textContent).toContain(fr.browser.unseeded);
  });

  it('renders no unseeded domain as an expandable branch', () => {
    const list = renderTree(treeWithoutOneDomain());
    const rows = list.querySelectorAll('[data-unseeded="true"]');
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.querySelector('details')).toBeNull();
    }
  });

  it('shows every domain as seeded once the whole taxonomy is present', () => {
    // The live counterpart of the two above, and the reason they had to move.
    expect(host.querySelectorAll('[data-unseeded="true"]')).toHaveLength(0);
  });

  it('counts the leaves under every seeded domain', () => {
    const seeded = host.querySelectorAll('.tb-domain:not([data-unseeded])');
    expect(seeded.length).toBeGreaterThan(0);
    for (const row of seeded) {
      expect(row.querySelector('.tb-count')?.textContent).toContain(
        fr.browser.leafCountLabel,
      );
    }
  });

  it('offers one selectable button per leaf', () => {
    expect(host.querySelectorAll('.tb-leaf-button')).toHaveLength(LEAVES.length);
  });
});

describe('the detail pane', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = mount();
  });

  it('invites a selection before one is made', () => {
    expect(host.querySelector('.tb-detail')?.textContent).toContain(
      fr.browser.emptyDetail,
    );
  });

  it('shows every authored field of the selected leaf', () => {
    const leaf = richLeaf();
    const button = host.querySelector<HTMLButtonElement>(
      `.tb-leaf-button[data-node-id="${leaf.id}"]`,
    );
    expect(button, leaf.id).not.toBeNull();
    button!.click();

    const detail = host.querySelector('.tb-detail');
    const text = detail?.textContent ?? '';
    expect(detail?.getAttribute('data-node-id')).toBe(leaf.id);
    expect(text).toContain(leaf.ca);
    expect(text).toContain(leaf.glosses.fr);
    expect(text).toContain(leaf.cefr);
    expect(text).toContain(leaf.contrast_fr.note);
    expect(text).toContain(leaf.notes ?? '');
    for (const example of leaf.examples) expect(text).toContain(example);
  });

  it('does not collapse the tree when a leaf is selected', () => {
    // Reviewing a domain means opening a branch and working down its leaves.
    // Rebuilding the tree on selection reset every <details> to its
    // filter-derived default, so the tree collapsed on every click and the
    // reviewer lost their place after one leaf.
    const opened = host.querySelector('details');
    expect(opened).not.toBeNull();
    opened!.open = true;

    const leaf = richLeaf();
    host
      .querySelector<HTMLButtonElement>(`.tb-leaf-button[data-node-id="${leaf.id}"]`)
      ?.click();

    expect(host.querySelectorAll('details[open]').length).toBeGreaterThan(0);
    expect(host.querySelector('.tb-detail')?.getAttribute('data-node-id')).toBe(
      leaf.id,
    );
  });

  it('moves the highlight to the newly selected leaf', () => {
    const [first, second] = LEAVES;
    expect(second).toBeDefined();

    host
      .querySelector<HTMLButtonElement>(`.tb-leaf-button[data-node-id="${first!.id}"]`)
      ?.click();
    host
      .querySelector<HTMLButtonElement>(`.tb-leaf-button[data-node-id="${second!.id}"]`)
      ?.click();

    const selected = host.querySelectorAll<HTMLElement>('.tb-leaf-button--selected');
    expect([...selected].map((button) => button.dataset['nodeId'])).toEqual([
      second!.id,
    ]);
  });

  it('labels the contrast status from the shared French table', () => {
    const leaf = richLeaf();
    host
      .querySelector<HTMLButtonElement>(`.tb-leaf-button[data-node-id="${leaf.id}"]`)
      ?.click();
    expect(host.querySelector('.tb-contrast-status')?.textContent).toBe(
      fr.contrast[leaf.contrast_fr.status],
    );
  });

  it('tags Catalan examples as Catalan, not as French', () => {
    const leaf = richLeaf();
    host
      .querySelector<HTMLButtonElement>(`.tb-leaf-button[data-node-id="${leaf.id}"]`)
      ?.click();
    expect(host.querySelector('.tb-examples')?.getAttribute('lang')).toBe('ca');
  });
});

describe('filtering through the interface', () => {
  it('narrows the tree to the chosen contrast status', () => {
    const host = mount();
    // Order follows the toolbar: search, CEFR, then contrast status.
    const status = host.querySelectorAll('select')[1];
    expect(status).toBeDefined();

    status!.value = 'novel';
    status!.dispatchEvent(new Event('change'));

    const shown = [...host.querySelectorAll<HTMLElement>('.tb-leaf-button')].map(
      (button) => button.dataset['nodeId'],
    );
    expect(shown.length).toBeGreaterThan(0);
    for (const id of shown) {
      const node = nodeById(id ?? '');
      expect(node && isLeaf(node) && node.contrast_fr.status).toBe('novel');
    }
  });

  it('reports how many notions the filter matched', () => {
    const host = mount();
    expect(host.querySelector('.tb-results')?.textContent).toContain(
      `${LEAVES.length} ${fr.browser.resultsLabel}`,
    );
  });

  it('says so in French when nothing matches', () => {
    const host = mount();
    const search = host.querySelector<HTMLInputElement>('.tb-search');
    expect(search).not.toBeNull();

    search!.value = 'zzzzzzz';
    search!.dispatchEvent(new Event('input'));

    expect(host.querySelector('.tb-no-results')?.textContent).toBe(
      fr.browser.noResults,
    );
  });
});
