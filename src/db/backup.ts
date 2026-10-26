/**
 * Export and import of the whole database as one JSON file.
 *
 * Generic over whatever tables the database declares, so it needs no change
 * when a phase adds a store. The file carries a schemaVersion, and a file with
 * a version this build does not know is refused before anything is written.
 *
 * IMPORT MERGES, IT DOES NOT REPLACE. Rows are never hard-deleted (see
 * ./sync.ts), so import upserts by UUID and leaves rows the file does not
 * mention alone. Clearing a table first would be exactly the hard delete the
 * sync rules forbid.
 */
import type Dexie from 'dexie';

export const BACKUP_SCHEMA_VERSION = 1;

export interface Backup {
  readonly schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  readonly database: string;
  readonly exportedAt: number;
  readonly tables: Readonly<Record<string, readonly unknown[]>>;
}

export type BackupRejection = 'unreadable' | 'unknown-version' | 'wrong-shape';

export class BackupRejected extends Error {
  constructor(readonly reason: BackupRejection) {
    super(`backup rejected: ${reason}`);
    this.name = 'BackupRejected';
  }
}

export async function exportDatabase(
  database: Dexie,
  now: number = Date.now(),
): Promise<Backup> {
  // Opened explicitly: a database that declares no stores yet would otherwise
  // never be opened at all, and the file would not prove it exists.
  await database.open();
  const tables: Record<string, unknown[]> = {};
  for (const table of database.tables) {
    tables[table.name] = await table.toArray();
  }
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    database: database.name,
    exportedAt: now,
    tables,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Parses and checks a backup file. The version is checked before the shape, so
 * a file from a later build is reported as such rather than as malformed.
 */
export function parseBackup(text: string): Backup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupRejected('unreadable');
  }
  if (!isRecord(parsed)) throw new BackupRejected('unreadable');
  if (parsed.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new BackupRejected('unknown-version');
  }

  const { database, exportedAt, tables } = parsed;
  if (typeof database !== 'string' || typeof exportedAt !== 'number') {
    throw new BackupRejected('wrong-shape');
  }
  if (!isRecord(tables)) throw new BackupRejected('wrong-shape');
  for (const rows of Object.values(tables)) {
    if (!Array.isArray(rows)) throw new BackupRejected('wrong-shape');
    for (const row of rows) {
      if (!isRecord(row) || typeof row.id !== 'string') {
        throw new BackupRejected('wrong-shape');
      }
    }
  }

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    database,
    exportedAt,
    tables: tables as Record<string, unknown[]>,
  };
}

/**
 * Writes a parsed backup in one transaction, so a failure part-way leaves the
 * database as it was. A table this build does not declare is refused rather
 * than silently dropped.
 */
export async function importBackup(database: Dexie, backup: Backup): Promise<void> {
  const known = new Set(database.tables.map((table) => table.name));
  const names = Object.keys(backup.tables);
  if (names.some((name) => !known.has(name))) {
    throw new BackupRejected('wrong-shape');
  }
  if (names.length === 0) return;

  await database.transaction('rw', names, async () => {
    for (const name of names) {
      await database.table(name).bulkPut([...(backup.tables[name] ?? [])]);
    }
  });
}

export function backupFileName(backup: Backup): string {
  const day = new Date(backup.exportedAt).toISOString().slice(0, 10);
  return `${backup.database}-${day}.json`;
}

/**
 * Export and import bound to one database, as the settings sheet uses them.
 * Components take this rather than a Dexie instance, so a test can hand the
 * sheet a database with tables in it without the sheet knowing about Dexie.
 */
export interface BackupPort {
  exportFile(): Promise<{ readonly name: string; readonly text: string }>;
  importFile(text: string): Promise<void>;
}

export function backupPort(database: Dexie): BackupPort {
  return {
    async exportFile() {
      const backup = await exportDatabase(database);
      return { name: backupFileName(backup), text: JSON.stringify(backup, null, 2) };
    },
    async importFile(text) {
      await importBackup(database, parseBackup(text));
    },
  };
}
