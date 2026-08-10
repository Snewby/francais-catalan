/**
 * The detail pane: one leaf, every authored field, nothing computed.
 *
 * This is the instrument the 2b gloss pass is reviewed with, so it shows what
 * was authored rather than a tidied summary of it. Catalan forms and examples
 * are data and are never translated; they are tagged lang="ca" so a screen
 * reader does not read them as French.
 */
import type { LeafNode } from '../../taxonomy';
import { fr } from '../../i18n/fr';
import { coverageOf, coverageSummary, gapKindOf, type CoverageMap } from './coverage';

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

export function renderDetail(
  leaf: LeafNode | undefined,
  coverage: CoverageMap = new Map(),
): HTMLElement {
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

  const fields = document.createElement('dl');
  fields.className = 'tb-fields';
  fields.append(
    field(fr.browser.fieldId, leaf.id),
    field(fr.browser.fieldCa, leaf.ca, 'ca'),
    field(fr.browser.fieldGloss, leaf.glosses.fr),
    field(fr.browser.fieldCefr, leaf.cefr),
    field(fr.browser.fieldExamples, examplesList(leaf.examples)),
    field(fr.browser.contrast, contrastBlock(leaf)),
    field(fr.heatmap.stateLabel, coverageBlock(leaf, coverage)),
  );

  // notes and dialect_note are optional in the schema, and an empty row for an
  // absent field reads as a gap in the authoring rather than as a field the
  // leaf does not need.
  if (leaf.notes !== undefined) {
    fields.append(field(fr.browser.fieldNotes, leaf.notes));
  }
  if (leaf.dialect_note !== undefined) {
    fields.append(field(fr.browser.fieldDialect, leaf.dialect_note));
  }

  panel.append(heading, fields);
  return panel;
}
