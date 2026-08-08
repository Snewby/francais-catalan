/**
 * The single source of every user-facing string.
 *
 * All copy is French. Typography rules: guillemets with a narrow no-break space
 * inside, a narrow no-break space before : ; ! ?, and no em-dashes.
 *
 * French strings run roughly 15 to 20 per cent longer than the English
 * equivalent, so any container sized against a draft English string will
 * overflow. Check the rendered width rather than assuming it.
 */

/**
 * Narrow no-break space, U+202F. Built from its code point rather than typed
 * literally: it is invisible in most editors and indistinguishable from an
 * ordinary space, so a literal one gets silently replaced sooner or later.
 * test/smoke.test.ts asserts the rule still holds.
 */
const NNBSP = String.fromCodePoint(0x202f);

/** Wrap in guillemets, with the narrow no-break space inside each. */
export function quote(text: string): string {
  return `«${NNBSP}${text}${NNBSP}»`;
}

export const fr = {
  app: {
    title: 'Entraîneur de grammaire catalane',
    tagline: 'Le catalan expliqué à partir du français',
  },
  status: {
    scaffold: `Phase 0${NNBSP}: le squelette du projet est en place. La taxonomie arrive à la phase 1.`,
  },
  apiKey: {
    label: 'Clé API',
    prompt: `Saisissez votre clé API Anthropic pour activer les analyses${NNBSP}:`,
    hint: 'La clé reste dans le stockage local de ce navigateur. Elle n’est jamais envoyée ailleurs qu’à Anthropic, ni enregistrée dans le dépôt.',
    missing: 'Aucune clé enregistrée pour l’instant.',
  },
  contrast: {
    transfer: 'Transfert direct depuis le français',
    'near-miss': 'Proche du français, mais la frontière diffère',
    'false-friend': `Faux ami${NNBSP}: l’intuition française induit en erreur`,
    novel: 'Sans équivalent en français',
  },
  errors: {
    unknown: 'Une erreur inattendue est survenue.',
  },
} as const;

export type FrenchStrings = typeof fr;
