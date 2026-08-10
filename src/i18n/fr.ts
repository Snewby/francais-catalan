/**
 * The single source of every user-facing string.
 *
 * All copy is French. Typography rules: guillemets with a narrow no-break space
 * inside, a narrow no-break space before : ; ! ?, and no em-dashes.
 *
 * French strings run roughly 15 to 20 per cent longer than the English
 * equivalent, so any container sized against a draft English string will
 * overflow. Check the rendered width rather than assuming it.
 *
 * The table is exactly two levels deep, and every group holds strings only.
 * test/smoke.test.ts flattens it with one Object.values per level to run the
 * typography checks, so a third level or a bare top-level string would be
 * skipped silently rather than fail. Add a group, not a nesting.
 */

/**
 * Narrow no-break space, U+202F. Built from its code point rather than typed
 * literally: it is invisible in most editors and indistinguishable from an
 * ordinary space, so a literal one gets silently replaced sooner or later.
 * test/smoke.test.ts asserts the rule still holds. Exported because the model
 * prompt in src/api/prompt.ts is French prose under the same rule, and a second
 * definition of this character is a second thing to lose.
 */
export const NNBSP = String.fromCodePoint(0x202f);

/** Wrap in guillemets, with the narrow no-break space inside each. */
export function quote(text: string): string {
  return `«${NNBSP}${text}${NNBSP}»`;
}

export const fr = {
  app: {
    title: 'Entraîneur de grammaire catalane',
    tagline: 'Le catalan expliqué à partir du français',
  },
  browser: {
    heading: 'Explorateur de la taxonomie',
    // Stated in the interface, not only in a test: a learner who cannot tell
    // whether looking counts will treat the coverage map as a record of what
    // they have read rather than of what they know.
    readOnly: `Consultation seule${NNBSP}: parcourir l’arbre n’enregistre aucune trace.`,
    searchLabel: 'Recherche',
    searchPlaceholder: 'Forme catalane, glose, exemple',
    filterCefr: 'Niveau CECR',
    contrast: 'Rapport au français',
    filterAny: 'Indifférent',
    resultsLabel: 'notions affichées',
    noResults: 'Aucune notion ne correspond à ces critères.',
    unseeded: 'Pas encore semé',
    leafCountLabel: 'notions',
    emptyDetail: 'Sélectionnez une notion dans l’arbre pour en afficher le détail.',
    fieldId: 'Identifiant',
    fieldCa: 'Forme catalane',
    fieldGloss: 'Glose',
    fieldCefr: 'Niveau',
    fieldExamples: 'Exemples',
    fieldNotes: 'Remarques',
    fieldDialect: 'Variation dialectale',
    expandAll: 'Tout déplier',
    collapseAll: 'Tout replier',
  },
  apiKey: {
    label: 'Clé API',
    prompt: `Saisissez votre clé API Anthropic pour activer les analyses${NNBSP}:`,
    hint: 'La clé reste dans le stockage local de ce navigateur. Elle n’est jamais envoyée ailleurs qu’à Anthropic, ni enregistrée dans le dépôt.',
    missing: 'Aucune clé enregistrée pour l’instant.',
  },
  heatmap: {
    // Exposure and mastery are two dimensions, never one colour: the teinte
    // carries mastery, the opacity carries exposure.
    exposure: 'Exposition',
    exposureHint: 'Nombre de rencontres, quelle qu’en soit la forme',
    mastery: 'Maîtrise',
    masteryHint: 'Fondée uniquement sur les révisions évaluées',
    unexplored: 'Jamais rencontré',
    unpractised: 'Rencontré, jamais révisé',
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
