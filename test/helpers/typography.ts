/**
 * French high-punctuation spacing, asserted in one place.
 *
 * The rule (`CLAUDE.md`, `.claude/rules/ui-copy.md`, the `fr-metalanguage`
 * skill) is that `: ; ! ?` take a narrow no-break space before them. It was
 * asserted as `not.toMatch(/ [:;!?]/)` in both `smoke.test.ts` and
 * `gloss-completeness.test.ts`, which rejects an ordinary space and says
 * nothing at all about punctuation written with no space: `(pas, jamais...);`
 * satisfied it. A rule stated in three documents and enforced by one assertion
 * is only as good as that assertion, so the check is positive here (whatever
 * precedes the mark must be U+202F) and lives in one module rather than two.
 */

/** Narrow no-break space, U+202F. Built from its code point rather than typed, because it is invisible in a diff. */
export const NNBSP = String.fromCodePoint(0x202f);

const CITATION = /«[^»]*»/g;
const HIGH_PUNCTUATION = /[:;!?]/g;
// Separate instance: `.test()` on a global regex advances `lastIndex` and would
// alternate between true and false across calls.
const ANY_HIGH_PUNCTUATION = /[:;!?]/;

/**
 * Every `: ; ! ?` in `text` not preceded by the narrow no-break space, returned
 * with a little leading context so a failure names the offending phrase rather
 * than only the field.
 *
 * Catalan cited inside guillemets is stripped before the check, on the same
 * grounds the apostrophe rule already uses: a cited form is data rather than
 * copy, and Catalan does not put a space before its own punctuation. Stripping
 * a citation leaves any surrounding French spacing intact, so a colon that
 * follows a citation is still checked.
 */
export function highPunctuationOffenders(text: string): string[] {
  const french = text.replace(CITATION, '');
  const offenders: string[] = [];
  for (const match of french.matchAll(HIGH_PUNCTUATION)) {
    const index = match.index;
    if (french[index - 1] === NNBSP) continue;
    offenders.push(french.slice(Math.max(0, index - 30), index + 1));
  }
  return offenders;
}

/** Whether `text` contains any high punctuation at all, for the positive controls. */
export function hasHighPunctuation(text: string): boolean {
  return ANY_HIGH_PUNCTUATION.test(text.replace(CITATION, ''));
}
