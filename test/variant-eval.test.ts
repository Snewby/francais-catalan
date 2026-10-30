import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ComponentId } from '../src/api/schema';
import type { GoldenCase } from '../src/eval/golden';
import {
  applyVariantVerdicts,
  buildCatalanSheet,
  buildFrenchSheet,
  describeChange,
  registerVariantLines,
  variantVerdictTemplates,
} from '../src/eval/variant-review';
import {
  VARIANT_FLOORS,
  renderVariantReport,
  scoreVariantModel,
  variantGateFailures,
} from '../src/eval/variant-score';
import {
  VARIANT_CANDIDATES,
  recordVariantRun,
  replayVariantRecording,
  variantCall,
  type ReplayedVariant,
  type VariantFixture,
  type VariantRecording,
} from '../src/eval/variants';
import type { VariantResult } from '../src/variants/client';
import { parseComboKey } from '../src/variants/combination';
import { recordedReply } from './helpers/recorded-replies';

const ROOT = path.resolve(__dirname, '..');
const CASES = path.join(ROOT, 'test/fixtures/variants-v1/cases');
const GOLDEN = path.join(ROOT, 'test/fixtures/golden-v2/cases');

const FIXTURES: VariantFixture[] = readdirSync(CASES)
  .sort()
  .map(
    (name) =>
      JSON.parse(readFileSync(path.join(CASES, name), 'utf8')) as VariantFixture,
  );
const GOLDEN_CASES: GoldenCase[] = readdirSync(GOLDEN).map(
  (name) => JSON.parse(readFileSync(path.join(GOLDEN, name), 'utf8')) as GoldenCase,
);

function fixture(n: number): VariantFixture {
  const found = FIXTURES.find((candidate) => candidate.n === n);
  if (found === undefined) throw new Error(`no fixture ${String(n)}`);
  return found;
}

function combination(id: string) {
  const n = Number(id.slice(0, -1));
  const found = fixture(n).combinations.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`no combination ${id}`);
  return { fixture: fixture(n), combination: found };
}

describe('the approved combination list (22 Oct)', () => {
  it('holds the ten rows, six combinations each, sixty in all', () => {
    expect(FIXTURES.map((f) => f.n)).toEqual([1, 2, 6, 9, 12, 16, 17, 19, 22, 28]);
    for (const f of FIXTURES) expect(f.combinations, String(f.n)).toHaveLength(6);
  });

  it('has exactly the three traps, with their expected reasons', () => {
    const traps = FIXTURES.flatMap((f) => f.combinations)
      .filter((c) => c.trap !== undefined)
      .map((c) => [c.id, c.trap]);
    expect(traps).toEqual([
      ['19b', 'aspect_incompatible'],
      ['22a', 'subordinate_affected'],
      ['28d', 'subordinate_affected'],
    ]);
  });

  it('writes every target as a full combination key, and the bases as approved', () => {
    for (const f of FIXTURES) {
      expect(() => parseComboKey(f.baseCombination)).not.toThrow();
      for (const c of f.combinations)
        expect(() => parseComboKey(c.target), c.id).not.toThrow();
    }
    expect(fixture(22).baseCombination).toBe('jo·-·none·0·0');
    expect(fixture(19).baseCombination).toBe('ella·present·none·0·0');
    expect(combination('1f').combination.target).toBe('nosaltres·ahir·haver·1·0');
    expect(combination('22e').combination.target).toBe('ells·-·none·0·1');
    expect(combination('28e').combination.target).toBe('jo·futur·none·0·0');
  });

  it('never repeats a combination within a row, nor asks for the base itself', () => {
    for (const f of FIXTURES) {
      const targets = f.combinations.map((c) => c.target);
      expect(new Set(targets).size, String(f.n)).toBe(6);
      expect(targets, String(f.n)).not.toContain(f.baseCombination);
    }
  });

  it('takes each base from the app model’s phase 1 reply, Opus run 1 (F3)', () => {
    for (const f of FIXTURES) {
      const reply = recordedReply(f.n);
      expect(f.base.ca, String(f.n)).toBe(reply.ca.replaceAll('’', "'"));
      expect(f.base.chunks.map((c) => c.text)).toEqual(
        reply.chunks.map((c) => c.text.replaceAll('’', "'")),
      );
      expect(f.input).toBe(GOLDEN_CASES.find((g) => g.n === f.n)?.input);
    }
  });

  it('starts with no rendering and no French line judged', () => {
    for (const c of FIXTURES.flatMap((f) => f.combinations)) {
      expect(c.renderings, c.id).toEqual([]);
      expect(c.frLines, c.id).toEqual([]);
    }
  });
});

