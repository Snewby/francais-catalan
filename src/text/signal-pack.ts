/**
 * Signalled replies, rendered as a pack an outside reader can be given.
 *
 * WHY THIS EXISTS AS A FILE RATHER THAN A SCREEN. Six outside reviews have found
 * every false claim about French this project knows about, and internal review
 * has found none. The limit on running a seventh is not the reviewer, it is the
 * sampling: a review can only look at replies somebody kept, and until now that
 * meant copying them out of the browser's network tab by hand.
 *
 * The shape follows the pack assembled by hand for the application review,
 * because that one worked: the question, the reply whole, and each component's
 * authored gloss beside the form it was attached to, so the reader can judge
 * whether the model applied the vocabulary correctly without being sent the
 * vocabulary. What it deliberately omits is any verdict of ours. A pack that
 * says which replies we think are wrong gets agreement back.
 */
import { NNBSP, labelled } from '../i18n/fr';
import { leafById } from '../taxonomy';
import type { SignalledReply } from '../db/dexie';

/** Escapes a cell so a Catalan form containing a pipe cannot break the table. */
function cell(text: string): string {
  return text.replaceAll('|', '\\|');
}

function renderComponents(reply: SignalledReply): string[] {
  if (reply.components.length === 0) {
    return [
      '_Aucun point de grammaire dans cette réponse._',
      '',
      ...(reply.unverified.length === 0
        ? []
        : [
            labelled(
              'Analyse écartée par le contrôle automatique, formes absentes de l’énoncé',
              reply.unverified.map(cell).join(', '),
            ),
            '',
          ]),
    ];
  }

  return [
    '| Identifiant | Forme citée | Forme de référence | Glose |',
    '| --- | --- | --- | --- |',
    ...reply.components.map((entry) => {
      const leaf = leafById(entry.id);
      const reference = cell(leaf?.ca ?? '?');
      const gloss = cell(leaf?.glosses.fr ?? '?');
      return `| \`${entry.id}\` | ${cell(entry.ca)} | ${reference} | ${gloss} |`;
    }),
    '',
  ];
}

const DIRECTION_LABEL: Record<string, string> = {
  ca_to_fr: 'catalan vers français',
  fr_to_ca: 'français vers catalan',
};

/**
 * The pack, in French, ready to paste into a chat with an outside reader.
 *
 * French because it is about French and Catalan and will be read alongside
 * both. The repository-language rule governs code and documentation, not a
 * document generated for a French-speaking reader.
 */
export function renderSignalPack(replies: readonly SignalledReply[]): string {
  const lines: string[] = [
    '# Réponses signalées',
    '',
    `${String(replies.length)} réponse(s) marquées comme douteuses pendant ` +
      'l’usage ordinaire de l’application.',
    '',
    'Pour chacune, merci de vérifier le catalan, le français, et si le point de ' +
      'grammaire cité correspond vraiment à ce que la forme réalise dans cet ' +
      'énoncé. La forme de référence et la glose viennent des données rédigées à ' +
      'la main, déjà relues, et servent à juger si le modèle les a appliquées ' +
      'correctement, non à être relues elles-mêmes.',
    '',
    `Ne relevez rien concernant la typographie (espaces, guillemets, ` +
      `apostrophes)${NNBSP}: elle se dégrade au copier-coller. Si un constat ` +
      `dépend d’un accent, dites-le explicitement.`,
    '',
  ];

  replies.forEach((reply, index) => {
    lines.push(
      `## Réponse ${String(index + 1)}`,
      '',
      labelled('**Question posée**', reply.question),
      '',
      labelled('**Sens détecté**', DIRECTION_LABEL[reply.direction] ?? reply.direction),
      '',
      labelled('**En catalan**', reply.answerCa),
      '',
      labelled('**En français**', reply.answerFr),
      '',
      '**Explication donnée**',
      '',
      ...reply.answer
        .split(/\n+/)
        .map((paragraph) => paragraph.trim())
        .filter((paragraph) => paragraph !== '')
        // A bare `>` between them, or Markdown runs the paragraphs together and
        // the reader sees one block where the prompt asked the model for several.
        .flatMap((paragraph, index, all) =>
          index === all.length - 1 ? [`> ${paragraph}`] : [`> ${paragraph}`, '>'],
        ),
      '',
      '**Points de grammaire relevés**',
      '',
      ...renderComponents(reply),
    );
  });

  return lines.join('\n');
}
