/**
 * Persistence for the exposure, mastery and Elo signals.
 *
 * The one mapping between the runtime state in `src/srs/` and the stored row in
 * `./dexie`, plus the transaction that applies a logged query to every
 * component it touched. Nothing here decides what an evidence type may move:
 * that is `applyEvidence`, which reads EVIDENCE_EFFECTS.
 */
import type { QueryLog as DecomposedQuery } from '../api/anthropic';
import { leafById } from '../taxonomy';
import { DEFAULT_RATING } from '../srs/elo';
import { applyEvidence, initialStateFor, type ComponentState } from '../srs/apply';
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

export function toRow(componentId: string, state: ComponentState): ComponentMastery {
  return {
    componentId,
    exposureCount: state.exposure.exposure_count,
    gradedReviewCount: state.mastery.graded_review_count,
    stability: state.mastery.stability,
    difficulty: state.mastery.difficulty,
    elo: state.elo,
    lastReviewed: state.mastery.last_review,
    due: state.mastery.due,
    elapsedDays: state.mastery.elapsed_days,
    scheduledDays: state.mastery.scheduled_days,
    reps: state.mastery.reps,
    lapses: state.mastery.lapses,
    schedulingState: state.mastery.scheduling_state,
  };
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

export interface RecordedQuery {
  readonly queryLog: DecomposedQuery;
  /**
   * Objective outcome of the attempt, for evidence that moves Elo without
   * carrying a rating. Ignored by evidence types that move neither.
   */
  readonly correct?: boolean;
}

export interface QueryOutcome {
  readonly queryId: number;
  readonly learnerElo: number;
  readonly components: readonly ComponentMastery[];
}

/** Component IDs touched by a query, deduplicated in first-mention order. */
export function componentIdsOf(queryLog: DecomposedQuery): string[] {
  // One sentence realising a component twice is one encounter, not two: the
  // exposure counter answers "how often has this been met", not "how many
  // words matched".
  return [...new Set(queryLog.decomposition.map((entry) => entry.id))];
}

function toQueryRow(queryLog: DecomposedQuery): QueryLog {
  return {
    askedAt: queryLog.asked_at,
    question: queryLog.question,
    componentIds: componentIdsOf(queryLog),
    intent: queryLog.intent,
    direction: queryLog.direction,
    evidence: queryLog.evidence,
    ...(queryLog.rating === undefined ? {} : { rating: queryLog.rating }),
  };
}

/**
 * Writes the query and applies it to every component it touched, in one
 * transaction.
 *
 * The learner's rating is carried across the components of a single query
 * rather than recomputed from the stored value each time: each component is a
 * separate opponent, so a review that touches three of them is three outcomes,
 * and reading the stored rating three times would apply the first result three
 * times over.
 */
export async function recordQuery(
  record: RecordedQuery,
  database: TrainerDatabase = defaultDatabase,
): Promise<QueryOutcome> {
  const componentIds = componentIdsOf(record.queryLog);
  for (const componentId of componentIds) {
    if (leafById(componentId) === undefined)
      throw new UnknownComponentError(componentId);
  }

  return database.transaction(
    'rw',
    database.mastery,
    database.queries,
    database.learner,
    async () => {
      const queryId = (await database.queries.add(
        toQueryRow(record.queryLog),
      )) as number;

      let learnerElo = await readLearnerElo(database);
      const components: ComponentMastery[] = [];

      for (const componentId of componentIds) {
        const before = await readComponentState(componentId, database);
        const outcome = applyEvidence(
          before,
          {
            evidence: record.queryLog.evidence,
            rating: record.queryLog.rating,
            correct: record.correct,
            at: record.queryLog.asked_at,
          },
          learnerElo,
        );
        learnerElo = outcome.learnerElo;

        const row = toRow(componentId, outcome.component);
        await database.mastery.put(row);
        components.push(row);
      }

      await database.learner.put({ id: LEARNER_ID, elo: learnerElo });

      return { queryId, learnerElo, components };
    },
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

export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

/**
 * Replaces the stored state with the snapshot, or leaves it untouched.
 *
 * Validated before anything is written and replaced rather than merged: an
 * import that half-applied would leave a learner rating that no component's
 * rating was ever computed against, and a merge would have to invent a rule
 * for a component present in both.
 */
export async function importSnapshot(
  snapshot: Snapshot,
  database: TrainerDatabase = defaultDatabase,
): Promise<void> {
  if (snapshot.version !== SNAPSHOT_VERSION) {
    throw new SnapshotError(
      `Snapshot format ${String(snapshot.version)} is not ${String(SNAPSHOT_VERSION)}.`,
    );
  }
  for (const row of snapshot.mastery) {
    if (leafById(row.componentId) === undefined) {
      throw new UnknownComponentError(row.componentId);
    }
  }
  for (const query of snapshot.queries) {
    for (const componentId of query.componentIds) {
      if (leafById(componentId) === undefined)
        throw new UnknownComponentError(componentId);
    }
  }

  await database.transaction(
    'rw',
    database.mastery,
    database.queries,
    database.learner,
    async () => {
      await database.mastery.clear();
      await database.queries.clear();
      await database.learner.clear();
      await database.mastery.bulkPut([...snapshot.mastery]);
      await database.queries.bulkPut([...snapshot.queries]);
      await database.learner.put({ id: LEARNER_ID, elo: snapshot.learnerElo });
    },
  );
}
