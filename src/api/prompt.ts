/**
 * The prompt sent to the model, split into a cached static prefix and a dynamic
 * suffix.
 *
 * Render order at the API is tools, then system, then messages, so everything
 * that never varies lives in `system` and the sentence lives in `messages`, on
 * its own. A single byte moving in the prefix costs a full cache write on every
 * call.
 *
 * Nothing here is user-facing copy, so it does not belong in `src/i18n/fr.ts`.
 * It is French prose all the same, and follows the same typography rules: the
 * narrow no-break space is imported rather than typed, and French prose takes
 * the typographic apostrophe while Catalan cited inside guillemets keeps the
 * straight one, which is also what the prompt asks the model to write.
 */
import { NNBSP, quote } from '../i18n/fr';
import { LEAVES } from '../taxonomy';
import {
  ASSUMPTIONS,
  CHUNK_ROLES,
  MAX_IDS_PER_CHUNK,
  UNLINKED_REASONS,
  type Assumption,
  type ChunkRole,
  type UnlinkedReason,
} from './phrase';

/**
 * Field separator in the vocabulary table. A tab is the cheapest separator that
 * cannot occur inside a gloss; test/anthropic-client.test.ts asserts that no
 * field actually contains one, because a stray tab would shift a column and the
 * model would read a Catalan form as a gloss.
 */
const FIELD = '\t';

/**
 * What each role means. Keyed by the closed enum in phrase.ts, so a role added
 * there does not compile until it is explained here.
 */
const ROLE_GUIDANCE: Record<ChunkRole, string> = {
  subject: 'le sujet exprimé, pronom fort ou groupe nominal',
  verb: 'le groupe verbal, auxiliaire et périphrase compris',
  object_direct: 'le complément d’objet direct',
  object_indirect: 'le complément d’objet indirect',
  clitic: 'un pronom faible, ou une combinaison de pronoms faibles',
  negation: 'les mots qui portent la négation',
  time: 'un complément de temps',
  place: 'un complément de lieu',
  manner: 'un complément de manière',
  quantity: 'une quantité ou un degré',
  connector: 'une conjonction ou un mot de liaison',
  complement: 'un autre complément, ou un attribut',
  other: 'ce qui n’entre dans aucun des rôles ci-dessus',
};

/** The choices French leaves open. Keyed by the closed enum in phrase.ts. */
const ASSUMPTION_GUIDANCE: Record<Assumption, string> = {
  addressee_tu: 'tu as choisi le tutoiement',
  addressee_formal: `tu as choisi le vouvoiement de politesse (${quote('vostè')}, ${quote('vostès')})`,
  speaker_fem: 'tu as supposé que la personne qui parle est une femme',
  subject_fem: 'tu as supposé que le sujet est féminin',
  plural_fem: 'tu as supposé qu’un pluriel ne désigne que des femmes',
};

/** Why a chunk links nothing. Keyed by the closed enum in phrase.ts. */
const UNLINKED_GUIDANCE: Record<UnlinkedReason, string> = {
  no_notion: 'du vocabulaire simple, sans point de grammaire à enseigner',
  outside_taxonomy:
    'un vrai point de grammaire qui n’a pas d’identifiant dans le vocabulaire',
};

function guidanceTable<K extends string>(
  guidance: Record<K, string>,
  keys: readonly K[],
): string {
  return keys.map((key) => `- ${key}${FIELD}${guidance[key]}`).join('\n');
}

/**
 * The instruction block. Static by construction: it names no sentence, no date
 * and no key, so it renders byte-identically on every call.
 */
