/**
 * The variant prompt: the phase 1 prefix unchanged, then the variant
 * instruction as a third system block with its own cache breakpoint (decided
 * 29 Oct, F2). A phrase call and a variant call to the same model share the
 * cached phase 1 prefix, vocabulary and all, and the phase 1 prompt hash, and
 * so its recordings, are untouched.
 *
 * Like src/api/prompt.ts, this is French prose that is not user-facing copy.
 * Every table it states (tense and tournure IDs, roles per axis, the reasons)
 * is rendered from its executable home rather than written out again.
 */
import { NNBSP, quote } from '../i18n/fr';
import { NOT_APPLICABLE_REASONS, type NotApplicableReason } from '../api/phrase';
import type { Chunk } from '../api/phrase-check';
import {
  buildSystemBlocks,
  guidanceTable,
  type CacheTtl,
  type SystemBlock,
} from '../api/prompt';
import { VARIANT_SCHEMA } from '../api/schema';
import {
  DROP,
  TENSES,
  TENSE_ID,
  TOURNURE_ID,
  VARIANT_PERSONS,
  type Tense,
  type Tournure,
} from './axes';
import { ROLES_BY_AXIS, type VariantContext } from './check';
import { timeWordFor, type Axis, type Combination } from './combination';

const TENSE_GUIDANCE: Record<Tense, string> = {
  present: 'présent',
  ahir: 'passé périphrastique, pour un passé raconté',
  avui: 'passé composé, pour une période qui inclut le présent',
  imperfet: 'imparfait',
  futur: 'futur',
  condicional: 'conditionnel',
};

const TOURNURE_GUIDANCE: Record<Exclude<Tournure, 'none'>, string> = {
  haver: `${quote('haver de')} suivi de l’infinitif`,
  acabar: `${quote('acabar de')} suivi de l’infinitif`,
  estar: `${quote('estar')} suivi du gérondif`,
};

const REASON_GUIDANCE: Record<NotApplicableReason, string> = {
  aspect_incompatible: 'le verbe de cette phrase ne prend pas cette forme',
  subordinate_affected: 'la cible obligerait à changer une autre proposition',
  no_pronoun_form: 'ce complément ne se remplace pas par un pronom faible ici',
  other: 'la cible ne s’applique pas pour une autre raison',
};

function list(values: readonly string[]): string {
  return values.map((value) => quote(value)).join(', ');
}

