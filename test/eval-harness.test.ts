import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  normaliseRendering,
  replayRecording,
  type GoldenCase,
  type Recording,
  type ReplayedReply,
} from '../src/eval/golden';
import { asCold, costOf } from '../src/eval/pricing';
import { PROBE_SENTENCE, recordRun, runPreChecks } from '../src/eval/record';
import {
  applyVerdicts,
  buildSheet,
  letters,
  registerRenderings,
  verdictTemplate,
} from '../src/eval/review';
import { percentile, renderReport, scoreModel } from '../src/eval/score';
import { NNBSP } from '../src/i18n/fr';
import { highPunctuationOffenders } from './helpers/typography';

/*
 * The eval harness, offline. The recorder runs against a stub that plays the
 * API, so the pre-checks, the capture and the replay are all exercised with
 * no key and no cost.
 */

const API_KEY = 'sk-ant-test-not-a-real-key';
const HASH = 'test-hash';
const CASES_DIR = path.resolve(import.meta.dirname, 'fixtures/golden-v2/cases');
const ALL_CASES: GoldenCase[] = readdirSync(CASES_DIR)
  .sort()
  .map(
    (name) =>
      JSON.parse(readFileSync(path.join(CASES_DIR, name), 'utf8')) as GoldenCase,
  );

function caseNumber(n: number): GoldenCase {
  const golden = ALL_CASES.find((candidate) => candidate.n === n);
  if (golden === undefined) throw new Error(`no case ${String(n)}`);
  return golden;
}

/** Case 12, « Je ne le fais plus. », with a valid reply in two spellings. */
const CASE_12 = caseNumber(12);
const CASE_29 = caseNumber(29);

interface Chunk {
  text: string;
  role: string;
  ids: string[];
  unlinked?: string;
}

function reply(
  ca: string,
  chunks: Chunk[],
  extra: Record<string, unknown> = {},
): unknown {
  return {
    fr: 'Je ne le fais plus.',
    ca,
    subject: { person: '1sg', expressed: false },
    assumptions: [],
    chunks,
    ...extra,
  };
}

const JA_NO_HO_FAIG = reply('Ja no ho faig.', [
  { text: 'Ja no', role: 'negation', ids: ['NEG.aspecte.ja_no'] },
  { text: 'ho', role: 'clitic', ids: ['PRON.feble.ho'] },
  { text: 'faig', role: 'verb', ids: [], unlinked: 'no_notion' },
]);

function envelope(text: unknown, usage: Record<string, unknown> = {}): unknown {
  return {
    id: 'msg_stub',
    type: 'message',
    content: [
      { type: 'text', text: typeof text === 'string' ? text : JSON.stringify(text) },
    ],
    stop_reason: 'end_turn',
    usage: {
      input_tokens: 40,
      output_tokens: 400,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 18300,
      ...usage,
    },
  };
}

/** A recording made by hand, one fetch per case unless told otherwise. */
function recordingOf(
  model: string,
  run: number,
  replies: { n: number; bodies: unknown[]; latencyMs?: number }[],
): Recording {
  return {
    model,
    run,
    recordedAt: '2026-10-26T00:00:00.000Z',
    promptHash: HASH,
    settings: { effort: 'medium', maxTokens: 16000, cacheTtl: '5m' },
    preChecks: [
      { name: 'structured_outputs', passed: true, detail: 'accepted' },
      { name: 'browser_access', passed: true, detail: 'accepted' },
      { name: 'cache_read', passed: true, detail: 'read' },
      { name: 'cache_1h', passed: true, detail: 'written' },
    ],
    cases: replies.map(({ n, bodies, latencyMs }) => ({
      n,
      input: caseNumber(n).input,
      fetches: bodies.map((body) => ({
        status: 200,
        body,
        latencyMs: latencyMs ?? 3000,
      })),
      latencyMs: latencyMs ?? 3000,
    })),
  };
}

async function replies(
  recording: Recording,
  cases = ALL_CASES,
): Promise<ReplayedReply[]> {
  return replayRecording(recording, cases);
}

