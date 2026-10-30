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
  nav: {
    label: 'Navigation principale',
    phrase: 'Phrase',
    carnet: 'Carnet',
    reviser: 'Réviser',
    carte: 'Carte',
  },
  screens: {
    phrase: 'Phrase',
    notion: 'Notion',
    carnet: 'Carnet',
    reviser: 'Réviser',
    carte: 'Carte',
  },
  stub: {
    // One line per unbuilt screen, so every tab is tappable from the first
    // release and the navigation tests cover all four.
    soon: 'Bientôt disponible.',
  },
  home: {
    inputLabel: 'Une phrase en français',
    inputPlaceholder: 'Écrivez une phrase en français',
    submit: 'Traduire en catalan',
    // Shown before the count, and only past 250 characters.
    counterLabel: 'Caractères',
    recentsHeading: 'Récentes',
    recentsEmpty: 'Vos phrases apparaîtront ici.',
  },
  phrase: {
    back: 'Retour à l’accueil',
    yourPhrase: 'Votre phrase',
    inCatalan: 'En catalan',
    translating: 'Traduction…',
    // Followed by the assumed choices, e.g. « On a supposé : tu, locutrice. »
    assumed: 'On a supposé',
    anatomy: 'Anatomie',
    notFound: 'Cette phrase n’est pas enregistrée sur cet appareil.',
    report: 'Signaler une erreur',
  },
  roles: {
    subject: 'Sujet',
    verb: 'Verbe',
    object_direct: 'Complément d’objet direct',
    object_indirect: 'Complément d’objet indirect',
    clitic: 'Pronom faible',
    negation: 'Négation',
    time: 'Temps',
    place: 'Lieu',
    manner: 'Manière',
    quantity: 'Quantité',
    connector: 'Connecteur',
    complement: 'Complément',
    other: 'Autre',
  },
  unlinked: {
    no_notion: 'hors notions',
    outside_taxonomy: 'pas encore décrit',
  },
  assumptions: {
    addressee_tu: 'tu',
    addressee_formal: 'vous de politesse',
    speaker_fem: 'locutrice',
    subject_fem: 'sujet au féminin',
    plural_fem: 'pluriel au féminin',
  },
  // The short form on the chunk sheet; `contrast` below is the long one.
  badge: {
    transfer: 'transfert',
    'near-miss': 'proche',
    'false-friend': 'faux ami',
    novel: 'nouveau',
  },
  chunkSheet: {
    close: 'Fermer',
    badgeLabel: 'Rapport au français',
  },
  failure: {
    noKey: 'Ajoutez votre clé API dans les réglages.',
    openSettings: 'Ouvrir les réglages',
    keyRejected: 'Clé API refusée. Vérifiez-la dans les réglages.',
    overloaded: 'Service saturé. Réessayez dans un instant.',
    offline: 'Pas de connexion.',
    refused: 'Cette phrase n’a pas pu être traduite.',
    analysisFailed: 'Analyse indisponible pour cette phrase.',
    retry: 'Réessayer',
  },
  // The variation panel's group headings (phase 2 spec, « Variantes »).
  variants: {
    heading: 'Variantes',
    who: `Qui${NNBSP}?`,
    when: `Quand${NNBSP}?`,
    tournure: 'Tournure',
    transform: 'Transformer',
  },
  // « Quand ? » button labels, keyed by Tense in src/variants/axes.ts.
  tenses: {
    present: 'Présent',
    ahir: `Passé ${quote('ahir')}`,
    avui: `Passé ${quote('avui')}`,
    imperfet: 'Imparfait',
    futur: 'Futur',
    condicional: 'Conditionnel',
  },
  // « Tournure » button labels, keyed by Tournure. All but « Aucune » are
  // Catalan words, shown in lang="ca".
  tournures: {
    none: 'Aucune',
    haver: 'haver de',
    acabar: 'acabar de',
    estar: 'estar + gérondif',
  },
  // Why a variation button does nothing: the four causes the panel derives
  // itself (GreyCause in src/variants/combination.ts), then the model's closed
  // not_applicable reasons (src/api/phrase.ts). First draft, phase 2 spec.
  variantReasons: {
    acabar_tense:
      'acabar de (venir de) ne se combine qu’avec le présent et l’imparfait.',
    no_subject: 'Cette phrase n’a pas de sujet à changer.',
    no_tense: 'Le verbe de cette phrase ne se conjugue pas à ces temps.',
    no_object: 'Cette phrase n’a pas de complément d’objet direct.',
    aspect_incompatible: 'Ce verbe ne se met pas à cette forme.',
    subordinate_affected:
      'Ce changement modifierait aussi une autre partie de la phrase.',
    no_pronoun_form: 'Ce complément ne se remplace pas par un pronom ici.',
    other: 'Cette variante ne s’applique pas à cette phrase.',
  },
  report: {
    heading: 'Signaler une erreur',
    label: `Qu’est-ce qui ne va pas${NNBSP}?`,
    hint: 'Votre remarque reste sur cet appareil, avec la phrase.',
    save: 'Enregistrer',
    saved: 'Signalement enregistré.',
    close: 'Fermer',
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
    replace: 'Remplacer la clé',
    replaced: 'Clé remplacée.',
  },
  settings: {
    open: 'Réglages',
    heading: 'Réglages',
    close: 'Fermer',
  },
  data: {
    heading: 'Données',
    exportButton: 'Exporter mes données',
    exportHint: 'Un fichier JSON avec toutes les données de cette application.',
    exported: 'Fichier exporté.',
    importLabel: 'Importer un fichier',
    importHint:
      'L’import ajoute les lignes du fichier et remplace celles qui portent le même identifiant. Rien n’est supprimé.',
    imported: 'Import terminé.',
    importUnreadable: `Fichier refusé${NNBSP}: il n’a pas pu être lu. Rien n’a été modifié.`,
    importUnknownVersion: `Fichier refusé${NNBSP}: sa version de format est inconnue. Rien n’a été modifié.`,
    importWrongShape: `Fichier refusé${NNBSP}: son contenu ne correspond pas à cette application. Rien n’a été modifié.`,
  },
  audio: {
    speak: 'Écouter',
    // Says what to install AND that nothing else will be used. Without the
    // second half the silence reads as a missing feature, and a learner whose
    // device has nine voices will wonder why none of them is used. The refusal
    // is the point: a Spanish or French voice reading catalan is confidently
    // wrong, which is the worst thing a contrastive tool can produce.
    unavailable:
      'Aucune voix catalane n’est installée sur cet appareil, donc la lecture à ' +
      `voix haute n’est pas proposée${NNBSP}: sur Android, ajoutez la voix ` +
      `${quote('català')} dans la synthèse vocale Google${NNBSP}; sur iPhone, dans ` +
      `${quote('Contenu énoncé')}${NNBSP}; sous Windows, dans les modules de voix. ` +
      'Aucune autre langue n’est utilisée à la place, une voix espagnole ou ' +
      'française lisant du catalan induirait en erreur.',
    // Kept from the phase 6b design even where a voice exists, because it is
    // per-component and language-invariant, and it is all the desktop has.
    ipa: 'Prononciation',
  },
  contrast: {
    transfer: 'Transfert direct depuis le français',
    // Two thirds of the taxonomy carries this status, so it is the one of the
    // four a learner reads most often. « la frontière diffère » left open the
    // frontier between what.
    'near-miss': 'Proche du français, mais les emplois ne coïncident pas exactement',
    'false-friend': `Faux ami${NNBSP}: l’intuition française induit en erreur`,
    novel: 'Sans équivalent en français',
  },
  errors: {
    unknown: 'Une erreur inattendue est survenue.',
  },
} as const;

export type FrenchStrings = typeof fr;
