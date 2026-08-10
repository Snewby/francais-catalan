/**
 * The golden set: recorded replies, replayed offline.
 *
 * `.claude/commands/eval.md` and the `prompt-eval` agent have pointed at
 * fixtures in `test/fixtures/` since phase 0, and there were none, so `/eval`
 * was a command that looked like it worked and silently did not. This is what
 * they were pointing at.
 *
 * WHAT IS ASSERTED AND WHAT IS NOT. Everything here is structural: the schema,
 * the closed vocabulary, the direction, the gate, the presence of the
 * components a case is about. **The French prose is never asserted.** It varies
 * between runs and asserting on it produces noise rather than signal, which is
 * the agent's contract and is also the honest position: whether an explanation
 * is TRUE is not decidable here, it is decided by a reader, and each fixture
 * carries that reader's verdict as data rather than as a check.
 *
 * A fixture's `expect` block is therefore two different kinds of thing. The
 * mechanical fields are checked. `defects` is a record of what an outside review
 * found, carried so that a future reply can be compared against a known-bad one
 * rather than against nothing.
 */
import { callHaiku, type CallResult } from '../api/anthropic';
import { LEAF_IDS } from '../api/schema';
import { DIRECTIONS, type Direction } from '../srs/evidence';

export interface GoldenExpectation {
  readonly direction: Direction;
  /** Whether the decomposition survives the form-in-sentence gate. */
  readonly passesGate: boolean;
  readonly expectedUnverified?: readonly string[];
  /** The components this case exists to exercise. Not the whole decomposition. */
  readonly requiredComponents: readonly string[];
  readonly verdict: 'sound' | 'defective';
  /** How the verdict was established. An unverified case is not a passing one. */
  readonly establishedBy: 'outside-review' | 'internal' | 'unverified';
  readonly defects?: readonly string[];
  readonly improvedOn?: string;
  readonly soundOutput?: string;
  readonly soundDecomposition?: readonly string[];
}

export interface GoldenCase {
  readonly slug: string;
  readonly question: string;
  readonly recordedAt: string;
  readonly model: string;
  readonly risk: readonly string[];
  readonly usage: Readonly<Record<string, number>>;
  readonly response: Record<string, unknown>;
  readonly expect: GoldenExpectation;
}

/** One failed assertion, with the class of failure the report groups by. */
export interface Failure {
  readonly reason:
    | 'schema'
    | 'out-of-vocabulary'
    | 'direction'
    | 'gate'
    | 'missing-component'
    | 'answer-pair'
    | 'threw';
  readonly detail: string;
}

export interface CaseResult {
  readonly slug: string;
  readonly risk: readonly string[];
  readonly passed: boolean;
  readonly failures: readonly Failure[];
  /** Present unless the call threw. */
  readonly unverified?: readonly string[];
}

/**
 * A fetch that answers every call with the recorded reply.
 *
 * Every call, not one: `callHaiku` retries once when the gate rejects a
 * decomposition, and a stub with a queue of one would turn a gate failure into
 * a transport failure and report the wrong thing.
 */
export function replayFetch(fixture: GoldenCase): typeof fetch {
  const body = JSON.stringify({
    id: `msg_golden_${fixture.slug}`,
    type: 'message',
    role: 'assistant',
    model: fixture.model,
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: JSON.stringify(fixture.response) }],
    usage: fixture.usage,
  });

  return (() =>
    Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve(body),
    })) as unknown as typeof fetch;
}

const VOCABULARY = new Set<string>(LEAF_IDS);

