/**
 * The learner's sentence before it is sent or looked up (spec, « Pipeline »,
 * step 1). Typing the same sentence twice with other spacing, case or
 * apostrophes must not cost a second call.
 */

/** Trimmed, spaces collapsed, NFC, straight apostrophes made typographic. */
export function normaliseInput(input: string): string {
  return input.normalize('NFC').trim().replace(/\s+/g, ' ').replace(/'/g, '’');
}

/** The cache key: the normalised input, lower-cased. */
export function inputKey(input: string): string {
  return normaliseInput(input).toLocaleLowerCase('fr');
}