describe('normalising renderings', () => {
  it('ignores case, spacing, final punctuation and apostrophe style', () => {
    expect(normaliseRendering('Ja  no ho faig.')).toBe('ja no ho faig');
    expect(normaliseRendering('ja no ho faig')).toBe('ja no ho faig');
    expect(normaliseRendering('Hi vas demà?')).toBe('hi vas demà');
    expect(normaliseRendering('L’home ha arribat !')).toBe("l'home ha arribat");
  });

  it('keeps what changes the Catalan', () => {
    expect(normaliseRendering('Ja no el faig.')).not.toBe(
      normaliseRendering('Ja no ho faig.'),
    );
    expect(normaliseRendering('col·lecció')).toBe('col·lecció');
  });
});

describe('stable rendering IDs', () => {
  it('counts a, b, ..., z, aa, ab', () => {
    expect([0, 1, 25, 26, 27].map(letters)).toEqual(['a', 'b', 'z', 'aa', 'ab']);
  });

  it('deduplicates across models and assigns letters alphabetically, not by model', async () => {
    const opus = recordingOf('claude-opus-5-5', 1, [
      {
        n: 12,
        bodies: [
          envelope(
            reply('Ja no el faig.', [
              { text: 'Ja no', role: 'negation', ids: ['NEG.aspecte.ja_no'] },
              { text: 'el faig', role: 'verb', ids: [], unlinked: 'no_notion' },
            ]),
          ),
        ],
      },
    ]);
    const haiku = recordingOf('claude-haiku-5-5', 1, [
      { n: 12, bodies: [envelope(JA_NO_HO_FAIG)] },
    ]);
    const sonnet = recordingOf('claude-sonnet-5-5', 1, [
      {
        n: 12,
        bodies: [
          envelope(
            reply('ja no ho faig', [
              { text: 'ja no', role: 'negation', ids: ['NEG.aspecte.ja_no'] },
              { text: 'ho', role: 'clitic', ids: ['PRON.feble.ho'] },
              { text: 'faig', role: 'verb', ids: [], unlinked: 'no_notion' },
            ]),
          ),
        ],
      },
    ]);
    const all = [
      ...(await replies(opus)),
      ...(await replies(haiku)),
      ...(await replies(sonnet)),
    ];
    const [registered] = registerRenderings([CASE_12], all);
    expect(registered?.renderings).toEqual([
      { id: '12-a', key: 'ja no el faig', ca: 'Ja no el faig.', verdict: null },
      { id: '12-b', key: 'ja no ho faig', ca: 'Ja no ho faig.', verdict: null },
    ]);
  });

  it('keeps existing IDs and continues the letters in a later round', async () => {
    const round1 = {
      ...CASE_12,
      renderings: [
        {
          id: '12-a',
          key: 'ja no ho faig',
          ca: 'Ja no ho faig.',
          verdict: 'naturel' as const,
        },
      ],
    };
    const later = recordingOf('claude-opus-5-5', 2, [
      {
        n: 12,
        bodies: [
          envelope(
            reply('Ja no ho faig més.', [
              { text: 'Ja no', role: 'negation', ids: ['NEG.aspecte.ja_no'] },
              { text: 'ho', role: 'clitic', ids: ['PRON.feble.ho'] },
              { text: 'faig més', role: 'verb', ids: [], unlinked: 'no_notion' },
            ]),
          ),
        ],
      },
    ]);
    const again = recordingOf('claude-opus-5-5', 3, [
      { n: 12, bodies: [envelope(JA_NO_HO_FAIG)] },
    ]);
    const [registered] = registerRenderings(
      [round1],
      [...(await replies(later, [round1])), ...(await replies(again, [round1]))],
    );
    expect(registered?.renderings.map((r) => [r.id, r.key, r.verdict])).toEqual([
      ['12-a', 'ja no ho faig', 'naturel'],
      ['12-b', 'ja no ho faig més', null],
    ]);
  });

  it('adds nothing for a reply that failed the hard checks', async () => {
    const broken = envelope(
      reply('Ja no ho faig.', [
        { text: 'Mai', role: 'negation', ids: ['NEG.aspecte.ja_no'] },
      ]),
    );
    const recording = recordingOf('claude-haiku-5-5', 1, [
      { n: 12, bodies: [broken, broken] },
    ]);
    const replayed = await replies(recording);
    expect(replayed[0]?.result.status).toBe('analysis_failed');
    expect(registerRenderings([CASE_12], replayed)[0]?.renderings).toEqual([]);
  });
});

