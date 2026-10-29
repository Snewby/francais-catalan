/**
 * The build step behind src/pwa/sw.ts (decided 26 Oct, phase 1 question D: a
 * small Vite plugin, no new dependency).
 *
 * After Vite has written every file, it stamps two things into `sw.js`: the
 * list of files that make up the shell, and a version hashed from their
 * contents. Any change to the app changes the version, so the browser installs
 * the new worker and its activate step deletes the old shell.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

export const SW_ENTRY = 'src/pwa/sw.ts';
export const SW_FILE = 'sw.js';

/** A short hash of every file's name and content, in a stable order. */
export function shellVersion(files: ReadonlyMap<string, string | Uint8Array>): string {
  const hash = createHash('sha256');
  for (const name of [...files.keys()].sort()) {
    hash.update(name);
    hash.update('\0');
    hash.update(files.get(name) ?? '');
    hash.update('\0');
  }
  return hash.digest('hex').slice(0, 16);
}

/** Files Vite copies from `public/` untouched, so they never appear in the bundle. */
function publicFiles(dir: string): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>();
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || entry.name.startsWith('.')) continue;
    const full = path.join(entry.parentPath, entry.name);
    files.set(path.relative(dir, full).split(path.sep).join('/'), readFileSync(full));
  }
  return files;
}

export function serviceWorkerPlugin(): Plugin {
  let publicDir = '';
  return {
    name: 'catala-service-worker',
    apply: 'build',
    // After Vite's own HTML step, so index.html is in the bundle to be listed.
    enforce: 'post',
    configResolved(config) {
      publicDir = config.publicDir;
    },
    generateBundle(_options, bundle) {
      const worker = bundle[SW_FILE];
      if (worker?.type !== 'chunk') {
        this.error(
          `${SW_FILE} is missing from the bundle; check the ${SW_ENTRY} input`,
        );
      }
      const files = new Map<string, string | Uint8Array>();
      for (const [name, output] of Object.entries(bundle)) {
        if (name === SW_FILE || name.endsWith('.map')) continue;
        files.set(name, output.type === 'chunk' ? output.code : output.source);
      }
      for (const [name, content] of publicFiles(publicDir)) files.set(name, content);

      // './' is the page itself as a navigation asks for it.
      const shell = ['./', ...[...files.keys()].sort()];
      worker.code = worker.code
        .replaceAll('__SHELL_VERSION__', JSON.stringify(shellVersion(files)))
        .replaceAll('__SHELL_FILES__', JSON.stringify(shell));
    },
  };
}
