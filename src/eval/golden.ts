/**
 * Golden set v2: the fixture and recording shapes, and the offline replay.
 *
 * A fixture is one of the 30 approved sentences (docs/golden-set-v2.md) with
 * what scoring needs to know about it. A recording is one model's run over all
 * 30, holding the raw API responses exactly as they arrived. Replay feeds those
 * responses back through `translatePhrase` with a stub fetch, so the eval
 * exercises the app's own client, check and retry, and costs nothing.
 *
 * No model judges anything here. Whether a rendering is good Catalan is the
 * native speaker's verdict, carried in each fixture's `renderings` list.
 */
import { translatePhrase, type TranslateResult } from '../api/anthropic';
import type { Assumption } from '../api/phrase';
import type { ComponentId } from '../api/schema';

/** The speaker's three marks: « naturel », « correct mais peu naturel », « faux ». */
export type Verdict = 'naturel' | 'peu_naturel' | 'faux';
export const VERDICTS: readonly Verdict[] = ['naturel', 'peu_naturel', 'faux'];

/** One distinct Catalan rendering of a case, with its stable sheet ID. */
export interface Rendering {
  /** Case number and letters, e.g. `12-b`. Never reused, never renumbered. */
  readonly id: string;
  /** The normalised form, which is what deduplication and matching compare. */
  readonly key: string;
  /** The first form seen, shown to the speaker. */
  readonly ca: string;
  /** Null until the speaker has judged it. */
  readonly verdict: Verdict | null;
}

export interface GoldenCase {
  readonly n: number;
  readonly slug: string;
  /** Exactly as approved, typos included (row 30). */
  readonly input: string;
  readonly risk: string;
  /** Each group is satisfied by any one of its IDs, anywhere in the chunks. */
  readonly mustLink: readonly {
    readonly anyOf: readonly ComponentId[];
    /** The drafter's guess at the chunk. Never scored. */
    readonly hint?: string;
  }[];
  /** Known padding traps: a link to one of these is a padded link. */
  readonly mustNotLink: readonly ComponentId[];
  readonly assumptions: {
    readonly required: readonly Assumption[];
    readonly forbidden: readonly Assumption[];
  };
  /** Row 29: an idiom outside the taxonomy, where forcing an ID is padding. */
  readonly requireUnlinked: boolean;
  /** Row 30: `fr` must correct the typo. Plain substring checks. */
  readonly fr: {
    readonly mustContain: readonly string[];
    readonly mustNotContain: readonly string[];
  };
  readonly renderings: readonly Rendering[];
}

/**
 * One fetch as it happened: the HTTP status and the response body, or the
 * failure that stopped it. A retry or the `output_config` fallback is simply a
 * second entry.
 */
export type RecordedFetch =
  | { readonly status: number; readonly body: unknown; readonly latencyMs: number }
  | { readonly failed: 'network' | 'timeout'; readonly latencyMs: number };

export interface RecordedCase {
  readonly n: number;
  readonly input: string;
  readonly fetches: readonly RecordedFetch[];
  /** The learner's whole wait for this sentence, retry included. */
  readonly latencyMs: number;
}

export type PreCheckName =
  'structured_outputs' | 'browser_access' | 'cache_read' | 'cache_1h';

export interface PreCheck {
  readonly name: PreCheckName;
  readonly passed: boolean;
  readonly detail: string;
}

/** The three pre-checks that drop a model. `cache_1h` is reported only. */
export const REQUIRED_PRE_CHECKS: readonly PreCheckName[] = [
  'structured_outputs',
  'browser_access',
  'cache_read',
];

export interface Recording {
  readonly model: string;
  readonly run: number;
  readonly recordedAt: string;
  readonly promptHash: string;
  readonly settings: {
    readonly effort: string | null;
    readonly maxTokens: number;
    readonly cacheTtl: '5m';
  };
  readonly preChecks: readonly PreCheck[];
  /** The failed pre-check that dropped the model, if one did; then no cases. */
  readonly dropped?: PreCheckName;
  readonly cases: readonly RecordedCase[];
}

/**
 * The form two renderings are compared in: case, spacing and final punctuation
 * do not make a second rendering (spec, « Running it »). Apostrophes are made
 * straight too, which the client already does to `ca`.
 */
export function normaliseRendering(ca: string): string {
  return ca
    .normalize('NFC')
    .replaceAll('’', "'")
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\s.!?…]+$/u, '')
    .toLocaleLowerCase('ca');
}

/**
 * A fetch that answers with the recorded responses, in order, and reports
 * whether the client asked for exactly as many as were recorded. Anything
 * else means the client no longer behaves as it did when the run was made.
 */
function replayFetch(fetches: readonly RecordedFetch[]): {
  readonly fetchFn: typeof fetch;
  readonly unused: () => number;
  readonly overran: () => boolean;
} {
  const queue = [...fetches];
  let overran = false;
  const stub = (): Promise<unknown> => {
    const next = queue.shift();
    if (next === undefined) {
      overran = true;
      return Promise.reject(new Error('the recording ran out of responses'));
    }
    if ('failed' in next) return Promise.reject(new TypeError(next.failed));
    const text = typeof next.body === 'string' ? next.body : JSON.stringify(next.body);
    return Promise.resolve({
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      text: () => Promise.resolve(text),
    });
  };
  return {
    fetchFn: stub as unknown as typeof fetch,
    unused: () => queue.length,
    overran: () => overran,
  };
}

/**
 * The recorded case, as the app would have shown it. Throws when the client
 * asks for more or fewer responses than were recorded, so a drifted client
 * fails loudly instead of replaying as « offline ».
 */
export async function replayCase(
  recorded: RecordedCase,
  model: string,
): Promise<TranslateResult> {
  const replay = replayFetch(recorded.fetches);
  const result = await translatePhrase({
    sentence: recorded.input,
    apiKey: 'replay',
    model,
    fetchFn: replay.fetchFn,
    isOnline: () => true,
  });
  if (replay.overran() || replay.unused() > 0) {
    throw new Error(
      `case ${String(recorded.n)} replayed with ${replay.overran() ? 'more' : 'fewer'} ` +
        `requests than the ${String(recorded.fetches.length)} recorded`,
    );
  }
  return result;
}

/** One reply after replay, beside the case it answers. */
export interface ReplayedReply {
  readonly model: string;
  readonly run: number;
  readonly golden: GoldenCase;
  readonly recorded: RecordedCase;
  readonly result: TranslateResult;
}

export async function replayRecording(
  recording: Recording,
  cases: readonly GoldenCase[],
): Promise<ReplayedReply[]> {
  const byNumber = new Map(cases.map((golden) => [golden.n, golden]));
  const replies: ReplayedReply[] = [];
  for (const recorded of recording.cases) {
    const golden = byNumber.get(recorded.n);
    if (golden === undefined) {
      throw new Error(
        `${recording.model} run ${String(recording.run)}: no case ${String(recorded.n)}`,
      );
    }
    if (golden.input !== recorded.input) {
      throw new Error(
        `${recording.model} run ${String(recording.run)}: case ${String(recorded.n)} was recorded for another input`,
      );
    }
    replies.push({
      model: recording.model,
      run: recording.run,
      golden,
      recorded,
      result: await replayCase(recorded, recording.model),
    });
  }
  return replies;
}

/** The rendering this reply's Catalan matches, if the case has one. */
export function renderingOf(reply: ReplayedReply): Rendering | undefined {
  if (reply.result.status !== 'ok') return undefined;
  const key = normaliseRendering(reply.result.phrase.ca);
  return reply.golden.renderings.find((rendering) => rendering.key === key);
}
