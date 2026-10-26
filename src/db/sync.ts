/**
 * The row rules every store follows from phase 0 on, so sync can be added
 * later without a migration.
 *
 * - The primary key is a UUID generated on the device, never an auto-increment,
 *   so two devices cannot mint the same key.
 * - Every row carries createdAt, updatedAt and deletedAt (ms since epoch).
 *   Rows are never hard-deleted: deletedAt is set instead, so a deletion can
 *   travel to another device.
 * - Rows never hold the API key or anything derived from it.
 */

export interface SyncFields {
  readonly id: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly deletedAt: number | null;
}

/** The sync fields for a row created now. */
export function newSyncFields(now: number = Date.now()): SyncFields {
  return { id: crypto.randomUUID(), createdAt: now, updatedAt: now, deletedAt: null };
}
