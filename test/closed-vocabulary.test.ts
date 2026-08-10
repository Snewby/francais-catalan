import { describe, expect, it } from 'vitest';
import {
  ALL_IDS,
  BRANCHES,
  DOMAIN_CODES,
  LEAVES,
  NODES,
  isLeaf,
  nodeById,
  splitComponentRefs,
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
    // The ?? cannot fire, since split always yields a first element, but
    // noUncheckedIndexedAccess types it as possibly undefined.
    const domains = [
      ...new Set(LEAVES.map((leaf) => leaf.id.split('.')[0] ?? leaf.id)),
    ];
    const undeclared = domains.filter(
      (domain) => !(DOMAIN_CODES as readonly string[]).includes(domain),
    );
    expect(undeclared).toEqual([]);
    expect(domains.length).toBeGreaterThan(1);
  });
});

describe('the cross-references authored inside notes', () => {
  /**
   * 61 leaves name another component in `notes`, and the browser now renders
   * those as links. That turns a prose convention into a load-bearing one: an ID
   * deleted or renamed out from under a note used to leave stale prose, and now
   * leaves a reference the splitter drops back to plain text, which is a silent
   * loss of an authored edge rather than a visible error.
   */
  const referenced = LEAVES.flatMap((leaf) =>
    splitComponentRefs(leaf.notes ?? '')
      .filter((segment) => segment.id !== undefined)
      .map((segment) => ({ from: leaf.id, to: segment.id! })),
  );

  it('finds edges to check at all', () => {
    expect(referenced.length).toBeGreaterThan(0);
    expect(new Set(referenced.map((edge) => edge.from)).size).toBeGreaterThan(0);
  });

  it('resolves every one of them, so no link is dead', () => {
    expect(referenced.filter((edge) => !ALL_IDS.includes(edge.to))).toEqual([]);
  });

  it('leaves the authored prose byte for byte when the segments are rejoined', () => {
    // The pane asserts it still contains `leaf.notes` verbatim. Nothing may be
    // inserted around a link, not a bracket and not a space.
    for (const leaf of LEAVES) {
      if (leaf.notes === undefined) continue;
      const rejoined = splitComponentRefs(leaf.notes)
        .map((segment) => segment.text)
        .join('');
      expect(rejoined).toBe(leaf.notes);
    }
  });

  it('does not mistake a bare domain code in French prose for a reference', () => {
    // One segment is required rather than none, which is the same departure
    // from the schema pattern that scan-ids.ts documents.
    for (const domain of DOMAIN_CODES) {
      const segments = splitComponentRefs(`Le domaine ${domain} en entier.`);
      expect(segments.filter((segment) => segment.id !== undefined)).toEqual([]);
    }
  });

  it('reports a token that does not resolve as prose rather than as a link', () => {
    const invented = `${DOMAIN_CODES[0]!}.pas_une_cle_reelle`;
    expect(nodeById(invented)).toBeUndefined();
    const segments = splitComponentRefs(`Voir ${invented} pour la suite.`);
    expect(segments.filter((segment) => segment.id !== undefined)).toEqual([]);
  });

  it('includes references to branches, which the browser must not make tappable', () => {
    // Selection is leaf-only from end to end. Handing a branch id to onSelect
    // would blank the pane the reader is in the middle of, so those stay text.
    const branches = referenced.filter((edge) => !LEAVES.some((l) => l.id === edge.to));
    expect(branches.length).toBeGreaterThan(0);
    for (const edge of branches) {
      expect(BRANCHES.some((branch) => branch.id === edge.to)).toBe(true);
    }
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
