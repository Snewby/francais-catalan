/**
 * The variant eval (phase 2 spec, « Variant eval »): fixture and recording
 * shapes, the paid recorder and the offline replay.
 *
 * A fixture is one of the ten golden-set rows with its six approved target
 * combinations. Its base is the app model's phase 1 reply for that row, Opus
 * run 1, frozen into the fixture so both candidates vary the same Catalan
 * (decided 29 Oct, F3). Its base combination is the approved table's, as
 * written, not re-derived (F4): row 19's « és » carries no tense ID, so the app
 * would grey « Quand ? » there, but the eval still asks the model.
 *
 * Replay feeds the recorded responses back through `requestVariant`, so the
 * eval exercises the app's own request, check and retry, and costs nothing.
 * No model judges anything: the speaker judges the Catalan and Sean the French.
 */
import type { NotApplicableReason } from '../api/phrase';
import type { Chunk } from '../api/phrase-check';
import { MAX_TOKENS, effortFor } from '../api/anthropic';
import { requestVariant, type VariantResult } from '../variants/client';
import { parseComboKey } from '../variants/combination';
import { buildVariantRequest, type VariantRequest } from '../variants/prompt';
import type { VariantContext } from '../variants/check';
import {
  REQUIRED_PRE_CHECKS,
  replayFetch,
  type PreCheck,
  type PreCheckName,
  type RecordedFetch,
  type Verdict,
} from './golden';
import { capturingFetch, runPreChecks } from './record';

/** The two models the variant eval compares (D6): the phase 1 winner and Haiku 5.5. */
export const VARIANT_CANDIDATES: readonly string[] = [
  'claude-opus-5-5',
  'claude-haiku-5-5',
];

/** Sean's two marks on a French line: « fidèle », « inexact ». */
export type FrVerdict = 'fidele' | 'inexact';
export const FR_VERDICTS: readonly FrVerdict[] = ['fidele', 'inexact'];

export interface CatalanRendering {
  /** Combination ID and letters, e.g. `1a-b`. Never reused, never renumbered. */
  readonly id: string;
  readonly key: string;
  readonly ca: string;
  readonly verdict: Verdict | null;
}

export interface FrenchLine {
  /** Combination ID, `fr` and letters, e.g. `1a-fr-a`. */
  readonly id: string;
  readonly key: string;
  readonly fr: string;
  readonly verdict: FrVerdict | null;
}

export interface VariantCombination {
  /** Row and column of the approved table, e.g. `1a`. */
  readonly id: string;
  /** A combination key, person·tense·tournure·pronoun·negation. */
  readonly target: string;
  /** Set on the three traps: the reason a correct model returns. */
  readonly trap?: NotApplicableReason;
  readonly renderings: readonly CatalanRendering[];
  readonly frLines: readonly FrenchLine[];
}

export interface VariantFixture {
  /** The golden-set v2 row. */
  readonly n: number;
  readonly slug: string;
  readonly input: string;
  /** The app model's phase 1 reply, Opus run 1. */
  readonly base: { readonly ca: string; readonly chunks: readonly Chunk[] };
  /** The approved table's base combination key, as written. */
  readonly baseCombination: string;
  readonly combinations: readonly VariantCombination[];
}

export interface VariantRecordedCase {
  readonly n: number;
  readonly combination: string;
  readonly target: string;
  readonly fetches: readonly RecordedFetch[];
  /** The learner's whole wait for this tap, retry included. */
  readonly latencyMs: number;
}

export interface VariantRecording {
  readonly model: string;
  readonly run: number;
  readonly recordedAt: string;
  /** variantPromptHash at recording time. */
  readonly promptHash: string;
  readonly settings: {
    readonly effort: string | null;
    readonly maxTokens: number;
    readonly cacheTtl: '5m';
  };
  readonly preChecks: readonly PreCheck[];
  readonly dropped?: PreCheckName;
  readonly cases: readonly VariantRecordedCase[];
}

/** The request one combination sends, and the context its reply is held to. */
export function variantCall(
  fixture: VariantFixture,
  combination: VariantCombination,
): { readonly request: VariantRequest; readonly context: VariantContext } {
  return buildVariantRequest(
    { ...fixture.base, combination: parseComboKey(fixture.baseCombination) },
    parseComboKey(combination.target),
  );
}

