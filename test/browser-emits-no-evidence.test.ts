/**
 * Browsing emits no evidence.
 *
 * The coverage view is a read-only view. Scrolling a tree is not an encounter,
 * and an exposure counter that browsing could move would turn the coverage
 * heatmap into a log of what the learner clicked on, presented as a map of what
 * they know. That is the failure the exposure/mastery split and EVIDENCE_EFFECTS
 * in src/srs/evidence.ts exist to prevent, and prose in CLAUDE.md will not hold
 * it.
 *
 * Enforced structurally rather than behaviourally: the browsing modules cannot
 * reach the modules that write, so there is no call path to get wrong. A
 * behavioural test would have to guess which interaction was the leaky one.
 *
 * PHASE 6 NARROWED THIS BY SCOPE, NOT BY DELETION. The interface now has views
 * that are supposed to write, because asking a question and grading a review are
 * exactly the encounters that should count, and one blanket ban over src/ui/
 * could only have been widened until it meant nothing. So:
 *
 * - The ban's scope is src/ui/browse/, a directory rather than a list, which is
 *   the browsing half of the interface and the half a heatmap lives in.
 * - The banned modules are unchanged. The browse view does not read the store
 *   either: the shell reads it through src/db/read.ts and passes plain data in,
 *   so the guarantee here is stronger than it was, not weaker.
 * - src/db/read.ts is asserted to contain no write, so "read-only accessor" is a
 *   property of the file rather than of its name.
 * - Nothing anywhere in src/ui/ writes an exposure count by hand or reaches
 *   Dexie directly, so the writing views still go through the one write path.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { repoRoot } from './helpers/taxonomy';
import { readSource, sourceFiles, stripComments } from './helpers/source';

/** The browsing half of the interface. A directory, so it cannot go stale. */
const BROWSE_DIR = 'src/ui/browse';

/** Every module under src/ui/, browsing and writing views alike. */
const UI_DIR = 'src/ui';

/** The read-only accessor. Its existence is what let the ban be narrowed. */
const READ_MODULE = 'src/db/read.ts';

/** Modules that write evidence, exposure or mastery. Unreachable from the browse view. */
const BANNED = [
  'src/db/dexie.ts',
  'src/db/persist.ts',
  'src/srs/apply.ts',
  'src/srs/fsrs.ts',
  'src/srs/elo.ts',
];

/** Dexie mutations. A read module containing one of these is not a read module. */
const WRITE_CALLS = ['.put(', '.add(', '.bulkPut(', '.bulkAdd(', '.clear(', '.delete('];

/**
 * An exposure counter being SET, rather than merely named.
 *
 * Three shapes, all of them a write: a plain assignment, an increment, and an
 * object-literal key whose value does arithmetic. A declaration, a comparison
 * and a straight copy of one field into another are all left alone, because the
 * heatmap legitimately reads this number.
 */
const EXPOSURE_WRITE =
  /(?:exposure_count|exposureCount)\s*(?:=[^=]|\+\+|:\s*[^,}\n]*[+-])/;

const IMPORT_PATTERN = /(?:from|import)\s*['"](\.[^'"]+)['"]/g;

function posix(relative: string): string {
  return relative.split(path.sep).join('/');
}

/**
 * Resolves a relative specifier the way the bundler does: bare, then .ts, then
 * an index file. A specifier that resolves to nothing is returned as-is so the
 * closure records it rather than silently dropping an unresolved edge.
 */
function resolveSpecifier(fromFile: string, specifier: string): string {
  const base = posix(path.normalize(path.join(path.dirname(fromFile), specifier)));
  for (const candidate of [base, `${base}.ts`, `${base}/index.ts`]) {
    try {
      readFileSync(path.join(repoRoot, candidate), 'utf8');
      return candidate;
    } catch {
      continue;
    }
  }
  return base;
}

/** Every module reachable from the given entry points by relative import. */
function moduleClosure(entries: readonly string[]): ReadonlySet<string> {
  const seen = new Set<string>(entries);
  const queue = [...entries];

  while (queue.length > 0) {
    const current = queue.pop();
    if (current === undefined || !current.endsWith('.ts')) continue;

    let source: string;
    try {
      source = readFileSync(path.join(repoRoot, current), 'utf8');
    } catch {
      continue;
    }

    for (const match of source.matchAll(IMPORT_PATTERN)) {
      const specifier = match[1];
      if (specifier === undefined) continue;
      const resolved = resolveSpecifier(current, specifier);
      if (seen.has(resolved)) continue;
      seen.add(resolved);
      queue.push(resolved);
    }
  }

  return seen;
}

const browseFiles = sourceFiles(BROWSE_DIR);
const uiFiles = sourceFiles(UI_DIR);
const browseClosure = moduleClosure(browseFiles);

