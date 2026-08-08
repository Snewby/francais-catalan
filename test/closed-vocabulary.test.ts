import { describe, expect, it } from 'vitest';
import {
  ALL_IDS,
  BRANCHES,
  DOMAIN_CODES,
  LEAVES,
  NODES,
  isLeaf,
  nodeById,
} from '../src/taxonomy';
import { componentIdPattern, scanReferences } from '../scripts/lib/scan-ids';
import { OVERRIDES_PATH, readRepoJson } from './helpers/taxonomy';

interface Override {
  id: string;
  status: string;
  note: string;
}

const overrides = readRepoJson<{ overrides: Override[] }>(OVERRIDES_PATH).overrides;

/**
 * Every ID literal appearing in src/ and test/ TypeScript. The taxonomy JSON is
 * not scanned: it is the definition, not a reference to one.
 */
const references = scanReferences(['src', 'test']);

describe('the component-ID vocabulary is closed', () => {
  it('finds ID references to check at all', () => {
    // A scanner that silently matches nothing passes forever. This is the
    // canary: src/api/schema.ts alone carries every leaf ID.
    expect(references.length).toBeGreaterThan(0);
  });

  it('resolves every referenced ID against taxonomy.json', () => {
    const unknown = references.filter((reference) => !ALL_IDS.includes(reference.id));
    expect(
      unknown.map((reference) => `${reference.file}:${reference.line} ${reference.id}`),
    ).toEqual([]);
  });

  it('resolves every non-wildcard contrast override', () => {
    const plain = overrides.filter((override) => !override.id.endsWith('.*'));
    const unknown = plain.filter((override) => !ALL_IDS.includes(override.id));
    expect(unknown.map((override) => override.id)).toEqual([]);
  });

  it('matches at least one leaf for every wildcard contrast override', () => {
    // A wildcard that matches nothing is a silently dead assignment, which is
    // worse than a missing one because it reads as covered.
    const wildcards = overrides.filter((override) => override.id.endsWith('.*'));
    expect(wildcards.length).toBeGreaterThan(0);
    for (const wildcard of wildcards) {
      const prefix = `${wildcard.id.slice(0, -1)}`;
      const matched = LEAVES.filter((leaf) => leaf.id.startsWith(prefix));
      expect(
        matched.map((leaf) => leaf.id),
        wildcard.id,
      ).not.toEqual([]);
    }
  });
});

describe('taxonomy structural integrity', () => {
  it('gives every node a unique ID', () => {
    const duplicates = ALL_IDS.filter((id, index) => ALL_IDS.indexOf(id) !== index);
    expect([...new Set(duplicates)]).toEqual([]);
  });

  it('resolves every parent to an existing node', () => {
    const dangling = NODES.filter(
      (node) => node.parent !== null && nodeById(node.parent) === undefined,
    );
    expect(dangling.map((node) => `${node.id} -> ${node.parent}`)).toEqual([]);
  });

  it('derives every parent ID from the child ID by dropping the last segment', () => {
    // Keeps the tree and the dotted IDs from telling two different stories.
    const mismatched = NODES.filter((node) => {
      const segments = node.id.split('.');
      const expected = segments.length === 1 ? null : segments.slice(0, -1).join('.');
      return node.parent !== expected;
    });
    expect(mismatched.map((node) => `${node.id} -> ${node.parent}`)).toEqual([]);
  });

  it('never parents a node under a leaf', () => {
    const underLeaf = NODES.filter(
      (node) => node.parent !== null && isLeaf(nodeById(node.parent)!),
    );
    expect(underLeaf.map((node) => node.id)).toEqual([]);
  });

  it('leaves no branch childless', () => {
    const childless = BRANCHES.filter(
      (branch) => !NODES.some((node) => node.parent === branch.id),
    );
    expect(childless.map((branch) => branch.id)).toEqual([]);
  });

  it('seeds more than one domain, and only declared ones', () => {
    // This was a snapshot of the phase 1 seed (exactly PRON and VERB, exactly
    // ten leaves). Every seeding pass would have had to edit the numbers, which
    // makes the assertion a changelog rather than a check. What is actually
    // invariant is that leaves only ever appear under a declared domain code.
    const domains = [...new Set(LEAVES.map((leaf) => leaf.id.split('.')[0]))];
    const undeclared = domains.filter(
      (domain) => !(DOMAIN_CODES as readonly string[]).includes(domain),
    );
    expect(undeclared).toEqual([]);
    expect(domains.length).toBeGreaterThan(1);
  });
});

describe('the reference scanner', () => {
  it('derives its pattern from the schema rather than a second copy', () => {
    expect(componentIdPattern().source).toContain('VERB');
  });

  it('ignores a bare domain code with no segments', () => {
    expect(componentIdPattern().test('VERB')).toBe(false);
  });

  it('would flag an ID that is not in the taxonomy', () => {
    // Built by concatenation on purpose: a literal invalid ID in this file
    // would be picked up by the scan above and fail the closed-vocabulary test.
    const invented = ['VERB', 'ind', 'plusquamperfet_inventat'].join('.');
    expect(componentIdPattern().test(invented)).toBe(true);
    expect(ALL_IDS).not.toContain(invented);
  });
});
