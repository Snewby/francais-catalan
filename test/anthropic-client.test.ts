import { describe, expect, it, vi } from 'vitest';

import {
  AnthropicError,
  MAX_TOKENS,
  MESSAGES_URL,
  MODEL,
  STRUCTURED_OUTPUTS_BETA,
  buildHeaders,
  buildRequestBody,
  callHaiku,
  toStructuredOutputSchema,
} from '../src/api/anthropic';
import { LEAF_IDS } from '../src/api/schema';
import {
  SYSTEM_INSTRUCTION,
  buildSystemBlocks,
  renderVocabulary,
} from '../src/api/prompt';
import { LEAVES } from '../src/taxonomy';
import { hasHighPunctuation, highPunctuationOffenders } from './helpers/typography';

import fixture from './fixtures/decomposition-response.json';

const API_KEY = 'sk-ant-test-not-a-real-key';

const CONTEXT = {
  question: "L'home acaba d'arribar",
  intent: 'comprehend',
} as const;

interface StubbedCall {
  readonly body: Record<string, unknown>;
  readonly headers: Record<string, string>;
}

/**
 * A fetch that never leaves the machine. Each queued reply is used once, so a
 * test that expects a retry has to say so by queueing two.
 */
function stubFetch(replies: readonly { status: number; body: unknown }[]): {
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

function okFixture(): { status: number; body: unknown } {
  return { status: 200, body: fixture };
}

/** The fixture reply with its decomposition swapped for `entries`. */
function replyWith(entries: unknown): { status: number; body: unknown } {
  const payload = {
    decomposition: entries,
    answer: 'Une réponse française.',
    answer_lang: 'fr',
  };
  return {
    status: 200,
    body: { ...fixture, content: [{ type: 'text', text: JSON.stringify(payload) }] },
  };
}

describe('request shape', () => {
  it('sends the model, the beta header and the direct browser access header', () => {
    const headers = buildHeaders(API_KEY);
    expect(headers['anthropic-beta']).toBe(STRUCTURED_OUTPUTS_BETA);
    expect(headers['anthropic-dangerous-direct-browser-access']).toBe('true');
    expect(buildRequestBody(CONTEXT).model).toBe(MODEL);
    expect(buildRequestBody(CONTEXT).max_tokens).toBe(MAX_TOKENS);
  });

  it('constrains the reply to the generated schema', () => {
    const body = buildRequestBody(CONTEXT) as {
      output_config: { format: { type: string; schema: Record<string, never> } };
    };
    expect(body.output_config.format.type).toBe('json_schema');

    const idField = (
      body.output_config.format.schema as unknown as {
        properties: {
          decomposition: { items: { properties: { id: { enum: string[] } } } };
        };
      }
    ).properties.decomposition.items.properties.id;
    expect(idField.enum).toEqual([...LEAF_IDS]);
  });

  it('strips the keywords constrained decoding cannot honour', () => {
    const sent = JSON.stringify(buildRequestBody(CONTEXT));
    expect(sent).not.toContain('minLength');
    // Ajv still enforces them locally, so they stay in the generated schema.
    expect(JSON.stringify(toStructuredOutputSchema({ a: { minLength: 1 } }))).toBe(
      '{"a":{}}',
    );
  });

  it('sends no assistant prefill, which structured outputs forbids', () => {
    const body = buildRequestBody(CONTEXT) as {
      messages: { role: string; content: string }[];
    };
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0]?.role).toBe('user');
    expect(body.messages[0]?.content).toContain(CONTEXT.question);
    expect(body.messages[0]?.content).toContain(CONTEXT.intent);
    // The direction is deliberately absent: the model reads it off the
    // question and reports it back, so sending one would be asserting an
    // answer to the thing being asked.
    expect(body.messages[0]?.content).not.toContain('ca_to_fr');
    expect(body.messages[0]?.content).not.toContain('fr_to_ca');
  });

  it('never puts the key in the body', () => {
    expect(JSON.stringify(buildRequestBody(CONTEXT))).not.toContain(API_KEY);
  });
});

describe('cached prefix', () => {
  it('marks exactly one breakpoint, on the last static block', () => {
    const blocks = buildSystemBlocks();
    const marked = blocks.filter((block) => block.cache_control !== undefined);
    expect(marked).toHaveLength(1);
    expect(marked[0]).toBe(blocks[blocks.length - 1]);
  });

  it('renders byte-identically whatever the question is', () => {
    const a = buildRequestBody({ ...CONTEXT, question: 'Vaig cantar' }) as {
      system: unknown;
    };
    const b = buildRequestBody({
      ...CONTEXT,
      question: 'Ho hem vist',
      intent: 'produce',
    }) as { system: unknown };
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
    expect(SYSTEM_INSTRUCTION).not.toContain("'");
  });

  it('clears the model minimum cacheable prefix', () => {
    // Haiku 4.5 will not cache a prefix under 4,096 tokens, and a prefix that
    // silently fails to cache reports no error at all: usage just shows a
    // permanent zero. Six characters per token is a deliberately pessimistic
    // floor for French and Catalan prose, so this is a lower bound on tokens.
    const characters = buildSystemBlocks().reduce(
      (total, block) => total + block.text.length,
      0,
    );
    expect(characters / 6).toBeGreaterThan(4096);
  });
});

