/**
 * The write path for the exposure, mastery and Elo signals.
 *
 * `recordQuery` is the ONE write path in the application. Nothing here decides
 * what an evidence type may move: that is `applyEvidence`, which reads
 * EVIDENCE_EFFECTS.
 *
 * The reads live in `./read`, which this module imports and which never imports
 * this one. The split is what lets the browser's no-evidence ban be narrowed to
 * the write path rather than deleted when the heatmap needs to read state; see
 * the header of test/browser-emits-no-evidence.test.ts.
 */
import type { QueryLog as DecomposedQuery } from '../api/anthropic';
import { leafById } from '../taxonomy';
import { applyEvidence, type ComponentState } from '../srs/apply';
import {
  SNAPSHOT_VERSION,
  UnknownComponentError,
  readComponentState,
  readLearnerElo,
  type Snapshot,
} from './read';
import {
  LEARNER_ID,
  db as defaultDatabase,
  type ComponentMastery,
  type QueryLog,
  type TrainerDatabase,
} from './dexie';

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
    answerCa: queryLog.answer_ca,
    // Absent rather than empty when the record carries no translation, so that
    // "has a pair" is a question the corpus can be asked.
    ...(queryLog.answer_fr === undefined ? {} : { answerFr: queryLog.answer_fr }),
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
