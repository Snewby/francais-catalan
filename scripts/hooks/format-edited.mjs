#!/usr/bin/env node
// PostToolUse (Write|Edit): format and autofix the file that was just written.
//
// Never blocks. A formatter that can fail the turn is worse than an unformatted
// file, and eslint --fix legitimately exits non-zero on rules it cannot fix.
import path from 'node:path';
import { readPayload, projectDir, localBin, runNode } from './lib.mjs';

const FORMATTABLE = new Set(['.ts', '.js', '.mjs', '.cjs', '.json', '.md', '.html', '.css']);
const LINTABLE = new Set(['.ts', '.js', '.mjs']);

// Generated or deliberately unformatted artefacts.
const SKIP = [
  path.join('src', 'api', 'schema.ts'),
  path.join('src', 'taxonomy', 'taxonomy.json'),
  'node_modules',
  'dist',
  'docs',
];

const payload = await readPayload();
const filePath = payload.tool_input?.file_path;
if (!filePath) process.exit(0);

const relative = path.relative(projectDir, path.resolve(projectDir, filePath));
if (relative.startsWith('..')) process.exit(0);
if (SKIP.some((skip) => relative.startsWith(skip))) process.exit(0);

const ext = path.extname(relative).toLowerCase();

if (FORMATTABLE.has(ext)) {
  const prettier = localBin('prettier/bin/prettier.cjs');
  if (prettier) runNode(prettier, ['--write', relative]);
}

if (LINTABLE.has(ext)) {
  const eslint = localBin('eslint/bin/eslint.js');
  if (eslint) {
    const result = runNode(eslint, ['--fix', relative]);
    // Surface remaining problems to Claude without blocking the turn.
    if (result.status !== 0 && result.stdout.trim()) {
      process.stderr.write(result.stdout);
    }
  }
}

process.exit(0);
