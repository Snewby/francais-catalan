#!/usr/bin/env node
// PreToolUse (Read): block reads of secret-bearing and personal files.
import path from 'node:path';
import { readPayload, block } from './lib.mjs';

const DENY = [
  { test: (base) => base === '.env' || base.startsWith('.env.'), reason: 'environment file' },
  { test: (base) => base.endsWith('.key') || base.endsWith('.pem'), reason: 'key material' },
  { test: (base) => base === 'settings.local.json', reason: 'personal Claude Code settings' },
  { test: (base) => base === 'CLAUDE.local.md', reason: 'personal project memory' },
];

// The build guide is 36 KB of grammar tables that are not needed before the
// seeding phases, and pulling it into context wastes the budget. CLAUDE.md says
// so; this makes it stick.
const PHASE_GATED = '01-catalan-structural-map-and-build-plan.md';

const payload = await readPayload();
const filePath = payload.tool_input?.file_path;
if (typeof filePath !== 'string' || filePath.length === 0) process.exit(0);

const base = path.basename(filePath);

for (const { test, reason } of DENY) {
  if (test(base)) {
    block(
      `Blocked by the project PreToolUse hook: ${filePath} is ${reason}.\n` +
        'Ask the user for whatever value you need instead of reading the file.',
    );
  }
}

if (base === PHASE_GATED && process.env.CATALAN_SEEDING_PHASE !== '1') {
  block(
    `${base} is reference material for the seeding phases only, and reading it ` +
      'wholesale wastes context (see CLAUDE.md). If seeding has started, set ' +
      'CATALAN_SEEDING_PHASE=1, and even then read only the section you need ' +
      'via grep or an offset read rather than the whole document.',
  );
}

process.exit(0);
