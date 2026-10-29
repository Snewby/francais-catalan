/**
 * The service worker's behaviour, as a function of its scope, so a test can
 * drive it with a fake scope (decided 26 Oct, phase 1 question D: hand-written,
 * no plugin dependency).
 *
 * - Install precaches the app shell into a cache named after the build.
 * - Activate deletes every older shell cache, so a new deploy replaces the old
 *   shell rather than sitting beside it, then takes over open pages.
 * - Fetch answers same-origin GETs from the shell and leaves everything else to
 *   the network. The API is cross-origin and POST, so a translation is never
 *   cached and never served stale.
 */

export const SHELL_CACHE_PREFIX = 'catala-shell-';

export function shellCacheName(version: string): string {
  return `${SHELL_CACHE_PREFIX}${version}`;
}

/** A shell cache from another build. Caches this worker did not make are left alone. */
export function isStaleShell(name: string, current: string): boolean {
  return name.startsWith(SHELL_CACHE_PREFIX) && name !== current;
}

export function servedFromShell(
  request: { readonly method: string; readonly url: string },
  origin: string,
): boolean {
  return request.method === 'GET' && new URL(request.url).origin === origin;
}

interface ExtendableEventLike {
  waitUntil(promise: Promise<unknown>): void;
}

interface FetchEventLike extends ExtendableEventLike {
  readonly request: Request;
  respondWith(response: Promise<Response>): void;
}

/**
 * The part of ServiceWorkerGlobalScope used here. Declared rather than taken
 * from the `webworker` lib, which cannot share a program with `dom`.
 */
export interface WorkerScope {
  addEventListener(
    type: 'install' | 'activate',
    listener: (event: ExtendableEventLike) => void,
  ): void;
  addEventListener(type: 'fetch', listener: (event: FetchEventLike) => void): void;
  readonly location: { readonly href: string; readonly origin: string };
  readonly caches: CacheStorage;
  readonly clients: { claim(): Promise<void> };
  skipWaiting(): Promise<void>;
  fetch(request: Request): Promise<Response>;
}

export function serviceWorker(
  scope: WorkerScope,
  version: string,
  shellFiles: readonly string[],
): void {
  const current = shellCacheName(version);
  // Routes live in the hash, so every navigation is the one page at the root.
  const root = new URL('./', scope.location.href).href;

  scope.addEventListener('install', (event) => {
    event.waitUntil(
      scope.caches
        .open(current)
        .then((cache) =>
          cache.addAll(
            shellFiles.map((file) => new URL(file, scope.location.href).href),
          ),
        )
        .then(() => scope.skipWaiting()),
    );
  });

  scope.addEventListener('activate', (event) => {
    event.waitUntil(
      scope.caches
        .keys()
        .then((names) =>
          Promise.all(
            names
              .filter((name) => isStaleShell(name, current))
              .map((name) => scope.caches.delete(name)),
          ),
        )
        .then(() => scope.clients.claim()),
    );
  });

  scope.addEventListener('fetch', (event) => {
    const { request } = event;
    if (!servedFromShell(request, scope.location.origin)) return;
    event.respondWith(
      scope.caches
        .open(current)
        .then((cache) =>
          cache.match(request.mode === 'navigate' ? root : request, {
            ignoreSearch: true,
            // Module scripts are requested with an Origin header the precache
            // did not send, and servers answer them with Vary: Origin.
            ignoreVary: true,
          }),
        )
        .then((hit) => hit ?? scope.fetch(request)),
    );
  });
}
