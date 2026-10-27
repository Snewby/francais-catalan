/**
 * Offline scoring against the spec's floors (« Floors and selection »).
 *
 * Everything here is counted from replayed replies and the speaker's verdicts.
 * Nothing is judged by a model, and nothing about French prose is asserted.
 */
import {
  REQUIRED_PRE_CHECKS,
  renderingOf,
  type PreCheck,
  type PreCheckName,
  type Recording,
  type RecordedCase,
  type ReplayedReply,
} from './golden';
import { asCold, costOf, type TokenCounts } from './pricing';

/** The floors, as the spec states them. */
export const FLOORS = {
  /** Valid schema and spans after the one retry: every reply. */
  validShare: 1,
  /** Catalan accepted: at least 95% (86 of 90). */
  acceptedShare: 0.95,
  /** A case « faux » in this many runs fails the floor whatever the share. */
  fauxRunsPerCase: 2,
  requiredLinkedShare: 0.9,
  paddedShareMax: 0.03,
  warmP90MsMax: 8000,
} as const;

export type FloorStatus = 'pass' | 'fail' | 'pending';

export interface ModelScore {
  readonly model: string;
  readonly runs: readonly number[];
  /** Runs recorded under a prompt other than today's. Their evidence is stale. */
  readonly staleRuns: readonly number[];
  readonly preChecks: readonly PreCheck[];
  readonly dropped?: PreCheckName;
  readonly replies: number;
  readonly valid: number;
  readonly analysisFailed: number;
  readonly errors: number;
  readonly naturel: number;
  readonly peuNaturel: number;
  readonly faux: number;
  /** Valid replies whose rendering has no verdict yet. */
  readonly pending: number;
  /** Case numbers judged « faux » in at least FLOORS.fauxRunsPerCase runs. */
  readonly fauxCases: readonly number[];
  readonly requiredMet: number;
  readonly requiredTotal: number;
  readonly links: number;
  readonly padded: number;
  readonly paddedDetail: readonly string[];
  readonly assumptionMisses: readonly string[];
  readonly frMisses: readonly string[];
  readonly warmReplies: number;
  readonly warmP90Ms: number | null;
  readonly costWarm: number | null;
  readonly costCold5m: number | null;
  readonly costCold1h: number | null;
  readonly floors: {
    readonly valid: FloorStatus;
    readonly accepted: FloorStatus;
    readonly required: FloorStatus;
    readonly padded: FloorStatus;
    readonly latency: FloorStatus;
  };
}

/** Tokens over every fetch of one case, the retry included. */
export function tokensOf(recorded: RecordedCase): TokenCounts {
  const total = { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 };
  for (const fetched of recorded.fetches) {
    if (
      'failed' in fetched ||
      typeof fetched.body !== 'object' ||
      fetched.body === null
    ) {
      continue;
    }
    const usage = (fetched.body as { usage?: Record<string, unknown> }).usage ?? {};
    const read = (field: string): number => {
      const value = usage[field];
      return typeof value === 'number' ? value : 0;
    };
    total.input += read('input_tokens');
    total.output += read('output_tokens');
    total.cacheWrite += read('cache_creation_input_tokens');
    total.cacheRead += read('cache_read_input_tokens');
  }
  return total;
}

/** Warm when the first call already read the prefix from the cache. */
export function isWarm(recorded: RecordedCase): boolean {
  const first = recorded.fetches[0];
  if (first === undefined || 'failed' in first) return false;
  const usage = (first.body as { usage?: { cache_read_input_tokens?: unknown } } | null)
    ?.usage;
  return (
    typeof usage?.cache_read_input_tokens === 'number' &&
    usage.cache_read_input_tokens > 0
  );
}

/** Nearest-rank percentile; null for no values. */
export function percentile(values: readonly number[], share: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil(share * sorted.length));
  return sorted[rank - 1] ?? null;
}

function mean(values: readonly number[]): number | null {
  return values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;
}