describe('each combination’s request', () => {
  it('sends the time word from the table only where the base has a time chunk', () => {
    const word = (id: string) => {
      const { fixture: f, combination: c } = combination(id);
      return variantCall(f, c).request.timeWord;
    };
    expect(word('1a')).toBe('Avui');
    expect(word('1e')).toBe('drop');
    expect(word('1c')).toBeUndefined();
    expect(word('2a')).toBe('Ahir');
    expect(word('2f')).toBe('drop');
    expect(word('6c')).toBe('Demà');
    expect(word('6a')).toBeUndefined();
    expect(word('9b')).toBeUndefined();
  });

  it('holds row 22’s greyed tense as null', () => {
    const { fixture: f, combination: c } = combination('22b');
    expect(variantCall(f, c).request.target.tense).toBeNull();
  });
});

/** A fetch answering the phase 1 probes, then every variant with `answer`. */
function scriptedFetch(answer: (body: { system: unknown[] }) => unknown) {
  let calls = 0;
  const fetchFn = (async (_url: string, init: RequestInit) => {
    calls += 1;
    const body = JSON.parse(String(init.body)) as { system: unknown[] };
    const payload = body.system.length === 2 ? { fr: 'x', ca: 'x' } : answer(body);
    const text = JSON.stringify({
      content: [{ type: 'text', text: JSON.stringify(payload) }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 300, output_tokens: 200, cache_read_input_tokens: 24000 },
    });
    return { ok: true, status: 200, text: () => Promise.resolve(text) } as Response;
  }) as typeof fetch;
  return { fetchFn, calls: () => calls };
}

describe('recording and replay', () => {
  it('records every combination in table order and replays it offline to the same result', async () => {
    const { fetchFn, calls } = scriptedFetch(() => ({
      status: 'not_applicable',
      reason: 'other',
    }));
    let tick = 0;
    const recording = await recordVariantRun(FIXTURES, {
      model: 'claude-haiku-5-5',
      apiKey: 'test',
      run: 1,
      promptHash: 'hash',
      fetchFn,
      clock: () => (tick += 1500),
      now: () => new Date('2026-10-29T12:00:00Z'),
    });
    expect(recording.dropped).toBeUndefined();
    expect(recording.cases).toHaveLength(60);
    expect(recording.cases[0]?.combination).toBe('1a');
    expect(recording.cases.at(-1)?.combination).toBe('28f');
    expect(calls()).toBe(2 + 60);

    const replies = await replayVariantRecording(recording, FIXTURES);
    expect(replies).toHaveLength(60);
    expect(replies.every((r) => r.result.status === 'ok')).toBe(true);
  });

  it('refuses a recording made for another target', async () => {
    const recording: VariantRecording = {
      model: 'claude-haiku-5-5',
      run: 1,
      recordedAt: '',
      promptHash: 'hash',
      settings: { effort: 'medium', maxTokens: 16000, cacheTtl: '5m' },
      preChecks: [],
      cases: [
        {
          n: 1,
          combination: '1a',
          target: 'tu·avui·none·0·0',
          fetches: [],
          latencyMs: 0,
        },
      ],
    };
    await expect(replayVariantRecording(recording, FIXTURES)).rejects.toThrow(
      /another target/,
    );
  });

  it('compares the phase 1 winner with Haiku 5.5 only (D6)', () => {
    expect([...VARIANT_CANDIDATES].sort()).toEqual([
      'claude-haiku-5-5',
      'claude-opus-5-5',
    ]);
  });
});

/** A replayed reply with the given result, for scoring without a recording. */
function replied(
  id: string,
  run: number,
  result: VariantResult,
  latencyMs = 1500,
): ReplayedVariant {
  const { fixture: f, combination: c } = combination(id);
  return {
    model: 'm',
    run,
    fixture: f,
    combination: c,
    recorded: {
      n: f.n,
      combination: id,
      target: c.target,
      latencyMs,
      fetches: [
        {
          status: 200,
          latencyMs,
          body: {
            usage: {
              input_tokens: 300,
              output_tokens: 200,
              cache_read_input_tokens: 1,
            },
          },
        },
      ],
    },
    result,
  };
}

function variantResult(ca: string, fr: string, ids: ComponentId[] = []): VariantResult {
  return {
    status: 'ok',
    model: 'claude-haiku-5-5',
    attempts: [],
    variant: {
      status: 'ok',
      fr,
      phrase: {
        fr,
        ca,
        subject: { person: '1sg', expressed: false },
        assumptions: [],
        chunks: [{ text: ca, role: 'verb', ids, start: 0, end: ca.length }],
      },
    },
  };
}

