/**
 * The sheet behaviour `aria-modal` promises: the page behind is inert, Tab
 * stays inside, and focus returns to the opener (review of 14 Nov,
 * « Accessibility and copy »).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { modal } from '../src/platform/modal';

function page(): { opener: HTMLButtonElement; nav: HTMLElement; sheet: HTMLElement } {
  document.body.innerHTML = `
    <main>
      <button id="opener">Ouvrir</button>
      <p>Derrière</p>
      <div id="sheet">
        <button id="first">Fermer</button>
        <input id="middle" />
        <button id="last" data-autofocus>Enregistrer</button>
      </div>
    </main>
    <nav id="nav"><a href="#/">Phrase</a></nav>`;
  const opener = document.getElementById('opener') as HTMLButtonElement;
  opener.focus();
  return {
    opener,
    nav: document.getElementById('nav') as HTMLElement,
    sheet: document.getElementById('sheet') as HTMLElement,
  };
}

function tab(target: HTMLElement, shiftKey = false): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('a sheet', () => {
  it('makes everything outside it inert, its own ancestors excepted', () => {
    const { opener, nav, sheet } = page();
    const handle = modal(sheet);
    expect(nav.hasAttribute('inert')).toBe(true);
    expect(opener.hasAttribute('inert')).toBe(true);
    expect(document.querySelector('p')?.hasAttribute('inert')).toBe(true);
    expect(document.querySelector('main')?.hasAttribute('inert')).toBe(false);
    expect(sheet.hasAttribute('inert')).toBe(false);
    handle.destroy();
  });

  it('focuses the element marked data-autofocus', () => {
    const { sheet } = page();
    const handle = modal(sheet);
    expect(document.activeElement?.id).toBe('last');
    handle.destroy();
  });

  it('wraps Tab from the last element to the first, and Shift+Tab back', () => {
    const { sheet } = page();
    const handle = modal(sheet);
    const last = document.getElementById('last') as HTMLElement;
    const first = document.getElementById('first') as HTMLElement;

    last.focus();
    expect(tab(last).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);

    expect(tab(first, true).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);

    const middle = document.getElementById('middle') as HTMLElement;
    middle.focus();
    expect(tab(middle).defaultPrevented).toBe(false);
    handle.destroy();
  });

  it('releases what it made inert, and only that, and returns focus to the opener', () => {
    const { opener, nav, sheet } = page();
    const before = document.createElement('aside');
    before.setAttribute('inert', '');
    document.body.append(before);

    modal(sheet).destroy();
    expect(nav.hasAttribute('inert')).toBe(false);
    expect(opener.hasAttribute('inert')).toBe(false);
    expect(before.hasAttribute('inert')).toBe(true);
    expect(document.activeElement).toBe(opener);
  });
});