export function scoreModel(
  model: string,
  recordings: readonly Recording[],
  replies: readonly ReplayedReply[],
  currentPromptHash: string,
): ModelScore {
  const preChecks = recordings.flatMap((recording) => recording.preChecks);
  const dropped = recordings.find((recording) => recording.dropped)?.dropped;

  let valid = 0;
  let analysisFailed = 0;
  let errors = 0;
  let naturel = 0;
  let peuNaturel = 0;
  let faux = 0;
  let pending = 0;
  let requiredMet = 0;
  let requiredTotal = 0;
  let links = 0;
  let padded = 0;
  const paddedDetail: string[] = [];
  const assumptionMisses: string[] = [];
  const frMisses: string[] = [];
  const fauxRuns = new Map<number, Set<number>>();

  for (const reply of replies) {
    const { golden, result } = reply;
    const where = `case ${String(golden.n)}, run ${String(reply.run)}`;
    if (result.status === 'analysis_failed') analysisFailed += 1;
    if (result.status === 'error') errors += 1;
    if (result.status !== 'ok') continue;
    valid += 1;

    const chunks = result.phrase.chunks;
    const linked = new Set(chunks.flatMap((chunk) => chunk.ids));

    for (const chunk of chunks) {
      for (const id of chunk.ids) {
        links += 1;
        if (golden.mustNotLink.includes(id)) {
          padded += 1;
          paddedDetail.push(`${where}: ${id} on « ${chunk.text} »`);
        }
      }
    }
    if (
      golden.requireUnlinked &&
      chunks.every((chunk) => chunk.unlinked === undefined)
    ) {
      // Q4, 26 Oct: an idiom outside the taxonomy with every chunk linked has
      // had an ID forced onto it, counted as one padded link.
      padded += 1;
      paddedDetail.push(`${where}: no chunk left unlinked`);
    }

    const assumptions = result.phrase.assumptions;
    for (const required of golden.assumptions.required) {
      if (!assumptions.includes(required))
        assumptionMisses.push(`${where}: ${required} missing`);
    }
    for (const forbidden of golden.assumptions.forbidden) {
      if (assumptions.includes(forbidden))
        assumptionMisses.push(`${where}: ${forbidden} assumed`);
    }
    for (const text of golden.fr.mustContain) {
      if (!result.phrase.fr.includes(text))
        frMisses.push(`${where}: fr lacks « ${text} »`);
    }
    for (const text of golden.fr.mustNotContain) {
      if (result.phrase.fr.includes(text))
        frMisses.push(`${where}: fr keeps « ${text} »`);
    }

    const verdict = renderingOf(reply)?.verdict ?? null;
    if (verdict === null) {
      pending += 1;
      continue;
    }
    if (verdict === 'faux') {
      faux += 1;
      const runs = fauxRuns.get(golden.n) ?? new Set<number>();
      runs.add(reply.run);
      fauxRuns.set(golden.n, runs);
      continue;
    }
    if (verdict === 'naturel') naturel += 1;
    else peuNaturel += 1;

    // Must link counts only where the speaker accepted the Catalan
    // (docs/golden-set-v2.md, « Rules for scoring »).
    for (const group of golden.mustLink) {
      requiredTotal += 1;
      if (group.anyOf.some((id) => linked.has(id))) requiredMet += 1;
    }
  }

  const warm = replies.filter((reply) => isWarm(reply.recorded));
  const warmP90Ms = percentile(
    warm.map((reply) => reply.recorded.latencyMs),
    0.9,
  );
  const tokens = replies.map((reply) => tokensOf(reply.recorded));
  const costWarm = mean(
    warm.map((reply) => costOf(model, tokensOf(reply.recorded), '5m')),
  );
  const costCold5m = mean(tokens.map((counts) => costOf(model, asCold(counts), '5m')));
  const costCold1h = mean(tokens.map((counts) => costOf(model, asCold(counts), '1h')));

  const total = replies.length;
  const accepted = naturel + peuNaturel;
  const fauxCases = [...fauxRuns]
    .filter(([, runs]) => runs.size >= FLOORS.fauxRunsPerCase)
    .map(([n]) => n)
    .sort((a, b) => a - b);
  const needed = Math.ceil(FLOORS.acceptedShare * total);

  const acceptedFloor: FloorStatus =
    total === 0 || fauxCases.length > 0 || accepted + pending < needed
      ? 'fail'
      : pending > 0
        ? 'pending'
        : accepted >= needed
          ? 'pass'
          : 'fail';
  const requiredFloor: FloorStatus =
    pending > 0
      ? 'pending'
      : requiredTotal === 0 || requiredMet / requiredTotal >= FLOORS.requiredLinkedShare
        ? 'pass'
        : 'fail';

  return {
    model,
    runs: recordings.map((recording) => recording.run).sort((a, b) => a - b),
    staleRuns: recordings
      .filter((recording) => recording.promptHash !== currentPromptHash)
      .map((recording) => recording.run),
    preChecks,
    ...(dropped !== undefined && { dropped }),
    replies: total,
    valid,
    analysisFailed,
    errors,
    naturel,
    peuNaturel,
    faux,
    pending,
    fauxCases,
    requiredMet,
    requiredTotal,
    links,
    padded,
    paddedDetail,
    assumptionMisses,
    frMisses,
    warmReplies: warm.length,
    warmP90Ms,
    costWarm,
    costCold5m,
    costCold1h,
    floors: {
      valid: total > 0 && valid === total ? 'pass' : 'fail',
      accepted: acceptedFloor,
      required: requiredFloor,
      padded: links === 0 || padded / links <= FLOORS.paddedShareMax ? 'pass' : 'fail',
      latency: warmP90Ms !== null && warmP90Ms <= FLOORS.warmP90MsMax ? 'pass' : 'fail',
    },
  };
}

