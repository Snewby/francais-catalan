/**
 * Where the variant eval lives on disk, and reading and writing it.
 *
 *   test/fixtures/variants-v1/cases/NN-slug.json             the ten approved rows
 *   test/fixtures/variants-v1/recordings/<model>/run-K.json  one run each
 *   test/fixtures/variants-v1/review/                        sheets and verdict files
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type { VariantFixture, VariantRecording } from '../../src/eval/variants';
import { writeJson } from './golden-files';

const projectDir = process.env['CLAUDE_PROJECT_DIR'] ?? process.cwd();
export const VARIANTS_DIR = path.join(projectDir, 'test/fixtures/variants-v1');
export const VARIANT_CASES_DIR = path.join(VARIANTS_DIR, 'cases');
export const VARIANT_RECORDINGS_DIR = path.join(VARIANTS_DIR, 'recordings');
export const VARIANT_REVIEW_DIR = path.join(VARIANTS_DIR, 'review');

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

function fixtureFiles(): string[] {
  return readdirSync(VARIANT_CASES_DIR)
    .filter((name) => name.endsWith('.json'))
    .sort();
}

export function loadVariantFixtures(): VariantFixture[] {
  return fixtureFiles().map((name) =>
    readJson<VariantFixture>(path.join(VARIANT_CASES_DIR, name)),
  );
}

export async function saveVariantFixtures(
  fixtures: readonly VariantFixture[],
): Promise<void> {
  for (const name of fixtureFiles()) {
    const n = Number(name.slice(0, 2));
    const fixture = fixtures.find((candidate) => candidate.n === n);
    if (fixture !== undefined)
      await writeJson(path.join(VARIANT_CASES_DIR, name), fixture);
  }
}

export function loadVariantRecordings(): VariantRecording[] {
  if (!existsSync(VARIANT_RECORDINGS_DIR)) return [];
  return readdirSync(VARIANT_RECORDINGS_DIR)
    .sort()
    .flatMap((model) =>
      readdirSync(path.join(VARIANT_RECORDINGS_DIR, model))
        .filter((name) => /^run-\d+\.json$/.test(name))
        .map((name) =>
          readJson<VariantRecording>(path.join(VARIANT_RECORDINGS_DIR, model, name)),
        ),
    )
    .sort((a, b) => a.model.localeCompare(b.model) || a.run - b.run);
}

export function variantRecordingPath(model: string, run: number): string {
  return path.join(VARIANT_RECORDINGS_DIR, model, `run-${String(run)}.json`);
}

/** The next run number for `model`, so round 2 adds runs rather than replacing. */
export function nextVariantRun(model: string): number {
  const runs = loadVariantRecordings()
    .filter((recording) => recording.model === model)
    .map((recording) => recording.run);
  return runs.length === 0 ? 1 : Math.max(...runs) + 1;
}
