/**
 * What the Phrase screen draws from two states of a sentence: the chunks to
 * ring, the change line and the notions to explain. Pure functions, so the
 * session holds state and this module holds the rules.
 */
import type { SpannedChunk } from '../api/phrase-check';
import type { ComponentId } from '../api/schema';
import type { AnatomyChunk } from '../phrase/anatomy';
import { sameText } from './check';
import type { Axis, Combination } from './combination';
import { SWITCH_NOTES } from './notes';

export const NO_RINGS: ReadonlySet<string> = new Set();

/** French prose takes the typographic apostrophe; a model may write the straight one. */
export function frenchProse(text: string): string {
  return text.replaceAll("'", '’');
}

/**
 * Which drawn chunks differ from the state before, pairing chunks of one role
 * in order, as the validator does (F8). Keys are those of `current`.
 */
export function changedKeys(
  previous: readonly AnatomyChunk[],
  current: readonly AnatomyChunk[],
): ReadonlySet<string> {
  const changed = new Set<string>();
  for (const role of new Set(current.map((chunk) => chunk.role))) {
    const was = previous.filter((chunk) => chunk.role === role);
    current
      .filter((chunk) => chunk.role === role)
      .forEach((chunk, index) => {
        const before = was[index];
        if (before === undefined || !sameText(before.text, chunk.text))
          changed.add(chunk.key);
      });
  }
  return changed;
}

/** A sentence as drawn: its Catalan, its spanned chunks and the anatomy built from them. */
export interface Drawn {
  readonly ca: string;
  readonly chunks: readonly SpannedChunk[];
  readonly anatomy: readonly AnatomyChunk[];
}

/**
 * « vaig comprar → ha comprat »: on each side, the stretch of the Catalan from
 * the first changed chunk to the last, read off `ca` so elision and hyphens
 * stay as written (« l'he comprat », not « l' he comprat »). The verb is always
 * in the stretch, so a chunk that appears or disappears (« no », « el pa »)
 * reads against what it attaches to. An implicit subject that changed leads.
 */
export function changeLine(previous: Drawn, current: Drawn): string {
  const side = (drawn: Drawn, changed: ReadonlySet<string>): string => {
    const picked = drawn.anatomy.filter(
      (chunk) => changed.has(chunk.key) || chunk.role === 'verb',
    );
    const implicit = picked
      .filter((chunk) => chunk.implicit)
      .map((chunk) => chunk.text);
    const spans = picked
      .filter((chunk) => !chunk.implicit)
      .map((chunk) => drawn.chunks[Number(chunk.key)])
      .filter((chunk) => chunk !== undefined);
    const stretch =
      spans.length === 0
        ? ''
        : drawn.ca.slice(
            Math.min(...spans.map((chunk) => chunk.start)),
            Math.max(...spans.map((chunk) => chunk.end)),
          );
    return [...implicit, stretch].filter((part) => part !== '').join(' ');
  };
  return `${side(previous, changedKeys(current.anatomy, previous.anatomy))} → ${side(current, changedKeys(previous.anatomy, current.anatomy))}`;
}

/** The elision card is never shown for taking a pronoun away (decided 22 Oct). */
const ELISION_ID = 'PRON.feble.forma_alomorfs';
const SUBJECT_ID: ComponentId = 'PRON.fort.subjecte';

/**
 * The notions the last tap introduced, one card each: the switchable notions
 * the variant links and the state before did not; for a person tap the
 * « Sujet » card; for a toggle turned off, the notion it took away (decided
 * 22 Oct). Notions without an authored switch note are left out, so a card is
 * always about the switch, not an incidental link.
 */
export function changeCards(
  axis: Axis,
  value: Combination[Axis],
  previous: readonly SpannedChunk[],
  current: readonly SpannedChunk[],
): ComponentId[] {
  const ids = (chunks: readonly SpannedChunk[]) =>
    new Set(chunks.flatMap((chunk) => chunk.ids));
  const before = ids(previous);
  const after = ids(current);
  const switchable = (id: ComponentId) => SWITCH_NOTES[id] !== undefined;
  const cards = [...after].filter((id) => !before.has(id) && switchable(id));
  if (axis === 'person' && !cards.includes(SUBJECT_ID)) cards.unshift(SUBJECT_ID);
  if ((axis === 'pronoun' || axis === 'negation') && value === false) {
    for (const id of before) {
      if (!after.has(id) && switchable(id) && id !== ELISION_ID) cards.push(id);
    }
  }
  return cards;
}
