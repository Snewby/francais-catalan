/**
 * The golden-set report.
 *
 *   npm run eval              replay and report
 *   npm run eval -- --baseline   rewrite the committed baseline
 *
 * Offline always. There is no live path here and no env flag that adds one: a
 * recorded reply is the whole point, and an eval that can quietly cost money is
 * an eval nobody runs.
 *
 * Rewriting the baseline is a separate flag and a separate commit on purpose.
 * `.claude/commands/eval.md` says not to adjust the golden set to make the eval
 * pass, and the only thing that makes that rule real is that changing the
 * expected result is a visible, reviewable act.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  byRiskArea,
  runGoldenSet,
  type CaseResult,
  type GoldenCase,
} from '../src/eval/golden';

const projectDir = process.env['CLAUDE_PROJECT_DIR'] ?? process.cwd();
const DIRECTORY = path.join(projectDir, 'test/fixtures/golden');
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

function readBaseline(): Record<string, BaselineEntry> | null {
  try {
    return JSON.parse(readFileSync(BASELINE, 'utf8')) as Record<string, BaselineEntry>;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const rewriting = process.argv.includes('--baseline');
  const fixtures = loadFixtures();
  const results = await runGoldenSet(fixtures);
  const summary = summarise(results);

  if (rewriting) {
    writeFileSync(BASELINE, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    console.log(`eval: baseline rewritten for ${String(results.length)} case(s).`);
    return;
  }

  const passed = results.filter((result) => result.passed).length;
  console.log(`eval: ${String(passed)}/${String(results.length)} cases pass.\n`);

  for (const result of results) {
    if (result.passed) continue;
    console.log(`FAIL ${result.slug}`);
    for (const failure of result.failures) {
      console.log(`  ${failure.reason}: ${failure.detail}`);
    }
  }

  console.log('\nBy risk area');
  for (const [area, tally] of [...byRiskArea(results)].sort()) {
    console.log(`  ${area}: ${String(tally.passed)}/${String(tally.total)}`);
  }

  // Regressions are reported separately from standing failures, because a case
  // that has always failed is a recorded defect and a case that has just
  // started failing is news.
  const baseline = readBaseline();
  if (baseline === null) {
    console.log('\nNo baseline committed; run with --baseline to write one.');
    return;
  }

  const regressions: string[] = [];
  const fixes: string[] = [];
  for (const [slug, entry] of Object.entries(summary)) {
    const before = baseline[slug];
    if (before === undefined) continue;
    if (before.passed && !entry.passed) regressions.push(slug);
    if (!before.passed && entry.passed) fixes.push(slug);
  }

  console.log('');
  console.log(
    regressions.length === 0
      ? 'No regressions against the baseline.'
      : `REGRESSIONS: ${regressions.join(', ')}`,
  );
  if (fixes.length > 0) {
    console.log(
      `Newly passing (decide whether this is right, then rerun with --baseline): ${fixes.join(', ')}`,
    );
  }

  process.exitCode = regressions.length === 0 ? 0 : 1;
}

await main();
