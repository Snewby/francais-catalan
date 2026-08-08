/**
 * Asserts every taxonomy leaf has a non-empty glosses.fr and a contrast_fr
 * whose status is one of transfer, near-miss, false-friend or novel, that no
 * node carries a flat gloss string instead of the keyed map, and that the
 * pre-assigned statuses in data/contrast-overrides.json are applied verbatim.
 *
 * The schema already rejects most of these shapes. What it cannot express is
 * the difference between an authored gloss and a surviving placeholder, or
 * between an applied override and a re-derived one.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { CONTRAST_STATUSES, LEAVES } from '../src/taxonomy';
import { resolveOverride } from '../src/taxonomy/overrides';

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

const PLACEHOLDER = /^(todo|tbd|xxx|placeholder|à faire)/i;
const THIN_NOTE = 40;

const problems: string[] = [];

function report(problem: string): void {
  problems.push(problem);
}

// The keyed-map check reads the raw JSON, because the typed view would have
// already coerced a flat string into something that looks like a map.
interface RawNode {
  id: string;
  kind: string;
  glosses?: unknown;
}

const raw = JSON.parse(
  readFileSync(path.join(projectDir, 'src/taxonomy/taxonomy.json'), 'utf8'),
) as { nodes: RawNode[] };

for (const node of raw.nodes) {
  if (node.glosses === undefined) continue;
  if (typeof node.glosses !== 'object' || node.glosses === null) {
    report(
      `${node.id}: glosses must be a keyed map such as {"fr": "..."}, not a string.`,
    );
  }
}

for (const leaf of LEAVES) {
  if (typeof leaf.glosses.fr !== 'string' || leaf.glosses.fr.trim() === '') {
    report(`${leaf.id}: missing glosses.fr.`);
  } else if (PLACEHOLDER.test(leaf.glosses.fr)) {
    report(`${leaf.id}: glosses.fr is still a placeholder.`);
  }

  const contrast = leaf.contrast_fr;
  if (!CONTRAST_STATUSES.includes(contrast.status)) {
    report(
      `${leaf.id}: contrast_fr.status is ${String(contrast.status)}, not one of ` +
        `${CONTRAST_STATUSES.join(', ')}.`,
    );
  }

  if (contrast.note.trim() === '' || PLACEHOLDER.test(contrast.note)) {
    report(`${leaf.id}: contrast_fr.note is empty or still a placeholder.`);
  } else if (contrast.note.length < THIN_NOTE) {
    report(`${leaf.id}: contrast_fr.note is too thin to state a contrast concretely.`);
  }

  const override = resolveOverride(leaf.id);
  if (override !== undefined) {
    if (contrast.status !== override.status) {
      report(
        `${leaf.id}: contrast_fr.status is ${contrast.status} but ` +
          `data/contrast-overrides.json fixes it at ${override.status}.`,
      );
    }
    if (contrast.note !== override.note) {
      report(
        `${leaf.id}: contrast_fr.note does not match data/contrast-overrides.json ` +
          'verbatim. Apply the override rather than re-deriving it.',
      );
    }
  }
}

if (problems.length > 0) {
  console.error(`check-glosses: ${problems.length} problem(s).`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(`check-glosses: ok, ${LEAVES.length} leaves fully glossed.`);
