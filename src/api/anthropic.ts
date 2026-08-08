/**
 * Anthropic API client.
 *
 * Phase 0 defines the shape only. Phase 4 implements the call, the cached
 * taxonomy prefix and the structured-output wiring.
 *
 * The API key is entered at runtime and kept in localStorage. It is never
 * hardcoded, never committed and never written to a file.
 */

const API_KEY_STORAGE_KEY = 'anthropic-api-key';

export const MODEL = 'claude-haiku-4-5';
export const ANTHROPIC_VERSION = '2023-06-01';

export interface Decomposition {
  /** Component IDs and Catalan surface forms only. Never French prose. */
  readonly components: readonly string[];
  /** The only French-language field in the response. */
  readonly answer: string;
  readonly answer_lang: 'fr';
}

export function readApiKey(storage: Storage = localStorage): string | null {
  return storage.getItem(API_KEY_STORAGE_KEY);
}

export function storeApiKey(key: string, storage: Storage = localStorage): void {
  storage.setItem(API_KEY_STORAGE_KEY, key);
}

export function buildHeaders(apiKey: string): Record<string, string> {
  return {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': ANTHROPIC_VERSION,
    // Required for calls made straight from the browser rather than a server.
    'anthropic-dangerous-direct-browser-access': 'true',
  };
}

export interface CallOptions {
  readonly apiKey: string;
  readonly question: string;
  /**
   * Injectable so tests can pass a stub returning a recorded fixture. Keeps the
   * golden-set eval fully offline and free.
   */
  readonly fetchFn?: typeof fetch;
}

export function callHaiku(_options: CallOptions): Promise<Decomposition> {
  return Promise.reject(new Error('Not implemented until phase 4.'));
}
