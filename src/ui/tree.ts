/**
 * The tree pane.
 *
 * The top level is built from DOMAIN_CODES, the closed list of twelve, and not
 * from the domains that happen to be present in the data. Six of the twelve
 * have no nodes at all right now, and a tree that showed only the six seeded
 * ones would read as the whole language. The unseeded ones are rendered as
 * non-expandable rows saying so.
 */
import { DOMAIN_CODES, isLeaf } from '../taxonomy';
import type { BranchNode, DomainCode, LeafNode, TaxonomyNode } from '../taxonomy';
import { fr } from '../i18n/fr';
import { isFiltered, visibleIds } from './filter';
import type { BrowserFilters } from './filter';

export interface TreeOptions {
  readonly nodes: readonly TaxonomyNode[];
  readonly filters: BrowserFilters;
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
}

type ChildIndex = ReadonlyMap<string | null, readonly TaxonomyNode[]>;

function childrenIndex(nodes: readonly TaxonomyNode[]): ChildIndex {
  const index = new Map<string | null, TaxonomyNode[]>();
  for (const node of nodes) {
    const siblings = index.get(node.parent);
    if (siblings === undefined) index.set(node.parent, [node]);
    else siblings.push(node);
  }
  return index;
}

function countLeavesUnder(id: string, index: ChildIndex): number {
  let total = 0;
  for (const child of index.get(id) ?? []) {
    total += isLeaf(child) ? 1 : countLeavesUnder(child.id, index);
  }
  return total;
}

function chip(className: string, text: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = className;
  span.textContent = text;
  return span;
}

function renderLeaf(leaf: LeafNode, options: TreeOptions): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'tb-leaf';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tb-leaf-button';
  button.dataset['nodeId'] = leaf.id;
  if (options.selectedId === leaf.id) {
    button.classList.add('tb-leaf-button--selected');
    button.setAttribute('aria-current', 'true');
  }
  button.addEventListener('click', () => {
    options.onSelect(leaf.id);
  });

  // The Catalan form is data and is never translated, so it carries its own
  // language tag rather than inheriting the document's lang="fr".
  const form = chip('tb-form', leaf.ca);
  form.lang = 'ca';
  button.append(form, chip('tb-cefr', leaf.cefr));

  item.append(button);
  return item;
}

function renderChildren(
  parent: string,
  options: TreeOptions,
  index: ChildIndex,
  visible: ReadonlySet<string>,
): HTMLUListElement {
  const list = document.createElement('ul');
  list.className = 'tb-children';

  for (const child of index.get(parent) ?? []) {
    if (!visible.has(child.id)) continue;
    list.append(
      isLeaf(child)
        ? renderLeaf(child, options)
        : renderBranch(child, options, index, visible),
    );
  }

  return list;
}

function renderBranch(
  branch: BranchNode,
  options: TreeOptions,
  index: ChildIndex,
  visible: ReadonlySet<string>,
): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'tb-branch';

  const details = document.createElement('details');
  // A filtered view opens itself: a match hidden three collapsed levels down
  // reads as no match at all.
  details.open = isFiltered(options.filters);

  const summary = document.createElement('summary');
  summary.dataset['nodeId'] = branch.id;
  summary.append(chip('tb-label', branch.label_fr));
  details.append(summary, renderChildren(branch.id, options, index, visible));

  item.append(details);
  return item;
}

function renderUnseededDomain(domain: DomainCode): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'tb-domain tb-domain--unseeded';
  item.dataset['domain'] = domain;
  item.dataset['unseeded'] = 'true';

  // The code, with no French name beside it. Domain labels live in label_fr on
  // the root branch, which does not exist until the domain is seeded; naming it
  // here would mint a second source for something the taxonomy will own.
  item.append(chip('tb-code', domain), chip('tb-badge', fr.browser.unseeded));
  return item;
}

function renderSeededDomain(
  root: BranchNode,
  options: TreeOptions,
  index: ChildIndex,
  visible: ReadonlySet<string>,
): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'tb-domain';
  item.dataset['domain'] = root.id;

  const details = document.createElement('details');
  details.open = isFiltered(options.filters);

  const summary = document.createElement('summary');
  summary.dataset['nodeId'] = root.id;
  summary.append(
    chip('tb-code', root.id),
    chip('tb-label', root.label_fr),
    // The leaf count is the honest signal for a thinly seeded domain. VERB and
    // PRON are seed-only, but that fact lives in TASKS.md prose rather than in
    // the data, so a count beside their siblings says it without this file
    // keeping a list that goes stale the moment VERB gets its 2a pass.
    chip(
      'tb-count',
      `${countLeavesUnder(root.id, index)} ${fr.browser.leafCountLabel}`,
    ),
  );

  details.append(summary, renderChildren(root.id, options, index, visible));
  item.append(details);
  return item;
}

export function renderTree(options: TreeOptions): HTMLElement {
  const index = childrenIndex(options.nodes);
  const visible = visibleIds(options.nodes, options.filters);
  const filtered = isFiltered(options.filters);

  const roots = new Map<string, BranchNode>();
  for (const root of index.get(null) ?? []) {
    if (!isLeaf(root)) roots.set(root.id, root);
  }

  const list = document.createElement('ul');
  list.className = 'tb-tree';

  for (const domain of DOMAIN_CODES) {
    const root = roots.get(domain);
    if (root === undefined) {
      // Under an active filter an unseeded domain is not a result: it has no
      // leaves, so it matches nothing, and six "not yet seeded" rows above two
      // hits reads as a broken filter rather than as honest coverage.
      if (!filtered) list.append(renderUnseededDomain(domain));
    } else if (visible.has(root.id)) {
      list.append(renderSeededDomain(root, options, index, visible));
    }
  }

  return list;
}
