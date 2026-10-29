import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { ASSUMPTIONS } from '../src/api/phrase';
import { LEAF_IDS } from '../src/api/schema';
import {
  VERDICTS,
  normaliseRendering,
  replayRecording,
  type GoldenCase,
  type Recording,
} from '../src/eval/golden';

/*
 * Golden set v2 as data: the 30 fixtures stay what docs/golden-set-v2.md
 * approved, and any committed recording replays through the client.
 */

const ROOT = path.resolve(import.meta.dirname, '..');
const CASES_DIR = path.join(ROOT, 'test/fixtures/golden-v2/cases');
const RECORDINGS_DIR = path.join(ROOT, 'test/fixtures/golden-v2/recordings');

const cases: GoldenCase[] = readdirSync(CASES_DIR)
  .filter((name) => name.endsWith('.json'))
  .sort()
  .map(
    (name) =>
      JSON.parse(readFileSync(path.join(CASES_DIR, name), 'utf8')) as GoldenCase,
  );

/** The approved table, one row per case, cells trimmed. */
const approved = readFileSync(path.join(ROOT, 'docs/golden-set-v2.md'), 'utf8')
  .split('\n')
  .filter((line) => /^\| \d+ \|/.test(line))
  .map((line) =>
    line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim()),
  );

const idsIn = (cell: string): string[] =>
  [...cell.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? '');

describe('the 30 fixtures are the approved sentences', () => {
  it('has one fixture per approved row, numbered 1 to 30', () => {
    expect(approved).toHaveLength(30);
    expect(cases.map((golden) => golden.n)).toEqual(
      Array.from({ length: 30 }, (_, index) => index + 1),
    );
  });

  it('copies every input exactly, typo included', () => {
    for (const [index, golden] of cases.entries()) {
      expect(golden.input, `case ${String(golden.n)}`).toBe(approved[index]?.[1]);
    }
    // Row 30 keeps its typo on purpose (docs/golden-set-v2.md).
    expect(cases[29]?.input).toContain('tromper');
  });

  it('carries exactly the approved must-link and must-not-link IDs', () => {
    for (const [index, golden] of cases.entries()) {
      const row = approved[index] ?? [];
      expect(
        golden.mustLink.flatMap((group) => group.anyOf),
        `must link, case ${String(golden.n)}`,
      ).toEqual(idsIn(row[3] ?? ''));
      expect(golden.mustNotLink, `must not link, case ${String(golden.n)}`).toEqual(
        idsIn(row[4] ?? ''),
      );
    }
  });

  it('makes row 15 an any-of and gives row 29 no required ID', () => {
    expect(cases[14]?.mustLink).toHaveLength(1);
    expect(cases[14]?.mustLink[0]?.anyOf).toEqual([
      'VERB.mod.obligacio',
      'VERB.subj.present',
    ]);
    expect(cases[28]?.mustLink).toEqual([]);
    expect(cases[28]?.requireUnlinked).toBe(true);
    expect(cases.filter((golden) => golden.requireUnlinked)).toHaveLength(1);
  });

  it('checks the assumptions and the corrected French only where the table asks', () => {
    expect(cases[26]?.assumptions.forbidden).toEqual(['addressee_formal']);
    // « contente » states the gender, so it is not an assumption (27 Oct).
    expect(cases[27]?.assumptions).toEqual({
      required: [],
      forbidden: ['speaker_fem'],
    });
    expect(cases[29]?.fr).toEqual({
      mustContain: ['trompé'],
      mustNotContain: ['tromper'],
    });
    const others = cases.filter((golden) => ![27, 28, 30].includes(golden.n));
    for (const golden of others) {
      expect(golden.assumptions).toEqual({ required: [], forbidden: [] });
      expect(golden.fr).toEqual({ mustContain: [], mustNotContain: [] });
    }
  });

  it('names only IDs and assumptions that exist', () => {
    // validate-ids scans TypeScript only, so the JSON fixtures are checked here.
    const known = new Set<string>(LEAF_IDS);
    for (const golden of cases) {
      for (const id of [
        ...golden.mustLink.flatMap((g) => g.anyOf),
        ...golden.mustNotLink,
      ]) {
        expect(known.has(id), `${id} in case ${String(golden.n)}`).toBe(true);
      }
      for (const assumption of [
        ...golden.assumptions.required,
        ...golden.assumptions.forbidden,
      ]) {
        expect(ASSUMPTIONS).toContain(assumption);
      }
    }
  });

  it('keeps every rendering ID unique, well-formed and normalised', () => {
    for (const golden of cases) {
      const ids = golden.renderings.map((rendering) => rendering.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const rendering of golden.renderings) {
        expect(rendering.id).toMatch(new RegExp(`^${String(golden.n)}-[a-z]+$`));
        expect(rendering.key).toBe(normaliseRendering(rendering.ca));
        if (rendering.verdict !== null) expect(VERDICTS).toContain(rendering.verdict);
      }
    }
  });
});

describe('committed recordings', () => {
  const recordings: Recording[] = existsSync(RECORDINGS_DIR)
    ? readdirSync(RECORDINGS_DIR).flatMap((model) =>
        readdirSync(path.join(RECORDINGS_DIR, model))
          .filter((name) => name.endsWith('.json'))
          .map(
            (name) =>
              JSON.parse(
                readFileSync(path.join(RECORDINGS_DIR, model, name), 'utf8'),
              ) as Recording,
          ),
      )
    : [];

  it('replays every recorded case with exactly the requests that were recorded', async () => {
    // Vacuous until Sean records round 1; from then on every recording is
    // replayed on every test run, and replayRecording throws on any drift.
    for (const recording of recordings) {
      const replies = await replayRecording(recording, cases);
      expect(replies).toHaveLength(recording.cases.length);
    }
  });

  it('holds no API key', () => {
    for (const recording of recordings) {
      expect(JSON.stringify(recording)).not.toMatch(/sk-ant-/);
    }
  });
});
