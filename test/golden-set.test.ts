import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  byRiskArea,
  runGoldenSet,
  type CaseResult,
  type GoldenCase,
} from '../src/eval/golden';
import { LEAF_IDS } from '../src/api/schema';

/**
 * The golden set, replayed offline.
 *
 * NO LIVE CALL, EVER, from this file. The replies are recordings and the whole
 * point of recording them is that measuring a prompt or taxonomy change costs
 * nothing and cannot vary with the weather.
 *
 * The baseline is committed, and this asserts the run against it. That makes a
 * CODE change that alters how a recorded reply is judged, a taxonomy rename
 * putting an ID out of vocabulary, a schema change, a gate change, into a
 * failing test naming the case. Updating the baseline is then a deliberate act
 * with a diff to review, which is the only thing standing between a golden set
 * and the temptation the command file warns about: adjusting the set until it
 * passes.
 */
const DIRECTORY = path.join(process.cwd(), 'test/fixtures/golden');
const BASELINE = path.join(DIRECTORY, 'baseline.json');

interface BaselineEntry {
  readonly passed: boolean;
  readonly reasons: readonly string[];
}

function loadFixtures(): GoldenCase[] {
  return readdirSync(DIRECTORY)
    .filter((name) => name.endsWith('.json') && name !== 'baseline.json')
    .sort()
    .map(
      (name) =>
        JSON.parse(readFileSync(path.join(DIRECTORY, name), 'utf8')) as GoldenCase,
    );
}

function summarise(results: readonly CaseResult[]): Record<string, BaselineEntry> {
  const summary: Record<string, BaselineEntry> = {};
  for (const result of results) {
    summary[result.slug] = {
      passed: result.passed,
      reasons: [...new Set(result.failures.map((failure) => failure.reason))].sort(),
    };
  }
  return summary;
}

const fixtures = loadFixtures();

describe('the golden set itself', () => {
  it('has cases, in both directions, spanning several risk areas', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(10);
    const directions = new Set(fixtures.map((fixture) => fixture.expect.direction));
    expect([...directions].sort()).toEqual(['ca_to_fr', 'fr_to_ca']);
    expect(
      new Set(fixtures.flatMap((fixture) => fixture.risk)).size,
    ).toBeGreaterThanOrEqual(5);
  });

  it('carries a human-checked verdict on every case, and says how it was reached', () => {
    // Recording a reply is not verifying it. A case whose verdict nobody
    // established is not evidence, and the field exists so that cannot be
    // forgotten once these stop being the ten somebody argued over.
    for (const fixture of fixtures) {
      expect(['sound', 'defective'], fixture.slug).toContain(fixture.expect.verdict);
      expect(['outside-review', 'internal', 'unverified'], fixture.slug).toContain(
        fixture.expect.establishedBy,
      );
      if (fixture.expect.verdict === 'defective') {
        expect(fixture.expect.defects?.length ?? 0, fixture.slug).toBeGreaterThan(0);
      }
    }
  });

  it('names only components the closed vocabulary has', () => {
    const vocabulary = new Set<string>(LEAF_IDS);
    for (const fixture of fixtures) {
      for (const id of fixture.expect.requiredComponents) {
        expect(vocabulary.has(id), `${fixture.slug}: ${id}`).toBe(true);
      }
    }
  });
});

describe('replaying it', () => {
  it('matches the committed baseline, case by case', async () => {
    const results = await runGoldenSet(fixtures);
    const baseline = JSON.parse(readFileSync(BASELINE, 'utf8')) as Record<
      string,
      BaselineEntry
    >;
    expect(summarise(results)).toEqual(baseline);
  });

  it('rejects every decomposition naming a form its own sentence lacks', async () => {
    // The gate, end to end, on real replies rather than on constructed ones.
    const results = await runGoldenSet(fixtures);
    const byName = new Map(results.map((result) => [result.slug, result]));

    for (const fixture of fixtures) {
      const result = byName.get(fixture.slug);
      const rejected = (result?.unverified?.length ?? 0) > 0;
      expect(rejected, fixture.slug).toBe(!fixture.expect.passesGate);
      for (const form of fixture.expect.expectedUnverified ?? []) {
        expect(result?.unverified, fixture.slug).toContain(form);
      }
    }
  });

  it('reports per risk area, because a regression in one is worth more', async () => {
    const areas = byRiskArea(await runGoldenSet(fixtures));
    expect(areas.get('padding')?.total ?? 0).toBeGreaterThan(0);
  });
});
