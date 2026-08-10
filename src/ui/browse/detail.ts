/**
 * The detail pane: one leaf, every authored field, nothing computed.
 *
 * This is the instrument the 2b gloss pass is reviewed with, so it shows what
 * was authored rather than a tidied summary of it. Catalan forms and examples
 * are data and are never translated; they are tagged lang="ca" so a screen
 * reader does not read them as French.
 */
import {
  ancestorsOf,
  leafById,
  siblingsOf,
  splitComponentRefs,
  type LeafNode,
} from '../../taxonomy';
import { fr } from '../../i18n/fr';
import { coverageOf, coverageSummary, gapKindOf, type CoverageMap } from './coverage';
import { speakControl, voiceNotice } from '../speak';

function field(label: string, value: Node | string, lang?: string): HTMLDivElement {
  const row = document.createElement('div');
  row.className = 'tb-field';

  const term = document.createElement('dt');
  term.className = 'tb-field-label';
  term.textContent = label;

  const definition = document.createElement('dd');
  definition.className = 'tb-field-value';
  if (lang !== undefined) definition.lang = lang;
  definition.append(value);

  row.append(term, definition);
  return row;
}

function examplesList(examples: readonly string[]): HTMLUListElement {
  const list = document.createElement('ul');
  list.className = 'tb-examples';
  list.lang = 'ca';
  for (const example of examples) {
    const item = document.createElement('li');
    item.textContent = example;
    list.append(item);
  }
  return list;
}

function contrastBlock(leaf: LeafNode): HTMLDivElement {
  const block = document.createElement('div');
  block.className = 'tb-contrast';
  block.dataset['status'] = leaf.contrast_fr.status;

  const label = document.createElement('span');
  label.className = 'tb-contrast-status';
  // The French wording for each status lives in fr.contrast and is reused here
  // rather than restated, so the browser and the heatmap legend cannot drift.
  label.textContent = fr.contrast[leaf.contrast_fr.status];

  const note = document.createElement('p');
  note.className = 'tb-contrast-note';
  note.textContent = leaf.contrast_fr.note;

  block.append(label, note);
  return block;
}

/**
 * A tappable reference to another leaf.
 *
 * Deliberately not `.tb-leaf-button`: that class means "one of the 300 buttons
 * in the tree" and a test counts them against LEAVES.length.
 */
function leafLink(
  id: string,
  label: string,
  onSelect: (id: string) => void,
): HTMLElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tb-ref';
  button.dataset['nodeId'] = id;
  button.lang = 'ca';
  button.textContent = label;
  button.addEventListener('click', () => {
    onSelect(id);
  });
  return button;
}

/**
 * Authored prose with its component references made navigable.
 *
 * TEN OF THE 69 REFERENCES NAME A BRANCH RATHER THAN A LEAF, and selection here
 * is leaf-only from end to end: handing a branch id to onSelect would clear the
 * highlight and blank the pane the reader was in the middle of. Those ten stay
 * plain text. Widening selection to branches is a bigger change than this.
 *
 * Nothing is inserted around a link, not a bracket and not a space. The prose is
 * the authored string and a test asserts the pane still contains it verbatim.
 */
function prose(text: string, onSelect: (id: string) => void): DocumentFragment {
  const fragment = document.createDocumentFragment();
  for (const segment of splitComponentRefs(text)) {
    if (segment.id !== undefined && leafById(segment.id) !== undefined) {
      fragment.append(leafLink(segment.id, segment.text, onSelect));
    } else {
      fragment.append(document.createTextNode(segment.text));
    }
  }
  return fragment;
}

/**
 * Where this leaf sits, and what sits beside it.
 *
 * Two different kinds of edge, and they are not worth the same. The breadcrumb
 * and the siblings are adjacency: an artefact of where the taxonomy happened to
 * be cut, useful for moving around and claiming nothing. The `notes` references
 * are a judgement somebody made that two rules belong together, and those are
 * linked in place, in the sentence that says why.
 *
 * Returns null when a leaf is an only child, which seven of them are. An empty
 * block reads as a gap in the data rather than as a leaf that has no siblings.
 */
function relatedBlock(
  leaf: LeafNode,
  onSelect: (id: string) => void,
): HTMLElement | null {
  const siblings = siblingsOf(leaf);
  if (siblings.length === 0) return null;

  const block = document.createElement('div');
  block.className = 'tb-related';

  const list = document.createElement('ul');
  list.className = 'tb-related-list';
  for (const sibling of siblings) {
    const item = document.createElement('li');
    item.append(leafLink(sibling.id, sibling.ca, onSelect));
    list.append(item);
  }

  block.append(list);
  return block;
}

/**
 * The path down to this leaf, in French.
 *
 * 23 leaves sit directly under a domain root, so their trail is one item and
 * says little. It is still worth drawing for them, because the alternative is a
 * pane that sometimes has a trail and sometimes does not.
 */
function breadcrumb(leaf: LeafNode): HTMLElement {
  const trail = document.createElement('p');
  trail.className = 'tb-breadcrumb';
  trail.textContent = ancestorsOf(leaf.id)
    .map((branch) => branch.label_fr)
    .join(` ${String.fromCodePoint(0x203a)} `);
  return trail;
}

