/**
 * The prompt sent to the model, split into a cached static prefix and a dynamic
 * suffix.
 *
 * The split is the whole point of phase 4, not an optimisation bolted on after.
 * Render order at the API is tools, then system, then messages, so everything
 * that never varies has to live in `system` and the question has to live in
 * `messages`. A single byte moving in the prefix costs a full cache write on
 * every query.
 *
 * Nothing here is user-facing copy, so it does not belong in `src/i18n/fr.ts`.
 * It is French prose all the same, and follows the same typography rules: the
 * narrow no-break space is imported rather than typed, and French prose takes
 * the typographic apostrophe while Catalan forms keep the straight one.
 */
import { NNBSP, quote } from '../i18n/fr';
import { LEAVES } from '../taxonomy';
import type { Direction, Intent } from '../srs/evidence';

/**
 * Field separator in the vocabulary table. A tab is the cheapest separator that
 * cannot occur inside a gloss; test/anthropic-client.test.ts asserts that no
 * field actually contains one, because a stray tab would shift a column and the
 * model would read a Catalan form as a gloss.
 */
const FIELD = '\t';

/**
 * What each intent asks the model for. All five are described here, in the
 * cached prefix, even though the MVP only ever sends two: describing them costs
 * a few tokens once, and moving the description into the dynamic suffix would
 * make the prefix vary by intent and halve the cache hit rate.
 */
const INTENT_GUIDANCE: Record<Intent, string> = {
  comprehend: 'expliquer ce que veut dire l’énoncé et pourquoi il est construit ainsi',
  produce: 'donner la forme catalane attendue et justifier chaque choix',
  teach: 'exposer la règle générale dont l’énoncé est un cas',
  assess: 'répondre normalement, sans révéler plus que ce qui est demandé',
  pronounce: `décrire la prononciation, et renseigner le champ ${quote('ipa')} de chaque entrée`,
};

/**
 * What each direction means, and how to tell which one you were sent.
 *
 * The model REPORTS the direction rather than being told it. Which way round a
 * question runs is evident from the question, so asking the learner to declare
 * it was an interface demanding something it could already see.
 */
const DIRECTION_GUIDANCE: Record<Direction, string> = {
  ca_to_fr:
    'l’énoncé soumis est en catalan, et il s’agit de l’expliquer à un francophone',
  fr_to_ca:
    'l’énoncé soumis est en français, ou décrit en français ce que l’on cherche à dire, et il s’agit de produire le catalan correspondant',
};

function guidanceTable<K extends string>(
  guidance: Record<K, string>,
  keys: readonly K[],
): string {
  return keys.map((key) => `- ${key}${FIELD}${guidance[key]}`).join('\n');
}

/**
 * The instruction block. Static by construction: it names no question, no date
 * and no key, so it renders byte-identically on every call.
 */
export const SYSTEM_INSTRUCTION = [
  'Tu analyses la grammaire catalane pour un locuteur francophone.',
  '',
  `Langue${NNBSP}: le champ ${quote('answer')} est rédigé en français, avec la ` +
    `terminologie grammaticale française (pronoms faibles, passé périphrastique, ` +
    `gérondif, complément d’objet direct). Le tableau ${quote('decomposition')} ne ` +
    `contient aucun français${NNBSP}: uniquement des identifiants de composants et ` +
    `des formes catalanes, laissées en catalan et jamais traduites.`,
  '',
  `Réponse catalane${NNBSP}: le champ ${quote('answer_ca')} contient l’énoncé ` +
    `catalan entier, en une seule ligne, sans guillemets ni commentaire. C’est la ` +
    `phrase que le lecteur doit pouvoir lire à voix haute. Quand la question est ` +
    `déjà en catalan, reprends-la, corrigée si elle contient une faute. Quand elle ` +
    `est en français, produis la forme catalane attendue. Ce champ n’est jamais ` +
    `vide et ne contient jamais de français.`,
  '',
  `Lisibilité${NNBSP}: le champ ${quote('answer')} est découpé en courts ` +
    `paragraphes séparés par une ligne vide, un point par paragraphe. Pas de ` +
    `titres, pas de listes à puces, pas de bloc unique et compact. Va au fait ` +
    `d’abord, les précisions ensuite.`,
  '',
  `Décomposition${NNBSP}: une entrée par point de grammaire réellement présent ` +
    `dans l’énoncé, dans l’ordre où il apparaît. Le champ ${quote('id')} est repris ` +
    `mot pour mot du vocabulaire ci-dessous, qui est clos${NNBSP}: aucun autre ` +
    `identifiant n’existe. Le champ ${quote('ca')} est la forme catalane qui ` +
    `réalise ce point dans cet énoncé précis, pas la forme de référence du ` +
    `vocabulaire. Le champ ${quote('ipa')} est facultatif et ne sert que pour ` +
    `l’intention ${quote('pronounce')}.`,
  '',
  'N’invente pas de point de grammaire pour étoffer la liste, et n’en omets pas ' +
    'un qui est présent. Une entrée par point, sans doublon.',
  '',
  `Intentions${NNBSP}:`,
  guidanceTable(INTENT_GUIDANCE, Object.keys(INTENT_GUIDANCE) as Intent[]),
  '',
  `Sens de la question${NNBSP}: détermine-le toi-même à partir de la langue de ` +
    `l’énoncé, et renseigne le champ ${quote('direction')} en conséquence.`,
  guidanceTable(DIRECTION_GUIDANCE, Object.keys(DIRECTION_GUIDANCE) as Direction[]),
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

export interface SystemBlock {
  readonly type: 'text';
  readonly text: string;
  readonly cache_control?: { readonly type: 'ephemeral' };
}

/**
 * The static prefix, with the single cache breakpoint on its last block.
 *
 * One breakpoint, not two: the instruction and the vocabulary always change
 * together (they are both built from committed files), so a second breakpoint
 * would buy nothing and spend one of the four the API allows.
 */
export function buildSystemBlocks(): readonly SystemBlock[] {
  return [
    { type: 'text', text: SYSTEM_INSTRUCTION },
    {
      type: 'text',
      text: `Vocabulaire clos (identifiant${FIELD}forme catalane${FIELD}glose)${NNBSP}:\n${renderVocabulary()}`,
      cache_control: { type: 'ephemeral' },
    },
  ];
}

export interface QuestionContext {
  readonly question: string;
  /**
   * Overrides the intent the detected direction implies. Omitted by the MVP
   * views, which ask for `comprehend` or `produce` and get whichever the
   * direction gives. `pronounce` is the case this exists for.
   */
  readonly intent?: Intent;
}

/**
 * The dynamic suffix. Everything that varies per query lives here and nowhere
 * else.
 *
 * The direction is NOT sent. The model reads it off the question and reports it
 * back, which is the whole point of dropping the selector from the interface.
 */
export function buildUserContent(context: QuestionContext): string {
  return [
    ...(context.intent === undefined ? [] : [`intent${FIELD}${context.intent}`]),
    '',
    context.question,
  ].join('\n');
}
