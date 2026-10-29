/**
 * The service worker entry, built to `sw.js` at the root of the base path so
 * its scope covers the whole app. The two constants are written into the
 * built file by scripts/vite-service-worker.ts: the build's version and the
 * files of its shell.
 */
import { serviceWorker, type WorkerScope } from './worker';

declare const __SHELL_VERSION__: string;
declare const __SHELL_FILES__: readonly string[];

serviceWorker(self as unknown as WorkerScope, __SHELL_VERSION__, __SHELL_FILES__);