const notApplicable = (reason: 'other' | 'subordinate_affected'): VariantResult => ({
  status: 'ok',
  model: 'claude-haiku-5-5',
  attempts: [],
  variant: { status: 'not_applicable', reason },
});

const NONE = new Map<number, readonly ComponentId[]>();

describe('scoring', () => {
  it('leaves the judged floors pending until the verdicts are in, then passes', () => {
    const replies = [
      replied(
        '1a',
        1,
        variantResult('Avui he comprat el pa.', 'Aujourd’hui j’ai acheté le pain.'),
      ),
    ];
    const pending = scoreVariantModel('claude-haiku-5-5', [], replies, 'h', NONE);
    expect(pending.floors.catalan).toBe('pending');
    expect(pending.floors.french).toBe('pending');

    const judged = applyVariantVerdicts(registerVariantLines(FIXTURES, replies), {
      '1a-a': 'naturel',
      '1a-fr-a': 'fidele',
    }).fixtures;
    const again = [{ ...replies[0]!, combination: judged[0]!.combinations[0]! }];
    const score = scoreVariantModel('claude-haiku-5-5', [], again, 'h', NONE);
    expect(score.floors.catalan).toBe('pass');
    expect(score.floors.french).toBe('pass');
    expect(score.naturel).toBe(1);
  });

  it('fails Catalan on a combination « faux » in two runs, whatever the share', () => {
    const base = replied('1a', 1, variantResult('Avui compro pa.', 'x'));
    const judged = applyVariantVerdicts(registerVariantLines(FIXTURES, [base]), {
      '1a-a': 'faux',
    }).fixtures;
    const c = judged[0]!.combinations[0]!;
    const replies = [1, 2].map((run) => ({
      ...replied('1a', run, base.result),
      combination: c,
    }));
    const score = scoreVariantModel('claude-haiku-5-5', [], replies, 'h', NONE);
    expect(score.fauxCombinations).toEqual(['1a']);
    expect(score.floors.catalan).toBe('fail');
  });

  it('passes a trap answered not_applicable in two of three runs, and fails it in two misses', () => {
    const hit = replied('22a', 1, notApplicable('subordinate_affected'));
    const hit2 = replied('22a', 2, notApplicable('other'));
    const miss = replied('22a', 3, variantResult('Vols que vinguis.', 'x'));
    const pass = scoreVariantModel(
      'claude-haiku-5-5',
      [],
      [hit, hit2, miss],
      'h',
      NONE,
    );
    expect(pass.traps[0]).toMatchObject({
      notApplicable: 2,
      expectedReason: 1,
      status: 'pass',
    });

    const fail = scoreVariantModel(
      'claude-haiku-5-5',
      [],
      [hit, replied('22a', 2, variantResult('Vols que vinguis.', 'x')), miss],
      'h',
      NONE,
    );
    expect(fail.traps[0]?.status).toBe('fail');
    expect(fail.floors.traps).toBe('fail');
  });

  it('caps not_applicable outside the traps at 3%', () => {
    const replies = [replied('1a', 1, notApplicable('other'))];
    const score = scoreVariantModel('claude-haiku-5-5', [], replies, 'h', NONE);
    expect(score.unexpectedNa).toBe(1);
    expect(score.floors.unexpectedNa).toBe('fail');
  });

  it('counts a reply that failed twice against validity', () => {
    const unavailable: VariantResult = {
      status: 'unavailable',
      errors: ['x'],
      model: 'm',
      attempts: [],
    };
    expect(
      scoreVariantModel(
        'claude-haiku-5-5',
        [],
        [replied('1a', 1, unavailable)],
        'h',
        NONE,
      ).floors.valid,
    ).toBe('fail');
  });

  it('counts padding against the row’s golden-set must-not-link IDs', () => {
    const forbidden = new Map<number, readonly ComponentId[]>([
      [1, ['VERB.mod.deure']],
    ]);
    const replies = [
      replied(
        '1a',
        1,
        variantResult('x', 'y', ['VERB.mod.deure', 'VERB.perf.present']),
      ),
    ];
    const score = scoreVariantModel('claude-haiku-5-5', [], replies, 'h', forbidden);
    expect([score.padded, score.links]).toEqual([1, 2]);
    expect(score.floors.padded).toBe('fail');
  });

  it('measures warm latency against the 8 s floor and the 2 s target', () => {
    const fast = [replied('1a', 1, notApplicable('other'), 1800)];
    expect(
      scoreVariantModel('claude-haiku-5-5', [], fast, 'h', NONE).latencyTargetMet,
    ).toBe(true);
    const slow = [replied('1a', 1, notApplicable('other'), 4300)];
    const score = scoreVariantModel('claude-haiku-5-5', [], slow, 'h', NONE);
    expect(score.latencyTargetMet).toBe(false);
    expect(score.floors.latency).toBe('pass');
    expect(VARIANT_FLOORS.warmP90MsTarget).toBe(2000);
  });

  it('gates on stale prompts and on a short run count', () => {
    const recording = {
      model: 'm',
      run: 1,
      promptHash: 'old',
      preChecks: [],
      cases: [],
    } as unknown as VariantRecording;
    const score = scoreVariantModel('claude-haiku-5-5', [recording], [], 'new', NONE);
    const failures = variantGateFailures(score, FIXTURES);
    expect(failures).toContain('prompt changed since runs 1');
    expect(failures).toContain('0 replies, not 180');
    expect(variantGateFailures(undefined, FIXTURES)).toEqual(['no recordings']);
  });

  it('reports every floor, the 2 s target and the three costs', () => {
    const report = renderVariantReport([
      scoreVariantModel(
        'claude-haiku-5-5',
        [],
        [replied('1a', 1, notApplicable('other'))],
        'h',
        NONE,
      ),
    ]);
    for (const line of [
      'Valid after the one retry',
      'Catalan accepted',
      'French line « fidèle »',
      'not_applicable on every trap',
      'not_applicable where not expected',
      'Padded links',
      'at most 8 s',
      '2 s target',
      'Cost per tap, warm',
      'cold, 5-minute cache',
      'cold, 1-hour cache',
    ]) {
      expect(report).toContain(line);
    }
  });
});

