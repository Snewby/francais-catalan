/**
 * Shared file-system access for the taxonomy tests.
 *
 * The tests read the taxonomy and its schema off disk rather than importing
 * them as modules, so that a missing or malformed file fails as a test failure
 * with a readable message rather than as a module-resolution error.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

// process.cwd() rather than import.meta.url: under the jsdom environment the
// module URL is not a file: URL, and fileURLToPath throws on it.
export const repoRoot = process.cwd();

export const TAXONOMY_PATH = 'src/taxonomy/taxonomy.json';
export const TAXONOMY_SCHEMA_PATH = 'src/taxonomy/taxonomy.schema.json';
export const OVERRIDES_PATH = 'data/contrast-overrides.json';
export const GENERATED_SCHEMA_PATH = 'src/api/schema.ts';

export function readRepoFile(relative: string): string {
  return readFileSync(path.join(repoRoot, relative), 'utf8');
}

export function readRepoJson<T>(relative: string): T {
  return JSON.parse(readRepoFile(relative)) as T;
}
