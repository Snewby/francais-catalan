/**
 * The native speaker's review: which renderings go on a sheet, what the sheet
 * says, and how verdicts come back into the fixtures.
 *
 * A rendering's ID is assigned once and kept in its fixture, so `12-b` means
 * the same Catalan in round 1, round 2 and every later run. New renderings take
 * the next free letters in alphabetical order of their normalised form, never
 * in the order the models produced them, so neither the letter nor the order
 * on the card says which model wrote a rendering.
 *
 * The sheet is French, the speaker's working language with Sean, and follows
 * the UI typography rules: guillemets and a narrow no-break space before
 * : ; ! ?
 */
import { NNBSP, quote } from '../i18n/fr';
import {
  VERDICTS,
  normaliseRendering,
  type GoldenCase,
  type Rendering,
  type ReplayedReply,
  type Verdict,
} from './golden';

/** a, b, ..., z, aa, ab, ...: the letters for the index-th rendering of a case. */
export function letters(index: number): string {
  let rest = index;
  let out = '';
  do {
    out = String.fromCharCode(97 + (rest % 26)) + out;
    rest = Math.floor(rest / 26) - 1;
  } while (rest >= 0);
  return out;
}

/**
 * Every valid reply's Catalan, added to its case as a rendering unless an
 * equal one is there already. Replies that failed the hard checks are scored
 * out before any review (spec, « Running it »), so they add nothing.
 */
export function registerRenderings(
  cases: readonly GoldenCase[],
  replies: readonly ReplayedReply[],
): GoldenCase[] {
  return cases.map((golden) => {
    const known = new Set(golden.renderings.map((rendering) => rendering.key));
    const fresh = new Map<string, string>();
    for (const reply of replies) {
      if (reply.golden.n !== golden.n || reply.result.status !== 'ok') continue;
      const key = normaliseRendering(reply.result.phrase.ca);
      if (!known.has(key) && !fresh.has(key)) fresh.set(key, reply.result.phrase.ca);
    }
    if (fresh.size === 0) return golden;

    const added: Rendering[] = [...fresh]
      .sort(([a], [b]) => a.localeCompare(b, 'ca'))
      .map(([key, ca], offset) => ({
        id: `${String(golden.n)}-${letters(golden.renderings.length + offset)}`,
        key,
        ca,
        verdict: null,
      }));
    return { ...golden, renderings: [...golden.renderings, ...added] };
  });
}

/** The renderings still waiting for a verdict, case by case. */
export function unjudged(cases: readonly GoldenCase[]): Rendering[] {
  return cases.flatMap((golden) =>
    golden.renderings.filter((rendering) => rendering.verdict === null),
  );
}

const MARKS: Record<Verdict, string> = {
  naturel: quote('naturel'),
  peu_naturel: quote('correct mais peu naturel'),
  faux: quote('faux'),
};

/**
 * The sheet for one round. Only unjudged renderings appear, so round 2 sends
 * the speaker nothing already seen. Model names appear nowhere.
 */
export function buildSheet(cases: readonly GoldenCase[], round: number): string {
  const cards = cases.flatMap((golden) => {
    const open = golden.renderings.filter((rendering) => rendering.verdict === null);
    if (open.length === 0) return [];
    return [
      `## ${String(golden.n)}. ${quote(golden.input)}`,
      '',
      '| Réf. | Catalan | Verdict |',
      '| --- | --- | --- |',
      ...open.map((rendering) => `| ${rendering.id} | ${rendering.ca} | |`),
      '',
    ];
  });

  return [
    `# Relecture des traductions, série ${String(round)}`,
    '',
    `Pour chaque phrase française, lisez chaque traduction catalane et donnez-lui ` +
      `l’un de ces trois verdicts${NNBSP}: ${MARKS.naturel}, ${MARKS.peu_naturel} ` +
      `ou ${MARKS.faux}.`,
    '',
    `- ${MARKS.naturel}${NNBSP}: ce que dirait un locuteur du catalan central.`,
    `- ${MARKS.peu_naturel}${NNBSP}: juste, mais on ne le dirait pas ainsi.`,
    `- ${MARKS.faux}${NNBSP}: une faute, ou un sens différent de la phrase française.`,
    '',
    'Jugez le catalan seul, sans vous soucier de la ponctuation finale ni des ' +
      'majuscules. Certaines phrases françaises contiennent une faute de frappe ' +
      'voulue, jugez alors la traduction du sens voulu. Chaque traduction porte ' +
      'une référence, par exemple 12-b, à reporter avec son verdict.',
    '',
    ...cards,
  ].join('\n');
}

/** The file Sean fills in: every open reference, mapped to null. */
export function verdictTemplate(cases: readonly GoldenCase[]): Record<string, null> {
  return Object.fromEntries(unjudged(cases).map((rendering) => [rendering.id, null]));
}

/**
 * Writes verdicts into the fixtures. Refuses the whole file on any unknown
 * reference, unknown verdict, or change to a verdict already given, so a typo
 * cannot quietly rewrite the evidence. Null entries are skipped: a sheet may
 * come back half done.
 */
export function applyVerdicts(
  cases: readonly GoldenCase[],
  verdicts: Readonly<Record<string, unknown>>,
): { readonly cases: GoldenCase[]; readonly applied: number } {
  const byId = new Map(
    cases.flatMap((golden) =>
      golden.renderings.map((rendering) => [rendering.id, rendering]),
    ),
  );
  const problems: string[] = [];
  for (const [id, verdict] of Object.entries(verdicts)) {
    const rendering = byId.get(id);
    if (rendering === undefined) problems.push(`${id}: no such rendering`);
    if (verdict === null) continue;
    if (!VERDICTS.includes(verdict as Verdict)) {
      problems.push(
        `${id}: ${JSON.stringify(verdict)} is not one of ${VERDICTS.join(', ')}`,
      );
    } else if (
      rendering !== undefined &&
      rendering.verdict !== null &&
      rendering.verdict !== verdict
    ) {
      problems.push(`${id}: already judged ${rendering.verdict}`);
    }
  }
  if (problems.length > 0) throw new Error(`Verdicts refused:\n${problems.join('\n')}`);

  let applied = 0;
  const updated = cases.map((golden) => ({
    ...golden,
    renderings: golden.renderings.map((rendering) => {
      const verdict = verdicts[rendering.id];
      if (verdict === null || verdict === undefined || rendering.verdict !== null) {
        return rendering;
      }
      applied += 1;
      return { ...rendering, verdict: verdict as Verdict };
    }),
  }));
  return { cases: updated, applied };
}
