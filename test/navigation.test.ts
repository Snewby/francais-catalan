/**
 * Phase 0 navigation: four tabs, hash routes, reload and back.
 *
 * Driven through window.location.hash, the same channel a tap, a reload and the
 * back button all use, so the shell is tested on the path a learner takes.
 */
import { render, screen } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';

import { fr } from '../src/i18n/fr';
import { TABS, hrefFor, parseHash, tabHref, type Route } from '../src/nav/router';
import App from '../src/ui/App.svelte';

/** Sets the hash and waits for the hashchange the shell listens to. */
async function go(hash: string): Promise<void> {
  // Setting the hash it already has fires no event, so there is nothing to wait for.
  if (window.location.hash === hash) return;
  const changed = new Promise<void>((resolve) => {
    window.addEventListener('hashchange', () => resolve(), { once: true });
  });
  window.location.hash = hash;
  await changed;
  flushSync();
}

async function back(): Promise<void> {
  const changed = new Promise<void>((resolve) => {
    window.addEventListener('hashchange', () => resolve(), { once: true });
  });
  window.history.back();
  await changed;
  flushSync();
}

function heading(): string {
  return screen.getByRole('heading', { level: 1 }).textContent ?? '';
}

function tabLink(tab: (typeof TABS)[number]): HTMLAnchorElement {
  return screen.getByRole('link', { name: fr.nav[tab] }) as HTMLAnchorElement;
}

/** The heading each tab's screen shows. Phrase is Home. */
const TAB_HEADING = {
  phrase: fr.app.title,
  carnet: fr.screens.carnet,
  reviser: fr.screens.reviser,
  carte: fr.screens.carte,
} as const;

afterEach(async () => {
  await go('#/');
});

describe('hash routes', () => {
  it('parses every route the spec names', () => {
    const cases: [string, Route][] = [
      ['', { name: 'home' }],
      ['#/', { name: 'home' }],
      ['#/phrase/abc-123', { name: 'phrase', id: 'abc-123' }],
      [
        '#/notion/VERB.ind.passat_perifrastic',
        { name: 'notion', id: 'VERB.ind.passat_perifrastic' },
      ],
      ['#/carnet', { name: 'carnet' }],
      ['#/reviser', { name: 'reviser' }],
      ['#/carte', { name: 'carte' }],
    ];
    for (const [hash, route] of cases) {
      expect(parseHash(hash), hash).toEqual(route);
      if (hash !== '') expect(parseHash(hrefFor(route))).toEqual(route);
    }
  });

  it('falls back to Home on anything it does not recognise', () => {
    for (const hash of ['#/nowhere', '#/carnet/extra', '#/phrase', '#/a/b/c']) {
      expect(parseHash(hash), hash).toEqual({ name: 'home' });
    }
  });
});

describe('bottom nav', () => {
  it('shows the four tabs in canvas order', () => {
    render(App);
    const nav = screen.getByRole('navigation', { name: fr.nav.label });
    const labels = [...nav.querySelectorAll('a')].map((link) => link.textContent);
    expect(labels).toEqual(TABS.map((tab) => fr.nav[tab]));
  });

  it('routes each tab to its screen and moves aria-current with it', async () => {
    render(App);
    for (const tab of TABS) {
      expect(tabLink(tab).getAttribute('href')).toBe(tabHref(tab));
      await go(tabHref(tab));
      expect(heading()).toBe(TAB_HEADING[tab]);
      for (const other of TABS) {
        expect(tabLink(other).getAttribute('aria-current'), `${tab} > ${other}`).toBe(
          other === tab ? 'page' : null,
        );
      }
    }
  });

  it('shows the stub line on each unbuilt tab', async () => {
    render(App);
    for (const tab of TABS.filter((name) => name !== 'phrase')) {
      await go(tabHref(tab));
      expect(screen.getByText(fr.stub.soon)).toBeTruthy();
    }
  });

  it('marks Phrase current on a phrase route and no tab on a notion sheet', async () => {
    render(App);
    await go('#/phrase/abc');
    expect(tabLink('phrase').getAttribute('aria-current')).toBe('page');
    await go('#/notion/VERB.ind.passat_perifrastic');
    for (const tab of TABS)
      expect(tabLink(tab).getAttribute('aria-current')).toBeNull();
  });
});

describe('reload and back', () => {
  it('draws the same screen when mounted fresh on any hash route', async () => {
    const routes: [string, string][] = [
      ['#/', fr.app.title],
      ['#/carnet', fr.screens.carnet],
      ['#/reviser', fr.screens.reviser],
      ['#/carte', fr.screens.carte],
      ['#/phrase/abc', fr.screens.phrase],
      ['#/notion/VERB.ind.passat_perifrastic', fr.screens.notion],
    ];
    for (const [hash, expected] of routes) {
      await go(hash === '#/' ? '#/carte' : '#/');
      await go(hash);
      // A fresh mount on the current hash is what a reload does.
      const { unmount } = render(App);
      expect(heading(), hash).toBe(expected);
      unmount();
    }
  });

  it('returns to the previous route on browser back', async () => {
    render(App);
    await go('#/carnet');
    await go('#/carte');
    expect(heading()).toBe(fr.screens.carte);

    await back();
    expect(heading()).toBe(fr.screens.carnet);
    expect(tabLink('carnet').getAttribute('aria-current')).toBe('page');
  });
});
