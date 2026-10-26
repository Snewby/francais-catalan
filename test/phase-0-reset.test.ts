/**
 * Phase 0 removed the vanilla UI layer and its database. These are the
 * structural checks the spec's acceptance criteria name: nothing under src/
 * imports a module that is gone, and src/ui/ holds Svelte components, not .ts
 * view files.
 *
 * Over source text rather than through the compiler, so the evidence is a named
 * test rather than "typecheck happened to pass".
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { repoRoot } from './helpers/taxonomy';
import { stripComments } from './helpers/source';

/** The vanilla modules phase 0 deleted or archived. */
const REMOVED = [
  'src/db/dexie.ts',
  'src/db/persist.ts',
  'src/db/read.ts',
  'src/ui/app.ts',
  'src/ui/query-view.ts',
  'src/ui/review-view.ts',
  'src/ui/data-view.ts',
  'src/ui/api-key.ts',
  'src/ui/speak.ts',
  'src/ui/browse',
  'src/review/session.ts',
];

const IMPORT_PATTERN = /(?:from|import)\s*['"](\.[^'"]+)['"]/g;

function posix(relative: string): string {
  return relative.split(path.sep).join('/');
}

function filesUnder(dir: string, extensions: readonly string[]): string[] {
  return readdirSync(path.join(repoRoot, dir), { recursive: true, withFileTypes: true })
    .filter(
      (entry) => entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext)),
    )
    .map((entry) =>
      posix(path.relative(repoRoot, path.join(entry.parentPath, entry.name))),
    );
}

/** Resolves a relative specifier as Vite does for this repo, or returns null. */
function resolve(fromFile: string, specifier: string): string | null {
  const base = posix(path.normalize(path.join(path.dirname(fromFile), specifier)));
  for (const candidate of [base, `${base}.ts`, `${base}/index.ts`]) {
    const full = path.join(repoRoot, candidate);
    if (existsSync(full) && !readdirSafe(full)) return candidate;
  }
  return null;
}

function readdirSafe(full: string): boolean {
  try {
    readdirSync(full);
    return true;
  } catch {
    return false;
  }
}

function importsOf(file: string): string[] {
  const source = stripComments(readFileSync(path.join(repoRoot, file), 'utf8'));
  return [...source.matchAll(IMPORT_PATTERN)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
}

const sources = filesUnder('src', ['.ts', '.svelte']);

describe('phase 0 removals', () => {
  it('finds source files and imports to check at all', () => {
    // A scanner that matches nothing passes forever.
    expect(sources.length).toBeGreaterThan(20);
    expect(sources.flatMap(importsOf).length).toBeGreaterThan(20);
    expect(sources).toContain('src/ui/App.svelte');
  });

  it('would flag an import of a removed module', () => {
    // Positive control on the resolver.
    expect(resolve('src/main.ts', './db/dexie')).toBeNull();
    expect(resolve('src/main.ts', './nav/router')).toBe('src/nav/router.ts');
  });

  it('has deleted every removed module', () => {
    const present = REMOVED.filter((removed) =>
      existsSync(path.join(repoRoot, removed)),
    );
    expect(present).toEqual([]);
  });

  it('has no file under src/ that imports a module that does not exist', () => {
    const broken = sources.flatMap((file) =>
      importsOf(file)
        .filter((specifier) => resolve(file, specifier) === null)
        .map((specifier) => `${file} -> ${specifier}`),
    );
    expect(broken).toEqual([]);
  });

  it('keeps no .ts view files in src/ui/', () => {
    const ts = filesUnder('src/ui', ['.ts']);
    expect(ts).toEqual([]);
    expect(filesUnder('src/ui', ['.svelte']).length).toBeGreaterThan(0);
  });
});
