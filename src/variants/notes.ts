/**
 * The authored switch notes: why the sentence changed when a variant switched
 * to a notion.
 *
 * data/variation-notes.json is the single source of the text (approved by Sean
 * on 22 Oct, phase 2 spec « Switch notes »). The value is a keyed map like
 * `glosses`, so a second base language adds a key rather than a second file.
 * scripts/validate-ids.ts checks that every key is a taxonomy leaf.
 */
import file from '../../data/variation-notes.json';
import { nodeById, isLeaf } from '../taxonomy';

export interface SwitchNote {
  readonly fr: string;
}

export const SWITCH_NOTES: Readonly<Record<string, SwitchNote>> = file as Record<
  string,
  SwitchNote
>;

/**
 * The French note for a notion the last tap introduced: the authored switch
 * note where there is one, else the leaf's own contrast note (spec, « Ce qui a
 * changé, et pourquoi »). Undefined only for an ID that is not a leaf.
 */
export function switchNoteFr(id: string): string | undefined {
  const authored = SWITCH_NOTES[id];
  if (authored !== undefined) return authored.fr;
  const node = nodeById(id);
  return node !== undefined && isLeaf(node) ? node.contrast_fr.note : undefined;
}
