/**
 * The rebuild's database, `catala-v2`.
 *
 * A fresh start: the vanilla database is left untouched in the browser and
 * never opened, so nothing here names it. Version 1 declares no stores; phase 1
 * adds `phrases`, `events` and `reports` as version 2, each following the rules
 * in ./sync.ts.
 *
 * A factory over a plain Dexie instance rather than a Dexie subclass: with this
 * repository's compiler settings, any `transaction` call on a subclass exceeds
 * TypeScript's instantiation depth. Dexie opens lazily on the first query, so
 * constructing it at import time costs nothing until something reads or writes.
 */
import Dexie from 'dexie';
import { backupPort } from './backup';

export const DATABASE_NAME = 'catala-v2';

export function createCatalaDatabase(name: string = DATABASE_NAME): Dexie {
  const database = new Dexie(name);
  database.version(1).stores({});
  return database;
}

export const db = createCatalaDatabase();

/** Export and import for this database, as the settings sheet uses them. */
export const backup = backupPort(db);