describe('the review sheets', () => {
  const opus = {
    ...replied('1a', 1, variantResult('Avui he comprat el pa.', 'Ligne B.')),
    model: 'claude-opus-5-5',
  };
  const haiku = {
    ...replied('1a', 1, variantResult('avui he comprat el pa', 'Ligne A.')),
    model: 'claude-haiku-5-5',
  };
  const na = replied('22a', 1, notApplicable('subordinate_affected'));
  const registered = registerVariantLines(FIXTURES, [opus, haiku, na]);
  const c1a = registered[0]!.combinations[0]!;

  it('deduplicates renderings across models and gives French lines their own IDs', () => {
    expect(c1a.renderings.map((line) => line.id)).toEqual(['1a-a']);
    expect(c1a.frLines.map((line) => [line.id, line.fr])).toEqual([
      ['1a-fr-a', 'Ligne A.'],
      ['1a-fr-b', 'Ligne B.'],
    ]);
  });

  it('adds nothing for a not_applicable reply', () => {
    const row22 = registered.find((f) => f.n === 22)!;
    expect(row22.combinations[0]?.renderings).toEqual([]);
  });

  it('keeps model names off both sheets and describes the change asked for', () => {
    const catalan = buildCatalanSheet(registered, 1);
    const french = buildFrenchSheet(registered, [opus, haiku, na], 1);
    for (const sheet of [catalan, french]) {
      expect(sheet).not.toMatch(/opus|haiku|claude/i);
      expect(sheet).toContain('1a.');
    }
    expect(catalan).toContain('| 1a-a | Avui he comprat el pa. | |');
    expect(french).toContain('Ligne A.');
    expect(describeChange(fixture(1), combination('1c').combination)).toBe(
      'Qui : ella',
    );
    expect(describeChange(fixture(1), combination('1d').combination)).toBe(
      'Quand : Futur, à la négation',
    );
    expect(describeChange(fixture(1), combination('1b').combination)).toBe(
      'Quand : Passé « avui », pronom à la place de « el pa »',
    );
  });

  it('templates every open line, Catalan and French apart', () => {
    const templates = variantVerdictTemplates(registered);
    expect(templates.catalan).toEqual({ '1a-a': null });
    expect(Object.keys(templates.french)).toEqual(['1a-fr-a', '1a-fr-b']);
  });

  it('refuses a verdict from the wrong scale, an unknown line or a changed verdict', () => {
    expect(() => applyVariantVerdicts(registered, { '1a-a': 'fidele' })).toThrow(
      /not one of/,
    );
    expect(() => applyVariantVerdicts(registered, { '1a-fr-a': 'naturel' })).toThrow(
      /not one of/,
    );
    expect(() => applyVariantVerdicts(registered, { '9z-a': 'naturel' })).toThrow(
      /no such line/,
    );
    const judged = applyVariantVerdicts(registered, { '1a-a': 'naturel' }).fixtures;
    expect(() => applyVariantVerdicts(judged, { '1a-a': 'faux' })).toThrow(
      /already judged/,
    );
    expect(
      applyVariantVerdicts(judged, { '1a-a': 'naturel', '1a-fr-a': null }).applied,
    ).toBe(0);
  });
});
