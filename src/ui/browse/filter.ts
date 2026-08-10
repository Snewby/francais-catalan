/**
 * Search and filter predicates for the taxonomy browser.
 *
 * Deliberately DOM-free, so the one-tree rule below can be tested without
 * rendering anything.
 *
 * ONE TREE ONLY. Everything here is a predicate over the existing hierarchy.
 * Nothing in this file groups, sorts or reparents nodes: filtering to a CEFR
 * level or a contrast status hides the leaves that do not match and keeps the
 * branches above the ones that do. A filter that built A1/A2/B1 headings would
 * be a second pedagogic hierarchy competing with the taxonomy, and the axis
 * rule in the DET section of TASKS.md exists to stop exactly that.
 */
import { isLeaf } from '../../taxonomy';
import type { Cefr, ContrastStatus, LeafNode, TaxonomyNode } from '../../taxonomy';

export interface BrowserFilters {
  readonly query: string;
  readonly cefr: Cefr | null;
  readonly status: ContrastStatus | null;
}

export const NO_FILTERS: BrowserFilters = { query: '', cefr: null, status: null };

export function isFiltered(filters: BrowserFilters): boolean {
  return (
    filters.query.trim() !== '' || filters.cefr !== null || filters.status !== null
  );
}

/**
 * Folds case, diacritics and both apostrophes together, so that searching
 * "sha" finds `s'ha` and "frances" finds « français ».
 *
 * SEARCH ONLY. This is not the answer comparator. Phase 6 compares a typed
 * Catalan attempt against a reference and emits a `recall` event from the
 * outcome; that comparison has to respect the straight-apostrophe policy on
 * Catalan forms, which this function deliberately destroys. Two jobs, two
 * functions, and binding them together would make a lenient search quietly
 * mark wrong answers correct.
 */
export function normalise(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[’']/g, '')
    .toLowerCase();
}

/** Every field a free-text search should reach, joined into one haystack. */
export function searchableText(leaf: LeafNode): string {
  return [
    leaf.id,
    leaf.ca,
    leaf.glosses.fr,
    ...leaf.examples,
    leaf.notes ?? '',
    leaf.dialect_note ?? '',
    leaf.contrast_fr.note,
  ].join(' ');
}

export function matchesLeaf(leaf: LeafNode, filters: BrowserFilters): boolean {
  if (filters.cefr !== null && leaf.cefr !== filters.cefr) return false;
  if (filters.status !== null && leaf.contrast_fr.status !== filters.status)
    return false;

  const query = normalise(filters.query.trim());
  if (query === '') return true;
  return normalise(searchableText(leaf)).includes(query);
}

/**
 * The IDs to render: every matching leaf, plus the branches above it.
 *
 * The ancestors are what keeps a filtered view a view of the one tree rather
 * than a flat result list. A leaf shown without its branch loses the only
 * context that says what it contrasts with.
 */
export function visibleIds(
  nodes: readonly TaxonomyNode[],
  filters: BrowserFilters,
): ReadonlySet<string> {
  if (!isFiltered(filters)) return new Set(nodes.map((node) => node.id));

  const parentOf = new Map(nodes.map((node) => [node.id, node.parent]));
  const visible = new Set<string>();

  for (const node of nodes) {
    if (!isLeaf(node) || !matchesLeaf(node, filters)) continue;
    visible.add(node.id);
    let parent = node.parent as string | null;
    while (parent !== null && !visible.has(parent)) {
      visible.add(parent);
      parent = parentOf.get(parent) ?? null;
    }
  }

  return visible;
}

/** Matching leaves only, for the result count. Branches are context, not hits. */
export function matchingLeaves(
  nodes: readonly TaxonomyNode[],
  filters: BrowserFilters,
): readonly LeafNode[] {
  return nodes.filter(isLeaf).filter((leaf) => matchesLeaf(leaf, filters));
}