/** Static: it names no sentence and no combination, so it caches. */
export const VARIANT_INSTRUCTION = [
  'Variantes. Quand le message est un objet JSON avec les champs ' +
    `${quote('base')} et ${quote('target')}, tu ne traduis pas${NNBSP}: tu ` +
    `récris la phrase catalane de ${quote('base')} pour qu’elle réalise ` +
    `${quote('target')}, en changeant le moins possible. ${quote('base.chunks')} ` +
    'est son découpage. La réponse suit le schéma des variantes, et les règles ' +
    'ci-dessus sur les champs, les segments, les rôles et les identifiants valent ' +
    'pour la variante.',
  '',
  `Champ ${quote('target')}${NNBSP}: les cinq axes. null veut dire que l’axe ` +
    'reste tel qu’il est dans la phrase, et un axe qui vaut déjà ce que dit ' +
    'la phrase ne change rien.',
  `- person${NNBSP}: ${list(VARIANT_PERSONS)}, la personne du verbe principal. ` +
    `${quote('ell')} et ${quote('ella')} sont toutes deux ${quote('3sg')} dans ` +
    `${quote('subject.person')}.`,
  `- tense${NNBSP}:`,
  guidanceTable(TENSE_GUIDANCE, TENSES).replaceAll('- ', '  - '),
  `- tournure${NNBSP}: ${quote('none')} pour aucune, sinon${NNBSP}:`,
  guidanceTable(TOURNURE_GUIDANCE, ['haver', 'acabar', 'estar'] as const).replaceAll(
    '- ',
    '  - ',
  ),
  `- pronoun${NNBSP}: true remplace le complément d’objet direct par un pronom ` +
    `faible${NNBSP}; le segment ${quote('object_direct')} disparaît et le pronom ` +
    `est un segment ${quote('clitic')} ou s’attache au verbe.`,
  `- negation${NNBSP}: true pour la phrase à la négation, false pour la phrase ` +
    'affirmative.',
  '',
  'Le segment du verbe porte toujours l’identifiant du temps et, s’il y en a ' +
    `une, celui de la tournure${NNBSP}: ` +
    TENSES.map((tense) => `${tense} ${TENSE_ID[tense]}`).join(', ') +
    `${NNBSP}; ` +
    (['haver', 'acabar', 'estar'] as const)
      .map((tournure) => `${tournure} ${TOURNURE_ID[tournure]}`)
      .join(', ') +
    '.',
  '',
  `Champ ${quote('timeWord')}${NNBSP}: un mot, et le segment ${quote('time')} ` +
    'devient exactement ce mot, avec une majuscule seulement en tête de ' +
    `phrase${NNBSP}; ${quote(DROP)}, et le segment ${quote('time')} disparaît${NNBSP}; ` +
    `absent, et le segment ${quote('time')} reste tel quel, ou il n’y en a pas. ` +
    'N’ajoute jamais de segment de temps.',
  '',
  'Seuls changent les segments que demande un axe modifié, et parmi eux les ' +
    `rôles suivants${NNBSP}:`,
  ...(Object.keys(ROLES_BY_AXIS) as Axis[]).map(
    (axis) => `- ${axis}${NNBSP}: ${list(ROLES_BY_AXIS[axis])}`,
  ),
  'Tout autre segment garde son texte. Seul le verbe principal change.',
  '',
  `Champ ${quote('fr')}${NNBSP}: une traduction française simple et fidèle de ` +
    'la variante, sans aucun commentaire de grammaire.',
  '',
  `Champ ${quote('status')}${NNBSP}: ${quote('ok')} avec la variante, ou ` +
    `${quote('not_applicable')} avec seulement ${quote('reason')} quand la cible ` +
    `ne s’applique pas à cette phrase${NNBSP}:`,
  guidanceTable(REASON_GUIDANCE, NOT_APPLICABLE_REASONS),
].join('\n');

/**
 * The phase 1 blocks byte for byte, then the variant instruction. Its own
 * breakpoint caches it too; the phase 1 breakpoint before it is what a phrase
 * call to the same model also reads.
 */
export function buildVariantSystemBlocks(ttl: CacheTtl = '5m'): readonly SystemBlock[] {
  return [
    ...buildSystemBlocks(ttl),
    {
      type: 'text',
      text: VARIANT_INSTRUCTION,
      cache_control: ttl === '1h' ? { type: 'ephemeral', ttl } : { type: 'ephemeral' },
    },
  ];
}

/** The original sentence as a request carries it: its Catalan and its chunks, no spans. */
export interface VariantBase {
  readonly ca: string;
  readonly chunks: readonly Chunk[];
}

export interface VariantRequest {
  readonly base: VariantBase;
  readonly target: Combination;
  readonly timeWord?: string;
}

/**
 * The request for `target`, always from the original sentence (D2), and the
 * context its reply is checked against.
 */
export function buildVariantRequest(
  original: VariantBase & { readonly combination: Combination },
  target: Combination,
): { readonly request: VariantRequest; readonly context: VariantContext } {
  const chunks = original.chunks.map(({ text, role, ids, unlinked, lemma }) => ({
    text,
    role,
    ids,
    ...(unlinked !== undefined && { unlinked }),
    ...(lemma !== undefined && { lemma }),
  }));
  const timeWord = timeWordFor(
    {
      combination: original.combination,
      hasTimeChunk: chunks.some((chunk) => chunk.role === 'time'),
    },
    target,
  );
  return {
    request: {
      base: { ca: original.ca, chunks },
      target,
      ...(timeWord !== undefined && { timeWord }),
    },
    context: {
      original: { chunks, combination: original.combination },
      target,
      ...(timeWord !== undefined && { timeWord }),
    },
  };
}

/** The dynamic suffix: the request, and nothing else. */
export function buildVariantUserContent(request: VariantRequest): string {
  return JSON.stringify(request);
}

/**
 * The fingerprint of a variant reply's prompt: all three blocks and the variant
 * schema. A cached variant or a recording made under another one is stale.
 */
export async function variantPromptHash(): Promise<string> {
  const source = JSON.stringify({
    system: buildVariantSystemBlocks().map((block) => block.text),
    schema: VARIANT_SCHEMA,
  });
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(source),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
