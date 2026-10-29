/**
 * Translations in flight, keyed by the phrase id the screen routes to.
 *
 * Home navigates to the Phrase screen at once (spec, « Home »), before the
 * reply exists, so the screen needs somewhere to read « still waiting » or
 * « failed, and why » that is not the database: a failed call stores nothing.
 * Held as reactive state so the screen redraws when the reply lands.
 */
import type Dexie from 'dexie';
import { readApiKey, type FailureKind } from '../api/anthropic';
import type { PhraseRow } from '../db/rows';
import { translateAndStore } from './store';

export type Translation =
  | { readonly status: 'pending'; readonly input: string }
  | {
      readonly status: 'error';
      readonly input: string;
      readonly kind: Exclude<FailureKind, 'cancelled'>;
    }
  | { readonly status: 'stored'; readonly row: PhraseRow };

const translations = $state<Record<string, Translation>>({});
// Bookkeeping, not state: nothing draws from it, so it stays non-reactive.
// eslint-disable-next-line svelte/prefer-svelte-reactivity
const controllers = new Map<string, AbortController>();

/** What is known about this id outside the database, if anything. Reactive. */
export function translationFor(id: string): Translation | undefined {
  return translations[id];
}

/**
 * Starts (or restarts, for « Réessayer ») the translation behind `id`. With
 * `force`, the cache is skipped and the stored row is rewritten in place.
 */
export function startTranslation(
  database: Dexie,
  id: string,
  input: string,
  options: { readonly force?: boolean } = {},
): Promise<void> {
  controllers.get(id)?.abort();
  const controller = new AbortController();
  controllers.set(id, controller);
  translations[id] = { status: 'pending', input };

  return translateAndStore(database, {
    input,
    id,
    apiKey: readApiKey(),
    signal: controller.signal,
    ...(options.force === true && { force: true }),
  }).then((outcome) => {
    if (controllers.get(id) !== controller) return;
    controllers.delete(id);
    if (outcome.status === 'stored') {
      translations[id] = { status: 'stored', row: outcome.row };
    } else if (outcome.kind === 'cancelled') {
      delete translations[id];
    } else {
      translations[id] = { status: 'error', input, kind: outcome.kind };
    }
  });
}

/** Back on the Phrase screen cancels the request; nothing is stored. */
export function cancelTranslation(id: string): void {
  const controller = controllers.get(id);
  if (controller === undefined) return;
  controller.abort();
  controllers.delete(id);
  delete translations[id];
}

/** Test seam: forgets every translation and aborts any still running. */
export function resetTranslations(): void {
  for (const controller of controllers.values()) controller.abort();
  controllers.clear();
  for (const id of Object.keys(translations)) delete translations[id];
}
