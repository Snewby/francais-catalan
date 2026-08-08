/**
 * Pre-assigned contrast_fr statuses.
 *
 * data/contrast-overrides.json is the single source of truth for these
 * assignments. This module only resolves an ID against it; it does not restate
 * any assignment, and nothing else in the codebase may either.
 */
import file from '../../data/contrast-overrides.json';
import type { ContrastStatus } from './index';

export interface ContrastOverride {
  /** May carry a trailing `.*` wildcard, which matches on the ID prefix. */
  readonly id: string;
  readonly status: ContrastStatus;
  readonly note: string;
  /** Why the assignment was fixed in advance. Repo language, not shown to the learner. */
  readonly rationale: string;
}

export const OVERRIDES: readonly ContrastOverride[] = (
  file as { overrides: ContrastOverride[] }
).overrides;

const WILDCARD_SUFFIX = '.*';

/**
 * The override that applies to a node, if any.
 *
 * An exact match wins over a wildcard, so a node can be carved out of a
 * wildcard assignment without editing the wildcard. Among wildcards the longest
 * prefix wins, which is the only ordering that makes nesting predictable.
 */
export function resolveOverride(id: string): ContrastOverride | undefined {
  const exact = OVERRIDES.find((override) => override.id === id);
  if (exact !== undefined) return exact;

  return OVERRIDES.filter((override) => override.id.endsWith(WILDCARD_SUFFIX))
    .filter((override) => id.startsWith(override.id.slice(0, -1)))
    .sort((a, b) => b.id.length - a.id.length)[0];
}