export const SYSTEM_INSTRUCTION = [
  'Tu traduis en catalan une phrase française pour un francophone qui apprend ' +
    'le catalan, puis tu découpes la traduction en segments. Tu ne rédiges ' +
    `aucune explication${NNBSP}: la réponse ne contient que les champs demandés.`,
  '',
  `Champ ${quote('fr')}${NNBSP}: la phrase soumise telle que tu l’as comprise, ` +
    'fautes de frappe et accents corrigés, sens inchangé. C’est le seul champ en ' +
    'français.',
  '',
  `Champ ${quote('ca')}${NNBSP}: la traduction, en une seule ligne, en catalan ` +
    'central standard. Écris ce que dirait un locuteur, pas un mot-à-mot. Ce champ ' +
    'n’est jamais vide et ne contient jamais de français. Quand la phrase soumise ' +
    `est déjà en catalan, reprends-la dans ${quote('ca')}, corrigée si elle ` +
    `contient une faute, et traduis-la en français dans ${quote('fr')}.`,
  '',
  `Orthographe catalane${NNBSP}: l’apostrophe est l’apostrophe droite (U+0027), ` +
    `comme dans ${quote("l'home")}, ${quote("s'ha")} et ${quote("d'arribar")}, ` +
    'jamais l’apostrophe typographique. Le l géminé prend le point volat ' +
    `(U+00B7), comme dans ${quote('col·lecció')}.`,
  '',
  `Champ ${quote('subject')}${NNBSP}: ${quote('person')} est la personne ` +
    `grammaticale du verbe principal, de ${quote('1sg')} à ${quote('3pl')}, ou ` +
    `${quote('none')} pour une phrase impersonnelle. ${quote('expressed')} vaut ` +
    'false quand le catalan omet le pronom sujet, comme il le fait d’ordinaire.',
  '',
  `Champ ${quote('assumptions')}${NNBSP}: les choix que le français laisse ` +
    'ouverts et que tu as dû trancher pour écrire le catalan. Tableau vide quand ' +
    `tu n’as rien supposé${NNBSP}:`,
  guidanceTable(ASSUMPTION_GUIDANCE, ASSUMPTIONS),
  '',
  `Champ ${quote('chunks')}${NNBSP}: ${quote('ca')} découpé en segments, dans ` +
    `l’ordre. Chaque ${quote('text')} est une sous-chaîne exacte de ` +
    `${quote('ca')}, recopiée caractère pour caractère, mêmes majuscules, mêmes ` +
    'accents, mêmes apostrophes. Ensemble, les segments couvrent tous les mots de ' +
    `${quote('ca')}${NNBSP}; seuls la ponctuation et les espaces restent hors ` +
    'segment, et la ponctuation n’est jamais un segment. Un segment regroupe les ' +
    `mots qui forment une unité, comme ${quote('vaig comprar')}, ${quote('el pa')} ` +
    `ou ${quote('al mercat')}. Quand ${quote('expressed')} vaut false, aucun ` +
    `segment n’a le rôle ${quote('subject')}.`,
  '',
  `Rôles${NNBSP}:`,
  guidanceTable(ROLE_GUIDANCE, CHUNK_ROLES),
  '',
  `Champ ${quote('ids')}${NNBSP}: de zéro à ${String(MAX_IDS_PER_CHUNK)} ` +
    'identifiants repris mot pour mot du vocabulaire ci-dessous, qui est ' +
    `clos${NNBSP}: aucun autre identifiant n’existe. Le plus spécifique d’abord.`,
  '',
  'Ne relie un identifiant que si le segment réalise vraiment ce que ' +
    `l’identifiant nomme${NNBSP}: un nom au singulier ne réalise aucune règle de ` +
    'pluriel, et un participe n’est pas un infinitif. Une liste courte et juste ' +
    'vaut mieux qu’un identifiant approchant, et un segment sans identifiant est ' +
    'une réponse honnête.',
  '',
  `Champ ${quote('unlinked')}${NNBSP}: présent si et seulement si ` +
    `${quote('ids')} est vide, avec l’une de ces valeurs${NNBSP}:`,
  guidanceTable(UNLINKED_GUIDANCE, UNLINKED_REASONS),
  '',
  `Champ ${quote('lemma')}${NNBSP}: la forme de base d’un verbe, d’un nom ou ` +
    'd’un adjectif (infinitif, ou masculin singulier). Omis pour les autres ' +
    'segments.',
].join('\n');

/**
 * The controlled vocabulary, one line per leaf, in taxonomy order.
 *
 * Only `glosses.fr` is sent, never the whole gloss map: the map is keyed so a
 * second base language can be added, and sending every language would grow the
 * cached prefix for no gain. Branch nodes are omitted because they are not
 * taggable, and the CEFR level and contrast status are omitted because they
 * describe how to schedule a component rather than how to recognise one.
 */
export function renderVocabulary(): string {
  return LEAVES.map((leaf) => [leaf.id, leaf.ca, leaf.glosses.fr].join(FIELD)).join(
    '\n',
  );
}

/**
 * How long the cached prefix lives. The app uses the default; the eval also
 * probes the hour, because a learner typing now and then often misses five
 * minutes.
 */
export type CacheTtl = '5m' | '1h';

export interface SystemBlock {
  readonly type: 'text';
  readonly text: string;
  readonly cache_control?: { readonly type: 'ephemeral'; readonly ttl?: '1h' };
}

/**
 * The static prefix, with the single cache breakpoint on its last block.
 *
 * One breakpoint, not two: the instruction and the vocabulary always change
 * together (they are both built from committed files), so a second breakpoint
 * would buy nothing and spend one of the four the API allows.
 */
export function buildSystemBlocks(ttl: CacheTtl = '5m'): readonly SystemBlock[] {
  return [
    { type: 'text', text: SYSTEM_INSTRUCTION },
    {
      type: 'text',
      text: `Vocabulaire clos (identifiant${FIELD}forme catalane${FIELD}glose)${NNBSP}:\n${renderVocabulary()}`,
      cache_control: ttl === '1h' ? { type: 'ephemeral', ttl } : { type: 'ephemeral' },
    },
  ];
}

/**
 * The dynamic suffix: the sentence, and nothing else. No intent and no
 * direction are sent; the phrase reply has one shape whichever way round the
 * sentence runs.
 */
export function buildUserContent(sentence: string): string {
  return sentence;
}
