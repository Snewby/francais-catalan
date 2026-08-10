/**
 * Reading src/ as text, for the structural bans.
 *
 * Two tests assert something about which module may do what: the browser emits
 * no evidence, and only the review loop emits a graded event. Both work over
 * source text rather than behaviour, because a behavioural test would have to
 * guess which call path was the leaky one.
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { repoRoot } from './taxonomy';

/**
 * Comments removed, so that a file explaining a ban does not trip it. The
 * assertions are looking for code, and prose about the rule is the opposite of
 * a violation: it is the reason the rule exists.
 */
export function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/** Repo-relative, forward-slashed paths of every .ts file under the directory. */
export function sourceFiles(dir: string): string[] {
  return readdirSync(path.join(repoRoot, dir), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) =>
      path
        .relative(repoRoot, path.join(entry.parentPath, entry.name))
        .split(path.sep)
        .join('/'),
    );
}

export function readSource(relative: string): string {
  return readFileSync(path.join(repoRoot, relative), 'utf8');
}
