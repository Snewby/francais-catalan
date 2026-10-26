/**
 * The rebuild starts fresh: the vanilla IndexedDB database is left untouched in
 * the browser and never opened. Checked behaviourally (every indexedDB.open
 * while the app runs, including an export, which opens catala-v2) and
 * structurally (no source names the old database).
 */
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DATABASE_NAME } from '../src/db/catala-v2';
import { fr } from '../src/i18n/fr';
import App from '../src/ui/App.svelte';
import { repoRoot } from './helpers/taxonomy';

/** The vanilla database's name, as the tag v1-vanilla's src/db/dexie.ts gave it. */
const LEGACY_NAME = 'francais-catalan';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the old IndexedDB database', () => {
  it('is never opened while the app runs, including on export', async () => {
    const open = vi.spyOn(indexedDB, 'open');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();

    window.location.hash = '#/';
    const user = userEvent.setup();
    render(App);
    await user.click(screen.getByRole('button', { name: fr.settings.open }));
    await user.click(screen.getByRole('button', { name: fr.data.exportButton }));
    await screen.findByText(fr.data.exported);

    const names = open.mock.calls.map(([name]) => name);
    // Positive control: the spy sees the new database being opened.
    expect(names).toContain(DATABASE_NAME);
    expect(names).not.toContain(LEGACY_NAME);
  });

  it('is not named anywhere in src/', () => {
    const files = readdirSync(path.join(repoRoot, 'src'), {
      recursive: true,
      withFileTypes: true,
    }).filter((entry) => entry.isFile() && /\.(ts|svelte)$/.test(entry.name));
    expect(files.length).toBeGreaterThan(20);

    const naming = files
      .map((entry) => path.join(entry.parentPath, entry.name))
      .filter((file) => {
        const source = readFileSync(file, 'utf8');
        return (
          source.includes(`'${LEGACY_NAME}'`) || source.includes(`"${LEGACY_NAME}"`)
        );
      });
    expect(naming).toEqual([]);
  });
});