describe('the review sheet', () => {
  const judged: GoldenCase = {
    ...CASE_12,
    renderings: [
      { id: '12-a', key: 'ja no el faig', ca: 'Ja no el faig.', verdict: 'faux' },
      { id: '12-b', key: 'ja no ho faig', ca: 'Ja no ho faig.', verdict: null },
    ],
  };
  const sheet = buildSheet([judged], 2);

  it('lists only renderings without a verdict, under their French sentence', () => {
    expect(sheet).toContain('# Relecture des traductions, série 2');
    expect(sheet).toContain('Je ne le fais plus.');
    expect(sheet).toContain('| 12-b | Ja no ho faig. | |');
    expect(sheet).not.toContain('12-a');
  });

  it('names no model', () => {
    expect(sheet).not.toMatch(/claude|haiku|sonnet|opus/i);
  });

  it('follows French typography in its instructions', () => {
    const instructions = sheet.split('\n## ')[0] ?? '';
    expect(instructions).toContain(`${NNBSP}:`);
    expect(highPunctuationOffenders(instructions)).toEqual([]);
    expect(instructions).not.toContain("'");
    expect(sheet).not.toContain('—');
  });

  it('gives Sean a template with every open reference and nothing else', () => {
    expect(verdictTemplate([judged])).toEqual({ '12-b': null });
  });
});

describe('writing verdicts back', () => {
  const open: GoldenCase = {
    ...CASE_12,
    renderings: [
      { id: '12-a', key: 'ja no el faig', ca: 'Ja no el faig.', verdict: 'faux' },
      { id: '12-b', key: 'ja no ho faig', ca: 'Ja no ho faig.', verdict: null },
    ],
  };

  it('writes a verdict and skips the blanks', () => {
    const { cases, applied } = applyVerdicts([open], { '12-b': 'naturel' });
    expect(applied).toBe(1);
    expect(cases[0]?.renderings[1]?.verdict).toBe('naturel');
    expect(applyVerdicts([open], { '12-b': null }).applied).toBe(0);
  });

  it('refuses the whole file on an unknown reference, an unknown verdict or a changed verdict', () => {
    expect(() => applyVerdicts([open], { '12-z': 'naturel' })).toThrow(
      /no such rendering/,
    );
    expect(() => applyVerdicts([open], { '12-b': 'bien' })).toThrow(/is not one of/);
    expect(() => applyVerdicts([open], { '12-a': 'naturel' })).toThrow(
      /already judged/,
    );
    expect(applyVerdicts([open], { '12-a': 'faux' }).applied).toBe(0);
  });
});

