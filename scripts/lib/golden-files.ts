/**
 * Where golden set v2 lives on disk, and reading and writing it.
 *
 *   test/fixtures/golden-v2/cases/NN-slug.json             the 30 approved cases
 *   test/fixtures/golden-v2/recordings/<model>/run-K.json  one run each
 *   test/fixtures/golden-v2/review/                        sheets and verdict files
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import prettier from 'prettier';
import type { GoldenCase, Recording } from '../../src/eval/golden';

const projectDir = process.env['CLAUDE_PROJECT_DIR'] ?? process.cwd();
export const GOLDEN_DIR = path.join(projectDir, 'test/fixtures/golden-v2');
export const CASES_DIR = path.join(GOLDEN_DIR, 'cases');
export const RECORDINGS_DIR = path.join(GOLDEN_DIR, 'recordings');
export const REVIEW_DIR = path.join(GOLDEN_DIR, 'review');

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

/**
 * Formatted as the repo formats its files, so a write leaves a reviewable diff
 * and a generated file passes format:check.
 */
export async function writeFormatted(
  file: string,
  text: string,
  parser: 'json' | 'markdown',
): Promise<void> {
  mkdirSync(path.dirname(file), { recursive: true });
  const options = await prettier.resolveConfig(file);
  writeFileSync(file, await prettier.format(text, { ...options, parser }), 'utf8');
}

export async function writeJson(file: string, value: unknown): Promise<void> {
  await writeFormatted(file, JSON.stringify(value), 'json');
}

function caseFiles(): string[] {
  return readdirSync(CASES_DIR)
    .filter((name) => name.endsWith('.json'))
    .sort();
}

export function loadCases(): GoldenCase[] {
  return caseFiles().map((name) => readJson<GoldenCase>(path.join(CASES_DIR, name)));
}

export async function saveCases(cases: readonly GoldenCase[]): Promise<void> {
  for (const name of caseFiles()) {
    const n = Number(name.slice(0, 2));
    const golden = cases.find((candidate) => candidate.n === n);
    if (golden !== undefined) await writeJson(path.join(CASES_DIR, name), golden);
  }
}

export function loadRecordings(): Recording[] {
  if (!existsSync(RECORDINGS_DIR)) return [];
  return readdirSync(RECORDINGS_DIR)
    .sort()
    .flatMap((model) =>
      readdirSync(path.join(RECORDINGS_DIR, model))
        .filter((name) => /^run-\d+\.json$/.test(name))
        .map((name) => readJson<Recording>(path.join(RECORDINGS_DIR, model, name))),
    )
    .sort((a, b) => a.model.localeCompare(b.model) || a.run - b.run);
}

export function recordingPath(model: string, run: number): string {
  return path.join(RECORDINGS_DIR, model, `run-${String(run)}.json`);
}

/** The next run number for `model`, so round 2 adds runs rather than replacing. */
export function nextRun(model: string): number {
  const runs = loadRecordings()
    .filter((recording) => recording.model === model)
    .map((recording) => recording.run);
  return runs.length === 0 ? 1 : Math.max(...runs) + 1;
}

/** `--name value` from argv, or undefined. */
export function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}
