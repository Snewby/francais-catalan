import { describe, expect, it } from 'vitest';
import { mergeFragments, readFragments, renderTaxonomy } from '../scripts/gen-schema';
import { DOMAIN_CODES, NODES } from '../src/taxonomy';
import { TAXONOMY_PATH, readRepoFile } from './helpers/taxonomy';

const fragments = readFragments();

describe('taxonomy.json is generated from the fragments', () => {
  it('regenerates byte for byte', async () => {
    // The committed file is an artefact. Drift means someone hand-edited it,
    // and the next generation would silently destroy that edit.
    expect(await renderTaxonomy()).toBe(readRepoFile(TAXONOMY_PATH));
  });

  it('carries the do-not-edit banner', () => {
    expect(readRepoFile(TAXONOMY_PATH)).toContain('DO NOT EDIT BY HAND');
  });

  it('merges every fragment node into the taxonomy', () => {
    const fromFragments = fragments.flatMap((fragment) => fragment.nodes.length);
    const total = fromFragments.reduce((sum, count) => sum + count, 0);
    expect(NODES).toHaveLength(total);
  });
});

describe('fragment integrity', () => {
  it('finds at least one fragment', () => {
    expect(fragments.length).toBeGreaterThan(0);
  });

  it('names a real domain in every fragment', () => {
    for (const fragment of fragments) {
      expect(DOMAIN_CODES, fragment.file).toContain(fragment.domain);
    }
  });

  it('gives each domain exactly one fragment', () => {
    // Two fragments for one domain is how a seeding pass silently half-lands.
    const domains = fragments.map((fragment) => fragment.domain);
    expect([...new Set(domains)]).toHaveLength(domains.length);
  });

  it('keeps every node inside its own fragment domain', () => {
    const strays: string[] = [];
    for (const fragment of fragments) {
      for (const node of fragment.nodes) {
        const domain = node.id.split('.')[0];
        if (domain !== fragment.domain) strays.push(`${fragment.file}: ${node.id}`);
      }
    }
    expect(strays).toEqual([]);
  });

  it('orders the merged domains by the closed domain list', () => {
    // Deterministic order is what makes the regeneration byte-stable, so a
    // fragment added later cannot reshuffle the whole file.
    const merged = mergeFragments();
    const seen: string[] = [];
    for (const node of merged.nodes) {
      const domain = node.id.split('.')[0] as string;
      if (seen[seen.length - 1] !== domain) seen.push(domain);
    }
    const expected = [...seen].sort(
      (a, b) =>
        DOMAIN_CODES.indexOf(a as (typeof DOMAIN_CODES)[number]) -
        DOMAIN_CODES.indexOf(b as (typeof DOMAIN_CODES)[number]),
    );
    expect(seen).toEqual(expected);
  });

  it('groups each domain into one contiguous run', () => {
    const merged = mergeFragments();
    const domains = merged.nodes.map((node) => node.id.split('.')[0]);
    const runs = domains.filter((domain, index) => domains[index - 1] !== domain);
    expect([...new Set(runs)]).toHaveLength(runs.length);
  });

  it('rejects a node whose domain does not match its fragment', () => {
    // Take a node from any domain but NOM. NODES.slice(0, 1) would be wrong:
    // the merge is in domain-list order, so the first node belongs to whichever
    // domain is seeded earliest, and once NOM is seeded that is NOM itself.
    const foreign = NODES.find((node) => !node.id.startsWith('NOM'));
    expect(foreign).toBeDefined();
    expect(() =>
      mergeFragments([
        { file: 'data/nom.fragment.json', domain: 'NOM', nodes: [foreign!] },
      ]),
    ).toThrow();
  });

  it('rejects two fragments claiming the same domain', () => {
    const verb = fragments.find((fragment) => fragment.domain === 'VERB');
    expect(verb).toBeDefined();
    expect(() =>
      mergeFragments([verb!, { ...verb!, file: 'data/copy.json' }]),
    ).toThrow();
  });

  it('rejects a duplicate node ID inside a fragment', () => {
    // Across fragments this cannot happen, because a node has to sit in its own
    // domain's fragment. Within one it can, and the merge is where it surfaces.
    const verb = fragments.find((fragment) => fragment.domain === 'VERB');
    expect(verb).toBeDefined();
    const doubled = { ...verb!, nodes: [...verb!.nodes, verb!.nodes[0]!] };
    expect(() => mergeFragments([doubled])).toThrow();
  });
});
