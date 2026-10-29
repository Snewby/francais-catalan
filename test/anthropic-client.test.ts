import { describe, expect, it, vi } from 'vitest';

import {
  EFFORT,
  MAX_TOKENS,
  MESSAGES_URL,
  MODEL,
  STRUCTURED_OUTPUTS_BETA,
  buildHeaders,
  buildRequestBody,
  toStructuredOutputSchema,
  translatePhrase,
  type TranslateOptions,
  type TranslateResult,
} from '../src/api/anthropic';
import { ASSUMPTIONS, CHUNK_ROLES, UNLINKED_REASONS } from '../src/api/phrase';
import { LEAF_IDS } from '../src/api/schema';
import {
  SYSTEM_INSTRUCTION,
  buildSystemBlocks,
  renderVocabulary,
} from '../src/api/prompt';
import { quote } from '../src/i18n/fr';
import { LEAVES } from '../src/taxonomy';
import { hasHighPunctuation, highPunctuationOffenders } from './helpers/typography';

import fixture from './fixtures/phrase-response.json';

const API_KEY = 'sk-ant-test-not-a-real-key';
const SENTENCE = 'Hier, j’ai acheté le pain au marché.';

/** One queued answer from the stub: a response, a thrown error, or no answer at all. */
type Reply =
  | { readonly status: number; readonly body: unknown }
  | { readonly throws: Error }
  | 'hang';

interface StubbedCall {
  readonly body: Record<string, unknown>;
  readonly headers: Record<string, string>;
}

/**
 * A fetch that never leaves the machine. Each queued reply is used once, so a
 * test that expects a retry has to say so by queueing two, and a third call
 * fails the test by running out.
 */
function stubFetch(replies: readonly Reply[]): {
  fetchFn: typeof fetch;
  calls: StubbedCall[];
} {
  const calls: StubbedCall[] = [];
  const queue = [...replies];

  const fetchFn = vi.fn(async (_url: string, init: RequestInit) => {
    calls.push({
      body: JSON.parse(String(init.body)) as Record<string, unknown>,
      headers: init.headers as Record<string, string>,
    });
    const reply = queue.shift();
    if (reply === undefined) throw new Error('the stub ran out of replies');
    if (reply === 'hang') {
      return new Promise<never>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        });
      });
    }
    if ('throws' in reply) throw reply.throws;
    const text =
      typeof reply.body === 'string' ? reply.body : JSON.stringify(reply.body);
    return {
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      text: () => Promise.resolve(text),
    };
  });

  return { fetchFn: fetchFn as unknown as typeof fetch, calls };
}

const SPEC_REPLY = JSON.parse(fixture.content[0]?.text ?? '{}') as Record<
  string,
  unknown
>;

/** The fixture envelope with `reply` as the model's text. */
function okWith(reply: unknown, extra: Record<string, unknown> = {}): Reply {
  const text = typeof reply === 'string' ? reply : JSON.stringify(reply);
  return {
    status: 200,
    body: { ...fixture, content: [{ type: 'text', text }], ...extra },
  };
}

const OK: Reply = okWith(SPEC_REPLY);

/** A reply whose Catalan is fine and whose anatomy names a chunk absent from it. */
const BAD_ANATOMY: Reply = okWith({
  ...SPEC_REPLY,
  chunks: [{ text: 'Avui', role: 'time', ids: [], unlinked: 'no_notion' }],
});

async function run(
  replies: readonly Reply[],
  options: Partial<TranslateOptions> = {},
): Promise<{ result: TranslateResult; calls: StubbedCall[] }> {
  const { fetchFn, calls } = stubFetch(replies);
  const result = await translatePhrase({
    sentence: SENTENCE,
    apiKey: API_KEY,
    fetchFn,
    isOnline: () => true,
    ...options,
  });
  return { result, calls };
}

function errorKind(result: TranslateResult): string | undefined {
  return result.status === 'error' ? result.kind : undefined;
}

