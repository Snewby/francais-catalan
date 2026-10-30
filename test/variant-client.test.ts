import { describe, expect, it } from 'vitest';
import { MAX_TOKENS, MESSAGES_URL } from '../src/api/anthropic';
import { buildSystemBlocks, promptHash } from '../src/api/prompt';
import { NOT_APPLICABLE_REASONS } from '../src/api/phrase';
import type { VARIANT_SCHEMA } from '../src/api/schema';
import { TENSE_ID, TOURNURE_ID } from '../src/variants/axes';
import { ROLES_BY_AXIS } from '../src/variants/check';
import { buildVariantRequestBody, requestVariant } from '../src/variants/client';
import { parseComboKey, startingState } from '../src/variants/combination';
import {
  VARIANT_INSTRUCTION,
  buildVariantRequest,
  buildVariantSystemBlocks,
  buildVariantUserContent,
  variantPromptHash,
} from '../src/variants/prompt';
import { recordedReply } from './helpers/recorded-replies';
import { stubFetch, type Reply } from './helpers/stub-fetch';
import { highPunctuationOffenders } from './helpers/typography';

const API_KEY = 'sk-ant-test-not-a-real-key';
const MODEL = 'claude-haiku-5-5';

const ROW1 = recordedReply(1);
const ORIGINAL = { ...ROW1, combination: startingState(ROW1).combination };
const { request, context } = buildVariantRequest(
  ORIGINAL,
  parseComboKey('ella·avui·none·0·0'),
);

const VARIANT = {
  status: 'ok',
  fr: 'Aujourd’hui, elle a acheté le pain au marché.',
  ca: 'Avui ha comprat el pa al mercat.',
  subject: { person: '3sg', expressed: false },
  assumptions: [],
  chunks: [
    { text: 'Avui', role: 'time', ids: ['ADV.temps.dixi'] },
    { text: 'ha comprat', role: 'verb', ids: ['VERB.perf.present', 'VERB.conj.1'] },
    { text: 'el pa', role: 'object_direct', ids: ['ART.def.forma.paradigma'] },
    { text: 'al mercat', role: 'place', ids: ['ART.contract.a_de'] },
  ],
};

function reply(payload: unknown): Reply {
  return {
    status: 200,
    body: {
      content: [{ type: 'text', text: JSON.stringify(payload) }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 300, output_tokens: 250, cache_read_input_tokens: 24000 },
    },
  };
}

const WRONG_TIME = reply({
  ...VARIANT,
  ca: 'Ahir ha comprat el pa al mercat.',
  chunks: [{ ...VARIANT.chunks[0], text: 'Ahir' }, ...VARIANT.chunks.slice(1)],
});

async function run(replies: readonly Reply[], signal?: AbortSignal) {
  const { fetchFn, calls } = stubFetch(replies);
  const result = await requestVariant({
    apiKey: API_KEY,
    model: MODEL,
    request,
    context,
    fetchFn,
    isOnline: () => true,
    ...(signal && { signal }),
  });
  return { result, calls };
}

describe('the request', () => {
  it('starts from the original sentence and names the full target', () => {
    expect(request.base.ca).toBe(ROW1.ca);
    expect(request.target).toEqual({
      person: 'ella',
      tense: 'avui',
      tournure: 'none',
      pronoun: false,
      negation: false,
    });
    expect(request.timeWord).toBe('Avui');
  });

  it('carries the chunks without spans, so the request is the same whatever was shown', () => {
    const spanned = {
      ...ORIGINAL,
      chunks: ORIGINAL.chunks.map((chunk) => ({ ...chunk, start: 0, end: 1 })),
    };
    const again = buildVariantRequest(spanned, request.target).request;
    expect(buildVariantUserContent(again)).toBe(buildVariantUserContent(request));
    expect(JSON.stringify(again)).not.toMatch(/"(start|end)"/);
  });

  it('leaves timeWord out when the tense does not change', () => {
    const { request: samePerson } = buildVariantRequest(
      ORIGINAL,
      parseComboKey('ella·ahir·none·0·0'),
    );
    expect('timeWord' in samePerson).toBe(false);
  });
});

