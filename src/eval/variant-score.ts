/**
 * Offline scoring of the variant eval against the spec's floors (« Floors »),
 * counted per model over its runs of every combination. Nothing is judged by
 * a model; the Catalan verdicts are the speaker's and the French ones Sean's.
 */
import type { ComponentId } from '../api/schema';
import type { PreCheck, PreCheckName } from './golden';
import { asCold, costOf } from './pricing';
import {
  isWarm,
  percentile,
  preChecksPassed,
  tokensOf,
  type FloorStatus,
} from './score';
import { normaliseRendering } from './golden';
import { normaliseFrench } from './variant-review';
import type { ReplayedVariant, VariantFixture, VariantRecording } from './variants';

export const VARIANT_FLOORS = {
  /** Valid after the one retry: every reply. */
  validShare: 1,
  /** Catalan accepted: at least 95% of the variants returned. */
  acceptedShare: 0.95,
  /** A combination « faux » in this many runs fails the floor whatever the share. */
  fauxRunsPerCombination: 2,
  /** French line « fidèle »: at least 95%. */
  fideleShare: 0.95,
  /** Each trap must come back not_applicable in at least this many of 3 runs. */
  trapRuns: 2,
  /** not_applicable where none is expected: at most 3% of non-trap replies. */
  unexpectedNaMax: 0.03,
  paddedShareMax: 0.03,
  warmP90MsMax: 8000,
  /** The target, not a floor: a miss adds prefetch rather than failing (D2). */
  warmP90MsTarget: 2000,
} as const;

/** The runs the floors are counted over. */
export const VARIANT_RUNS = 3;

export interface TrapScore {
  readonly combination: string;
  readonly runs: number;
  readonly notApplicable: number;
  /** Replies that named the trap's own reason. Reported, not a floor. */
  readonly expectedReason: number;
  readonly status: FloorStatus;
}

export interface VariantScore {
  readonly model: string;
  readonly runs: readonly number[];
  readonly staleRuns: readonly number[];
  readonly preChecks: readonly PreCheck[];
  readonly dropped?: PreCheckName;
  readonly replies: number;
  readonly valid: number;
  readonly unavailable: number;
  readonly errors: number;
  /** Valid replies carrying a variant, so a Catalan and a French line. */
  readonly variants: number;
  readonly naturel: number;
  readonly peuNaturel: number;
  readonly faux: number;
  readonly pendingCatalan: number;
  readonly fauxCombinations: readonly string[];
  readonly fidele: number;
  readonly inexact: number;
  readonly pendingFrench: number;
  readonly traps: readonly TrapScore[];
  readonly nonTrapReplies: number;
  readonly unexpectedNa: number;
  readonly unexpectedNaDetail: readonly string[];
  readonly links: number;
  readonly padded: number;
  readonly paddedDetail: readonly string[];
  readonly warmReplies: number;
  readonly warmP90Ms: number | null;
  readonly warmP50Ms: number | null;
  readonly costWarm: number | null;
  readonly costCold5m: number | null;
  readonly costCold1h: number | null;
  readonly floors: {
    readonly valid: FloorStatus;
    readonly catalan: FloorStatus;
    readonly french: FloorStatus;
    readonly traps: FloorStatus;
    readonly unexpectedNa: FloorStatus;
    readonly padded: FloorStatus;
    readonly latency: FloorStatus;
  };
  readonly latencyTargetMet: boolean | null;
}

function mean(values: readonly number[]): number | null {
  return values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;
}

/** A judged share: fail as soon as it cannot reach `share`, pending while lines wait. */
function judgedFloor(
  good: number,
  pending: number,
  total: number,
  share: number,
): FloorStatus {
  const needed = Math.ceil(share * total);
  if (good + pending < needed) return 'fail';
  return pending > 0 ? 'pending' : 'pass';
}

/**
 * @param mustNotLink the golden-set v2 padding traps of each row, by row
 *   number: the variant fixtures change the sentence, not what padding means
 *   for it, so padded links are counted against the row's own list. A lower
 *   bound, as in phase 1.
 */