describe('request shape', () => {
  it('sends the model, the beta header and the direct browser access header', () => {
    const headers = buildHeaders(API_KEY);
    expect(headers['anthropic-beta']).toBe(STRUCTURED_OUTPUTS_BETA);
    expect(headers['anthropic-dangerous-direct-browser-access']).toBe('true');
    expect(buildRequestBody(SENTENCE).model).toBe(MODEL);
    expect(buildRequestBody(SENTENCE).max_tokens).toBe(MAX_TOKENS);
  });

  it('uses the model the phase 1 eval chose', () => {
    expect(MODEL).toBe('claude-opus-5-5');
  });

  it('constrains the reply to the generated phrase schema', () => {
    const body = buildRequestBody(SENTENCE) as {
      output_config: { format: { type: string; schema: unknown } };
    };
    expect(body.output_config.format.type).toBe('json_schema');
    const schema = body.output_config.format.schema as {
      required: string[];
      properties: {
        chunks: { items: { properties: { ids: { items: { enum: string[] } } } } };
      };
    };
    expect(schema.required).toEqual(['fr', 'ca', 'subject', 'assumptions', 'chunks']);
    expect(schema.properties.chunks.items.properties.ids.items.enum).toEqual([
      ...LEAF_IDS,
    ]);
  });

  it('strips the keywords constrained decoding cannot honour', () => {
    const sent = JSON.stringify(buildRequestBody(SENTENCE));
    expect(sent).not.toContain('minLength');
    expect(sent).not.toContain('maxItems');
    // Ajv still enforces them locally, so they stay in the generated schema.
    expect(JSON.stringify(toStructuredOutputSchema({ a: { minLength: 1 } }))).toBe(
      '{"a":{}}',
    );
  });

  it('sets the decided effort on the eval candidates, and none on Haiku 4.5', () => {
    for (const model of ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5']) {
      const body = buildRequestBody(SENTENCE, { model }) as {
        model: string;
        output_config: { effort?: string };
      };
      expect(body.model).toBe(model);
      expect(body.output_config.effort).toBe(EFFORT);
    }
    const haiku45 = buildRequestBody(SENTENCE, { model: 'claude-haiku-4-5' }) as {
      output_config: object;
    };
    expect(haiku45.output_config).not.toHaveProperty('effort');
    expect(EFFORT).toBe('medium');
  });

  it('sends the sentence as the only dynamic content, with no prefill', () => {
    const body = buildRequestBody(SENTENCE) as {
      messages: { role: string; content: string }[];
    };
    expect(body.messages).toEqual([{ role: 'user', content: SENTENCE }]);
  });

  it('never puts the key in the body', () => {
    expect(JSON.stringify(buildRequestBody(SENTENCE))).not.toContain(API_KEY);
  });

  it('asks for the one-hour cache only when told to', () => {
    const last = (blocks: ReturnType<typeof buildSystemBlocks>) => blocks.at(-1);
    expect(last(buildSystemBlocks())?.cache_control).toEqual({ type: 'ephemeral' });
    expect(last(buildSystemBlocks('1h'))?.cache_control).toEqual({
      type: 'ephemeral',
      ttl: '1h',
    });
  });
});

