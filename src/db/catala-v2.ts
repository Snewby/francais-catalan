/**
 * The rebuild's database, `catala-v2`.
 *
 * A fresh start: the vanilla database is left untouched in the browser and
 * never opened, so nothing here names it. Version 1 declared no stores; phase 1
 * adds `phrases`, `events` and `reports` as version 2, each following the rules
 * in ./sync.ts. Their row shapes are in ./rows.ts.
 *
 * A factory over a plain Dexie instance rather than a Dexie subclass: with this
 * repository's compiler settings, any `transaction` call on a subclass exceeds
 * TypeScript's instantiation depth. Dexie opens lazily on the first query, so
 * constructing it at import time costs nothing until something reads or writes.
 */
import Dexie, { type Table } from 'dexie';
import { backupPort } from './backup';
import type { EventRow, PhraseRow, ReportRow } from './rows';

export const DATABASE_NAME = 'catala-v2';

export function createCatalaDatabase(name: string = DATABASE_NAME): Dexie {
  const database = new Dexie(name);
  database.version(1).stores({});
  // Primary key first, then the indexes a query needs: phrases by cache key
  // and age (recents), events and reports by the phrase they belong to.
  database.version(2).stores({
    phrases: 'id, inputKey, createdAt',
    events: 'id, componentId, phraseId, at',
    reports: 'id, phraseId, at',
  });
  return database;
}

export const phrasesOf = (database: Dexie): Table<PhraseRow, string> =>
  database.table('phrases');
export const eventsOf = (database: Dexie): Table<EventRow, string> =>
  database.table('events');
export const reportsOf = (database: Dexie): Table<ReportRow, string> =>
  database.table('reports');

export const db = createCatalaDatabase();

/** Export and import for this database, as the settings sheet uses them. */
export const backup = backupPort(db);