export function scoreVariantModel(
  model: string,
  recordings: readonly VariantRecording[],
  replies: readonly ReplayedVariant[],
  currentPromptHash: string,
  mustNotLink: ReadonlyMap<number, readonly ComponentId[]>,
): VariantScore {
  let valid = 0;
  let unavailable = 0;
  let errors = 0;
  let variants = 0;
  let naturel = 0;
  let peuNaturel = 0;
  let faux = 0;
  let pendingCatalan = 0;
  let fidele = 0;
  let inexact = 0;
  let pendingFrench = 0;
  let nonTrapReplies = 0;
  let unexpectedNa = 0;
  let links = 0;
  let padded = 0;
  const unexpectedNaDetail: string[] = [];
  const paddedDetail: string[] = [];
  const fauxRuns = new Map<string, Set<number>>();
  const traps = new Map<string, { runs: number; na: number; reason: number }>();

  for (const reply of replies) {
    const { combination, result } = reply;
    const where = `${combination.id}, run ${String(reply.run)}`;
    const trap = combination.trap;
    const trapTally = traps.get(combination.id) ?? { runs: 0, na: 0, reason: 0 };
    if (trap !== undefined) {
      trapTally.runs += 1;
      traps.set(combination.id, trapTally);
    } else {
      nonTrapReplies += 1;
    }

    if (result.status === 'unavailable') unavailable += 1;
    if (result.status === 'error') errors += 1;
    if (result.status !== 'ok') continue;
    valid += 1;

    const { variant } = result;
    if (variant.status === 'not_applicable') {
      if (trap !== undefined) {
        trapTally.na += 1;
        if (variant.reason === trap) trapTally.reason += 1;
      } else {
        unexpectedNa += 1;
        unexpectedNaDetail.push(`${where}: ${variant.reason}`);
      }
      continue;
    }

    variants += 1;
    const forbidden = mustNotLink.get(reply.fixture.n) ?? [];
    for (const chunk of variant.phrase.chunks) {
      for (const id of chunk.ids) {
        links += 1;
        if (forbidden.includes(id)) {
          padded += 1;
          paddedDetail.push(`${where}: ${id} on « ${chunk.text} »`);
        }
      }
    }

    const caKey = normaliseRendering(variant.phrase.ca);
    const caVerdict =
      combination.renderings.find((line) => line.key === caKey)?.verdict ?? null;
    if (caVerdict === null) pendingCatalan += 1;
    else if (caVerdict === 'naturel') naturel += 1;
    else if (caVerdict === 'peu_naturel') peuNaturel += 1;
    else {
      faux += 1;
      const runs = fauxRuns.get(combination.id) ?? new Set<number>();
      runs.add(reply.run);
      fauxRuns.set(combination.id, runs);
    }

    const frKey = normaliseFrench(variant.fr);
    const frVerdict =
      combination.frLines.find((line) => line.key === frKey)?.verdict ?? null;
    if (frVerdict === null) pendingFrench += 1;
    else if (frVerdict === 'fidele') fidele += 1;
    else inexact += 1;
  }

  const trapScores: TrapScore[] = [...traps].map(([id, tally]) => ({
    combination: id,
    runs: tally.runs,
    notApplicable: tally.na,
    expectedReason: tally.reason,
    status:
      tally.na >= VARIANT_FLOORS.trapRuns
        ? 'pass'
        : tally.runs - tally.na > VARIANT_RUNS - VARIANT_FLOORS.trapRuns
          ? 'fail'
          : 'pending',
  }));
  const fauxCombinations = [...fauxRuns]
    .filter(([, runs]) => runs.size >= VARIANT_FLOORS.fauxRunsPerCombination)
    .map(([id]) => id)
    .sort();

  const dropped = recordings.find((recording) => recording.dropped)?.dropped;
  const warm = replies.filter((reply) => isWarm(reply.recorded));
  const warmLatencies = warm.map((reply) => reply.recorded.latencyMs);
  const warmP90Ms = percentile(warmLatencies, 0.9);
  const tokens = replies.map((reply) => tokensOf(reply.recorded));

  const catalanFloor =
    fauxCombinations.length > 0
      ? 'fail'
      : judgedFloor(
          naturel + peuNaturel,
          pendingCatalan,
          variants,
          VARIANT_FLOORS.acceptedShare,
        );

  return {
    model,
    runs: recordings.map((recording) => recording.run).sort((a, b) => a - b),
    staleRuns: recordings
      .filter((recording) => recording.promptHash !== currentPromptHash)
      .map((recording) => recording.run),
    preChecks: recordings.flatMap((recording) => recording.preChecks),
    ...(dropped !== undefined && { dropped }),
    replies: replies.length,
    valid,
    unavailable,
    errors,
    variants,
    naturel,
    peuNaturel,
    faux,
    pendingCatalan,
    fauxCombinations,
    fidele,
    inexact,
    pendingFrench,
    traps: trapScores,
    nonTrapReplies,
    unexpectedNa,
    unexpectedNaDetail,
    links,
    padded,
    paddedDetail,
    warmReplies: warm.length,
    warmP90Ms,
    warmP50Ms: percentile(warmLatencies, 0.5),
    costWarm: mean(warm.map((reply) => costOf(model, tokensOf(reply.recorded), '5m'))),
    costCold5m: mean(tokens.map((counts) => costOf(model, asCold(counts), '5m'))),
    costCold1h: mean(tokens.map((counts) => costOf(model, asCold(counts), '1h'))),
    floors: {
      valid: replies.length > 0 && valid === replies.length ? 'pass' : 'fail',
      catalan: catalanFloor,
      french: judgedFloor(fidele, pendingFrench, variants, VARIANT_FLOORS.fideleShare),
      traps: trapScores.some((trap) => trap.status === 'fail')
        ? 'fail'
        : trapScores.length === 0 ||
            trapScores.some((trap) => trap.status === 'pending')
          ? 'pending'
          : 'pass',
      unexpectedNa:
        nonTrapReplies === 0 ||
        unexpectedNa / nonTrapReplies <= VARIANT_FLOORS.unexpectedNaMax
          ? 'pass'
          : 'fail',
      padded:
        links === 0 || padded / links <= VARIANT_FLOORS.paddedShareMax
          ? 'pass'
          : 'fail',
      latency:
        warmP90Ms !== null && warmP90Ms <= VARIANT_FLOORS.warmP90MsMax
          ? 'pass'
          : 'fail',
    },
    latencyTargetMet:
      warmP90Ms === null ? null : warmP90Ms <= VARIANT_FLOORS.warmP90MsTarget,
  };
}

