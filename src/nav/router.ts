/**
 * Hash routes, hand-rolled.
 *
 * GitHub Pages has no rewrites, so a path route such as /carnet 404s on reload.
 * A hash route survives reload and back, and parsing six shapes does not need a
 * router package. Pure functions only: the shell owns the listener, so this
 * module is testable without a window.
 */

export type Route =
  | { readonly name: 'home' }
  | { readonly name: 'phrase'; readonly id: string }
  | { readonly name: 'notion'; readonly id: string }
  | { readonly name: 'carnet' }
  | { readonly name: 'reviser' }
  | { readonly name: 'carte' };

export type RouteName = Route['name'];

/** The four bottom-nav tabs, in canvas order. Phrase is Home. */
export const TABS = ['phrase', 'carnet', 'reviser', 'carte'] as const;
export type Tab = (typeof TABS)[number];

const HOME: Route = { name: 'home' };

/**
 * Reads a location hash. Anything unrecognised is Home, so a stale or mistyped
 * link lands somewhere usable rather than on a blank screen.
 */
export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '');
  const [first, second, ...rest] = path.split('/').filter((part) => part !== '');
  if (rest.length > 0) return HOME;

  switch (first) {
    case undefined:
      return HOME;
    case 'carnet':
    case 'reviser':
    case 'carte':
      return second === undefined ? { name: first } : HOME;
    case 'phrase':
    case 'notion':
      return second === undefined
        ? HOME
        : { name: first, id: decodeURIComponent(second) };
    default:
      return HOME;
  }
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'phrase':
    case 'notion':
      return `#/${route.name}/${encodeURIComponent(route.id)}`;
    default:
      return `#/${route.name}`;
  }
}

/** The tab a route belongs to, or null for a sheet reached from inside a tab. */
export function tabFor(route: Route): Tab | null {
  switch (route.name) {
    case 'home':
    case 'phrase':
      return 'phrase';
    case 'notion':
      return null;
    default:
      return route.name;
  }
}

export function tabHref(tab: Tab): string {
  return tab === 'phrase' ? hrefFor(HOME) : hrefFor({ name: tab });
}
