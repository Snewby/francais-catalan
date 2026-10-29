/**
 * Opening the chunk sheet is curiosity, not evidence, so it must write no
 * event (spec, phase 1 acceptance, added 26 Oct). Checked structurally, as the
 * archived browser-emits-no-evidence test did for the explorer: nothing the
 * sheet imports, however indirectly, can reach a module that writes evidence.
 * The behavioural half, an unchanged event count after the sheet opens, is in
 * test/phrase-screen.test.ts.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { stripComments } from './helpers/source';
import { repoRoot } from './helpers/taxonomy';

/** Modules that write events or advance learner state. */
const EVIDENCE_WRITERS = [
  'src/phrase/store.ts',
  'src/phrase/session.svelte.ts',
  'src/db/catala-v2.ts',
  'src/srs/apply.ts',
  'src/srs/fsrs.ts',
  'src/srs/elo.ts',
];

const SHEET = 'src/ui/ChunkSheet.svelte';
const IMPORT_PATTERN = /(?:from|import)\s*['"](\.[^'"]+)['"]/g;

function resolve(fromFile: string, specifier: string): string | null {
  const base = path.posix.normalize(
    path.posix.join(path.posix.dirname(fromFile), specifier),
  );
  for (const candidate of [base, `${base}.ts`, `${base}/index.ts`]) {
    const full = path.join(repoRoot, candidate);
    if (existsSync(full) && statSync(full).isFile()) return candidate;
  }
  return null;
}

/** Every repository module `entry` reaches through relative imports. */
function closureOf(entry: string): Set<string> {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    if (!/\.(ts|svelte)$/.test(file)) continue;
    const source = stripComments(readFileSync(path.join(repoRoot, file), 'utf8'));
    for (const [, specifier] of source.matchAll(IMPORT_PATTERN)) {
      const target = resolve(file, specifier ?? '');
      if (target !== null) queue.push(target);
    }
  }
  return seen;
}

describe('the chunk sheet emits no evidence', () => {
  const closure = closureOf(SHEET);

  it('reads the taxonomy and the copy (positive control)', () => {
    expect(closure).toContain('src/taxonomy/index.ts');
    expect(closure).toContain('src/i18n/fr.ts');
  });

  it('cannot reach any module that writes events or learner state', () => {
    for (const writer of EVIDENCE_WRITERS) {
      expect(existsSync(path.join(repoRoot, writer)), writer).toBe(true);
      expect([...closure], writer).not.toContain(writer);
    }
  });

  it('touches no database', () => {
    for (const file of closure) {
      if (!/\.(ts|svelte)$/.test(file)) continue;
      const source = stripComments(readFileSync(path.join(repoRoot, file), 'utf8'));
      expect(source, file).not.toMatch(/\bdexie\b|indexedDB/i);
    }
  });
});
