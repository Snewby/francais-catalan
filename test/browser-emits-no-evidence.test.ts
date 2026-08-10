/**
 * Browsing emits no evidence.
 *
 * The taxonomy browser is a read-only view. Scrolling a tree is not an
 * encounter, and an exposure counter that browsing could move would turn the
 * coverage heatmap into a log of what the learner clicked on, presented as a
 * map of what they know. That is the failure the exposure/mastery split and
 * EVIDENCE_EFFECTS in src/srs/evidence.ts exist to prevent, and prose in
 * CLAUDE.md will not hold it.
 *
 * Enforced structurally rather than behaviourally: src/ui/ cannot reach the
 * modules that write, so there is no call path to get wrong. A behavioural test
 * would have to guess which interaction was the leaky one.
 *
 * PHASE 6 NOTE. The heatmap must READ per-component state to colour a node,
 * which is legitimate. Narrow BANNED to the write path when that lands, by
 * putting the read queries in their own module. Do not delete this test.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { repoRoot } from './helpers/taxonomy';

const UI_DIR = 'src/ui';

/** Modules that write evidence, exposure or mastery. Unreachable from src/ui/. */
const BANNED = [
  'src/db/dexie.ts',
  'src/db/persist.ts',
  'src/srs/apply.ts',
  'src/srs/fsrs.ts',
  'src/srs/elo.ts',
];

const IMPORT_PATTERN = /(?:from|import)\s*['"](\.[^'"]+)['"]/g;

/**
 * Comments removed, so that a file explaining the ban does not trip it. The
 * assertion below is looking for a hand-rolled write, and prose about exposure
 * counting is the opposite of one: it is the reason the rule exists.
 */
export function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

function posix(relative: string): string {
  return relative.split(path.sep).join('/');
}

function sourceFiles(dir: string): string[] {
  const absolute = path.join(repoRoot, dir);
  return readdirSync(absolute, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) =>
      posix(path.relative(repoRoot, path.join(entry.parentPath, entry.name))),
    );
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

const uiFiles = sourceFiles(UI_DIR);
const uiClosure = moduleClosure(uiFiles);

describe('the taxonomy browser emits no evidence', () => {
  it('finds files in src/ui to check at all', () => {
    // A scanner that silently matches nothing passes forever, which is worse
    // than no test because it reads as enforcement.
    expect(uiFiles.length).toBeGreaterThan(0);
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
    const reached = BANNED.filter((banned) => uiClosure.has(banned));
    expect(reached).toEqual([]);
  });

  it('strips comments without stripping the code around them', () => {
    // Canary on the stripper. One that returned an empty string would make the
    // assertion below pass for every possible source file.
    const stripped = stripComments(
      'const a = 1; // exposure_count\n/* exposureCount */',
    );
    expect(stripped).toContain('const a = 1');
    expect(stripped).not.toContain('exposure_count');
    expect(stripped).not.toContain('exposureCount');
  });

  it('never writes an exposure count by hand', () => {
    // Catches a write that bypasses those modules entirely, which the import
    // ban above cannot see.
    const offenders = uiFiles.filter((file) => {
      const source = stripComments(readFileSync(path.join(repoRoot, file), 'utf8'));
      return source.includes('exposure_count') || source.includes('exposureCount');
    });
    expect(offenders).toEqual([]);
  });

  it('reaches the taxonomy, so the closure is not trivially empty', () => {
    // The browser is supposed to read the taxonomy. If this fails, the walk is
    // not following imports and the ban above proves nothing.
    expect([...uiClosure]).toContain('src/taxonomy/index.ts');
  });
});
