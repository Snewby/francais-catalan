/**
 * Everything a phrase reply must pass before it is stored or shown.
 *
 * Structured outputs and Ajv guarantee the shape. They cannot guarantee that
 * the chunks are the sentence: a schema cannot say "each text is a substring
 * of ca, in order", and constrained decoding has no conditional, so it cannot
 * say "unlinked exactly when ids is empty" either. Those rules live here.
 *
 * Spans come out of the same pass. Models are unreliable at counting
 * characters, so the reply carries no offsets; they are derived from text the
 * model did produce, which is checkable.
 */
import type { Assumption, ChunkRole, Person, UnlinkedReason } from './phrase';
import type { ComponentId } from './schema';
import { validatePhraseShape } from './validate';

export interface Chunk {
  readonly text: string;
  readonly role: ChunkRole;
  readonly ids: readonly ComponentId[];
  readonly unlinked?: UnlinkedReason;
  readonly lemma?: string;
}

export interface PhraseReply {
  readonly fr: string;
  readonly ca: string;
  readonly subject: { readonly person: Person; readonly expressed: boolean };
  readonly assumptions: readonly Assumption[];
  readonly chunks: readonly Chunk[];
}

/**
 * A chunk with its place in `ca`, in UTF-16 code units with `end` exclusive,
 * so `ca.slice(start, end) === text`. Code units because that is what
 * JavaScript strings index by, and so what the screen will highlight with.
 */
export interface SpannedChunk extends Chunk {
  readonly start: number;
  readonly end: number;
}

export interface SpannedPhrase extends Omit<PhraseReply, 'chunks'> {
  readonly chunks: readonly SpannedChunk[];
}

export type PhraseCheck =
  | { readonly valid: true; readonly phrase: SpannedPhrase }
  | { readonly valid: false; readonly errors: readonly string[] };

/**
 * What `ca` may hold outside every chunk. Punctuation is not a chunk, and
 * nothing else may go untaught: a digit or a currency sign is read, so it
 * belongs to a chunk.
 */
const UNCOVERED_ALLOWED = /^[\p{P}\s]*$/u;

/**
 * Find each chunk's text in `ca`, in order, each search starting where the
 * previous chunk ended.
 *
 * Taking the first occurrence is safe. If a correct placement exists, the text
 * between the cursor and it is only punctuation and whitespace, so an earlier
 * occurrence of a chunk that contains a letter cannot fit there.
 *
 * Matching is exact: no case folding, no Unicode normalisation. The one
 * exception is made before this runs, in `straightenApostrophes`. A chunk may
 * end inside a word; whether to forbid that waits for the round 1 replies.
 */
export function deriveSpans(
  ca: string,
  chunks: readonly Chunk[],
): { readonly chunks: SpannedChunk[]; readonly errors: string[] } {
  const spanned: SpannedChunk[] = [];
  const errors: string[] = [];
  const gaps: [number, number][] = [];
  let cursor = 0;

  chunks.forEach((chunk, index) => {
    const start = ca.indexOf(chunk.text, cursor);
    if (start === -1) {
      errors.push(
        ca.includes(chunk.text)
          ? `/chunks/${index} "${chunk.text}" is out of order: it occurs in ca only before offset ${cursor}`
          : `/chunks/${index} "${chunk.text}" does not occur in ca`,
      );
      return;
    }
    const end = start + chunk.text.length;
    gaps.push([cursor, start]);
    spanned.push({ ...chunk, start, end });
    cursor = end;
  });
  gaps.push([cursor, ca.length]);

  // With a chunk unplaced, its words are uncovered too and the gap report
  // would only restate the error above.
  if (errors.length === 0) {
    for (const [from, to] of gaps) {
      const uncovered = ca.slice(from, to);
      if (!UNCOVERED_ALLOWED.test(uncovered)) {
        errors.push(
          `/ca "${uncovered.trim()}" at offset ${from} is not covered by any chunk`,
        );
      }
    }
  }

  return { chunks: spanned, errors };
}

/** The per-chunk rules, independent of where the chunk sits in `ca`. */
function chunkRuleErrors(reply: PhraseReply): string[] {
  const errors: string[] = [];
  reply.chunks.forEach((chunk, index) => {
    if (chunk.ids.length > 0 && chunk.unlinked !== undefined) {
      errors.push(`/chunks/${index} has unlinked "${chunk.unlinked}" but links IDs`);
    }
    if (chunk.ids.length === 0 && chunk.unlinked === undefined) {
      errors.push(`/chunks/${index} links no ID and gives no unlinked reason`);
    }
    // The screen adds the implicit subject itself; a subject chunk here would
    // show the learner a pronoun the Catalan does not contain.
    if (chunk.role === 'subject' && !reply.subject.expressed) {
      errors.push(`/chunks/${index} is a subject chunk but subject.expressed is false`);
    }
  });
  return errors;
}

/**
 * Catalan forms use the straight apostrophe (l'home, s'ha), and so does the
 * golden set, but a model may return the typographic one (’, U+2019) in `ca`,
 * in a chunk, or in one and not the other. Converted in both before any span is
 * looked for, so exact matching holds whichever it wrote (decided 26 Oct, phase
 * 1 step 3). `fr` is French prose and keeps its typographic apostrophes.
 *
 * After the shape check, which it cannot affect: one code unit for one.
 */
export function straightenApostrophes(reply: PhraseReply): PhraseReply {
  const straight = (text: string): string => text.replaceAll('’', "'");
  return {
    ...reply,
    ca: straight(reply.ca),
    chunks: reply.chunks.map((chunk) => ({ ...chunk, text: straight(chunk.text) })),
  };
}

export function checkPhraseReply(candidate: unknown): PhraseCheck {
  const shape = validatePhraseShape(candidate);
  if (!shape.valid) return { valid: false, errors: shape.errors };

  const reply = straightenApostrophes(candidate as PhraseReply);
  const spans = deriveSpans(reply.ca, reply.chunks);
  const errors = [...chunkRuleErrors(reply), ...spans.errors];
  if (errors.length > 0) return { valid: false, errors };

  return { valid: true, phrase: { ...reply, chunks: spans.chunks } };
}