export interface VariantRecorderOptions {
  readonly model: string;
  readonly apiKey: string;
  readonly run: number;
  readonly promptHash: string;
  readonly fetchFn?: typeof fetch;
  readonly clock?: () => number;
  readonly now?: () => Date;
  /** Progress, one line per combination. Never given the key. */
  readonly log?: (line: string) => void;
}

/** One run over every combination, in table order, one at a time. */
export async function recordVariantRun(
  fixtures: readonly VariantFixture[],
  options: VariantRecorderOptions,
): Promise<VariantRecording> {
  const fetchFn = options.fetchFn ?? fetch;
  const clock = options.clock ?? (() => performance.now());
  const log = options.log ?? (() => undefined);
  const base = {
    model: options.model,
    run: options.run,
    recordedAt: (options.now ?? (() => new Date()))().toISOString(),
    promptHash: options.promptHash,
    settings: {
      effort: effortFor(options.model),
      maxTokens: MAX_TOKENS,
      cacheTtl: '5m' as const,
    },
  };

  // The phase 1 pre-checks: they test the account and the model, which a
  // variant call shares, and they warm the phase 1 prefix as the app would.
  const preChecks = await runPreChecks(fetchFn, options.apiKey, options.model);
  for (const check of preChecks) {
    log(`pre-check ${check.name}: ${check.passed ? 'pass' : 'FAIL'} (${check.detail})`);
  }
  const failed = preChecks.find(
    (check) => REQUIRED_PRE_CHECKS.includes(check.name) && !check.passed,
  );
  if (failed !== undefined)
    return { ...base, preChecks, dropped: failed.name, cases: [] };

  const capture = capturingFetch(fetchFn, clock, log);
  const recorded: VariantRecordedCase[] = [];
  for (const fixture of [...fixtures].sort((a, b) => a.n - b.n)) {
    for (const combination of fixture.combinations) {
      const { request, context } = variantCall(fixture, combination);
      const started = clock();
      const result = await requestVariant({
        apiKey: options.apiKey,
        model: options.model,
        request,
        context,
        fetchFn: capture.fetchFn,
        isOnline: () => true,
      });
      const latencyMs = Math.round(clock() - started);
      recorded.push({
        n: fixture.n,
        combination: combination.id,
        target: combination.target,
        fetches: capture.drain(),
        latencyMs,
      });
      log(
        `${combination.id.padStart(3)}: ${describeResult(result)}, ${String(latencyMs)} ms`,
      );
    }
  }
  return { ...base, preChecks, cases: recorded };
}

function describeResult(result: VariantResult): string {
  if (result.status === 'error') return `error (${result.kind})`;
  if (result.status === 'unavailable') return 'unavailable';
  return result.variant.status === 'ok'
    ? 'ok'
    : `not_applicable (${result.variant.reason})`;
}

/** One reply after replay, beside the combination it answers. */
export interface ReplayedVariant {
  readonly model: string;
  readonly run: number;
  readonly fixture: VariantFixture;
  readonly combination: VariantCombination;
  readonly recorded: VariantRecordedCase;
  readonly result: VariantResult;
}

export async function replayVariantRecording(
  recording: VariantRecording,
  fixtures: readonly VariantFixture[],
): Promise<ReplayedVariant[]> {
  const replies: ReplayedVariant[] = [];
  for (const recorded of recording.cases) {
    const where = `${recording.model} run ${String(recording.run)} ${recorded.combination}`;
    const fixture = fixtures.find((candidate) => candidate.n === recorded.n);
    const combination = fixture?.combinations.find(
      (candidate) => candidate.id === recorded.combination,
    );
    if (fixture === undefined || combination === undefined) {
      throw new Error(`${where}: no such combination in the fixtures`);
    }
    if (combination.target !== recorded.target) {
      throw new Error(`${where}: recorded for another target`);
    }
    const { request, context } = variantCall(fixture, combination);
    const replay = replayFetch(recorded.fetches);
    const result = await requestVariant({
      apiKey: 'replay',
      model: recording.model,
      request,
      context,
      fetchFn: replay.fetchFn,
      isOnline: () => true,
    });
    if (replay.overran() || replay.unused() > 0) {
      throw new Error(
        `${where}: replayed with ${replay.overran() ? 'more' : 'fewer'} requests than the ` +
          `${String(recorded.fetches.length)} recorded`,
      );
    }
    replies.push({
      model: recording.model,
      run: recording.run,
      fixture,
      combination,
      recorded,
      result,
    });
  }
  return replies;
}