function assess(fixture: GoldenCase, result: CallResult): Failure[] {
  const failures: Failure[] = [];
  const reply = result.decomposition;

  // Constrained decoding makes an out-of-vocabulary tag undecodable, so this
  // failing does not mean the model misbehaved: it means the committed schema
  // and the taxonomy have drifted apart. The agent's contract says to report it
  // that way, because the fix is a regeneration and not a prompt change.
  for (const entry of reply.decomposition) {
    if (!VOCABULARY.has(entry.id)) {
      failures.push({
        reason: 'out-of-vocabulary',
        detail: `${entry.id} is not in the generated LEAF_IDS`,
      });
    }
  }

  if (!DIRECTIONS.includes(reply.direction)) {
    failures.push({
      reason: 'direction',
      detail: `${reply.direction} is not a direction`,
    });
  } else if (reply.direction !== fixture.expect.direction) {
    // The recording is what it is: a case whose direction the model misread is
    // recorded with the direction it SHOULD have reported, so this fails until
    // the model gets it right. That is the point of a golden set.
    failures.push({
      reason: 'direction',
      detail: `reported ${reply.direction}, expected ${fixture.expect.direction}`,
    });
  }

  const gatePassed = result.unverified.length === 0;
  if (gatePassed !== fixture.expect.passesGate) {
    failures.push({
      reason: 'gate',
      detail: fixture.expect.passesGate
        ? `forms absent from answer_ca: ${result.unverified.join(', ')}`
        : 'expected the gate to reject this decomposition and it did not',
    });
  }

  // Only when the decomposition survived: a dropped analysis is empty by
  // design, and reporting every component as missing would bury the one
  // failure that matters.
  if (gatePassed) {
    // Widened to string: a fixture is read off disk, so its expected IDs are
    // strings until something checks them, and that check is a test of the
    // fixtures rather than an assumption made here.
    const present = new Set<string>(reply.decomposition.map((entry) => entry.id));
    for (const id of fixture.expect.requiredComponents) {
      if (!present.has(id)) {
        failures.push({ reason: 'missing-component', detail: id });
      }
    }
  }

  if (reply.answer_lang !== 'fr') {
    failures.push({ reason: 'schema', detail: `answer_lang is ${reply.answer_lang}` });
  }
  if (reply.answer_ca.trim() === '' || reply.answer_fr.trim() === '') {
    failures.push({ reason: 'answer-pair', detail: 'a half of the pair is empty' });
  }
  if (reply.answer_ca.trim() === reply.answer_fr.trim()) {
    // Not a language check, which is not decidable here. This catches the one
    // mechanical way the pair can be useless: the same string twice.
    failures.push({ reason: 'answer-pair', detail: 'both halves are the same string' });
  }

  return failures;
}

/** Replays one case. Never throws: a thrown call is a reported failure. */
export async function runCase(fixture: GoldenCase): Promise<CaseResult> {
  try {
    const result = await callHaiku({
      apiKey: 'golden-set-offline',
      question: fixture.question,
      evidence: 'lookup',
      fetchFn: replayFetch(fixture),
      now: () => 0,
    });
    const failures = assess(fixture, result);
    return {
      slug: fixture.slug,
      risk: fixture.risk,
      passed: failures.length === 0,
      failures,
      unverified: result.unverified,
    };
  } catch (error) {
    return {
      slug: fixture.slug,
      risk: fixture.risk,
      passed: false,
      failures: [
        {
          reason:
            error instanceof Error && /schema/i.test(error.message)
              ? 'schema'
              : 'threw',
          detail: error instanceof Error ? error.message : String(error),
        },
      ],
    };
  }
}

export async function runGoldenSet(
  fixtures: readonly GoldenCase[],
): Promise<CaseResult[]> {
  const results: CaseResult[] = [];
  for (const fixture of fixtures) results.push(await runCase(fixture));
  return results;
}

/** Pass counts per risk area, since a regression in one is worth more than its count. */
export function byRiskArea(
  results: readonly CaseResult[],
): Map<string, { passed: number; total: number }> {
  const areas = new Map<string, { passed: number; total: number }>();
  for (const result of results) {
    for (const area of result.risk) {
      const tally = areas.get(area) ?? { passed: 0, total: 0 };
      tally.total += 1;
      if (result.passed) tally.passed += 1;
      areas.set(area, tally);
    }
  }
  return areas;
}