describe('scoring', () => {
  const judged12: GoldenCase = {
    ...CASE_12,
    renderings: [
      { id: '12-a', key: 'ja no ho faig', ca: 'Ja no ho faig.', verdict: 'naturel' },
    ],
  };

  it('counts valid replies, verdicts and required IDs on accepted replies only', async () => {
    const recording = recordingOf('claude-haiku-5-5', 1, [
      { n: 12, bodies: [envelope(JA_NO_HO_FAIG)] },
    ]);
    const score = scoreModel(
      'claude-haiku-5-5',
      [recording],
      await replies(recording, [judged12]),
      HASH,
    );
    expect(score.valid).toBe(1);
    expect(score.naturel).toBe(1);
    expect([score.requiredMet, score.requiredTotal]).toEqual([2, 2]);
    expect(score.floors).toMatchObject({
      valid: 'pass',
      accepted: 'pass',
      required: 'pass',
    });
  });

  it('holds the Catalan floor pending until every rendering is judged', async () => {
    const recording = recordingOf('claude-haiku-5-5', 1, [
      { n: 12, bodies: [envelope(JA_NO_HO_FAIG)] },
    ]);
    const score = scoreModel(
      'claude-haiku-5-5',
      [recording],
      await replies(recording, [CASE_12]),
      HASH,
    );
    expect(score.pending).toBe(1);
    expect(score.floors.accepted).toBe('pending');
    expect(score.floors.required).toBe('pending');
  });

  it('counts a must-not-link ID and a fully linked idiom as padding', async () => {
    const padded = reply('Ja no el faig.', [
      { text: 'Ja no', role: 'negation', ids: ['NEG.aspecte.ja_no'] },
      { text: 'el faig', role: 'verb', ids: ['PRON.feble.cd_3a'] },
    ]);
    const forced = reply('Em fa mandra anar-hi.', [
      { text: 'Em fa mandra', role: 'verb', ids: ['VERB.ser_estar'] },
      { text: 'anar-hi', role: 'verb', ids: ['PRON.feble.hi'] },
    ]);
    const recording = recordingOf('claude-haiku-5-5', 1, [
      { n: 12, bodies: [envelope(padded)] },
      { n: 29, bodies: [envelope(forced)] },
    ]);
    const score = scoreModel(
      'claude-haiku-5-5',
      [recording],
      await replies(recording, [CASE_12, CASE_29]),
      HASH,
    );
    expect(score.links).toBe(4);
    expect(score.padded).toBe(2);
    expect(score.floors.padded).toBe('fail');
    expect(score.paddedDetail.join('\n')).toContain('PRON.feble.cd_3a');
    expect(score.paddedDetail.join('\n')).toContain('no chunk left unlinked');
  });

  it('fails the valid floor on analysis_failed, after exactly two recorded calls', async () => {
    const broken = envelope(
      reply('Ja no ho faig.', [
        { text: 'Mai', role: 'negation', ids: [], unlinked: 'no_notion' },
      ]),
    );
    const recording = recordingOf('claude-haiku-5-5', 1, [
      { n: 12, bodies: [broken, broken] },
    ]);
    const score = scoreModel(
      'claude-haiku-5-5',
      [recording],
      await replies(recording, [CASE_12]),
      HASH,
    );
    expect(score.analysisFailed).toBe(1);
    expect(score.floors.valid).toBe('fail');
  });

  it('fails a case judged « faux » in two runs, whatever the share', async () => {
    const faux12: GoldenCase = {
      ...CASE_12,
      renderings: [
        { id: '12-a', key: 'ja no ho faig', ca: 'Ja no ho faig.', verdict: 'faux' },
      ],
    };
    const runs = [1, 2].map((run) =>
      recordingOf('claude-opus-5-5', run, [
        { n: 12, bodies: [envelope(JA_NO_HO_FAIG)] },
      ]),
    );
    const replayed = [
      ...(await replies(runs[0] as Recording, [faux12])),
      ...(await replies(runs[1] as Recording, [faux12])),
    ];
    const score = scoreModel('claude-opus-5-5', runs, replayed, HASH);
    expect(score.fauxCases).toEqual([12]);
    expect(score.floors.accepted).toBe('fail');
  });

  it('takes the warm 90th percentile from recorded latency, and flags another prompt', async () => {
    const recording = {
      ...recordingOf('claude-haiku-5-5', 1, [
        { n: 12, bodies: [envelope(JA_NO_HO_FAIG)], latencyMs: 9000 },
      ]),
      promptHash: 'older',
    };
    const score = scoreModel(
      'claude-haiku-5-5',
      [recording],
      await replies(recording, [judged12]),
      HASH,
    );
    expect(score.warmP90Ms).toBe(9000);
    expect(score.floors.latency).toBe('fail');
    expect(score.staleRuns).toEqual([1]);
    expect(renderReport([score])).toContain('recorded under another prompt');
  });

  it('uses nearest-rank percentiles', () => {
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9)).toBe(9);
    expect(percentile([5], 0.9)).toBe(5);
    expect(percentile([], 0.9)).toBeNull();
  });

  it('prices warm and cold replies as the spec estimates them', () => {
    const tokens = { input: 40, output: 400, cacheWrite: 0, cacheRead: 18300 };
    // Spec, « Candidates and cost per sentence »: Haiku 5.5 $0.0004 warm, $0.0025 cold.
    expect(costOf('claude-haiku-5-5', tokens, '5m')).toBeCloseTo(0.0004, 4);
    expect(costOf('claude-haiku-5-5', asCold(tokens), '5m')).toBeCloseTo(0.0025, 4);
    expect(costOf('claude-opus-5-5', tokens, '5m')).toBeCloseTo(0.012, 3);
    expect(costOf('claude-haiku-5-5', asCold(tokens), '1h')).toBeGreaterThan(
      costOf('claude-haiku-5-5', asCold(tokens), '5m'),
    );
  });
});

