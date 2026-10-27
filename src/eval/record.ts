/**
 * The live recorder behind `npm run eval:record`: the one paid step, which
 * Sean runs and Claude Code never does (decided 26 Oct, phase 1 question A).
 *
 * The key is a parameter, read from the environment by the script. Nothing
 * here writes it anywhere: a recording holds response bodies, statuses and
 * timings, and the request is rebuilt from the committed prompt, never stored.
 *
 * `fetchFn` is injectable so the whole recorder, pre-checks included, is
 * tested offline against a stub.
 */
import {
  MAX_TOKENS,
  MESSAGES_URL,
  buildHeaders,
  buildRequestBody,
  effortFor,
  readUsage,
  translatePhrase,
  type CacheUsage,
} from '../api/anthropic';
import type { CacheTtl } from '../api/prompt';
import {
  REQUIRED_PRE_CHECKS,
  type GoldenCase,
  type PreCheck,
  type RecordedCase,
  type RecordedFetch,
  type Recording,
} from './golden';

/** Not one of the 30, so the pre-checks never stand in for a recorded case. */
export const PROBE_SENTENCE = 'Bonjour, comment ça va ?';

export interface RecorderOptions {
  readonly model: string;
  readonly apiKey: string;
  readonly run: number;
  readonly promptHash: string;
  readonly fetchFn?: typeof fetch;
  readonly clock?: () => number;
  readonly now?: () => Date;
  /** Progress, one line per case. Never given the key. */
  readonly log?: (line: string) => void;
}

interface Probe {
  readonly status: number;
  readonly body: string;
  readonly usage: CacheUsage;
  readonly oneHourTokens: number;
}

/** One bare request outside the app's client, so a pre-check sees the raw answer. */
async function probe(
  fetchFn: typeof fetch,
  apiKey: string,
  model: string,
  options: { readonly browserHeader: boolean; readonly cacheTtl: CacheTtl },
): Promise<Probe> {
  const headers = buildHeaders(apiKey);
  if (!options.browserHeader)
    delete headers['anthropic-dangerous-direct-browser-access'];
  const response = await fetchFn(MESSAGES_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(
      buildRequestBody(PROBE_SENTENCE, { model, cacheTtl: options.cacheTtl }),
    ),
  });
  const body = await response.text();
  let usage: Record<string, unknown> = {};
  try {
    usage = (JSON.parse(body) as { usage?: Record<string, unknown> }).usage ?? {};
  } catch {
    // A non-JSON body is reported through the status.
  }
  const creation = usage['cache_creation'] as Record<string, unknown> | undefined;
  const oneHour = creation?.['ephemeral_1h_input_tokens'];
  return {
    status: response.status,
    body,
    usage: readUsage(usage),
    oneHourTokens: typeof oneHour === 'number' ? oneHour : 0,
  };
}

/** The first line of an error body, enough to name the cause without dumping it. */
function brief(probe: Probe): string {
  return `HTTP ${String(probe.status)}: ${probe.body.slice(0, 200)}`;
}

/**
 * The spec's three pre-checks, plus the one-hour cache probe.
 *
 * 1. Structured outputs accepted: the app's request, without the browser
 *    header, so a refusal here is about the format. It asks for the one-hour
 *    cache, which is the probe for that option.
 * 2. Direct browser access: the same request with the browser-access header,
 *    sent from Node (access is per account, not per model; question B).
 * 3. Cache read above zero on the second call: that same second request.
 */
export async function runPreChecks(
  fetchFn: typeof fetch,
  apiKey: string,
  model: string,
): Promise<PreCheck[]> {
  const first = await probe(fetchFn, apiKey, model, {
    browserHeader: false,
    cacheTtl: '1h',
  });
  const second = await probe(fetchFn, apiKey, model, {
    browserHeader: true,
    cacheTtl: '5m',
  });
  const firstOk = first.status === 200;
  const secondOk = second.status === 200;
  return [
    {
      name: 'structured_outputs',
      passed: firstOk,
      detail: firstOk ? 'accepted' : brief(first),
    },
    {
      name: 'browser_access',
      passed: secondOk,
      detail: secondOk ? 'accepted' : brief(second),
    },
    {
      name: 'cache_read',
      passed: secondOk && second.usage.cacheReadTokens > 0,
      detail: `second call read ${String(second.usage.cacheReadTokens)} tokens from the cache`,
    },
    {
      name: 'cache_1h',
      passed: firstOk && (first.oneHourTokens > 0 || first.usage.cacheReadTokens > 0),
      detail: firstOk
        ? `one-hour write ${String(first.oneHourTokens)} tokens, read ${String(first.usage.cacheReadTokens)}`
        : brief(first),
    },
  ];
}

/**
 * A fetch that passes through to `inner` and keeps each response as it
 * arrived. `drain` hands over what one case produced and starts the next.
 */
function capturingFetch(
  inner: typeof fetch,
  clock: () => number,
): { fetchFn: typeof fetch; drain: () => RecordedFetch[] } {
  let captured: RecordedFetch[] = [];
  const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const started = clock();
    try {
      const response = await inner(input, init);
      const text = await response.text();
      let body: unknown = text;
      try {
        body = JSON.parse(text);
      } catch {
        // Kept as text: a malformed response is evidence too.
      }
      captured.push({
        status: response.status,
        body,
        latencyMs: Math.round(clock() - started),
      });
      return {
        ok: response.ok,
        status: response.status,
        text: () => Promise.resolve(text),
      } as Response;
    } catch (error) {
      captured.push({
        failed: init?.signal?.aborted ? 'timeout' : 'network',
        latencyMs: Math.round(clock() - started),
      });
      throw error;
    }
  }) as typeof fetch;
  return {
    fetchFn,
    drain: () => {
      const out = captured;
      captured = [];
      return out;
    },
  };
}

/** One run over the 30 sentences, in order, one at a time. */
export async function recordRun(
  cases: readonly GoldenCase[],
  options: RecorderOptions,
): Promise<Recording> {
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

  const preChecks = await runPreChecks(fetchFn, options.apiKey, options.model);
  const failed = preChecks.find(
    (check) => REQUIRED_PRE_CHECKS.includes(check.name) && !check.passed,
  );
  for (const check of preChecks) {
    log(`pre-check ${check.name}: ${check.passed ? 'pass' : 'FAIL'} (${check.detail})`);
  }
  if (failed !== undefined) {
    return { ...base, preChecks, dropped: failed.name, cases: [] };
  }

  const capture = capturingFetch(fetchFn, clock);
  const recorded: RecordedCase[] = [];
  for (const golden of [...cases].sort((a, b) => a.n - b.n)) {
    const started = clock();
    const result = await translatePhrase({
      sentence: golden.input,
      apiKey: options.apiKey,
      model: options.model,
      fetchFn: capture.fetchFn,
      isOnline: () => true,
    });
    const latencyMs = Math.round(clock() - started);
    recorded.push({
      n: golden.n,
      input: golden.input,
      fetches: capture.drain(),
      latencyMs,
    });
    log(
      `case ${String(golden.n).padStart(2)}: ${result.status}` +
        `${result.status === 'error' ? ` (${result.kind})` : ''}, ${String(latencyMs)} ms`,
    );
  }
  return { ...base, preChecks, cases: recorded };
}
