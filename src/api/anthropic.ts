/**
 * Anthropic API client.
 *
 * The call is made straight from the browser. There is no server to hide a key
 * behind, so the key is entered at runtime and kept in localStorage: it is never
 * hardcoded, never committed, never written to a file and never logged.
 *
 * The cached prefix is built in `./prompt` and every reply is checked in
 * `./phrase-check`. This module is the transport around them: it assembles the
 * request, retries once on a reply that fails the check, and sorts every way a
 * call can fail into the causes the spec's failure table names, so the screen
 * shows one message per cause and never a raw error.
 */

import { PHRASE_SCHEMA } from './schema';
import { buildSystemBlocks, buildUserContent, type CacheTtl } from './prompt';
import { checkPhraseReply, straight, type SpannedPhrase } from './phrase-check';

const API_KEY_STORAGE_KEY = 'anthropic-api-key';

/** The app's model until the phase 1 eval picks one (docs/spec-phases-0-1.md). */
export const MODEL = 'claude-haiku-4-5';
export const ANTHROPIC_VERSION = '2023-06-01';
export const MESSAGES_URL = 'https://api.anthropic.com/v1/messages';

/** Structured outputs, which is what makes an out-of-vocabulary tag undecodable. */
export const STRUCTURED_OUTPUTS_BETA = 'structured-outputs-2025-11-13';

/**
 * A ceiling, not a target. The reply is about 400 tokens, but the eval
 * candidates think before they answer, and a reply cut off at the ceiling is a
 * failure the learner sees, so the headroom is cheap (decided 26 Oct, phase 1
 * eval, Q3).
 */
export const MAX_TOKENS = 16000;

/**
 * Thinking depth for every eval candidate, decided 26 Oct (phase 1 eval, Q3):
 * the default for Opus 5.5 and Haiku 5.5, one level below Sonnet 5.5's. The
 * models listed below take no effort setting and reject the field.
 */
export const EFFORT = 'medium';
const MODELS_WITHOUT_EFFORT: ReadonlySet<string> = new Set(['claude-haiku-4-5']);

/** Per attempt, so the worst case with the one retry is twice this. */
export const TIMEOUT_MS = 20_000;

/**
 * What the cache did. Read `cacheReadTokens` during development: a persistent
 * zero means the prefix is not byte-stable, or it has fallen under the model's
 * minimum cacheable prefix.
 */
export interface CacheUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheCreationTokens: number;
  readonly cacheReadTokens: number;
}

export function readApiKey(storage: Storage = localStorage): string | null {
  return storage.getItem(API_KEY_STORAGE_KEY);
}

export function storeApiKey(key: string, storage: Storage = localStorage): void {
  storage.setItem(API_KEY_STORAGE_KEY, key);
}

/**
 * Here rather than in the settings pane, so the storage key is named once. A
 * caller removing it by its literal string would keep working until the key was
 * renamed, and then silently stop clearing anything.
 */
export function clearApiKey(storage: Storage = localStorage): void {
  storage.removeItem(API_KEY_STORAGE_KEY);
}

export function buildHeaders(apiKey: string): Record<string, string> {
  return {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': ANTHROPIC_VERSION,
    'anthropic-beta': STRUCTURED_OUTPUTS_BETA,
    // Required for calls made straight from the browser rather than a server.
    'anthropic-dangerous-direct-browser-access': 'true',
  };
}

/**
 * JSON Schema keywords that constrained decoding does not implement.
 *
 * They are kept in the generated schema, because `validate.ts` compiles that
 * schema with Ajv and Ajv does enforce them: an empty `ca` is a bad reply
 * whether or not the decoder could have prevented it. They are stripped on the
 * way out so the request is not rejected for asking the decoder to do something
 * it cannot. This derives from the generated schema rather than restating it,
 * so a new component ID still arrives only through `npm run gen-schema`.
 */
const UNSUPPORTED_KEYWORDS = new Set([
  'minLength',
  'maxLength',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'minItems',
  'maxItems',
]);