/** Whether every required pre-check passed in every run. */
export function preChecksPassed(score: ModelScore): boolean {
  return REQUIRED_PRE_CHECKS.every((name) => {
    const runs = score.preChecks.filter((check) => check.name === name);
    return runs.length > 0 && runs.every((check) => check.passed);
  });
}

const usd = (value: number | null): string =>
  value === null ? 'n/a' : `$${value.toFixed(4)}`;
const share = (part: number, whole: number): string =>
  whole === 0 ? 'n/a' : `${((100 * part) / whole).toFixed(1)}%`;
const mark = (status: FloorStatus): string =>
  status === 'pass' ? 'pass' : status === 'fail' ? '**fail**' : 'pending';

/** The report `npm run eval` prints. English: it is repo documentation. */
export function renderReport(scores: readonly ModelScore[]): string {
  if (scores.length === 0) {
    return '# Golden set v2 report\n\nNo recordings yet. Run `npm run eval:record` first.\n';
  }
  const header = `| Measure | Floor | ${scores.map((s) => `\`${s.model}\``).join(' | ')} |`;
  const rule = `| --- | --- | ${scores.map(() => '---').join(' | ')} |`;
  const row = (
    measure: string,
    floor: string,
    cell: (s: ModelScore) => string,
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
    row('One-hour cache accepted', 'reported', (s) => {
      const checks = s.preChecks.filter((check) => check.name === 'cache_1h');
      return checks.length === 0 ? 'n/a' : checks.every((c) => c.passed) ? 'yes' : 'no';
    }),
    row(
      'Valid schema and spans, after the retry',
      'every reply',
      (s) => `${String(s.valid)}/${String(s.replies)} ${mark(s.floors.valid)}`,
    ),
    row(
      'Catalan accepted',
      '95%, no case faux in 2 runs',
      (s) =>
        `${String(s.naturel + s.peuNaturel)}/${String(s.replies)} ${mark(s.floors.accepted)}`,
    ),
    row('« naturel »', 'tie-breaker', (s) => String(s.naturel)),
    row('« correct mais peu naturel »', 'reported', (s) => String(s.peuNaturel)),
    row('« faux »', 'reported', (s) => String(s.faux)),
    row('Awaiting a verdict', '', (s) => String(s.pending)),
    row(
      'Required IDs linked (accepted replies)',
      '90%',
      (s) => `${share(s.requiredMet, s.requiredTotal)} ${mark(s.floors.required)}`,
    ),
    row(
      'Padded links (lower bound, Q4)',
      'at most 3%',
      (s) =>
        `${String(s.padded)}/${String(s.links)} (${share(s.padded, s.links)}) ${mark(s.floors.padded)}`,
    ),
    row(
      'Latency, warm, 90th percentile',
      'at most 8 s',
      (s) =>
        `${s.warmP90Ms === null ? 'n/a' : `${(s.warmP90Ms / 1000).toFixed(1)} s`} ${mark(s.floors.latency)}`,
    ),
    row('Cost per sentence, warm (measured)', '', (s) => usd(s.costWarm)),
    row('Cost per sentence, cold, 5-minute cache', '', (s) => usd(s.costCold5m)),
    row('Cost per sentence, cold, 1-hour cache', '', (s) => usd(s.costCold1h)),
  ];

  const details = scores.flatMap((s) => {
    const lines = [
      ...(s.staleRuns.length > 0
        ? [`- Runs ${s.staleRuns.join(', ')} were recorded under another prompt.`]
        : []),
      ...s.preChecks
        .filter((c) => !c.passed)
        .map((c) => `- Pre-check ${c.name}: ${c.detail}`),
      ...(s.analysisFailed + s.errors > 0
        ? [`- ${String(s.analysisFailed)} analysis_failed, ${String(s.errors)} errors.`]
        : []),
      ...(s.fauxCases.length > 0
        ? [`- Faux in 2 runs: cases ${s.fauxCases.join(', ')}.`]
        : []),
      ...s.paddedDetail.map((line) => `- Padded: ${line}`),
      ...s.assumptionMisses.map((line) => `- Assumptions: ${line}`),
      ...s.frMisses.map((line) => `- French: ${line}`),
    ];
    return lines.length === 0 ? [] : [`### \`${s.model}\``, '', ...lines, ''];
  });

  return [
    '# Golden set v2 report',
    '',
    'Replayed offline from the recordings in `test/fixtures/golden-v2/recordings/`.',
    'Cold cost reprices the same replies with the prefix written instead of read.',
    'Padded links count must-not-link IDs and, on row 29, an idiom left with no',
    'unlinked chunk; padding outside those is not counted, so this is a lower bound.',
    '',
    ...table,
    '',
    ...(details.length > 0 ? ['## Details', '', ...details] : []),
  ].join('\n');
}
