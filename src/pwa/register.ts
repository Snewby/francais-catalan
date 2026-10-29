/**
 * Installable and offline: registers the service worker and asks the browser
 * to keep this origin's storage, so Chrome is less likely to clear the
 * learner's phrases under storage pressure.
 *
 * Production builds only: the dev server has no `sw.js`, and a worker left over
 * from a build would serve a stale shell over live reloading.
 */
export function registerShell(): void {
  if (!import.meta.env.PROD) return;
  if ('serviceWorker' in navigator) {
    // An enhancement: if registration fails, the app still works online.
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => undefined);
  }
  if ('storage' in navigator && 'persist' in navigator.storage) {
    void navigator.storage.persist();
  }
}