export function toStructuredOutputSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toStructuredOutputSchema);
  if (schema === null || typeof schema !== 'object') return schema;
  return Object.fromEntries(
    Object.entries(schema)
      .filter(([key]) => !UNSUPPORTED_KEYWORDS.has(key))
      .map(([key, value]) => [key, toStructuredOutputSchema(value)]),
  );
}

export interface RequestBodyOptions {
  readonly model?: string;
  readonly cacheTtl?: CacheTtl;
  /**
   * Send the response format under the older `output_format` key. Only used
   * after the stable field has been rejected once; see `send`.
   */
  readonly legacyOutputFormat?: boolean;
}

export function buildRequestBody(
  sentence: string,
  options: RequestBodyOptions = {},
): Record<string, unknown> {
  const model = options.model ?? MODEL;
  const format = {
    type: 'json_schema',
    schema: toStructuredOutputSchema(PHRASE_SCHEMA),
  };
  const effort = MODELS_WITHOUT_EFFORT.has(model) ? {} : { effort: EFFORT };

  return {
    model,
    max_tokens: MAX_TOKENS,
    // Static prefix, cache breakpoint on its last block. The sentence is the
    // only thing after it, which is what makes the prefix reusable.
    system: buildSystemBlocks(options.cacheTtl),
    messages: [{ role: 'user', content: buildUserContent(sentence) }],
    ...(options.legacyOutputFormat
      ? { output_format: format }
      : { output_config: { format, ...effort } }),
  };
}

/**
 * Every cause the spec's failure table shows, plus `cancelled`, which the
 * caller asked for and so shows nothing. Causes the table does not name are
 * folded in as decided 26 Oct (phase 1 step 3, Q2): any 500 to 504 is
 * `overloaded`, because waiting is the right advice; any other refused request,
 * a malformed response and a reply whose Catalan is unusable twice are
 * `refused`.
 */
export type FailureKind =
  'no_key' | 'key_rejected' | 'overloaded' | 'offline' | 'refused' | 'cancelled';

/** One round trip, as the eval reports it. */
export interface Attempt {
  readonly latencyMs: number;
  readonly httpStatus?: number;
  readonly stopReason?: string;
  readonly usage?: CacheUsage;
  /** Why the reply failed the check. Empty for a valid reply or a failed call. */
  readonly errors: readonly string[];
}

interface ResultBase {
  readonly model: string;
  /** At most two: the call and the one retry. */
  readonly attempts: readonly Attempt[];
}

export type TranslateResult =
  | (ResultBase & { readonly status: 'ok'; readonly phrase: SpannedPhrase })
  | (ResultBase & {
      /**
       * The anatomy failed twice and the Catalan did not: shown without
       * chunks rather than with wrong ones. `errors` are the last reply's.
       */
      readonly status: 'analysis_failed';
      readonly fr: string;
      readonly ca: string;
      readonly errors: readonly string[];
    })
  | (ResultBase & {
      readonly status: 'error';
      readonly kind: FailureKind;
      /** English, for the log and the eval. The screen picks French by `kind`. */
      readonly detail: string;
      readonly httpStatus?: number;
    });

export interface TranslateOptions {
  readonly sentence: string;
  /** Null or empty is the « Ajoutez votre clé API » state, before any call. */
  readonly apiKey: string | null;
  readonly model?: string;
  readonly cacheTtl?: CacheTtl;
  /** The caller's cancel, e.g. back on the Phrase screen. */
  readonly signal?: AbortSignal;
  /**
   * Injectable so tests can pass a stub returning a recorded reply, which is
   * what keeps the golden-set eval offline and free.
   */
  readonly fetchFn?: typeof fetch;
  /** Injectable for tests; the default reads `navigator.onLine`. */
  readonly isOnline?: () => boolean;
  /** Injectable for tests; the default is `performance.now`. */
  readonly clock?: () => number;
  readonly timeoutMs?: number;
}

interface ApiResponse {
  readonly content?: readonly { readonly type: string; readonly text?: string }[];
  readonly stop_reason?: string;
  readonly usage?: Readonly<Record<string, unknown>>;
}