/** Why a model does not clear the variant eval, empty when it does. */
export function variantGateFailures(
  score: VariantScore | undefined,
  fixtures: readonly VariantFixture[],
): string[] {
  if (score === undefined) return ['no recordings'];
  const combinations = fixtures.reduce(
    (sum, fixture) => sum + fixture.combinations.length,
    0,
  );
  const failures: string[] = [];
  if (score.dropped !== undefined) failures.push(`dropped: ${score.dropped}`);
  if (!preChecksPassed(score)) failures.push('a pre-check failed');
  if (score.staleRuns.length > 0)
    failures.push(`prompt changed since runs ${score.staleRuns.join(', ')}`);
  if (score.replies !== combinations * VARIANT_RUNS)
    failures.push(
      `${String(score.replies)} replies, not ${String(combinations * VARIANT_RUNS)}`,
    );
  for (const [floor, status] of Object.entries(score.floors))
    if (status !== 'pass') failures.push(`${floor} floor: ${status}`);
  return failures;
}

const usd = (value: number | null): string =>
  value === null ? 'n/a' : `$${value.toFixed(4)}`;
const share = (part: number, whole: number): string =>
  whole === 0 ? 'n/a' : `${((100 * part) / whole).toFixed(1)}%`;
const mark = (status: FloorStatus): string =>
  status === 'pass' ? 'pass' : status === 'fail' ? '**fail**' : 'pending';
const seconds = (ms: number | null): string =>
  ms === null ? 'n/a' : `${(ms / 1000).toFixed(1)} s`;

