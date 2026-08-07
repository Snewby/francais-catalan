#!/usr/bin/env node
// PostToolUse (Write|Edit): when the taxonomy or its schema changes, re-run the
// closed-vocabulary and gloss-completeness checks.
//
// CLAUDE.md states both invariants, but CLAUDE.md is advisory context. This
// hook is the deterministic layer: an out-of-vocabulary component ID or a leaf
// missing glosses.fr blocks the turn rather than being merely discouraged.
import path from 'node:path';
import { readPayload, projectDir, localBin, runNode, block } from './lib.mjs';

const WATCHED = ['taxonomy.json', 'taxonomy.schema.json'];

const payload = await readPayload();
const filePath = payload.tool_input?.file_path;
if (!filePath) process.exit(0);

const relative = path.relative(projectDir, path.resolve(projectDir, filePath));
if (!WATCHED.includes(path.basename(relative))) process.exit(0);

const tsx = localBin('tsx/dist/cli.mjs');
if (!tsx) process.exit(0);

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
      'Fix the taxonomy before continuing. New component IDs are added only by ' +
      'editing taxonomy.json and then running `npm run gen-schema`.',
  );
}

process.exit(0);