describe('the recorder, against a stubbed API', () => {
  /**
   * Plays the API: probes answer per `probes`, sentences answer with a valid
   * reply. The first probe writes the cache and the second reads it.
   */
  function stubApi(
    probes: { status: number; read: number }[] = [
      { status: 200, read: 0 },
      { status: 200, read: 18300 },
    ],
  ): { fetchFn: typeof fetch; headers: Record<string, string>[] } {
    const queue = [...probes];
    const headers: Record<string, string>[] = [];
    const fetchFn = (async (_url: string, init: RequestInit) => {
      headers.push(init.headers as Record<string, string>);
      const body = JSON.parse(String(init.body)) as { messages: { content: string }[] };
      const text = (value: unknown) => Promise.resolve(JSON.stringify(value));
      if (body.messages[0]?.content === PROBE_SENTENCE) {
        const probe = queue.shift() ?? { status: 200, read: 18300 };
        const usage = {
          cache_read_input_tokens: probe.read,
          cache_creation: { ephemeral_1h_input_tokens: probe.read === 0 ? 18300 : 0 },
        };
        return {
          ok: probe.status === 200,
          status: probe.status,
          text: () => text(envelope(JA_NO_HO_FAIG, usage)),
        };
      }
      return { ok: true, status: 200, text: () => text(envelope(JA_NO_HO_FAIG)) };
    }) as unknown as typeof fetch;
    return { fetchFn, headers };
  }

  it('passes the pre-checks, with the browser header only on the second probe', async () => {
    const { fetchFn, headers } = stubApi();
    const checks = await runPreChecks(fetchFn, API_KEY, 'claude-haiku-5-5');
    expect(checks.map((check) => [check.name, check.passed])).toEqual([
      ['structured_outputs', true],
      ['browser_access', true],
      ['cache_read', true],
      ['cache_1h', true],
    ]);
    expect(headers[0]).not.toHaveProperty('anthropic-dangerous-direct-browser-access');
    expect(headers[1]?.['anthropic-dangerous-direct-browser-access']).toBe('true');
  });

  it('drops a model on a failed pre-check and records no case', async () => {
    const { fetchFn } = stubApi([
      { status: 200, read: 0 },
      { status: 200, read: 0 },
    ]);
    const recording = await recordRun(ALL_CASES, {
      model: 'claude-haiku-5-5',
      apiKey: API_KEY,
      run: 1,
      promptHash: HASH,
      fetchFn,
    });
    expect(recording.dropped).toBe('cache_read');
    expect(recording.cases).toEqual([]);
  });

  it('records all 30 cases, holds no key, and replays to what it recorded', async () => {
    const { fetchFn } = stubApi();
    const recording = await recordRun(ALL_CASES, {
      model: 'claude-haiku-5-5',
      apiKey: API_KEY,
      run: 1,
      promptHash: HASH,
      fetchFn,
    });
    expect(recording.dropped).toBeUndefined();
    expect(recording.cases.map((recorded) => recorded.n)).toEqual(
      ALL_CASES.map((g) => g.n),
    );
    expect(recording.settings).toEqual({
      effort: 'medium',
      maxTokens: 16000,
      cacheTtl: '5m',
    });
    expect(JSON.stringify(recording)).not.toContain(API_KEY);

    const replayed = await replayRecording(recording, ALL_CASES);
    expect(replayed.every((r) => r.result.status === 'ok')).toBe(true);
  });

  it('records the retry as a second fetch, so replay makes the same two calls', async () => {
    let sentences = 0;
    const inner = stubApi().fetchFn;
    const fetchFn = (async (url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { messages: { content: string }[] };
      if (body.messages[0]?.content !== PROBE_SENTENCE && sentences++ === 0) {
        return {
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify(envelope('not json'))),
        };
      }
      return inner(url, init);
    }) as unknown as typeof fetch;
    const recording = await recordRun([CASE_12], {
      model: 'claude-haiku-5-5',
      apiKey: API_KEY,
      run: 1,
      promptHash: HASH,
      fetchFn,
    });
    expect(recording.cases[0]?.fetches).toHaveLength(2);
    const [replayed] = await replayRecording(recording, [CASE_12]);
    expect(replayed?.result.status).toBe('ok');
  });

  it('fails loudly when a recording no longer matches the client', async () => {
    const recording = recordingOf('claude-haiku-5-5', 1, [
      { n: 12, bodies: [envelope(JA_NO_HO_FAIG), envelope(JA_NO_HO_FAIG)] },
    ]);
    await expect(replayRecording(recording, [CASE_12])).rejects.toThrow(
      /fewer requests/,
    );
  });
});
