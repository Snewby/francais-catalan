/**
 * Enumerates every component ID referenced in src/ and test/, plus the
 * assignments in data/contrast-overrides.json, and asserts each resolves
 * against src/taxonomy/taxonomy.json. The closed-vocabulary invariant.
 *
 * Run after gen-schema, never before: running it first validates the previous
 * generation and passes happily on a stale taxonomy.
 */
import { ALL_IDS, BRANCHES, LEAVES, NODES, isLeaf, nodeById } from '../src/taxonomy';
import { OVERRIDES } from '../src/taxonomy/overrides';
import { scanReferences } from './lib/scan-ids';

const problems: string[] = [];

function report(problem: string): void {
  problems.push(problem);
}

// 1. Every ID literal in the TypeScript sources exists in the taxonomy.
for (const reference of scanReferences(['src', 'test'])) {
  if (!ALL_IDS.includes(reference.id)) {
    report(
      `${reference.file}:${reference.line} references ${reference.id}, which is ` +
        'not in taxonomy.json.',
    );
  }
}

// 2. Every override resolves. A wildcard that matches nothing is a dead
//    assignment, which reads as covered and so is worse than a missing one.
for (const override of OVERRIDES) {
  if (override.id.endsWith('.*')) {
    const prefix = override.id.slice(0, -1);
    if (!LEAVES.some((leaf) => leaf.id.startsWith(prefix))) {
      report(
        `data/contrast-overrides.json: ${override.id} matches no leaf in the taxonomy.`,
      );
    }
  } else if (!ALL_IDS.includes(override.id)) {
    report(`data/contrast-overrides.json: ${override.id} is not in taxonomy.json.`);
  }
}

// 3. The taxonomy is internally consistent: unique IDs, resolvable parents, and
//    a tree whose shape agrees with the dotted IDs.
const seen = new Set<string>();
for (const id of ALL_IDS) {
  if (seen.has(id)) report(`taxonomy.json: duplicate node ID ${id}.`);
  seen.add(id);
}

for (const node of NODES) {
  const segments = node.id.split('.');
  const expected = segments.length === 1 ? null : segments.slice(0, -1).join('.');
  if (node.parent !== expected) {
    report(
      `taxonomy.json: ${node.id} has parent ${String(node.parent)} but its ID ` +
        `implies ${String(expected)}.`,
    );
  }

  if (node.parent !== null) {
    const parent = nodeById(node.parent);
    if (parent === undefined) {
      report(
        `taxonomy.json: ${node.id} has parent ${node.parent}, which does not exist.`,
      );
    } else if (isLeaf(parent)) {
      report(`taxonomy.json: ${node.id} is parented under the leaf ${parent.id}.`);
    }
  }
}

for (const branch of BRANCHES) {
  if (!NODES.some((node) => node.parent === branch.id)) {
    report(`taxonomy.json: the branch ${branch.id} has no children.`);
  }
}

if (problems.length > 0) {
  console.error(`validate-ids: ${problems.length} problem(s).`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(
  `validate-ids: ok, ${LEAVES.length} leaves and ${BRANCHES.length} branches, ` +
    'every reference resolved.',
);