describe('the coverage view emits no evidence', () => {
  it('finds files in the browse directory to check at all', () => {
    // A scanner that silently matches nothing passes forever, which is worse
    // than no test because it reads as enforcement.
    expect(browseFiles.length).toBeGreaterThan(0);
    // And the scope really is narrower than src/ui/, which is the change this
    // phase made. If these two ever coincide again, either the writing views
    // have been moved into the browse directory or the scope has been widened
    // back to everything, and both mean this file is no longer saying anything.
    expect(uiFiles.length).toBeGreaterThan(browseFiles.length);
  });

  it('would detect a banned import if one existed', () => {
    // Positive control on the walker itself, run against a module that does
    // import from src/srs/. If this stops holding, the walk is broken and the
    // assertions below are passing for the wrong reason.
    const control = moduleClosure(['src/srs/apply.ts']);
    expect([...control]).toContain('src/srs/fsrs.ts');
    expect([...control]).toContain('src/srs/evidence.ts');
  });

  it('follows imports transitively, not one level deep', () => {
    // taxonomy.json is reachable from apply.ts only through taxonomy/index.ts,
    // so it can only appear here if the walk recurses. A one-level walk would
    // pass every assertion in this file while missing a banned module imported
    // through a helper, which is exactly how this ban would be broken.
    expect([...moduleClosure(['src/srs/apply.ts'])]).toContain(
      'src/taxonomy/taxonomy.json',
    );
    // And the closure is not simply every file in the repo: fsrs.ts is imported
    // by apply.ts, not the other way round.
    expect([...moduleClosure(['src/srs/fsrs.ts'])]).not.toContain('src/srs/apply.ts');
  });

  it('never reaches a module that writes evidence, exposure or mastery', () => {
    const reached = BANNED.filter((banned) => browseClosure.has(banned));
    expect(reached).toEqual([]);
  });

  it('does not reach the store to read it either, but is given the data', () => {
    // The heatmap needs per-component state, which is legitimate, and the
    // tempting way to get it was to unban the reads. Injecting them instead
    // keeps the browse view unable to touch the database in either direction,
    // and keeps its rendering testable without one.
    expect([...browseClosure]).not.toContain(READ_MODULE);
    expect(readSource('src/ui/app.ts')).toContain(READ_MODULE.replace('.ts', ''));
  });

  it('strips comments without stripping the code around them', () => {
    // Canary on the stripper. One that returned an empty string would make the
    // assertions below pass for every possible source file.
    const stripped = stripComments(
      'const a = 1; // exposure_count\n/* exposureCount */',
    );
    expect(stripped).toContain('const a = 1');
    expect(stripped).not.toContain('exposure_count');
    expect(stripped).not.toContain('exposureCount');
  });

  it('never writes an exposure count by hand, anywhere in the interface', () => {
    // Catches a write that bypasses those modules entirely, which the import
    // ban above cannot see. Scoped to all of src/ui/ rather than to the browse
    // directory: the writing views are supposed to record encounters, and they
    // are supposed to do it through recordQuery rather than by incrementing a
    // counter themselves.
    //
    // It looks for an assignment rather than for the identifier, which is what
    // it used to do. Phase 6 made the plain mention legitimate: the heatmap is
    // coloured from an exposure count, so the shell reads one and the coverage
    // model declares a field for it. Banning the word would have forced this
    // test to be deleted for saying something that is no longer true, which is
    // the failure mode the header warns about.
    const offenders = uiFiles.filter((file) =>
      EXPOSURE_WRITE.test(stripComments(readSource(file))),
    );
    expect(offenders).toEqual([]);

    // Positive control on the pattern, against the module whose whole job is to
    // increment that counter. Without this, a regex that matched nothing at all
    // would pass this test for ever.
    expect(EXPOSURE_WRITE.test(stripComments(readSource('src/srs/apply.ts')))).toBe(
      true,
    );
    // And it does not fire on a read or on a declaration, which is what every
    // legitimate mention in src/ui/ looks like.
    expect(EXPOSURE_WRITE.test('readonly exposureCount: number;')).toBe(false);
    expect(EXPOSURE_WRITE.test('if (coverage.exposureCount <= 0) return null;')).toBe(
      false,
    );
    expect(EXPOSURE_WRITE.test('exposureCount: state.exposure.exposure_count,')).toBe(
      false,
    );
  });

  it('opens no second write path: no view touches Dexie directly', () => {
    const offenders = uiFiles.filter((file) =>
      /from\s*['"][^'"]*db\/dexie['"]/.test(stripComments(readSource(file))),
    );
    expect(offenders).toEqual([]);
  });

  it('keeps the read accessor read-only, so the narrowing is real', () => {
    const source = stripComments(readSource(READ_MODULE));
    expect(source.length).toBeGreaterThan(0);
    const writes = WRITE_CALLS.filter((call) => source.includes(call));
    expect(writes).toEqual([]);
    // Positive control: the same scan does fire on the module that writes.
    const writer = stripComments(readSource('src/db/persist.ts'));
    expect(WRITE_CALLS.filter((call) => writer.includes(call)).length).toBeGreaterThan(
      0,
    );
  });

  it('reaches the taxonomy, so the closure is not trivially empty', () => {
    // The browse view is supposed to read the taxonomy. If this fails, the walk
    // is not following imports and the ban above proves nothing.
    expect([...browseClosure]).toContain('src/taxonomy/index.ts');
  });
});