/** The report `npm run eval:variants` prints. English: it is repo documentation. */
export function renderVariantReport(scores: readonly VariantScore[]): string {
  if (scores.length === 0) {
    return '# Variant eval report\n\nNo recordings yet. Run `npm run eval:variants:record` first.\n';
  }
  const header = `| Measure | Floor | ${scores.map((s) => `\`${s.model}\``).join(' | ')} |`;
  const rule = `| --- | --- | ${scores.map(() => '---').join(' | ')} |`;
  const row = (
    measure: string,
    floor: string,
    cell: (s: VariantScore) => string,
  ): string => `| ${measure} | ${floor} | ${scores.map(cell).join(' | ')} |`;

  const table = [
    header,
    rule,
    row('Runs', '', (s) => (s.runs.length === 0 ? 'none' : s.runs.join(', '))),
    row('Pre-checks', 'all three', (s) =>
      s.dropped
        ? `**dropped: ${s.dropped}**`
        : preChecksPassed(s)
          ? 'pass'
          : '**fail**',
    ),
    row(
      'Valid after the one retry',
      'every reply',
      (s) => `${String(s.valid)}/${String(s.replies)} ${mark(s.floors.valid)}`,
    ),
    row(
      'Catalan accepted',
      '95%, no combination faux in 2 runs',
      (s) =>
        `${String(s.naturel + s.peuNaturel)}/${String(s.variants)} ${mark(s.floors.catalan)}`,
    ),
    row('« naturel »', 'tie-breaker', (s) => String(s.naturel)),
    row('« correct mais peu naturel »', 'reported', (s) => String(s.peuNaturel)),
    row('« faux »', 'reported', (s) => String(s.faux)),
    row('Catalan awaiting a verdict', '', (s) => String(s.pendingCatalan)),
    row(
      'French line « fidèle »',
      '95%',
      (s) => `${String(s.fidele)}/${String(s.variants)} ${mark(s.floors.french)}`,
    ),
    row('French awaiting a verdict', '', (s) => String(s.pendingFrench)),
    row('not_applicable on every trap', '2 of 3 runs each', (s) =>
      [
        ...s.traps.map(
          (t) => `${t.combination} ${String(t.notApplicable)}/${String(t.runs)}`,
        ),
        mark(s.floors.traps),
      ].join(', '),
    ),
    row(
      'not_applicable where not expected',
      'at most 3%',
      (s) =>
        `${String(s.unexpectedNa)}/${String(s.nonTrapReplies)} (${share(s.unexpectedNa, s.nonTrapReplies)}) ${mark(s.floors.unexpectedNa)}`,
    ),
    row(
      'Padded links (lower bound)',
      'at most 3%',
      (s) =>
        `${String(s.padded)}/${String(s.links)} (${share(s.padded, s.links)}) ${mark(s.floors.padded)}`,
    ),
    row('Latency, warm, median', '', (s) => seconds(s.warmP50Ms)),
    row(
      'Latency, warm, 90th percentile',
      'at most 8 s',
      (s) => `${seconds(s.warmP90Ms)} ${mark(s.floors.latency)}`,
    ),
    row('2 s target (a miss adds prefetch)', 'target', (s) =>
      s.latencyTargetMet === null ? 'n/a' : s.latencyTargetMet ? 'met' : 'missed',
    ),
    row('Cost per tap, warm (measured)', '', (s) => usd(s.costWarm)),
    row('Cost per tap, cold, 5-minute cache', '', (s) => usd(s.costCold5m)),
    row('Cost per tap, cold, 1-hour cache', '', (s) => usd(s.costCold1h)),
  ];

  const details = scores.flatMap((s) => {
    const lines = [
      ...(s.staleRuns.length > 0
        ? [`- Runs ${s.staleRuns.join(', ')} were recorded under another prompt.`]
        : []),
      ...s.preChecks
        .filter((c) => !c.passed)
        .map((c) => `- Pre-check ${c.name}: ${c.detail}`),
      ...(s.unavailable + s.errors > 0
        ? [
            `- ${String(s.unavailable)} unavailable after the retry, ${String(s.errors)} errors.`,
          ]
        : []),
      ...(s.fauxCombinations.length > 0
        ? [`- Faux in 2 runs: ${s.fauxCombinations.join(', ')}.`]
        : []),
      ...s.traps
        .filter((t) => t.expectedReason < t.notApplicable)
        .map(
          (t) =>
            `- Trap ${t.combination}: ${String(t.expectedReason)} of ${String(t.notApplicable)} named the expected reason.`,
        ),
      ...s.unexpectedNaDetail.map((line) => `- Unexpected not_applicable: ${line}`),
      ...s.paddedDetail.map((line) => `- Padded: ${line}`),
    ];
    return lines.length === 0 ? [] : [`### \`${s.model}\``, '', ...lines, ''];
  });

  return [
    '# Variant eval report',
    '',
    'Replayed offline from the recordings in `test/fixtures/variants-v1/recordings/`.',
    'Cold cost reprices the same replies with the prefix written instead of read.',
    'Padded links count each row’s golden-set must-not-link IDs, so this is a lower bound.',
    '',
    ...table,
    '',
    ...(details.length > 0 ? ['## Details', '', ...details] : []),
  ].join('\n');
}