/**
 * The heatmap's two dimensions, in words.
 *
 * This is where the colour is explained, because the primary device has no
 * hover and a tooltip is therefore not an explanation. Tapping a cell already
 * selects the node, so this pane is the one place that can say in French what
 * the hue and the opacity say in paint.
 */
function coverageBlock(leaf: LeafNode, coverage: CoverageMap): HTMLDivElement {
  const block = document.createElement('div');
  block.className = 'tb-coverage';

  const entry = coverageOf(coverage, leaf.id);
  const counts = document.createElement('p');
  counts.className = 'tb-coverage-counts';
  counts.textContent = coverageSummary(entry);

  block.append(counts);

  const kind = gapKindOf(entry);
  if (kind !== null) {
    const gap = document.createElement('p');
    gap.className = 'tb-coverage-gap';
    gap.dataset['gapKind'] = kind;
    gap.textContent =
      kind === 'unexplored' ? fr.heatmap.unexplored : fr.heatmap.unpractised;
    block.append(gap);
  }

  return block;
}

export interface DetailOptions {
  readonly coverage?: CoverageMap;
  /**
   * Selects another leaf. Navigation only: the browse view emits no evidence,
   * and moving between leaves is not an encounter with either of them.
   */
  readonly onSelect?: (id: string) => void;
}

export function renderDetail(
  leaf: LeafNode | undefined,
  options: DetailOptions = {},
): HTMLElement {
  const coverage = options.coverage ?? new Map();
  const onSelect = options.onSelect ?? ((): void => undefined);
  const panel = document.createElement('div');
  panel.className = 'tb-detail';

  if (leaf === undefined) {
    const empty = document.createElement('p');
    empty.className = 'tb-detail-empty';
    empty.textContent = fr.browser.emptyDetail;
    panel.append(empty);
    return panel;
  }

  panel.dataset['nodeId'] = leaf.id;

  const heading = document.createElement('h2');
  heading.className = 'tb-detail-heading';
  heading.lang = 'ca';
  heading.textContent = leaf.ca;

  // The component ID is an authoring affordance, not a field of the language.
  // It is what a gloss-review pass navigates back to data/*.fragment.json with,
  // and filter.ts puts it first in searchableText, so it is also the only thing
  // on screen hinting that an ID can be typed into the search box. Kept for
  // both, demoted out of the field list so a learner's eye passes over it
  // instead of meeting it as the first labelled row of every leaf.
  const identifier = document.createElement('p');
  identifier.className = 'tb-detail-id';
  identifier.textContent = leaf.id;

  const fields = document.createElement('dl');
  fields.className = 'tb-fields';
  // Gloss, examples, contrast, uninterrupted. The CEFR level used to sit
  // between the gloss and the examples, which put a two-character metadata
  // field ahead of the Catalan; it now sits with the coverage counts, which is
  // the other thing here that is about the leaf rather than in it.
  //
  // The gloss stays ABOVE the examples rather than below them, against the
  // first draft of docs/03: it names the rule the examples illustrate, and
  // three Catalan sentences under a bare Catalan heading leave a reader working
  // out what the point is before they can read for it.
  //
  // « Forme catalane » is gone. It repeated the <h2> directly above it, which
  // already carries lang="ca", so the row was a second copy and nothing else.
  fields.append(
    field(fr.browser.fieldGloss, leaf.glosses.fr),
    field(fr.browser.fieldExamples, examplesList(leaf.examples)),
    field(fr.browser.contrast, contrastBlock(leaf)),
    field(fr.browser.fieldCefr, leaf.cefr),
    field(fr.heatmap.stateLabel, coverageBlock(leaf, coverage)),
  );

  // notes and dialect_note are optional in the schema, and an empty row for an
  // absent field reads as a gap in the authoring rather than as a field the
  // leaf does not need.
  if (leaf.notes !== undefined) {
    // Linked in place rather than collected into a list below, because the
    // sentence around a reference is the argument for it. A « voir aussi » row
    // would keep the edge and throw away the reason.
    fields.append(field(fr.browser.fieldNotes, prose(leaf.notes, onSelect)));
  }
  if (leaf.dialect_note !== undefined) {
    fields.append(field(fr.browser.fieldDialect, leaf.dialect_note));
  }

  const related = relatedBlock(leaf, onSelect);
  if (related !== null) {
    fields.append(field(fr.browser.related, related));
  }

  // Audio on the reference form only, not on each example.
  //
  // The three leaves this phase was designed around, PHON.so.reduccio_vocalica,
  // PHON.so.ensordiment and PHON.so.erra_final, were kept in a text-only
  // application precisely because each has a written consequence; hearing the
  // citation form is what closes the gap between the rule and the sound. A
  // button per example would put six identical controls in a pane read on a
  // telephone, for a gain the citation form already gives.
  const audio = document.createElement('div');
  audio.className = 'tb-detail-audio';
  audio.append(speakControl(leaf.ca, { label: leaf.ca }), voiceNotice());

  panel.append(breadcrumb(leaf), heading, identifier, audio, fields);
  return panel;
}
