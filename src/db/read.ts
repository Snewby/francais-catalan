/**
 * Reading the stored state, and nothing else.
 *
 * This module exists so that the browser's no-evidence ban could be narrowed
 * rather than deleted. Phase 6 has to READ per-component state to colour a
 * heatmap node, which is legitimate; what stays banned is the write path. While
 * the reads and the writes lived in one module, the ban could only be all or
 * nothing, and the pressure was to delete it.
 *
 * NOTHING HERE WRITES. test/browser-emits-no-evidence.test.ts asserts that over
 * the source text, so the guarantee is a property of the file rather than of its
 * name. `src/db/persist.ts` imports from here; the dependency never runs the
 * other way.
 */
import { LEAVES, leafById } from '../taxonomy';
import { DEFAULT_RATING } from '../srs/elo';
import { initialStateFor, type ComponentState } from '../srs/apply';
import { freshMastery } from '../srs/fsrs';
import {
  LEARNER_ID,
  db as defaultDatabase,
  type ComponentMastery,
  type QueryLog,
  type TrainerDatabase,
} from './dexie';

/** Thrown when a stored or imported row names a component the taxonomy does not have. */
export class UnknownComponentError extends Error {
  constructor(componentId: string) {
    super(
      `${componentId} is not in taxonomy.json. The component-ID vocabulary is ` +
        'closed; see src/taxonomy/taxonomy.json.',
    );
    this.name = 'UnknownComponentError';
  }
}

export function fromRow(row: ComponentMastery): ComponentState {
  return {
    exposure: { exposure_count: row.exposureCount },
    mastery: {
      ...freshMastery(row.difficulty),
      stability: row.stability,
      graded_review_count: row.gradedReviewCount,
      due: row.due,
      last_review: row.lastReviewed,
      elapsed_days: row.elapsedDays,
      scheduled_days: row.scheduledDays,
      reps: row.reps,
      lapses: row.lapses,
      scheduling_state: row.schedulingState,
    },
    elo: row.elo,
  };
}

/** The seed state for a component never yet stored, from its contrast status. */
export function seedStateFor(componentId: string): ComponentState {
  const leaf = leafById(componentId);
  if (leaf === undefined) throw new UnknownComponentError(componentId);
  return initialStateFor(leaf);
}

export async function readLearnerElo(
  database: TrainerDatabase = defaultDatabase,
): Promise<number> {
  return (await database.learner.get(LEARNER_ID))?.elo ?? DEFAULT_RATING;
}

/** The stored state for one component, or its seed state if it has never been met. */
export async function readComponentState(
  componentId: string,
  database: TrainerDatabase = defaultDatabase,
): Promise<ComponentState> {
  const row = await database.mastery.get(componentId);
  return row === undefined ? seedStateFor(componentId) : fromRow(row);
}

/**
 * Every leaf's state in one read, unmet components included at their seed state.
 *
 * A selector ranks the whole taxonomy and a heatmap colours all of it, so the
 * alternative is 300 single-key gets. Keyed on LEAVES rather than on the stored
 * rows, because a component that has never been met has a seed state and no row,
 * and it is exactly those that a gaps ranking is about.
 */
export async function readAllComponentStates(
  database: TrainerDatabase = defaultDatabase,
): Promise<Map<string, ComponentState>> {
  const stored = new Map(
    (await database.mastery.toArray()).map((row) => [row.componentId, row]),
  );
  return new Map(
    LEAVES.map((leaf) => {
      const row = stored.get(leaf.id);
      return [leaf.id, row === undefined ? initialStateFor(leaf) : fromRow(row)];
    }),
  );
}

/**
 * The whole rolodex as one file.
 *
 * `version` is the snapshot format, not the Dexie schema version: an export
 * that cannot say which shape it is in can only be imported by guessing.
 */
export const SNAPSHOT_VERSION = 1;

export interface Snapshot {
  readonly version: number;
  readonly exportedAt: number;
  readonly learnerElo: number;
  readonly mastery: readonly ComponentMastery[];
  readonly queries: readonly QueryLog[];
}

export async function exportSnapshot(
  database: TrainerDatabase = defaultDatabase,
  now: number = Date.now(),
): Promise<Snapshot> {
  return {
    version: SNAPSHOT_VERSION,
    exportedAt: now,
    learnerElo: await readLearnerElo(database),
    mastery: await database.mastery.orderBy('componentId').toArray(),
    queries: await database.queries.orderBy('askedAt').toArray(),
  };
}