describe('cached prefix', () => {
  it('marks exactly one breakpoint, on the last static block', () => {
    const blocks = buildSystemBlocks();
    const marked = blocks.filter((block) => block.cache_control !== undefined);
    expect(marked).toHaveLength(1);
    expect(marked[0]).toBe(blocks[blocks.length - 1]);
  });

  it('renders byte-identically whatever the sentence is', () => {
    const a = buildRequestBody('Je ne le fais plus.') as { system: unknown };
    const b = buildRequestBody('Vous êtes prêts ?') as { system: unknown };
    expect(JSON.stringify(a.system)).toBe(JSON.stringify(b.system));
  });

  it('carries every leaf once, and nothing that is not a leaf', () => {
    const lines = renderVocabulary().split('\n');
    expect(lines).toHaveLength(LEAVES.length);
    expect(lines.map((line) => line.split('\t')[0])).toEqual([...LEAF_IDS]);
  });

  it('keeps the separator out of the fields it separates', () => {
    for (const leaf of LEAVES) {
      for (const field of [leaf.id, leaf.ca, leaf.glosses.fr]) {
        expect(field, `tab or newline in: ${leaf.id}`).not.toMatch(/[\t\n]/);
      }
    }
  });

  it('holds the prompt to the French typography the UI copy follows', () => {
    // The prompt is French prose that is not user-facing, so it sits outside
    // src/i18n/fr.ts and outside the smoke test that guards that file. It is
    // under the same rule all the same, and this is the only thing enforcing it.
    expect(hasHighPunctuation(SYSTEM_INSTRUCTION)).toBe(true);
    expect(highPunctuationOffenders(SYSTEM_INSTRUCTION)).toEqual([]);
    expect(SYSTEM_INSTRUCTION).not.toContain('—');
    // Straight apostrophes only inside cited Catalan, which is data.
    expect(SYSTEM_INSTRUCTION.replace(/«[^»]*»/g, '')).not.toContain("'");
  });

  it('asks for straight apostrophes and the punt volat in Catalan', () => {
    expect(SYSTEM_INSTRUCTION).toContain('U+0027');
    expect(SYSTEM_INSTRUCTION).toContain(quote("l'home"));
    expect(SYSTEM_INSTRUCTION).toContain(quote('col·lecció'));
  });

  it('explains every value of every closed phrase enum', () => {
    for (const value of [...CHUNK_ROLES, ...ASSUMPTIONS, ...UNLINKED_REASONS]) {
      expect(SYSTEM_INSTRUCTION, value).toContain(`- ${value}\t`);
    }
  });

  it('clears the model minimum cacheable prefix', () => {
    // Haiku 4.5 will not cache a prefix under 4,096 tokens, the highest minimum
    // of any model in play, and a prefix that silently fails to cache reports
    // no error at all. Six characters per token is a deliberately pessimistic
    // floor for French and Catalan prose, so this is a lower bound on tokens.
    const characters = buildSystemBlocks().reduce(
      (total, block) => total + block.text.length,
      0,
    );
    expect(characters / 6).toBeGreaterThan(4096);
  });
});

describe('a successful call', () => {
  it('returns the checked phrase with spans, and the usage of its one attempt', async () => {
    const { result, calls } = await run([OK]);
    expect(calls).toHaveLength(1);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.phrase.ca).toBe('Ahir vaig comprar el pa al mercat.');
    expect(result.phrase.chunks.map((chunk) => [chunk.start, chunk.end])).toEqual([
      [0, 4],
      [5, 17],
      [18, 23],
      [24, 33],
    ]);
    expect(result.model).toBe(MODEL);
    expect(result.attempts).toHaveLength(1);
    expect(result.attempts[0]?.usage?.cacheReadTokens).toBe(18300);
  });

  it('posts to the Messages API with the key in the header only', async () => {
    const { calls } = await run([OK]);
    expect(calls[0]?.headers['x-api-key']).toBe(API_KEY);
    expect(JSON.stringify(calls[0]?.body)).not.toContain(API_KEY);
    expect(MESSAGES_URL).toBe('https://api.anthropic.com/v1/messages');
  });

  it('straightens a typographic apostrophe the model wrote in ca', async () => {
    const { result } = await run([
      okWith({
        fr: 'L’homme vient d’arriver.',
        ca: 'L’home acaba d’arribar.',
        subject: { person: '3sg', expressed: true },
        assumptions: [],
        chunks: [
          { text: "L'home", role: 'subject', ids: ['ART.def.forma.elisio'] },
          {
            text: "acaba d'arribar",
            role: 'verb',
            ids: ['VERB.perifrasi.acabar_de'],
            lemma: 'arribar',
          },
        ],
      }),
    ]);
    expect(result.status).toBe('ok');
    if (result.status === 'ok')
      expect(result.phrase.ca).toBe("L'home acaba d'arribar.");
  });
});

