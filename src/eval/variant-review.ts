/**
 * The variant review (phase 2 spec, « Running it »): the speaker judges each
 * distinct Catalan rendering « naturel », « correct mais peu naturel » or
 * « faux », and Sean judges each distinct French line « fidèle » or
 * « inexact ». One card per combination, renderings deduplicated across
 * models, model names nowhere.
 *
 * IDs are assigned once and kept in the fixture, as in phase 1, and new ones
 * take letters in alphabetical order of their normalised form, so neither the
 * letter nor the order says which model wrote a line. A `not_applicable`
 * reply has no line to judge, and a reply that failed the code checks never
 * reaches a sheet.
 */
import { NNBSP, fr, labelled, quote } from '../i18n/fr';
import { parseComboKey, type Axis, type Combination } from '../variants/combination';
import { VERDICTS, normaliseRendering, type Verdict } from './golden';
import { letters } from './review';
import {
  FR_VERDICTS,
  type CatalanRendering,
  type FrVerdict,
  type FrenchLine,
  type ReplayedVariant,
  type VariantCombination,
  type VariantFixture,
} from './variants';

/** Case, spacing and final punctuation do not make a second French line. */
export function normaliseFrench(line: string): string {
  return line
    .normalize('NFC')
    .replaceAll("'", '’')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\s.!?…]+$/u, '')
    .toLocaleLowerCase('fr');
}

function accepted(reply: ReplayedVariant) {
  const { result } = reply;
  return result.status === 'ok' && result.variant.status === 'ok'
    ? result.variant
    : undefined;
}

function sortedFresh<T>(entries: Map<string, T>): [string, T][] {
  return [...entries].sort(([a], [b]) => a.localeCompare(b, 'fr'));
}

/** Every valid variant's Catalan and French, added to its combination unless already there. */
export function registerVariantLines(
  fixtures: readonly VariantFixture[],
  replies: readonly ReplayedVariant[],
): VariantFixture[] {
  return fixtures.map((fixture) => ({
    ...fixture,
    combinations: fixture.combinations.map((combination) => {
      const knownCa = new Set(combination.renderings.map((line) => line.key));
      const knownFr = new Set(combination.frLines.map((line) => line.key));
      const freshCa = new Map<string, string>();
      const freshFr = new Map<string, string>();
      for (const reply of replies) {
        if (reply.fixture.n !== fixture.n || reply.combination.id !== combination.id)
          continue;
        const variant = accepted(reply);
        if (variant === undefined) continue;
        const caKey = normaliseRendering(variant.phrase.ca);
        if (!knownCa.has(caKey) && !freshCa.has(caKey))
          freshCa.set(caKey, variant.phrase.ca);
        const frKey = normaliseFrench(variant.fr);
        if (!knownFr.has(frKey) && !freshFr.has(frKey)) freshFr.set(frKey, variant.fr);
      }
      if (freshCa.size === 0 && freshFr.size === 0) return combination;

      const renderings: CatalanRendering[] = sortedFresh(freshCa).map(
        ([key, ca], offset) => ({
          id: `${combination.id}-${letters(combination.renderings.length + offset)}`,
          key,
          ca,
          verdict: null,
        }),
      );
      const frLines: FrenchLine[] = sortedFresh(freshFr).map(([key, line], offset) => ({
        id: `${combination.id}-fr-${letters(combination.frLines.length + offset)}`,
        key,
        fr: line,
        verdict: null,
      }));
      return {
        ...combination,
        renderings: [...combination.renderings, ...renderings],
        frLines: [...combination.frLines, ...frLines],
      };
    }),
  }));
}