describe('a successful call', () => {
  it('returns the decomposition, a schema-valid log and the cache usage', async () => {
    const { fetchFn, calls } = stubFetch([okFixture()]);

    const result = await callHaiku({
      ...CONTEXT,
      apiKey: API_KEY,
      evidence: 'lookup',
      fetchFn,
      now: () => 1_700_000_000_000,
    });

    expect(calls).toHaveLength(1);
    expect(result.decomposition.answer_lang).toBe('fr');
    expect(result.decomposition.decomposition.map((entry) => entry.id)).toEqual([
      'ART.def.forma.elisio',
      'VERB.perifrasi.acabar_de',
    ]);
    expect(result.queryLog.asked_at).toBe(1_700_000_000_000);
    expect(result.queryLog.evidence).toBe('lookup');
    expect(result.queryLog.rating).toBeUndefined();
    expect(result.usage.cacheReadTokens).toBe(13104);
  });

  it('posts to the messages endpoint with the key in the headers only', async () => {
    const { fetchFn, calls } = stubFetch([okFixture()]);
    await callHaiku({ ...CONTEXT, apiKey: API_KEY, evidence: 'lookup', fetchFn });
    expect(vi.mocked(fetchFn).mock.calls[0]?.[0]).toBe(MESSAGES_URL);
    expect(calls[0]?.headers['x-api-key']).toBe(API_KEY);
  });
});

describe('a bad reply', () => {
  it('refuses a component ID that is not in the taxonomy', async () => {
    // Assembled rather than written out: scripts/lib/scan-ids.ts scans every
    // .ts file for ID literals, and a deliberately invalid one in a test would
    // fail the closed-vocabulary check for the right reason at the wrong place.
    const outOfVocabulary = ['VERB', 'invented'].join('.');
    const { fetchFn } = stubFetch([replyWith([{ id: outOfVocabulary, ca: 'x' }])]);
    await expect(
      callHaiku({ ...CONTEXT, apiKey: API_KEY, evidence: 'lookup', fetchFn }),
    ).rejects.toThrow(AnthropicError);
  });

  it('refuses French prose smuggled into the decomposition', async () => {
    const { fetchFn } = stubFetch([
      replyWith([{ id: 'ART.def.forma.elisio', ca: "l'home", gloss: 'article élidé' }]),
    ]);
    await expect(
      callHaiku({ ...CONTEXT, apiKey: API_KEY, evidence: 'lookup', fetchFn }),
    ).rejects.toThrow(AnthropicError);
  });

  it('refuses a reply that is not JSON', async () => {
    const { fetchFn } = stubFetch([
      { status: 200, body: { ...fixture, content: [{ type: 'text', text: 'oui' }] } },
    ]);
    await expect(
      callHaiku({ ...CONTEXT, apiKey: API_KEY, evidence: 'lookup', fetchFn }),
    ).rejects.toThrow(AnthropicError);
  });
});

describe('the logged record', () => {
  it('rejects graded evidence with no rating', async () => {
    const { fetchFn } = stubFetch([okFixture()]);
    await expect(
      callHaiku({ ...CONTEXT, apiKey: API_KEY, evidence: 'graded', fetchFn }),
    ).rejects.toThrow(/logged query/);
  });

  it('rejects a rating on evidence that does not carry one', async () => {
    const { fetchFn } = stubFetch([okFixture()]);
    await expect(
      callHaiku({
        ...CONTEXT,
        apiKey: API_KEY,
        evidence: 'lookup',
        rating: 'good',
        fetchFn,
      }),
    ).rejects.toThrow(/logged query/);
  });

  it('accepts graded evidence with a rating', async () => {
    const { fetchFn } = stubFetch([okFixture()]);
    const result = await callHaiku({
      ...CONTEXT,
      apiKey: API_KEY,
      evidence: 'graded',
      rating: 'good',
      fetchFn,
    });
    expect(result.queryLog.rating).toBe('good');
  });
});

describe('transport failures', () => {
  it('reports the status and does not retry an ordinary error', async () => {
    const { fetchFn, calls } = stubFetch([
      { status: 401, body: { error: { message: 'invalid x-api-key' } } },
    ]);
    await expect(
      callHaiku({ ...CONTEXT, apiKey: API_KEY, evidence: 'lookup', fetchFn }),
    ).rejects.toThrow('401');
    expect(calls).toHaveLength(1);
  });

  it('falls back to output_format only when output_config is rejected', async () => {
    const { fetchFn, calls } = stubFetch([
      { status: 400, body: { error: { message: 'unexpected field output_config' } } },
      okFixture(),
    ]);
    await callHaiku({ ...CONTEXT, apiKey: API_KEY, evidence: 'lookup', fetchFn });
    expect(calls).toHaveLength(2);
    expect(calls[0]?.body).toHaveProperty('output_config');
    expect(calls[1]?.body).toHaveProperty('output_format');
    expect(calls[1]?.body).not.toHaveProperty('output_config');
  });

  it('does not retry a 400 that is about something else', async () => {
    const { fetchFn, calls } = stubFetch([
      { status: 400, body: { error: { message: 'max_tokens is too large' } } },
    ]);
    await expect(
      callHaiku({ ...CONTEXT, apiKey: API_KEY, evidence: 'lookup', fetchFn }),
    ).rejects.toThrow('400');
    expect(calls).toHaveLength(1);
  });
});
