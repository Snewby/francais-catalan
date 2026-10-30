/**
 * Everything a variant reply must pass before it is stored or shown (phase 2
 * spec, « Validation »).
 *
 * The phase 1 checks come first and unchanged, through checkPhraseReply. Then
 * the variant is compared with the ORIGINAL sentence, never the previous
 * variant: every request starts from the original, so that is the only state
 * the reply can be held to. (Rings on the screen compare with the previous
 * state instead; that is display, not validation.)
 */
import type { ChunkRole, NotApplicableReason } from '../api/phrase';
import {
  checkPhraseReply,
  straight,
  type Chunk,
  type PhraseReply,
  type SpannedPhrase,
} from '../api/phrase-check';
import { validateVariantShape } from '../api/validate';
import { DROP, PERSON_OF, tenseOfId, tournureOfId, type Tournure } from './axes';
import type { Axis, Combination } from './combination';

/** The roles a change on each axis may touch (spec, « Axis | Roles it may change »). */
export const ROLES_BY_AXIS: Readonly<Record<Axis, readonly ChunkRole[]>> = {
  person: ['subject', 'verb', 'clitic', 'complement'],
  tense: ['verb', 'time', 'clitic'],
  tournure: ['verb', 'clitic'],
  pronoun: ['object_direct', 'clitic', 'verb'],
  negation: ['negation'],
};

const AXES = Object.keys(ROLES_BY_AXIS) as Axis[];

export interface VariantContext {
  readonly original: {
    readonly chunks: readonly Pick<Chunk, 'text' | 'role'>[];
    readonly combination: Combination;
  };
  readonly target: Combination;
  /** As sent in the request: a word, `drop`, or undefined when absent. */
  readonly timeWord?: string | undefined;
}

export type CheckedVariant =
  | { readonly status: 'ok'; readonly fr: string; readonly phrase: SpannedPhrase }
  | { readonly status: 'not_applicable'; readonly reason: NotApplicableReason };

export type VariantCheck =
  | { readonly valid: true; readonly variant: CheckedVariant }
  | { readonly valid: false; readonly errors: readonly string[] };

interface VariantPayload {
  readonly status: 'ok' | 'not_applicable';
  readonly fr?: string;
  readonly ca?: string;
  readonly subject?: PhraseReply['subject'];
  readonly assumptions?: PhraseReply['assumptions'];
  readonly chunks?: PhraseReply['chunks'];
  readonly reason?: NotApplicableReason;
}

const OK_FIELDS = ['fr', 'ca', 'subject', 'assumptions', 'chunks'] as const;

/**
 * Equal but for the case of the first letter. Moving a word to or from the
 * head of the sentence (a dropped time chunk, an added « No ») recapitalises
 * it without changing it, and the time-word table writes its words capitalised
 * wherever they land (decided 29 Oct, F6).
 */
export function sameText(a: string, b: string): boolean {
  const fold = (text: string) =>
    straight(text).replace(/^\p{L}/u, (first) => first.toLowerCase());
  return fold(a) === fold(b);
}

/** Chunks with the same role paired in order, the first with the first (decided 29 Oct, F8). */
export function changedRoles(
  before: readonly Pick<Chunk, 'text' | 'role'>[],
  after: readonly Pick<Chunk, 'text' | 'role'>[],
): Set<ChunkRole> {
  const changed = new Set<ChunkRole>();
  const roles = new Set([...before, ...after].map((chunk) => chunk.role));
  for (const role of roles) {
    const was = before.filter((chunk) => chunk.role === role);
    const now = after.filter((chunk) => chunk.role === role);
    const same =
      was.length === now.length &&
      was.every((chunk, index) => sameText(chunk.text, now[index]?.text ?? ''));
    if (!same) changed.add(role);
  }
  return changed;
}

function differingAxes(original: Combination, target: Combination): Axis[] {
  return AXES.filter((axis) => original[axis] !== target[axis]);
}

function roleErrors(context: VariantContext, chunks: readonly Chunk[]): string[] {
  const axes = differingAxes(context.original.combination, context.target);
  const allowed = new Set(axes.flatMap((axis) => ROLES_BY_AXIS[axis]));
  return [...changedRoles(context.original.chunks, chunks)]
    .filter((role) => !allowed.has(role))
    .map(
      (role) =>
        `the ${role} chunk changed, which no changed axis (${axes.join(', ') || 'none'}) allows`,
    );
}

