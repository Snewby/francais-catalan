/**
 * Typed access to the taxonomy.
 *
 * The node shape itself is defined by taxonomy.schema.json, which is the single
 * source of truth. The interfaces below are the TypeScript projection of that
 * schema; test/taxonomy-schema.test.ts is what keeps the two honest, because a
 * hand-written interface cannot enforce the schema on the JSON.
 *
 * Import from here rather than reaching for taxonomy.json directly, so that
 * leaf and branch stay distinguishable at the type level.
 */
import raw from './taxonomy.json';

export const DOMAIN_CODES = [
  'PHON',
  'NOM',
  'ART',
  'VERB',
  'PRON',
  'DET',
  'PREP',
  'ADV',
  'CONJ',
  'NEG',
  'SYN',
  'LEX',
] as const;

export type DomainCode = (typeof DOMAIN_CODES)[number];

export const CONTRAST_STATUSES = [
  'transfer',
  'near-miss',
  'false-friend',
  'novel',
] as const;

export type ContrastStatus = (typeof CONTRAST_STATUSES)[number];

export type Cefr = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface ContrastFr {
  readonly status: ContrastStatus;
  readonly note: string;
}

/** Exposure and mastery live in separate objects so neither can be updated by accident. */
export interface LeafState {
  readonly exposure: { readonly exposure_count: number };
  readonly mastery: {
    readonly stability: number | null;
    readonly difficulty: number | null;
    readonly graded_review_count: number;
  };
}

export interface BranchNode {
  readonly id: string;
  readonly kind: 'branch';
  readonly parent: string | null;
  readonly label_fr: string;
}

export interface LeafNode {
  readonly id: string;
  readonly kind: 'leaf';
  readonly parent: string;
  readonly ca: string;
  /** Keyed by language code. Never a flat string. */
  readonly glosses: Readonly<Record<string, string>> & { readonly fr: string };
  readonly cefr: Cefr;
  readonly examples: readonly string[];
  readonly notes?: string;
  readonly dialect_note?: string;
  readonly contrast_fr: ContrastFr;
  readonly state: LeafState;
}

export type TaxonomyNode = BranchNode | LeafNode;

export interface Taxonomy {
  readonly version: number;
  readonly nodes: readonly TaxonomyNode[];
}

export const TAXONOMY = raw as unknown as Taxonomy;

export const NODES: readonly TaxonomyNode[] = TAXONOMY.nodes;

export function isLeaf(node: TaxonomyNode): node is LeafNode {
  return node.kind === 'leaf';
}

export function isBranch(node: TaxonomyNode): node is BranchNode {
  return node.kind === 'branch';
}

export const LEAVES: readonly LeafNode[] = NODES.filter(isLeaf);
export const BRANCHES: readonly BranchNode[] = NODES.filter(isBranch);

/** Leaf IDs, in taxonomy order. The generated API enums are drawn from this. */
export const LEAF_IDS: readonly string[] = LEAVES.map((leaf) => leaf.id);

/** Every ID, leaf and branch alike. The closed-vocabulary check resolves against this. */
export const ALL_IDS: readonly string[] = NODES.map((node) => node.id);

const BY_ID = new Map(NODES.map((node) => [node.id, node]));

export function nodeById(id: string): TaxonomyNode | undefined {
  return BY_ID.get(id);
}

export function leafById(id: string): LeafNode | undefined {
  const node = BY_ID.get(id);
  return node !== undefined && isLeaf(node) ? node : undefined;
}

/** The domain code an ID belongs to, or undefined if the ID is malformed. */
export function domainOf(id: string): DomainCode | undefined {
  const head = id.split('.')[0] as DomainCode | undefined;
  return head !== undefined && DOMAIN_CODES.includes(head) ? head : undefined;
}

/** The branches above a node, domain root first. Empty for a domain root. */
export function ancestorsOf(id: string): readonly BranchNode[] {
  const path: BranchNode[] = [];
  let current = nodeById(id)?.parent ?? null;
  while (current !== null) {
    const node = nodeById(current);
    if (node === undefined || !isBranch(node)) break;
    path.unshift(node);
    current = node.parent;
  }
  return path;
}

/** The other leaves under the same parent, in taxonomy order. */
export function siblingsOf(leaf: LeafNode): readonly LeafNode[] {
  return LEAVES.filter((other) => other.parent === leaf.parent && other.id !== leaf.id);
}

/**
 * Component IDs embedded in authored French prose, and the prose around them.
 *
 * 61 leaves name another component inside `notes`, 69 references in all, and
 * every one of them is a judgement an author made about which two rules belong
 * together. Written as bare tokens in a sentence, they are readable and not
 * reachable; split out, the browser can make them navigable.
 *
 * The pattern is built from DOMAIN_CODES rather than from the schema's own
 * `componentId` pattern, because reading the schema needs `node:fs` and this
 * runs in the browser. Two deliberate departures from it, the same two
 * scripts/lib/scan-ids.ts documents: no anchors, since these sit mid-sentence,
 * and one segment required rather than none, so a bare « VERB » in French prose
 * is not mistaken for a reference.
 *
 * A token that does not resolve in the taxonomy comes back as plain text rather
 * than as a dead link. Today none of the 69 fails that, which the test asserts.
 */
export interface ProseSegment {
  readonly text: string;
  /** Set when the segment is a component ID that resolves. */
  readonly id?: string;
}

const COMPONENT_REF = new RegExp(
  `\\b(?:${DOMAIN_CODES.join('|')})(?:\\.[a-z0-9_]+)+\\b`,
  'g',
);

export function splitComponentRefs(text: string): readonly ProseSegment[] {
  const segments: ProseSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(COMPONENT_REF)) {
    const start = match.index;
    if (nodeById(match[0]) === undefined) continue;
    if (start > cursor) segments.push({ text: text.slice(cursor, start) });
    segments.push({ text: match[0], id: match[0] });
    cursor = start + match[0].length;
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}
