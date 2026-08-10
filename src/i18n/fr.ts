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

/**
 * A caption and its value, spaced the French way.
 *
 * Here rather than at each call site so that the narrow no-break space before
 * the colon comes from the module that owns the rule. A component composing
 * `${label}: ${value}` by hand would produce copy that reads as French and is
 * typeset as English, which is exactly how this character has been lost three
 * times already.
 */
export function labelled(caption: string, value: string): string {
  return `${caption}${NNBSP}: ${value}`;
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
  nav: {
    query: 'Analyser',
    review: 'Réviser',
    browse: 'Explorer',
    data: 'Données',
  },
  apiKey: {
    label: 'Clé API',
    prompt: `Saisissez votre clé API Anthropic pour activer les analyses${NNBSP}:`,
    hint: 'La clé reste dans le stockage local de ce navigateur. Elle n’est jamais envoyée ailleurs qu’à Anthropic, ni enregistrée dans le dépôt.',
    missing: 'Aucune clé enregistrée pour l’instant.',
    placeholder: 'Votre clé API',
    stored: 'Une clé est enregistrée dans ce navigateur.',
    save: 'Enregistrer la clé',
    saved: 'Clé enregistrée.',
    forget: 'Oublier la clé',
    forgotten: 'Clé effacée de ce navigateur.',
  },
  query: {
    heading: 'Analyser un énoncé',
    // The direction is detected from the question and reported back, never
    // chosen. It is still named in the interface so a wrong reading is visible
    // rather than silent.
    detectedLabel: 'Sens détecté',
    directionCaToFr: 'Du catalan vers le français',
    directionFrToCa: 'Du français vers le catalan',
    questionLabel: 'Question',
    placeholder: 'Un énoncé catalan à expliquer, ou ce que vous cherchez à dire',
    answerCaHeading: 'À dire en catalan',
    attemptLabel: 'Votre tentative en catalan',
    attemptOptional: 'facultatif',
    // Says what the affordance is for without restating what each evidence type
    // moves: that routing lives in src/srs/evidence.ts and nowhere else.
    attemptHint:
      'Écrivez votre version avant d’afficher la réponse. La comparaison est automatique, et il ne vous sera jamais demandé de vous noter vous-même.',
    submitReveal: 'Afficher la réponse',
    submitCheck: 'Vérifier ma tentative',
    pending: 'Analyse en cours…',
    answerHeading: 'Pourquoi',
    componentsHeading: 'Points de grammaire relevés',
    attemptExact: 'Votre version correspond à la réponse.',
    attemptCorrect:
      'Votre version diffère de la réponse, mais elle contient toutes les formes attendues.',
    attemptIncomplete: `Formes attendues qui manquent${NNBSP}:`,
    recordedLookup: 'Consultation enregistrée.',
    recordedRecall: 'Tentative enregistrée.',
    emptyQuestion: 'Saisissez une question avant de lancer l’analyse.',
    failed: 'L’analyse a échoué.',
    // Shown after every reply. The taxonomy travels as a cached prompt prefix,
    // and whether that cache is actually hit is a property of a second live
    // call that no test can check: it reports as silence rather than as an
    // error, so the interface has to say it out loud.
    usageHeading: 'Cache du préfixe',
    usageRead: 'Relu du cache',
    usageWritten: 'Écrit dans le cache',
    usageTokens: 'jetons',
    usageHint:
      'Une seconde question doit relire le préfixe. Un zéro qui persiste signale un préfixe qui varie d’un appel à l’autre, ou trop court pour être mis en cache.',
  },
  review: {
    heading: 'Réviser',
    start: 'Commencer une session',
    empty: 'Rien à réviser pour l’instant.',
    // The authored data holds no French translation of any example, so a card
    // asks for the rule. Promising a translation here would promise something
    // the data cannot supply.
    ruleRecall:
      'Une carte porte sur la règle illustrée, non sur la traduction de l’exemple.',
    askCaToFr: `Quelle règle cet énoncé illustre-t-il${NNBSP}?`,
    askFrToCa: `Quelle forme catalane réalise cette règle${NNBSP}?`,
    reveal: 'Afficher la réponse',
    referenceHeading: 'Réponse attendue',
    rateHeading: 'Votre rappel était',
    ratingAgain: 'À revoir',
    ratingHard: 'Difficile',
    ratingGood: 'Correct',
    ratingEasy: 'Facile',
    progress: 'Progression',
    finished: 'Session terminée.',
  },
  heatmap: {
    // Exposure and mastery are two dimensions, never one colour: the teinte
    // carries mastery, the opacity carries exposure.
    heading: 'Carte de couverture',
    exposure: 'Exposition',
    exposureHint: 'Nombre de rencontres, quelle qu’en soit la forme',
    mastery: 'Maîtrise',
    masteryHint: 'Fondée uniquement sur les révisions évaluées',
    unexplored: 'Jamais rencontré',
    unpractised: 'Rencontré, jamais révisé',
    legendHue: `Teinte${NNBSP}: maîtrise, du rouge au vert`,
    legendOpacity: `Opacité${NNBSP}: exposition, du pâle au franc`,
    legendUngraded: `Gris${NNBSP}: aucune révision évaluée`,
    legendLow: 'faible',
    legendHigh: 'élevée',
    // No tooltip anywhere in this component: there is no hover on a touch
    // screen, and the primary device is a telephone.
    domainsHint: 'Touchez un domaine pour en afficher les notions.',
    back: 'Revenir aux domaines',
    exposureCount: 'Rencontres',
    gradedCount: 'Révisions évaluées',
    stateLabel: 'Couverture',
  },
  gaps: {
    heading: 'Lacunes',
    unexploredHint: 'Aucune rencontre enregistrée, dans un sens ou dans l’autre',
    unpractisedHint: 'Rencontré au moins une fois, mais jamais évalué en révision',
    none: 'Aucune notion de ce type.',
    ranking:
      'Les faux amis et les notions sans équivalent français viennent en premier.',
    hidden: 'autres notions non affichées',
  },
  data: {
    heading: 'Données',
    exportButton: 'Exporter mes données',
    exportHint:
      'Un fichier JSON reprenant vos rencontres, vos révisions et vos classements.',
    importButton: 'Importer un fichier',
    importHint: 'L’import remplace entièrement les données de ce navigateur.',
    imported: 'Import terminé.',
    importFailed: `Fichier refusé${NNBSP}: rien n’a été modifié.`,
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
