/**
 * Comparing a typed Catalan attempt against the reference forms.
 *
 * THIS IS NOT THE SEARCH NORMALISER. `normalise` in src/ui/browse/filter.ts
 * deletes apostrophes outright so that "sha" finds `s'ha`, which is right for a
 * search box and would quietly mark a wrong answer correct here: `lhome` is not
 * `l'home`. Two jobs, two functions.
 *
 * The comparison decides an evidence type, which is the whole reason it has to
 * be objective. A `recall` event carries no rating and never advances FSRS, so
 * what it moves is the Elo difficulty, and the learner is never asked to grade
 * themselves. See EVIDENCE_EFFECTS in src/srs/evidence.ts.
 */

/**
 * Folded for comparison: case, diacritics, and the apostrophe policy.
 *
 * The apostrophe is FOLDED, NOT DROPPED. Catalan forms take the straight `'`
 * and French prose the typographic `’`, but a phone keyboard substitutes the
 * typographic one without asking, so an attempt typed as `s’ha` is the same
 * answer as `s'ha` and must not be marked wrong for a character the learner did
 * not choose. Dropping the apostrophe instead would accept `sha`, which is a
 * different and wrong form.
 *
 * Diacritics are folded because the phase brief says so, and the cost is real
 * and accepted: `si` will be accepted for `sí` and `mes` for `més`. An accent
 * typed on a phone is a long-press away, and marking a right answer wrong is
 * worse than marking a near-right one right, because only the first teaches the
 * learner to distrust the tool.
 *
 * The interpunct is left alone. `l·l` against `ll` is a spelling contrast that
 * PHON.grafia keys deliberately, so folding it would erase the thing being
 * taught. It has to be protected explicitly: U+00B7 carries the Unicode
 * Diacritic property, so the accent-stripping pass below removes it, and a fold
 * written the obvious way accepts `colleccio` for `col·lecció`.
 */
const INTERPUNCT_SAFE_DIACRITIC = /(?!·)\p{Diacritic}/gu;

export function foldAttempt(text: string): string {
  return text
    .replace(/[’‘]/g, "'")
    .normalize('NFD')
    .replace(INTERPUNCT_SAFE_DIACRITIC, '')
    .toLowerCase()
    .replace(/[.,;:!?¿¡"«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface AttemptResult {
  /** The objective outcome. */
  readonly correct: boolean;
  /** True when the attempt matched the reference utterance outright. */
  readonly exact: boolean;
  readonly found: readonly string[];
  readonly missing: readonly string[];
}

/**
 * Whether the attempt produced the Catalan the reply gave.
 *
 * TWO WAYS TO BE RIGHT, and the second is not leniency for its own sake.
 *
 * The first is matching `answer_ca`, the whole utterance the model returned.
 * That field did not exist until the query view stopped being able to show the
 * learner what to say: before it, `answer` was French by schema and the only
 * Catalan was each component's `ca` fragment, so there was nothing to compare
 * an attempt against and this function compared by containment alone.
 *
 * The second is producing every component form the reply named, which still
 * counts. A learner who writes a different but valid phrasing of the same
 * sentence has not made a mistake, and the model's wording is one option rather
 * than the only one. Marking that wrong is the failure mode that teaches a
 * learner to distrust the tool, which is worse than crediting a near miss.
 *
 * What this still cannot see is extra wrong material around the right forms
 * when only the second test passes. Recorded rather than hidden.
 */
export function compareAttempt(
  attempt: string,
  reference: string,
  componentForms: readonly string[] = [],
): AttemptResult {
  const folded = foldAttempt(attempt);
  const wanted = [...new Set(componentForms.map(foldAttempt))].filter(
    (form) => form !== '',
  );

  const found: string[] = [];
  const missing: string[] = [];
  for (const form of wanted) (folded.includes(form) ? found : missing).push(form);

  const target = foldAttempt(reference);
  const exact = folded !== '' && target !== '' && folded === target;
  // An empty attempt is not a correct one, and neither is one asked about a
  // reply that named no Catalan at all: with nothing to produce, "produced
  // everything" is vacuously true and would hand out free Elo.
  const producedAll = folded !== '' && wanted.length > 0 && missing.length === 0;

  return { correct: exact || producedAll, exact, found, missing };
}
