#!/usr/bin/env node
// PreToolUse (Bash|PowerShell): block destructive commands and anything that
// would move the Anthropic API key around.
//
// The key is entered at runtime into localStorage and must never reach the
// repo, the shell history, or a build artefact.
import { readPayload, block } from './lib.mjs';

const DENY = [
  { pattern: /\brm\s+(-[a-zA-Z]*\s+)*-[a-zA-Z]*[rR][a-zA-Z]*f|\brm\s+-fr?\b/, reason: 'recursive force delete' },
  { pattern: /\bRemove-Item\b[^|;]*-Recurse[^|;]*-Force/i, reason: 'recursive force delete' },
  { pattern: /\bgit\s+push\b[^|;]*(--force(?!-with-lease)|(?<![\w-])-f(?![\w-]))/, reason: 'force push' },
  { pattern: /\bgit\s+reset\s+--hard\b/, reason: 'hard reset discards uncommitted work' },
  { pattern: /sk-ant-[\w-]+/, reason: 'literal Anthropic API key in a command' },
  { pattern: /\bANTHROPIC_API_KEY\b/, reason: 'API key environment variable' },
  { pattern: /(^|[\s'"`=(])\.env\b/, reason: 'reads or writes a .env file' },
  { pattern: /\bsettings\.local\.json\b/, reason: 'personal settings file' },
];

const payload = await readPayload();
const command = payload.tool_input?.command;
if (typeof command !== 'string' || command.length === 0) process.exit(0);

for (const { pattern, reason } of DENY) {
  if (pattern.test(command)) {
    block(
      `Blocked by the project PreToolUse hook: ${reason}.\n` +
        `Command: ${command}\n` +
        'If this is genuinely needed, ask the user to run it themselves.',
    );
  }
}

process.exit(0);
