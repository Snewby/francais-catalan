/**
 * Anthropic API client.
 *
 * The call is made straight from the browser. There is no server to hide a key
 * behind, so the key is entered at runtime and kept in localStorage: it is never
 * hardcoded, never committed, never written to a file and never logged.
 *
 * The cached taxonomy prefix is built in `./prompt`. This module is the
 * transport: it assembles the request around that prefix, constrains the reply
 * to the generated schema, and reports what the cache actually did.
 */

import { DECOMPOSITION_SCHEMA, type ComponentId } from './schema';
import { validateDecomposition, validateQueryLog } from './validate';
import { buildSystemBlocks, buildUserContent, type QuestionContext } from './prompt';
import {
  INTENT_FOR_DIRECTION,
  type Direction,
  type Evidence,
  type Intent,
  type Rating,
} from '../srs/evidence';

const API_KEY_STORAGE_KEY = 'anthropic-api-key';

export const MODEL = 'claude-haiku-4-5';
export const ANTHROPIC_VERSION = '2023-06-01';
export const MESSAGES_URL = 'https://api.anthropic.com/v1/messages';

/** Structured outputs, which is what makes an out-of-vocabulary tag undecodable. */
export const STRUCTURED_OUTPUTS_BETA = 'structured-outputs-2025-11-13';

/**
 * Roughly four times the ~450-token French answer docs/01 costed, which leaves
 * room for a long decomposition without inviting an essay.
 */
export const MAX_TOKENS = 2048;

/**
 * One entry in the decomposition. LANGUAGE-INVARIANT: the ipa is a property of
 * the Catalan form, not a French rendering of it.
 */
export interface ComponentEntry {
  readonly id: ComponentId;
  readonly ca: string;
  readonly ipa?: string;
}

/** The payload every intent emits. Only the prompt and the logged fields differ. */
export interface Decomposition {
  /** Component IDs and Catalan surface forms only. Never French prose. */
  readonly decomposition: readonly ComponentEntry[];
  /**
   * Which way round the question ran, as READ OFF THE QUESTION BY THE MODEL
   * rather than declared by the caller. A learner types Catalan or French and
   * the difference is plain; asking them to also pick from a menu was the
   * interface demanding something it could already see.
   */
  readonly direction: Direction;
  /** The only French-language field in the response. */
  readonly answer: string;
  /**
   * The whole Catalan utterance, on one line: the sentence the learner is
   * meant to be able to say. A sibling of the decomposition rather than a field
   * inside it, so the decomposition stays language-invariant and `answer` stays
   * the single French field.
   *
   * Nothing held this before. The only Catalan in a reply was each component's
   * `ca`, which is the fragment realising one grammar point, and joining those
   * does not reconstruct a sentence. Pronunciation had nothing to pronounce and
   * the attempt comparison had nothing to compare against.
   */
  readonly answer_ca: string;
  /**
   * The same utterance in French, on one line. The mirror of `answer_ca`, and
   * NOT `answer`: one renders the sentence, the other explains its structure.
   *
   * With both, the reply shows the pair whichever way the question ran, so the
   * Catalan-to-French side stops burying the meaning inside the explanation.
   * The pair is also the only translation material this application will have
   * that it did not invent, which is what phase 9 builds practice on.
   */
  readonly answer_fr: string;
  readonly answer_lang: 'fr';
}

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
 * schema with Ajv and Ajv does enforce them: an empty `answer` is a bad reply
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
  /**
   * Send the response format under the older `output_format` key. Only used
   * after the stable field has been rejected once; see `callHaiku`.
   */
  readonly legacyOutputFormat?: boolean;
}

export function buildRequestBody(
  context: QuestionContext,
  options: RequestBodyOptions = {},
): Record<string, unknown> {
  const format = {
    type: 'json_schema',
    schema: toStructuredOutputSchema(DECOMPOSITION_SCHEMA),
  };

  return {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    // Static prefix, cache breakpoint on its last block. The question is the
    // only thing after it, which is what makes the prefix reusable.
    system: buildSystemBlocks(),
    messages: [{ role: 'user', content: buildUserContent(context) }],
    ...(options.legacyOutputFormat
      ? { output_format: format }
      : { output_config: { format } }),
  };
}

/**
 * A logged query: the decomposition plus the interaction-model triple.
 *
 * `answer_fr` is optional here and required of the model, which is the one
 * place the two shapes differ. A review item is built from the taxonomy, and
 * the taxonomy holds no French translation of any example, so a review record
 * has no pair to carry; putting the rule's gloss there instead would file a
 * description as a translation in the corpus phase 9 reads.
 */