/** What a combination asks for, in French, against the base: « Qui : ella, Quand : Passé « avui » ». */
export function describeChange(
  fixture: VariantFixture,
  combination: VariantCombination,
): string {
  const base = parseComboKey(fixture.baseCombination);
  const target = parseComboKey(combination.target);
  const object = fixture.base.chunks.find(
    (chunk) => chunk.role === 'object_direct',
  )?.text;
  // The sheet is not app UI, so its captions are written here, as in review.ts.
  const parts: Record<Axis, (value: Combination) => string> = {
    person: (value) => labelled('Qui', value.person ?? ''),
    tense: (value) =>
      labelled('Quand', value.tense === null ? '' : fr.tenses[value.tense]),
    tournure: (value) => labelled('Tournure', fr.tournures[value.tournure]),
    pronoun: (value) =>
      value.pronoun
        ? `pronom à la place de ${quote(object ?? '')}`
        : 'complément rétabli',
    negation: (value) => (value.negation ? 'à la négation' : 'à l’affirmative'),
  };
  return (Object.keys(parts) as Axis[])
    .filter((axis) => base[axis] !== target[axis])
    .map((axis) => parts[axis](target))
    .join(', ');
}

function cardHeading(fixture: VariantFixture, combination: VariantCombination): string {
  return `## ${combination.id}. ${quote(fixture.base.ca)}, ${describeChange(fixture, combination)}`;
}

const CA_MARKS: Record<Verdict, string> = {
  naturel: quote('naturel'),
  peu_naturel: quote('correct mais peu naturel'),
  faux: quote('faux'),
};

const FR_MARKS: Record<FrVerdict, string> = {
  fidele: quote('fidèle'),
  inexact: quote('inexact'),
};

function openCards(
  fixtures: readonly VariantFixture[],
  table: (fixture: VariantFixture, combination: VariantCombination) => string[],
): string[] {
  return fixtures.flatMap((fixture) =>
    fixture.combinations.flatMap((combination) => {
      const rows = table(fixture, combination);
      return rows.length === 0
        ? []
        : [cardHeading(fixture, combination), '', ...rows, ''];
    }),
  );
}

/** The speaker's sheet: unjudged Catalan only, so round 2 repeats nothing. */
export function buildCatalanSheet(
  fixtures: readonly VariantFixture[],
  round: number,
): string {
  const cards = openCards(fixtures, (_fixture, combination) => {
    const open = combination.renderings.filter((line) => line.verdict === null);
    if (open.length === 0) return [];
    return [
      '| Réf. | Catalan | Verdict |',
      '| --- | --- | --- |',
      ...open.map((line) => `| ${line.id} | ${line.ca} | |`),
    ];
  });
  return [
    `# Relecture des variantes, série ${String(round)}`,
    '',
    'Chaque carte donne une phrase catalane et le changement demandé. Lisez ' +
      `chaque variante et donnez-lui l’un de ces trois verdicts${NNBSP}: ` +
      `${CA_MARKS.naturel}, ${CA_MARKS.peu_naturel} ou ${CA_MARKS.faux}.`,
    '',
    `- ${CA_MARKS.naturel}${NNBSP}: ce que dirait un locuteur du catalan central.`,
    `- ${CA_MARKS.peu_naturel}${NNBSP}: juste, mais on ne le dirait pas ainsi.`,
    `- ${CA_MARKS.faux}${NNBSP}: une faute, ou un autre changement que celui demandé.`,
    '',
    'Jugez le catalan seul, sans vous soucier de la ponctuation finale ni des ' +
      'majuscules. Chaque variante porte une référence, par exemple 1a-b, à ' +
      'reporter avec son verdict.',
    '',
    ...cards,
  ].join('\n');
}

