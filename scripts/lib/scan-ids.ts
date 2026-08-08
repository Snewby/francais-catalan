/**
 * Finds component-ID literals in the source tree.
 *
 * Shared by scripts/validate-ids.ts and test/closed-vocabulary.test.ts so the
 * hook, the CLI and the test all agree on what counts as a reference. The
 * pattern is derived from taxonomy.schema.json rather than written out again:
 * a second copy of the domain list is exactly the drift the closed-vocabulary
 * rule exists to prevent.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

export const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

const SCHEMA_PATH = 'src/taxonomy/taxonomy.schema.json';

/**
 * Only TypeScript is regex-scanned. taxonomy.json defines the vocabulary rather
 * than referencing it, and data/contrast-overrides.json is checked structurally
 * by scripts/validate-ids.ts, because its wildcards need different treatment.
 */
const SCANNED_EXTENSIONS = new Set(['.ts', '.tsx']);
const SKIPPED_DIRECTORIES = new Set(['node_modules', 'dist', 'coverage', '.git']);

export interface Reference {
  readonly id: string;
  /** Repo-relative, forward-slashed, so messages are the same on every platform. */
  readonly file: string;
  readonly line: number;
}

interface SchemaShape {
  definitions: { componentId: { pattern: string } };
}

/**
 * The scanner pattern, built from the schema's componentId pattern.
 *
 * Two deliberate differences from the schema's own pattern. The anchors go,
 * because a reference sits inside a string literal. And the trailing `*`
 * becomes `+`, because a bare domain code such as `VERB` appears in ordinary
 * prose and identifiers and would flood the results with false positives.
 */
export function componentIdPattern(): RegExp {
  const schema = JSON.parse(
    readFileSync(path.join(projectDir, SCHEMA_PATH), 'utf8'),
  ) as SchemaShape;

  const body = schema.definitions.componentId.pattern
    .replace(/^\^/, '')
    .replace(/\$$/, '')
    .replace(/\*$/, '+');

  return new RegExp(`\\b${body}\\b`);
}

function* walk(directory: string): Generator<string> {
  for (const entry of readdirSync(directory)) {
    if (SKIPPED_DIRECTORIES.has(entry)) continue;
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) {
      yield* walk(full);
    } else if (SCANNED_EXTENSIONS.has(path.extname(entry))) {
      yield full;
    }
  }
}

/** Every component-ID literal in the given repo-relative roots, with its location. */
export function scanReferences(roots: readonly string[]): Reference[] {
  const pattern = new RegExp(componentIdPattern().source, 'g');
  const found: Reference[] = [];

  for (const root of roots) {
    const absolute = path.join(projectDir, root);
    for (const file of walk(absolute)) {
      const relative = path.relative(projectDir, file);
      const lines = readFileSync(file, 'utf8').split(/\r?\n/);
      lines.forEach((text, index) => {
        for (const match of text.matchAll(pattern)) {
          found.push({
            id: match[0],
            file: relative.split(path.sep).join('/'),
            line: index + 1,
          });
        }
      });
    }
  }

  return found;
}
