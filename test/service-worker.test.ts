/**
 * The service worker against a fake scope and cache storage: what install
 * caches, that a new deploy's activate deletes the old shell, and that only
 * same-origin GETs are answered from the cache (decided 26 Oct, phase 1
 * question D). The real worker in a real browser is exercised by
 * e2e/installable.spec.ts.
 */
import { describe, expect, it, vi } from 'vitest';

import { shellVersion } from '../scripts/vite-service-worker';
import {
  isStaleShell,
  serviceWorker,
  servedFromShell,
  shellCacheName,
  type WorkerScope,
} from '../src/pwa/worker';

const ORIGIN = 'https://snewby.github.io';
const SCRIPT = `${ORIGIN}/francais-catalan/sw.js`;
const ROOT = `${ORIGIN}/francais-catalan/`;
const SHELL = ['./', 'index.html', 'assets/main-abc.js', 'icons/icon-192.png'];

class FakeCache {
  readonly entries = new Map<string, Response>();
  lastOptions: CacheQueryOptions | undefined;
  async addAll(urls: string[]): Promise<void> {
    for (const url of urls) this.entries.set(url, new Response(`cached ${url}`));
  }
  async match(
    request: Request | string,
    options?: CacheQueryOptions,
  ): Promise<Response | undefined> {
    this.lastOptions = options;
    const url = new URL(typeof request === 'string' ? request : request.url);
    url.search = '';
    return this.entries.get(url.href);
  }
}

class FakeCacheStorage {
  readonly stores = new Map<string, FakeCache>();
  async open(name: string): Promise<FakeCache> {
    const store = this.stores.get(name) ?? new FakeCache();
    this.stores.set(name, store);
    return store;
  }
  async keys(): Promise<string[]> {
    return [...this.stores.keys()];
  }
  async delete(name: string): Promise<boolean> {
    return this.stores.delete(name);
  }
}

type Listener = (event: Record<string, unknown>) => void;

/** One worker version over shared cache storage, as two deploys share a browser. */
function worker(version: string, caches: FakeCacheStorage) {
  const listeners = new Map<string, Listener>();
  const scope = {
    addEventListener: (type: string, listener: Listener) =>
      listeners.set(type, listener),
    location: { href: SCRIPT, origin: ORIGIN },
    caches,
    clients: { claim: vi.fn(async () => {}) },
    skipWaiting: vi.fn(async () => {}),
    fetch: vi.fn(async (request: Request) => new Response(`network ${request.url}`)),
  };
  serviceWorker(scope as unknown as WorkerScope, version, SHELL);

  async function dispatch(type: string, extra: Record<string, unknown> = {}) {
    let pending: Promise<unknown> | undefined;
    let responded = false;
    listeners.get(type)?.({
      ...extra,
      waitUntil: (promise: Promise<unknown>) => (pending = promise),
      respondWith: (promise: Promise<unknown>) => {
        responded = true;
        pending = promise;
      },
    });
    return { responded, result: await pending };
  }

  const request = (url: string, method = 'GET', mode = 'cors') =>
    ({ url, method, mode }) as unknown as Request;

  return { scope, dispatch, request };
}

describe('install and activate', () => {
  it('precaches every shell file under a cache named after the build', async () => {
    const caches = new FakeCacheStorage();
    const v1 = worker('v1', caches);
    await v1.dispatch('install');

    const cached = [...(caches.stores.get(shellCacheName('v1'))?.entries.keys() ?? [])];
    expect(cached.sort()).toEqual(
      SHELL.map((file) => new URL(file, SCRIPT).href).sort(),
    );
    expect(v1.scope.skipWaiting).toHaveBeenCalled();
  });

  it('replaces the old shell when a new deploy activates, leaving other caches alone', async () => {
    const caches = new FakeCacheStorage();
    await caches.open('someone-else');
    const v1 = worker('v1', caches);
    await v1.dispatch('install');
    await v1.dispatch('activate');

    const v2 = worker('v2', caches);
    await v2.dispatch('install');
    expect((await caches.keys()).sort()).toEqual(
      [shellCacheName('v1'), shellCacheName('v2'), 'someone-else'].sort(),
    );
    await v2.dispatch('activate');

    expect((await caches.keys()).sort()).toEqual([
      shellCacheName('v2'),
      'someone-else',
    ]);
    expect(v2.scope.clients.claim).toHaveBeenCalled();
  });
});

describe('fetch', () => {
  async function installed() {
    const v1 = worker('v1', new FakeCacheStorage());
    await v1.dispatch('install');
    return v1;
  }

  it('answers a shell file from the cache, ignoring the query string', async () => {
    const v1 = await installed();
    const { responded, result } = await v1.dispatch('fetch', {
      request: v1.request(`${ROOT}assets/main-abc.js?v=2`),
    });
    expect(responded).toBe(true);
    expect(await (result as Response).text()).toBe(`cached ${ROOT}assets/main-abc.js`);
    expect(v1.scope.fetch).not.toHaveBeenCalled();
    // Module scripts carry an Origin header and come back with Vary: Origin;
    // honouring it missed every script offline in the first e2e run.
    const cache = await (v1.scope.caches as unknown as FakeCacheStorage).open(
      shellCacheName('v1'),
    );
    expect(cache.lastOptions).toEqual({ ignoreSearch: true, ignoreVary: true });
  });

  it('answers every navigation with the cached page, so it opens offline', async () => {
    const v1 = await installed();
    const { result } = await v1.dispatch('fetch', {
      request: v1.request(`${ROOT}?from=homescreen`, 'GET', 'navigate'),
    });
    expect(await (result as Response).text()).toBe(`cached ${ROOT}`);
  });

  it('goes to the network for a same-origin file outside the shell', async () => {
    const v1 = await installed();
    const { result } = await v1.dispatch('fetch', {
      request: v1.request(`${ROOT}other.json`),
    });
    expect(await (result as Response).text()).toBe(`network ${ROOT}other.json`);
  });

  it('never touches an API call', async () => {
    const v1 = await installed();
    for (const request of [
      v1.request('https://api.anthropic.com/v1/messages', 'POST'),
      v1.request('https://api.anthropic.com/v1/models'),
      v1.request(`${ROOT}assets/main-abc.js`, 'POST'),
    ]) {
      const { responded } = await v1.dispatch('fetch', { request });
      expect(responded, request.url).toBe(false);
    }
    expect(servedFromShell({ method: 'GET', url: `${ROOT}x` }, ORIGIN)).toBe(true);
  });

  it('counts only this worker’s older caches as stale', () => {
    const current = shellCacheName('v2');
    expect(isStaleShell(shellCacheName('v1'), current)).toBe(true);
    expect(isStaleShell(current, current)).toBe(false);
    expect(isStaleShell('someone-else', current)).toBe(false);
  });
});

describe('the shell version', () => {
  const files = new Map<string, string>([
    ['index.html', '<html>'],
    ['assets/main-abc.js', 'code'],
  ]);

  it('does not depend on the order the files were listed in', () => {
    const reversed = new Map([...files].reverse());
    expect(shellVersion(reversed)).toBe(shellVersion(files));
  });

  it('changes when any file changes, so a deploy installs a new worker', () => {
    const edited = new Map(files).set('index.html', '<html lang="fr">');
    expect(shellVersion(edited)).not.toBe(shellVersion(files));
  });
});