export interface QueryLog extends Omit<Decomposition, 'answer_fr'> {
  readonly answer_fr?: string;
  readonly asked_at: number;
  readonly question: string;
  readonly intent: Intent;
  // `direction` is inherited from Decomposition, because the model reports it.
  readonly evidence: Evidence;
  readonly rating?: Rating;
}

export interface CallOptions extends QuestionContext {
  readonly apiKey: string;
  /**
   * No `direction` here on purpose. It arrives on the reply, and a caller that
   * could also assert one would be a second source for a field the model is now
   * responsible for.
   */
  /**
   * How much this interaction tells us about what the user knows. Passed
   * through to the logged record; what each type may move is EVIDENCE_EFFECTS'
   * business, not this module's.
   */
  readonly evidence: Evidence;
  readonly rating?: Rating;
  /**
   * Injectable so tests can pass a stub returning a recorded fixture. Keeps the
   * golden-set eval fully offline and free.
   */
  readonly fetchFn?: typeof fetch;
  /** Injectable so a logged record is reproducible in a test. */
  readonly now?: () => number;
}

export interface CallResult {
  readonly decomposition: Decomposition;
  /** Schema-valid and ready to persist. Phase 5 stores this, it does not rebuild it. */
  readonly queryLog: QueryLog;
  readonly usage: CacheUsage;
}

export class AnthropicError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'AnthropicError';
  }
}

interface ApiResponse {
  readonly content?: readonly { readonly type: string; readonly text?: string }[];
  readonly stop_reason?: string;
  readonly usage?: Readonly<Record<string, number>>;
}

function readUsage(usage: ApiResponse['usage']): CacheUsage {
  return {
    inputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
    cacheCreationTokens: usage?.cache_creation_input_tokens ?? 0,
    cacheReadTokens: usage?.cache_read_input_tokens ?? 0,
  };
}

/** The constrained reply arrives as JSON in the first text block. */
function parseDecomposition(response: ApiResponse): Decomposition {
  if (response.stop_reason === 'refusal') {
    throw new AnthropicError('The model declined to answer this query.');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new AnthropicError('The reply was cut off at max_tokens.');
  }

  const text = response.content?.find((block) => block.type === 'text')?.text;
  if (text === undefined) {
    throw new AnthropicError('The reply carried no text block.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AnthropicError('The reply was not valid JSON.');
  }

  const result = validateDecomposition(parsed);
  if (!result.valid) {
    throw new AnthropicError(
      `The reply failed the schema: ${result.errors.join('; ')}`,
    );
  }
  return parsed as Decomposition;
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

async function post(
  fetchFn: typeof fetch,
  apiKey: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; text: string }> {
  const response = await fetchFn(MESSAGES_URL, {
    method: 'POST',
    headers: buildHeaders(apiKey),
    body: JSON.stringify(body),
  });
  return { ok: response.ok, status: response.status, text: await response.text() };
}

export async function callHaiku(options: CallOptions): Promise<CallResult> {
  const fetchFn = options.fetchFn ?? fetch;
  const context: QuestionContext = {
    question: options.question,
    ...(options.intent === undefined ? {} : { intent: options.intent }),
  };

  let response = await post(fetchFn, options.apiKey, buildRequestBody(context));

  if (!response.ok && isUnknownOutputConfig(response.status, response.text)) {
    response = await post(
      fetchFn,
      options.apiKey,
      buildRequestBody(context, { legacyOutputFormat: true }),
    );
  }

  if (!response.ok) {
    throw new AnthropicError(
      `The API returned ${String(response.status)}.`,
      response.status,
    );
  }

  let payload: ApiResponse;
  try {
    payload = JSON.parse(response.text) as ApiResponse;
  } catch {
    throw new AnthropicError('The API response was not valid JSON.');
  }

  const decomposition = parseDecomposition(payload);

  const queryLog: QueryLog = {
    asked_at: (options.now ?? Date.now)(),
    question: options.question,
    // Derived from the direction the model reported, unless the caller asked
    // for a specific intent. The mapping is EVIDENCE_EFFECTS' neighbour in
    // src/srs/evidence.ts, so the review loop and this client cannot disagree.
    intent: options.intent ?? INTENT_FOR_DIRECTION[decomposition.direction],
    evidence: options.evidence,
    ...(options.rating === undefined ? {} : { rating: options.rating }),
    ...decomposition,
  };

  // The rating rule lives in the generated schema and is checked here rather
  // than restated: a graded call with no rating must not reach persistence.
  const logResult = validateQueryLog(queryLog);
  if (!logResult.valid) {
    throw new AnthropicError(
      `The logged query failed the schema: ${logResult.errors.join('; ')}`,
    );
  }

  return { decomposition, queryLog, usage: readUsage(payload.usage) };
}
