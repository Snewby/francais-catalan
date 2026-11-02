/**
 * What a « Signaler une erreur » report can say about what was on screen.
 *
 * THIS FILE IS AUTHORITATIVE for the report kinds (decided by Sean, 2 Nov:
 * four tap choices above the note, so reports can be sorted rather than read
 * one by one). The French for each is in fr.ts, keyed off these values.
 */

export type ReportKind =
  'catalan_wrong' | 'french_wrong' | 'wrong_change' | 'notion_wrong';

export const REPORT_KINDS: readonly ReportKind[] = [
  'catalan_wrong',
  'french_wrong',
  'wrong_change',
  'notion_wrong',
];

/** « Ce n’est pas le changement demandé » only means something on a variant. */
export function kindsFor(onVariant: boolean): ReportKind[] {
  return REPORT_KINDS.filter((kind) => onVariant || kind !== 'wrong_change');
}

/**
 * What the learner was looking at, kept with the report so it can be
 * troubleshot later even if the cache moves on: the sentence as typed, the
 * Catalan and French shown, and the combination when it was a variant.
 */
export interface ReportSnapshot {
  readonly input: string;
  readonly ca: string;
  readonly fr: string;
  /** person·tense·tournure·pronoun·negation; null for the original sentence. */
  readonly comboKey: string | null;
}