function tokens(usage: ApiResponse['usage'], field: string): number {
  const value = usage?.[field];
  return typeof value === 'number' ? value : 0;
}

export function readUsage(usage: ApiResponse['usage']): CacheUsage {
  return {
    inputTokens: tokens(usage, 'input_tokens'),
    outputTokens: tokens(usage, 'output_tokens'),
    cacheCreationTokens: tokens(usage, 'cache_creation_input_tokens'),
    cacheReadTokens: tokens(usage, 'cache_read_input_tokens'),
  };
}

function kindForStatus(status: number): FailureKind {
  if (status === 401) return 'key_rejected';
  if (status === 429 || status === 529) return 'overloaded';
  if (status >= 500 && status <= 504) return 'overloaded';
  return 'refused';
}

/**
 * True when a 400 is the API telling us it does not know `output_config`.
 *
 * Narrow on purpose: any other 400 is a real error and retrying it would hide
 * the cause behind a second identical failure.
 */
function isUnknownOutputConfig(status: number, body: string): boolean {
  return status === 400 && /output_config/.test(body);
}

type Outcome =
  | {
      readonly type: 'reply';
      readonly check: ReturnType<typeof checkPhraseReply>;
      /** `fr` and `ca` when both are usable, whatever the rest of the reply. */
      readonly draft?: { readonly fr: string; readonly ca: string };
    }
  | {
      readonly type: 'error';
      readonly kind: FailureKind;
      readonly detail: string;
      readonly httpStatus?: number;
    };

function usableText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** The parts of a failed reply the screen can still show. */
function draftOf(candidate: unknown): { fr: string; ca: string } | undefined {
  if (candidate === null || typeof candidate !== 'object') return undefined;
  const { fr, ca } = candidate as { fr?: unknown; ca?: unknown };
  return usableText(fr) && usableText(ca) ? { fr, ca: straight(ca) } : undefined;
}

/** Read the constrained reply out of a 200 and check it. */
function outcomeOf(payload: ApiResponse): Outcome {
  if (payload.stop_reason === 'refusal') {
    return { type: 'error', kind: 'refused', detail: 'The model declined.' };
  }
  if (payload.stop_reason === 'max_tokens') {
    return { type: 'error', kind: 'refused', detail: 'The reply was cut off.' };
  }

  const text = payload.content?.find((block) => block.type === 'text')?.text;
  if (text === undefined) {
    return {
      type: 'reply',
      check: { valid: false, errors: ['the reply carried no text block'] },
    };
  }

  let candidate: unknown;
  try {
    candidate = JSON.parse(text);
  } catch {
    return {
      type: 'reply',
      check: { valid: false, errors: ['the reply text was not valid JSON'] },
    };
  }

  const draft = draftOf(candidate);
  return { type: 'reply', check: checkPhraseReply(candidate), ...(draft && { draft }) };
}

interface Sent {
  readonly outcome: Outcome;
  readonly attempt: Attempt;
}

