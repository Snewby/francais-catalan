#!/usr/bin/env node
// Stop: run the test suite so a turn cannot finish red.
//
// LOOP SAFETY. The Stop payload carries no stop_hook_active field and Claude
// Code has no built-in loop guard, so a hook that exits 2 whenever tests fail
// would cycle forever: Claude continues, attempts a fix, stops, tests fail,
// blocked again. This hook therefore blocks at most once per session. The
// second time the same session stops with a red suite it reports the failure on
// stderr and exits 0, handing the decision back to the user.
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { readPayload, projectDir, localBin, runNode } from './lib.mjs';

const STATE_DIR = path.join(projectDir, '.claude', '.hook-state');

const payload = await readPayload();
const sessionId = String(payload.session_id ?? 'unknown').replace(/[^\w-]/g, '');

const vitest = localBin('vitest/vitest.mjs');
if (!vitest) process.exit(0);

// --passWithNoTests matters while the suite is still being built out: without
// it vitest exits non-zero on every turn simply for finding no test files.
const result = runNode(vitest, ['--run', '--passWithNoTests']);
if (result.status === 0) process.exit(0);

const marker = path.join(STATE_DIR, `${sessionId}.stop-blocked`);
const alreadyBlocked = existsSync(marker);

const output = `${result.stdout}${result.stderr}`
  .trim()
  .split('\n')
  .slice(-40)
  .join('\n');

if (alreadyBlocked) {
  process.stderr.write(
    `Tests are still failing, but this session has already been blocked once, ` +
      `so the Stop hook is standing down to avoid a loop.\n\n${output}\n`,
  );
  process.exit(0);
}

mkdirSync(STATE_DIR, { recursive: true });
writeFileSync(marker, new Date().toISOString(), 'utf8');

process.stderr.write(
  `The test suite is failing, so this turn cannot finish. Fix the failures ` +
    `below, or tell the user why they are expected.\n\n${output}\n`,
);
process.exit(2);