/** Sean's sheet: each unjudged French line beside the Catalan it translates. */
export function buildFrenchSheet(
  fixtures: readonly VariantFixture[],
  replies: readonly ReplayedVariant[],
  round: number,
): string {
  const cards = openCards(fixtures, (fixture, combination) => {
    const open = combination.frLines.filter((line) => line.verdict === null);
    if (open.length === 0) return [];
    const catalanFor = (line: FrenchLine): string => {
      const reply = replies.find((candidate) => {
        const variant = accepted(candidate);
        return (
          candidate.fixture.n === fixture.n &&
          candidate.combination.id === combination.id &&
          variant !== undefined &&
          normaliseFrench(variant.fr) === line.key
        );
      });
      const variant = reply === undefined ? undefined : accepted(reply);
      return variant?.phrase.ca ?? '';
    };
    return [
      '| Réf. | Catalan | Français | Verdict |',
      '| --- | --- | --- | --- |',
      ...open.map((line) => `| ${line.id} | ${catalanFor(line)} | ${line.fr} | |`),
    ];
  });
  return [
    `# Relecture des traductions françaises des variantes, série ${String(round)}`,
    '',
    `Pour chaque ligne française, ${FR_MARKS.fidele} si elle rend la variante ` +
      `catalane sans rien ajouter ni retirer, ${FR_MARKS.inexact} sinon. Une ` +
      'ligne qui commente la grammaire est inexacte.',
    '',
    ...cards,
  ].join('\n');
}

/** The verdict files: every open reference, mapped to null. */
export function variantVerdictTemplates(fixtures: readonly VariantFixture[]): {
  readonly catalan: Record<string, null>;
  readonly french: Record<string, null>;
} {
  const combinations = fixtures.flatMap((fixture) => fixture.combinations);
  const open = (lines: readonly { id: string; verdict: unknown }[]) =>
    lines
      .filter((line) => line.verdict === null)
      .map((line) => [line.id, null] as const);
  return {
    catalan: Object.fromEntries(combinations.flatMap((c) => open(c.renderings))),
    french: Object.fromEntries(combinations.flatMap((c) => open(c.frLines))),
  };
}

/**
 * Writes verdicts into the fixtures. A Catalan reference takes a speaker
 * verdict and a French one (`-fr-`) one of Sean's. Refuses the whole file on an
 * unknown reference, an unknown verdict or a change to a verdict already given.
 */
export function applyVariantVerdicts(
  fixtures: readonly VariantFixture[],
  verdicts: Readonly<Record<string, unknown>>,
): { readonly fixtures: VariantFixture[]; readonly applied: number } {
  const lines = new Map<string, { verdict: unknown; allowed: readonly string[] }>();
  for (const combination of fixtures.flatMap((fixture) => fixture.combinations)) {
    for (const line of combination.renderings)
      lines.set(line.id, { verdict: line.verdict, allowed: VERDICTS });
    for (const line of combination.frLines)
      lines.set(line.id, { verdict: line.verdict, allowed: FR_VERDICTS });
  }
  const problems: string[] = [];
  for (const [id, verdict] of Object.entries(verdicts)) {
    const line = lines.get(id);
    if (line === undefined) {
      problems.push(`${id}: no such line`);
      continue;
    }
    if (verdict === null) continue;
    if (typeof verdict !== 'string' || !line.allowed.includes(verdict)) {
      problems.push(
        `${id}: ${JSON.stringify(verdict)} is not one of ${line.allowed.join(', ')}`,
      );
    } else if (line.verdict !== null && line.verdict !== verdict) {
      problems.push(`${id}: already judged ${String(line.verdict)}`);
    }
  }
  if (problems.length > 0) throw new Error(`Verdicts refused:\n${problems.join('\n')}`);

  let applied = 0;
  const apply = <T extends { id: string; verdict: unknown }>(line: T): T => {
    const verdict = verdicts[line.id];
    if (verdict === null || verdict === undefined || line.verdict !== null) return line;
    applied += 1;
    return { ...line, verdict };
  };
  const updated = fixtures.map((fixture) => ({
    ...fixture,
    combinations: fixture.combinations.map((combination) => ({
      ...combination,
      renderings: combination.renderings.map(apply),
      frLines: combination.frLines.map(apply),
    })),
  }));
  return { fixtures: updated, applied };
}
