#!/usr/bin/env node
// PostToolUse (Write|Edit): guard the generated taxonomy, and re-run the
// closed-vocabulary and gloss-completeness checks when its sources change.
//
// CLAUDE.md states both invariants, but CLAUDE.md is advisory context. This
// hook is the deterministic layer: an out-of-vocabulary component ID or a leaf
// missing glosses.fr blocks the turn rather than being merely discouraged.
//
// The first check below is the more valuable one during a seeding pass. A
// subagent authoring a domain has a real reason to reach for taxonomy.json,
// because that is where nodes visibly live; the edit then looks correct and is
// silently destroyed by the next generation. Blocking at write time is the only
// point at which that mistake is cheap, because the Stop hook that runs the
// tests fires for the main session and not for a subagent's turn.
import path from 'node:path';
import { readPayload, projectDir, localBin, runNode, block } from './lib.mjs';

/** Generated artefacts. Editing one is always wrong, whatever it now contains. */
const GENERATED = [path.normalize('src/taxonomy/taxonomy.json')];

/** Sources whose edit invalidates the taxonomy invariants until rechecked. */
const WATCHED_BASENAMES = ['taxonomy.schema.json'];
const WATCHED_SUFFIX = '.fragment.json';

const payload = await readPayload();
const filePath = payload.tool_input?.file_path;
if (!filePath) process.exit(0);

const relative = path.relative(projectDir, path.resolve(projectDir, filePath));
const basename = path.basename(relative);

if (GENERATED.includes(path.normalize(relative))) {
  block(
    `${relative} is a generated artefact and must not be hand-edited.\n\n` +
      'It is rebuilt from data/*.fragment.json by `npm run gen-schema`, so this ' +
      'edit would be destroyed by the next generation without warning. Edit the ' +
      "fragment for the node's domain instead, for example " +
      'data/verb.fragment.json, then run `npm run gen-schema`.',
  );
}

const isSource =
  WATCHED_BASENAMES.includes(basename) || basename.endsWith(WATCHED_SUFFIX);
if (!isSource) process.exit(0);

const tsx = localBin('tsx/dist/cli.mjs');
if (!tsx) process.exit(0);

// The fragments are the source, so the checks have to run against a fresh
// build. Running them on a stale taxonomy.json would validate the previous
// generation and pass happily.
const build = runNode(tsx, ['scripts/gen-schema.ts']);
if (build.status !== 0) {
  block(
    `${relative} was edited but the taxonomy no longer builds.\n\n` +
      `${build.stdout}${build.stderr}`,
  );
}

const failures = [];
for (const script of ['scripts/validate-ids.ts', 'scripts/check-glosses.ts']) {
  const result = runNode(tsx, [script]);
  if (result.status !== 0) {
    failures.push(`${script} failed:\n${result.stdout}${result.stderr}`);
  }
}

if (failures.length > 0) {
  block(
    `${relative} was edited but the taxonomy invariants no longer hold.\n\n` +
      `${failures.join('\n\n')}\n\n` +
      'Fix the fragment before continuing. New component IDs are added only by ' +
      'editing the domain fragment under data/ and then running ' +
      '`npm run gen-schema`.',
  );
}

process.exit(0);