describe('the one retry', () => {
  it('retries once on a reply that fails the check, and keeps the second', async () => {
    const { result, calls } = await run([BAD_ANATOMY, OK]);
    expect(calls).toHaveLength(2);
    expect(result.status).toBe('ok');
    expect(result.attempts).toHaveLength(2);
    expect(result.attempts[0]?.errors.length).toBeGreaterThan(0);
    expect(result.attempts[1]?.errors).toEqual([]);
  });

  it('retries once on reply text that is not JSON', async () => {
    const { result, calls } = await run([okWith('{"fr": "Hier'), OK]);
    expect(calls).toHaveLength(2);
    expect(result.status).toBe('ok');
  });

  it('stores analysis_failed with the Catalan after two failures, never calling a third time', async () => {
    // The stub holds two replies; a third call would throw and fail the test.
    const { result, calls } = await run([BAD_ANATOMY, BAD_ANATOMY]);
    expect(calls).toHaveLength(2);
    expect(result).toMatchObject({
      status: 'analysis_failed',
      fr: SPEC_REPLY['fr'],
      ca: SPEC_REPLY['ca'],
    });
    if (result.status === 'analysis_failed') {
      expect(result.errors.join(' ')).toContain('Avui');
    }
  });

  it('shows the error state when neither reply has usable Catalan', async () => {
    const { result, calls } = await run([okWith('not json'), okWith({ ca: '' })]);
    expect(calls).toHaveLength(2);
    expect(errorKind(result)).toBe('refused');
  });

  it('keeps the first reply’s Catalan when the retry itself fails', async () => {
    const { result } = await run([BAD_ANATOMY, { status: 529, body: 'overloaded' }]);
    expect(result).toMatchObject({ status: 'analysis_failed', ca: SPEC_REPLY['ca'] });
  });
});

describe('each failure cause in the spec’s table', () => {
  it('no API key: detected before the call', async () => {
    for (const apiKey of [null, '', '  ']) {
      const { result, calls } = await run([OK], { apiKey });
      expect(calls).toHaveLength(0);
      expect(errorKind(result)).toBe('no_key');
    }
  });

  it('key rejected: HTTP 401, not retried', async () => {
    const { result, calls } = await run([{ status: 401, body: 'nope' }]);
    expect(calls).toHaveLength(1);
    expect(errorKind(result)).toBe('key_rejected');
    if (result.status === 'error') expect(result.httpStatus).toBe(401);
  });

  it('overloaded or rate-limited: HTTP 429 and 529, and 500 to 504 (Q2)', async () => {
    for (const status of [429, 529, 500, 502, 503, 504]) {
      const { result, calls } = await run([{ status, body: 'busy' }]);
      expect(calls, String(status)).toHaveLength(1);
      expect(errorKind(result), String(status)).toBe('overloaded');
    }
  });

  it('offline: navigator.onLine false, before the call', async () => {
    const { result, calls } = await run([OK], { isOnline: () => false });
    expect(calls).toHaveLength(0);
    expect(errorKind(result)).toBe('offline');
  });

  it('offline: a request that never reaches the API', async () => {
    const { result } = await run([{ throws: new TypeError('Failed to fetch') }]);
    expect(errorKind(result)).toBe('offline');
  });

  it('offline: no reply within the timeout', async () => {
    const { result, calls } = await run(['hang'], { timeoutMs: 5 });
    expect(calls).toHaveLength(1);
    expect(errorKind(result)).toBe('offline');
    if (result.status === 'error') expect(result.detail).toContain('timeout');
  });

  it('refusal or cut off: stop_reason, not retried', async () => {
    for (const stop_reason of ['refusal', 'max_tokens']) {
      const { result, calls } = await run([okWith(SPEC_REPLY, { stop_reason })]);
      expect(calls, stop_reason).toHaveLength(1);
      expect(errorKind(result), stop_reason).toBe('refused');
      expect(result.attempts[0]?.stopReason).toBe(stop_reason);
    }
  });

  it('refused: any other HTTP error and a malformed response (Q2)', async () => {
    for (const reply of [
      { status: 400, body: 'bad request' },
      { status: 403, body: 'forbidden' },
      { status: 200, body: '<html>' },
    ]) {
      const { result, calls } = await run([reply]);
      expect(calls).toHaveLength(1);
      expect(errorKind(result)).toBe('refused');
    }
  });

  it('cancelled by the caller: reported, never shown as a failure', async () => {
    const controller = new AbortController();
    const pending = run(['hang'], { signal: controller.signal });
    controller.abort();
    expect(errorKind((await pending).result)).toBe('cancelled');
  });
});

describe('the output_config fallback', () => {
  it('resends under output_format once when the API does not know output_config', async () => {
    const { result, calls } = await run([
      { status: 400, body: '{"error":{"message":"output_config: Extra inputs"}}' },
      OK,
    ]);
    expect(result.status).toBe('ok');
    expect(calls).toHaveLength(2);
    expect(calls[1]?.body).toHaveProperty('output_format');
    expect(calls[1]?.body).not.toHaveProperty('output_config');
  });
});