function timeWordErrors(context: VariantContext, chunks: readonly Chunk[]): string[] {
  const time = chunks.filter((chunk) => chunk.role === 'time');
  const { timeWord } = context;
  if (timeWord === DROP) {
    return time.length === 0
      ? []
      : [`timeWord is drop but a time chunk "${time[0]?.text}" is left`];
  }
  if (timeWord !== undefined) {
    if (time.length === 1 && sameText(time[0]?.text ?? '', timeWord)) return [];
    return [
      `timeWord is "${timeWord}" but the time chunk is ${time.map((chunk) => `"${chunk.text}"`).join(', ') || 'missing'}`,
    ];
  }
  const was = context.original.chunks.filter((chunk) => chunk.role === 'time');
  const unchanged =
    was.length === time.length &&
    was.every((chunk, index) => sameText(chunk.text, time[index]?.text ?? ''));
  return unchanged ? [] : ['no timeWord was sent but the time chunk changed'];
}

/**
 * The tense a verb chunk realises. A tournure with no tense ID counts as
 * Présent, as at the starting state (decided 29 Oct, F4): the phase 1 replies
 * tag « Has de venir » and « Està preparant » that way in every run.
 */
function realised(chunk: Chunk): { tense: string | undefined; tournure: Tournure } {
  const tournure =
    chunk.ids.map(tournureOfId).find((found) => found !== undefined) ?? 'none';
  const tense = chunk.ids.map(tenseOfId).find((found) => found !== undefined);
  return { tense: tense ?? (tournure === 'none' ? undefined : 'present'), tournure };
}

function targetErrors(context: VariantContext, phrase: SpannedPhrase): string[] {
  const errors: string[] = [];
  const { target } = context;
  if (target.person !== null && phrase.subject.person !== PERSON_OF[target.person]) {
    errors.push(
      `subject.person is ${phrase.subject.person}, not ${PERSON_OF[target.person]} for ${target.person}`,
    );
  }
  if (target.tense !== null) {
    const verbs = phrase.chunks.filter((chunk) => chunk.role === 'verb');
    const hit = verbs.some((chunk) => {
      const found = realised(chunk);
      return found.tense === target.tense && found.tournure === target.tournure;
    });
    if (!hit) {
      errors.push(
        `no verb chunk carries ${target.tense} with tournure ${target.tournure}`,
      );
    }
  }
  return errors;
}

export function checkVariantReply(
  candidate: unknown,
  context: VariantContext,
): VariantCheck {
  const shape = validateVariantShape(candidate);
  if (!shape.valid) return { valid: false, errors: shape.errors };

  const payload = candidate as VariantPayload;
  if (payload.status === 'not_applicable') {
    const extra = OK_FIELDS.filter((field) => payload[field] !== undefined);
    if (payload.reason === undefined || extra.length > 0) {
      return {
        valid: false,
        errors: [
          ...(payload.reason === undefined ? ['not_applicable without a reason'] : []),
          ...extra.map((field) => `not_applicable carries ${field}`),
        ],
      };
    }
    return {
      valid: true,
      variant: { status: 'not_applicable', reason: payload.reason },
    };
  }

  const missing = OK_FIELDS.filter((field) => payload[field] === undefined);
  if (missing.length > 0 || payload.reason !== undefined) {
    return {
      valid: false,
      errors: [
        ...missing.map((field) => `ok without ${field}`),
        ...(payload.reason !== undefined ? ['ok carries a reason'] : []),
      ],
    };
  }

  const fr = payload.fr ?? '';
  const phase1 = checkPhraseReply({
    fr,
    ca: payload.ca,
    subject: payload.subject,
    assumptions: payload.assumptions,
    chunks: payload.chunks,
  });
  if (!phase1.valid) return phase1;

  const { phrase } = phase1;
  const errors = [
    ...(fr.trim() === '' ? ['fr is empty'] : []),
    ...roleErrors(context, phrase.chunks),
    ...timeWordErrors(context, phrase.chunks),
    ...targetErrors(context, phrase),
  ];
  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, variant: { status: 'ok', fr, phrase } };
}
