/**
 * What `aria-modal` promises and the browser does not do by itself: the page
 * behind a sheet is out of reach, Tab stays inside the sheet, and focus goes
 * back to whatever opened it (review of 14 Nov, « Accessibility and copy »).
 *
 * A Svelte action, applied as `use:modal` on the sheet's root. It owns the
 * initial focus too, so the opener is read before anything inside the sheet
 * takes focus: the element marked `data-autofocus` if there is one, else the
 * first focusable element.
 */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/** Focusable elements inside `root`, in document order, visually hidden ones included. */
export function focusableIn(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => !element.hidden && element.closest('[inert]') === null,
  );
}

/**
 * Makes every element outside `node` inert, by marking the siblings of `node`
 * and of each of its ancestors up to `<body>`. Returns what it marked, so only
 * those are released: something already inert stays inert.
 */
function inertOutside(node: HTMLElement): Element[] {
  const marked: Element[] = [];
  const body = node.ownerDocument.body;
  for (let current: Element = node; current !== body;) {
    const parent = current.parentElement;
    if (parent === null) break;
    for (const sibling of parent.children) {
      if (sibling !== current && !sibling.hasAttribute('inert')) {
        sibling.setAttribute('inert', '');
        marked.push(sibling);
      }
    }
    current = parent;
  }
  return marked;
}

export function modal(node: HTMLElement): { destroy(): void } {
  const opener = node.ownerDocument.activeElement;
  const marked = inertOutside(node);

  const first =
    node.querySelector<HTMLElement>('[data-autofocus]') ?? focusableIn(node)[0];
  first?.focus();

  function trap(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const focusable = focusableIn(node);
    const head = focusable[0];
    const tail = focusable[focusable.length - 1];
    if (head === undefined || tail === undefined) return;
    const active = node.ownerDocument.activeElement;
    if (event.shiftKey && (active === head || !node.contains(active))) {
      event.preventDefault();
      tail.focus();
    } else if (!event.shiftKey && (active === tail || !node.contains(active))) {
      event.preventDefault();
      head.focus();
    }
  }
  node.addEventListener('keydown', trap);

  return {
    destroy() {
      node.removeEventListener('keydown', trap);
      for (const element of marked) element.removeAttribute('inert');
      // The opener may have gone with the sheet (a variant tap re-rendering
      // the anatomy); focus then stays where the browser puts it.
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    },
  };
}