/** One round trip: the request, the legacy-field fallback, and the check. */
async function send(options: TranslateOptions, model: string): Promise<Sent> {
  const fetchFn = options.fetchFn ?? fetch;
  const clock = options.clock ?? (() => performance.now());
  const started = clock();
  const elapsed = (): number => Math.round(clock() - started);

  // One controller for both the 20 s timeout and the caller's cancel, linked
  // by hand: AbortSignal.any is missing from Safari before 17.4.
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? TIMEOUT_MS);
  const cancel = (): void => {
    controller.abort();
  };
  if (options.signal?.aborted) cancel();
  options.signal?.addEventListener('abort', cancel);
  const signal = controller.signal;

  const post = async (legacyOutputFormat: boolean) => {
    const response = await fetchFn(MESSAGES_URL, {
      method: 'POST',
      headers: buildHeaders(options.apiKey ?? ''),
      body: JSON.stringify(
        buildRequestBody(options.sentence, {
          model,
          ...(options.cacheTtl && { cacheTtl: options.cacheTtl }),
          legacyOutputFormat,
        }),
      ),
      signal,
    });
    return { ok: response.ok, status: response.status, text: await response.text() };
  };

  try {
    let response = await post(false);
    if (!response.ok && isUnknownOutputConfig(response.status, response.text)) {
      response = await post(true);
    }

    if (!response.ok) {
      return {
        outcome: {
          type: 'error',
          kind: kindForStatus(response.status),
          detail: `The API returned ${String(response.status)}.`,
          httpStatus: response.status,
        },
        attempt: { latencyMs: elapsed(), httpStatus: response.status, errors: [] },
      };
    }

    let payload: ApiResponse;
    try {
      payload = JSON.parse(response.text) as ApiResponse;
    } catch {
      return {
        outcome: {
          type: 'error',
          kind: 'refused',
          detail: 'The API response was not valid JSON.',
          httpStatus: response.status,
        },
        attempt: { latencyMs: elapsed(), httpStatus: response.status, errors: [] },
      };
    }

    const outcome = outcomeOf(payload);
    return {
      outcome,
      attempt: {
        latencyMs: elapsed(),
        httpStatus: response.status,
        ...(payload.stop_reason !== undefined && { stopReason: payload.stop_reason }),
        usage: readUsage(payload.usage),
        errors:
          outcome.type === 'reply' && !outcome.check.valid ? outcome.check.errors : [],
      },
    };
  } catch {
    // A rejected fetch is the network, the 20 s abort, or the caller's cancel.
    const cancelled = options.signal?.aborted === true;
    return {
      outcome: cancelled
        ? { type: 'error', kind: 'cancelled', detail: 'Cancelled by the caller.' }
        : timedOut
          ? { type: 'error', kind: 'offline', detail: 'No reply within the timeout.' }
          : {
              type: 'error',
              kind: 'offline',
              detail: 'The request did not reach the API.',
            },
      attempt: { latencyMs: elapsed(), errors: [] },
    };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
  }
}

function defaultIsOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

export async function translatePhrase(
  options: TranslateOptions,
): Promise<TranslateResult> {
  const model = options.model ?? MODEL;
  const attempts: Attempt[] = [];
  const fail = (
    kind: FailureKind,
    detail: string,
    httpStatus?: number,
  ): TranslateResult => ({
    status: 'error',
    kind,
    detail,
    ...(httpStatus !== undefined && { httpStatus }),
    model,
    attempts,
  });

  if (options.apiKey === null || options.apiKey.trim() === '') {
    return fail('no_key', 'No API key is stored.');
  }
  if (!(options.isOnline ?? defaultIsOnline)()) {
    return fail('offline', 'The device reports no connection.');
  }

  const drafts: { fr: string; ca: string }[] = [];
  let lastErrors: readonly string[] = [];

  // ONE retry, not a loop. A reply that fails the check is usually a bad draw
  // and a second ask fixes it; a second failure is the model failing at the
  // task, and a third call would spend the learner's wait on the same answer.
  for (let call = 0; call < 2; call += 1) {
    const { outcome, attempt } = await send(options, model);
    attempts.push(attempt);

    if (outcome.type === 'error') {
      // A failed call is final on the first attempt. On the retry, a usable
      // Catalan from the first reply still beats an error screen, unless the
      // learner cancelled.
      if (call === 0 || outcome.kind === 'cancelled' || drafts.length === 0) {
        return fail(outcome.kind, outcome.detail, outcome.httpStatus);
      }
      break;
    }
    if (outcome.check.valid) {
      return { status: 'ok', phrase: outcome.check.phrase, model, attempts };
    }
    if (outcome.draft) drafts.push(outcome.draft);
    lastErrors = outcome.check.errors;
  }

  // The latest usable pair, so a retry that fixed the Catalan is the one shown.
  const draft = drafts.at(-1);
  if (draft === undefined) {
    return fail(
      'refused',
      `No usable Catalan in two replies: ${lastErrors.join('; ')}`,
    );
  }
  return { status: 'analysis_failed', ...draft, errors: lastErrors, model, attempts };
}
