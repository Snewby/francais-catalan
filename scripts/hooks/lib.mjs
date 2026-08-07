// Shared helpers for the Claude Code hooks in .claude/settings.json.
//
// Hooks receive their payload as JSON on stdin. There is no CLAUDE_FILE_PATHS
// environment variable, so the edited path must be read from tool_input.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

export const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

/** Read and parse the hook payload from stdin. Returns {} if stdin is empty. */
export async function readPayload() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Resolve a locally installed CLI entrypoint.
 *
 * Hooks run on every edit, so they invoke the package's entry script through
 * node directly rather than through npx, which would re-resolve the package on
 * each call.
 */
export function localBin(relative) {
  const full = path.join(projectDir, 'node_modules', relative);
  return existsSync(full) ? full : null;
}

/** Run a node script synchronously. Returns {status, stdout, stderr}. */
export function runNode(entry, args) {
  const result = spawnSync(process.execPath, [entry, ...args], {
    cwd: projectDir,
    encoding: 'utf8',
    windowsHide: true,
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

/** Exit 2 tells Claude Code to block, feeding stderr back to the model. */
export function block(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}
