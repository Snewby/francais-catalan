/**
 * Phase 0 settings sheet: the API key saved, replaced and cleared; export then
 * import round-trips; a file with an unknown schemaVersion is refused in
 * French and changes nothing.
 */
import { getDefaultNormalizer, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readApiKey } from '../src/api/anthropic';
import {
  BACKUP_SCHEMA_VERSION,
  BackupRejected,
  backupPort,
  parseBackup,
} from '../src/db/backup';
import { newSyncFields } from '../src/db/sync';
import { fr } from '../src/i18n/fr';
import App from '../src/ui/App.svelte';
import SettingsSheet from '../src/ui/SettingsSheet.svelte';

/**
 * French copy carries narrow no-break spaces, which the default normaliser
 * collapses to ordinary spaces before comparing against the unnormalised query.
 */
const exact = { normalizer: getDefaultNormalizer({ collapseWhitespace: false }) };

function keyInput(): HTMLInputElement {
  return screen.getByLabelText(fr.apiKey.prompt, exact) as HTMLInputElement;
}

let database: Dexie;
let saved: { name: string; text: string }[];

function sheet(): ReturnType<typeof render> {
  return render(SettingsSheet, {
    onclose: () => {},
    backup: backupPort(database),
    save: (name: string, text: string) => saved.push({ name, text }),
  });
}

function jsonFile(content: unknown): File {
  return new File([JSON.stringify(content)], 'backup.json', {
    type: 'application/json',
  });
}

function status(text: string): HTMLElement {
  return screen.getByText(text, { selector: '[role="status"]', ...exact });
}

beforeEach(() => {
  localStorage.clear();
  saved = [];
  // A database with a sync-shaped table, standing in for the phase 1 stores:
  // catala-v2 itself declares none yet.
  database = new Dexie(`settings-test-${crypto.randomUUID()}`);
  database.version(1).stores({ notes: 'id, updatedAt' });
});

afterEach(async () => {
  await database.delete();
  localStorage.clear();
});

describe('API key', () => {
  it('saves a key and says one is stored, without showing it', async () => {
    const user = userEvent.setup();
    sheet();
    expect(screen.getByText(fr.apiKey.missing)).toBeTruthy();

    await user.type(keyInput(), 'test-key-one');
    await user.click(screen.getByRole('button', { name: fr.apiKey.save }));

    expect(readApiKey()).toBe('test-key-one');
    expect(status(fr.apiKey.saved)).toBeTruthy();
    expect(screen.getByText(fr.apiKey.stored)).toBeTruthy();
    expect(keyInput().value).toBe('');
    expect(document.body.textContent).not.toContain('test-key-one');
  });

  it('replaces a stored key', async () => {
    localStorage.clear();
    const user = userEvent.setup();
    sheet();
    await user.type(keyInput(), 'test-key-one');
    await user.click(screen.getByRole('button', { name: fr.apiKey.save }));

    await user.type(keyInput(), 'test-key-two');
    await user.click(screen.getByRole('button', { name: fr.apiKey.replace }));

    expect(readApiKey()).toBe('test-key-two');
    expect(status(fr.apiKey.replaced)).toBeTruthy();
  });

  it('clears a stored key', async () => {
    const user = userEvent.setup();
    sheet();
    await user.type(keyInput(), 'test-key-one');
    await user.click(screen.getByRole('button', { name: fr.apiKey.save }));

    await user.click(screen.getByRole('button', { name: fr.apiKey.forget }));

    expect(readApiKey()).toBeNull();
    expect(status(fr.apiKey.forgotten)).toBeTruthy();
    expect(screen.getByText(fr.apiKey.missing)).toBeTruthy();
    expect(screen.queryByRole('button', { name: fr.apiKey.forget })).toBeNull();
  });

  it('ignores an empty or blank key', async () => {
    const user = userEvent.setup();
    sheet();
    await user.type(keyInput(), '   ');
    await user.click(screen.getByRole('button', { name: fr.apiKey.save }));
    expect(readApiKey()).toBeNull();
  });
});

describe('export and import', () => {
  it('round-trips: what is exported is what comes back after import', async () => {
    const rows = [
      { ...newSyncFields(1_000), text: "L'home acaba d'arribar" },
      { ...newSyncFields(2_000), text: 'col·lecció', deletedAt: 3_000 },
    ];
    await database.table('notes').bulkPut(rows);

    const user = userEvent.setup();
    sheet();
    await user.click(screen.getByRole('button', { name: fr.data.exportButton }));
    expect(status(fr.data.exported)).toBeTruthy();
    expect(saved).toHaveLength(1);
    const exported = saved[0];
    if (!exported) throw new Error('nothing exported');
    expect(exported.name).toMatch(/^settings-test-.+-\d{4}-\d{2}-\d{2}\.json$/);
    expect(JSON.parse(exported.text).schemaVersion).toBe(BACKUP_SCHEMA_VERSION);

    // Empty the table from the test side, then bring it back through the UI.
    await database.table('notes').clear();
    await user.upload(
      screen.getByLabelText(fr.data.importLabel),
      new File([exported.text], exported.name, { type: 'application/json' }),
    );
    await screen.findByText(fr.data.imported, { selector: '[role="status"]' });

    const back = await database.table('notes').orderBy('updatedAt').toArray();
    expect(back).toEqual(rows);
  });

  it('merges on import and never deletes a row the file does not mention', async () => {
    const kept = { ...newSyncFields(1_000), text: 'kept' };
    await database.table('notes').put(kept);
    const incoming = { ...newSyncFields(2_000), text: 'incoming' };

    await backupPort(database).importFile(
      JSON.stringify({
        schemaVersion: BACKUP_SCHEMA_VERSION,
        database: database.name,
        exportedAt: 0,
        tables: { notes: [incoming] },
      }),
    );

    expect(await database.table('notes').count()).toBe(2);
  });

  it('refuses an unknown schemaVersion in French and changes nothing', async () => {
    const before = { ...newSyncFields(1_000), text: 'before' };
    await database.table('notes').put(before);

    const user = userEvent.setup();
    sheet();
    await user.upload(
      screen.getByLabelText(fr.data.importLabel),
      jsonFile({
        schemaVersion: 99,
        database: database.name,
        exportedAt: 0,
        tables: { notes: [{ ...newSyncFields(), text: 'from the future' }] },
      }),
    );

    await screen.findByText(fr.data.importUnknownVersion, {
      selector: '[role="status"]',
      ...exact,
    });
    expect(fr.data.importUnknownVersion).toMatch(/^Fichier refusé/);
    expect(await database.table('notes').toArray()).toEqual([before]);
  });

  it('refuses unreadable files and unknown tables without writing', () => {
    expect(() => parseBackup('not json')).toThrow(BackupRejected);
    const unknownTable = JSON.stringify({
      schemaVersion: BACKUP_SCHEMA_VERSION,
      database: 'x',
      exportedAt: 0,
      tables: { nowhere: [{ id: 'a' }] },
    });
    return expect(backupPort(database).importFile(unknownTable)).rejects.toThrow(
      BackupRejected,
    );
  });
});

describe('opening the sheet', () => {
  it('opens from the gear in the Home header and closes again', async () => {
    window.location.hash = '#/';
    const user = userEvent.setup();
    render(App);
    expect(screen.queryByRole('dialog')).toBeNull();

    await user.click(screen.getByRole('button', { name: fr.settings.open }));
    expect(screen.getByRole('dialog', { name: fr.settings.heading })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: fr.settings.close }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