describe('the body', () => {
  const body = buildVariantRequestBody(request, { model: MODEL });

  it('keeps the phase 1 blocks byte for byte, then adds the variant block (F2)', () => {
    const system = body.system as { text: string; cache_control?: unknown }[];
    const phase1 = buildSystemBlocks();
    expect(system).toHaveLength(phase1.length + 1);
    expect(system.slice(0, phase1.length)).toEqual(phase1);
    expect(system.at(-1)?.text).toBe(VARIANT_INSTRUCTION);
    expect(system.at(-1)?.cache_control).toEqual({ type: 'ephemeral' });
  });

  it('caches the hour when asked, on both breakpoints', () => {
    const blocks = buildVariantSystemBlocks('1h');
    expect(blocks.filter((block) => block.cache_control?.ttl === '1h')).toHaveLength(2);
  });

  it('sends the request as the only user content, with the variant schema', () => {
    expect(body.messages).toEqual([{ role: 'user', content: JSON.stringify(request) }]);
    const config = body.output_config as { format: { schema: typeof VARIANT_SCHEMA } };
    expect(config.format.schema.properties.reason.enum).toEqual(NOT_APPLICABLE_REASONS);
    expect(body.max_tokens).toBe(MAX_TOKENS);
    expect(body.model).toBe(MODEL);
  });
});

describe('the variant instruction', () => {
  it('names every tense and tournure ID from the axis tables', () => {
    for (const id of [...Object.values(TENSE_ID), ...Object.values(TOURNURE_ID)]) {
      expect(VARIANT_INSTRUCTION).toContain(id);
    }
  });

  it('states the roles each axis may change, from the validator’s own table', () => {
    for (const roles of Object.values(ROLES_BY_AXIS)) {
      for (const role of roles) expect(VARIANT_INSTRUCTION).toContain(role);
    }
  });

  it('follows French typography', () => {
    expect(highPunctuationOffenders(VARIANT_INSTRUCTION)).toEqual([]);
    expect(VARIANT_INSTRUCTION).not.toContain('—');
  });
});

describe('the prompt hash', () => {
  it('differs from the phase 1 hash, which stays as recorded', async () => {
    expect(await variantPromptHash()).not.toBe(await promptHash());
    expect(await variantPromptHash()).toBe(await variantPromptHash());
  });
});

describe('a call', () => {
  it('returns a checked variant from one valid reply', async () => {
    const { result, calls } = await run([reply(VARIANT)]);
    expect(result.status).toBe('ok');
    expect(calls).toHaveLength(1);
    expect(result.attempts[0]?.usage?.cacheReadTokens).toBe(24000);
  });

  it('returns not_applicable as a valid reply, with no retry', async () => {
    const { result, calls } = await run([
      reply({ status: 'not_applicable', reason: 'subordinate_affected' }),
    ]);
    expect(result).toMatchObject({
      status: 'ok',
      variant: { status: 'not_applicable', reason: 'subordinate_affected' },
    });
    expect(calls).toHaveLength(1);
  });

  it('retries exactly once on a failed check', async () => {
    const { result, calls } = await run([WRONG_TIME, reply(VARIANT)]);
    expect(result.status).toBe('ok');
    expect(calls).toHaveLength(2);
  });

  it('is unavailable after two failed checks, and makes no third call', async () => {
    const { result, calls } = await run([WRONG_TIME, WRONG_TIME]);
    expect(result.status).toBe('unavailable');
    expect(result.status === 'unavailable' && result.errors[0]).toMatch(/timeWord/);
    expect(calls).toHaveLength(2);
  });

  it('maps an HTTP failure through the phase 1 table', async () => {
    const { result } = await run([{ status: 529, body: { error: 'overloaded' } }]);
    expect(result).toMatchObject({
      status: 'error',
      kind: 'overloaded',
      httpStatus: 529,
    });
  });

  it('is cancelled when the caller aborts, for the next tap', async () => {
    const controller = new AbortController();
    const pending = run(['hang'], controller.signal);
    controller.abort();
    const { result } = await pending;
    expect(result).toMatchObject({ status: 'error', kind: 'cancelled' });
  });

  it('makes no call without a key or a connection', async () => {
    const { fetchFn, calls } = stubFetch([]);
    const base = { model: MODEL, request, context, fetchFn };
    expect(
      await requestVariant({ ...base, apiKey: null, isOnline: () => true }),
    ).toMatchObject({ status: 'error', kind: 'no_key' });
    expect(
      await requestVariant({ ...base, apiKey: API_KEY, isOnline: () => false }),
    ).toMatchObject({ status: 'error', kind: 'offline' });
    expect(calls).toHaveLength(0);
  });

  it('posts to the Messages API', async () => {
    const { fetchFn } = stubFetch([reply(VARIANT)]);
    await requestVariant({
      apiKey: API_KEY,
      model: MODEL,
      request,
      context,
      fetchFn,
      isOnline: () => true,
    });
    expect(
      (fetchFn as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]?.[0],
    ).toBe(MESSAGES_URL);
  });
});
