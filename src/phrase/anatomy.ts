/**
 * What « Anatomie » draws for a stored phrase: the chunks in sentence order,
 * the implicit subject first when Catalan drops it, and the caption, colour
 * and accessible name of each. Labels come from fr.ts and the taxonomy, never
 * from the model.
 */
import type { Assumption, ChunkRole, Person, UnlinkedReason } from '../api/phrase';
import type { ComponentId } from '../api/schema';
import type { PhraseRow } from '../db/rows';
import { fr, labelled } from '../i18n/fr';
import { leafById } from '../taxonomy/index';

/** The leaf the implicit « (jo) » chunk teaches. */
export const SUBJECT_PRONOUN_ID: ComponentId = 'PRON.fort.subjecte';

export interface AnatomyChunk {
  /** Stable within one phrase, for keyed lists. */
  readonly key: string;
  readonly text: string;
  readonly role: ChunkRole;
  readonly ids: readonly ComponentId[];
  readonly unlinked?: UnlinkedReason;
  /** Added by the app from `subject.person`, drawn dashed. */
  readonly implicit: boolean;
}

/**
 * The colour family of a role, as the canvas draws it. The caption repeats the
 * role in words, so colour is never the only signal.
 */
export type Tone =
  'subject' | 'time' | 'negation' | 'clitic' | 'verb' | 'object' | 'place' | 'neutral';

const TONES: Partial<Record<ChunkRole, Tone>> = {
  subject: 'subject',
  time: 'time',
  negation: 'negation',
  clitic: 'clitic',
  verb: 'verb',
  object_direct: 'object',
  object_indirect: 'object',
  place: 'place',
};

export function toneOf(role: ChunkRole): Tone {
  return TONES[role] ?? 'neutral';
}

/**
 * The strong pronoun Catalan leaves out for this person. Catalan data, not
 * copy: it is shown in Catalan and never translated.
 */
export function droppedPronoun(
  person: Person,
  assumptions: readonly Assumption[],
): string | null {
  const formal = assumptions.includes('addressee_formal');
  switch (person) {
    case '1sg':
      return 'jo';
    case '2sg':
      return 'tu';
    case '3sg':
      if (formal) return 'vostè';
      return assumptions.includes('subject_fem') ? 'ella' : 'ell';
    case '1pl':
      return 'nosaltres';
    case '2pl':
      return 'vosaltres';
    case '3pl':
      if (formal) return 'vostès';
      return assumptions.includes('plural_fem') ? 'elles' : 'ells';
    case 'none':
      return null;
  }
}

/** The chunks to draw, the implicit subject first. Empty when the anatomy failed. */
export function anatomyOf(row: PhraseRow): AnatomyChunk[] {
  const chunks: AnatomyChunk[] = row.chunks.map((chunk, index) => ({
    key: String(index),
    text: chunk.text,
    role: chunk.role,
    ids: chunk.ids,
    ...(chunk.unlinked !== undefined && { unlinked: chunk.unlinked }),
    implicit: false,
  }));
  if (row.subject === null || row.subject.expressed) return chunks;
  const pronoun = droppedPronoun(row.subject.person, row.assumptions);
  if (pronoun === null) return chunks;
  return [
    {
      key: 'subject',
      text: `(${pronoun})`,
      role: 'subject',
      ids: [SUBJECT_PRONOUN_ID],
      implicit: true,
    },
    ...chunks,
  ];
}

/** « Verbe · vaig cantar »: the role, then the first leaf's Catalan form. */
export function captionOf(chunk: AnatomyChunk): string {
  const role = fr.roles[chunk.role];
  const first = chunk.ids[0];
  if (first === undefined) {
    return `${role} · ${fr.unlinked[chunk.unlinked ?? 'no_notion']}`;
  }
  const leaf = leafById(first);
  return leaf === undefined ? role : `${role} · ${leaf.ca}`;
}

/** « vaig comprar, verbe, le passé périphrastique… »: text, role, first notion. */
export function accessibleNameOf(chunk: AnatomyChunk): string {
  const role = fr.roles[chunk.role].toLocaleLowerCase('fr');
  const first = chunk.ids[0];
  const notion =
    first === undefined
      ? fr.unlinked[chunk.unlinked ?? 'no_notion']
      : (leafById(first)?.glosses.fr ?? first);
  return `${chunk.text}, ${role}, ${notion}`;
}

/** « On a supposé : tu, locutrice. », or null when nothing was assumed. */
export function assumptionsLine(assumptions: readonly Assumption[]): string | null {
  if (assumptions.length === 0) return null;
  const labels = assumptions.map((assumption) => fr.assumptions[assumption]);
  return `${labelled(fr.phrase.assumed, labels.join(', '))}.`;
}
