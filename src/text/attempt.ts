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
  /** The objective outcome. Every reference form was produced. */
  readonly correct: boolean;
  readonly found: readonly string[];
  readonly missing: readonly string[];
}

/**
 * Whether the attempt produced every Catalan form the reply named.
 *
 * Containment rather than whole-string equality, and the reason is the response
 * shape rather than leniency. The reply carries no field holding the expected
 * Catalan sentence: `answer` is pinned to French by the schema, and the only
 * Catalan in it is the `ca` of each decomposition entry, which the prompt
 * defines as the form realising that grammar point in this utterance. Joining
 * them does not reconstruct the sentence, because a word that realises no keyed
 * component has no entry at all, so an equality test would mark a correct
 * attempt wrong.
 *
 * The limit that follows is recorded rather than hidden: this cannot see extra
 * wrong material around the right forms. A field holding the expected utterance
 * would fix it, and that field is exercise generation, which TASKS.md puts
 * outside this phase.
 */
export function compareAttempt(
  attempt: string,
  references: readonly string[],
): AttemptResult {
  const folded = foldAttempt(attempt);
  const wanted = [...new Set(references.map(foldAttempt))].filter(
    (form) => form !== '',
  );

  const found: string[] = [];
  const missing: string[] = [];
  for (const form of wanted) (folded.includes(form) ? found : missing).push(form);

  return {
    // An empty attempt is not a correct one, and neither is one asked about a
    // reply that named no Catalan at all: with nothing to produce, "produced
    // everything" is vacuously true and would hand out free Elo.
    correct: folded !== '' && wanted.length > 0 && missing.length === 0,
    found,
    missing,
  };
}
