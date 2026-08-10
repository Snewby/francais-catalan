import Dexie, { type EntityTable } from 'dexie';
import type { Direction, Evidence, Intent, Rating } from '../srs/evidence';
import type { SchedulingState } from '../srs/fsrs';

/**
 * Local persistence.
 *
 * Phase 0 fixed the store names and keys; phase 5 filled in the FSRS card and
 * added the learner rating. The row shape is a storage projection, not the
 * runtime state: it is flat and camelCase because the indexes were declared
 * that way in version 1, while the runtime state in src/srs/ is nested and
 * snake_case because that is what the taxonomy seed uses. src/db/persist.ts
 * holds the one mapping between them, and a round-trip test holds it honest.
 */

export interface ComponentMastery {
  /** Taxonomy component ID. Must exist in taxonomy.json. */
  componentId: string;

  /** Exposure: how often this component has been met, in any way at all. */
  exposureCount: number;

  /** Mastery: how many graded reviews have advanced FSRS for this component. */
  gradedReviewCount: number;

  /** FSRS state. Advanced only by graded evidence. */
  stability: number | null;
  difficulty: number | null;

  /**
   * Difficulty rating, moved by recall attempts and graded reviews alike.
   * Higher means harder. The learner's strength at this component is the
   * learner's own rating minus this one; see src/srs/elo.ts.
   */
  elo: number;

  lastReviewed: number | null;

  /** The rest of the ts-fsrs card, so scheduling survives a reload. */
  due: number | null;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  schedulingState: SchedulingState;
}

export interface QueryLog {
  id?: number;
  askedAt: number;
  question: string;
  componentIds: string[];

  /** What the user was trying to do. All intents share one decomposition payload. */
  intent: Intent;
  direction: Direction;

  /** How much this tells us about what the user knows. Routing: src/srs/evidence.ts. */
  evidence: Evidence;

  /** Present if and only if evidence is 'graded'. */
  rating?: Rating;

  /**
   * The matched pair, kept so the corpus survives the reply that carried it.
   *
   * Both are optional and for different reasons. `answerFr` is absent on a
   * review record, which has no translation to give. Both are absent on any row
   * written before phase 6c, which is why neither can be declared required
   * without the type lying about rows already in a browser.
   *
   * No Dexie version bump: neither is indexed, and a version is a schema of
   * indexes rather than of fields.
   */
  answerCa?: string;
  answerFr?: string;
}

/**
 * A reply the learner marked as suspect.
 *
 * SEPARATE FROM `queries` ON PURPOSE. A query row says what the learner did and
 * exists to schedule them; this says the model looked wrong and exists to be
 * read by a human later. Different subject, different lifetime, different
 * reader.
 *
 * It holds the whole reply rather than a reference to one, because `queries`
 * stores a projection: component IDs, not the explanation, and not the Catalan
 * forms the reply attached to them. Without those a signal names a problem
 * nobody can look at. Only signalled replies are stored this way, so ordinary
 * use does not accumulate every French paragraph the model has ever written.
 *
 * SIGNALLING IS NOT EVIDENCE. It moves no exposure, no mastery and no rating;
 * see src/srs/evidence.ts for what may. A learner who thinks an answer is wrong
 * has told us about the model, not about themselves.
 */
export interface SignalledReply {
  id?: number;
  signalledAt: number;
  /** The query row this reply was logged as, when it was logged at all. */
  queryId?: number;
  question: string;
  direction: Direction;
  /** The French explanation, verbatim. */
  answer: string;
  answerCa: string;
  answerFr: string;
  /** The decomposition as the reply gave it: the ID and the realising form. */
  components: { id: string; ca: string }[];
  /** Forms the client could not anchor in `answerCa`. Empty on a clean reply. */
  unverified: string[];
}

/**
 * The learner's own Elo rating, the other side of every component's.
 *
 * A single row rather than a scalar in localStorage, so that it lives in the
 * same transaction as the component it was updated against: a crash between
 * the two would otherwise leave the two halves of one two-sided update
 * disagreeing, permanently and silently.
 */
export interface Learner {
  id: string;
  elo: number;
}

/** The key of the one learner row. There is a single user; see docs/01 Part 2. */
export const LEARNER_ID = 'learner';

export class TrainerDatabase extends Dexie {
  mastery!: EntityTable<ComponentMastery, 'componentId'>;
  queries!: EntityTable<QueryLog, 'id'>;
  learner!: EntityTable<Learner, 'id'>;
  signals!: EntityTable<SignalledReply, 'id'>;

  constructor(name = 'francais-catalan') {
    super(name);
    this.version(1).stores({
      mastery: '&componentId, elo, lastReviewed, exposureCount, gradedReviewCount',
      queries: '++id, askedAt, intent, evidence',
    });
    // Version 2 adds the learner rating. The version 1 stores are repeated
    // because Dexie treats each version as the full schema, not a delta, and
    // omitting one here would delete it.
    this.version(2).stores({
      mastery: '&componentId, elo, lastReviewed, exposureCount, gradedReviewCount, due',
      queries: '++id, askedAt, intent, evidence',
      learner: '&id',
    });
    // Version 3 adds signalled replies. A new store needs a version; the fields
    // added to `queries` in phase 6c did not, because a Dexie version declares
    // indexes rather than fields.
    this.version(3).stores({
      mastery: '&componentId, elo, lastReviewed, exposureCount, gradedReviewCount, due',
      queries: '++id, askedAt, intent, evidence',
      learner: '&id',
      signals: '++id, signalledAt',
    });
  }
}

export const db = new TrainerDatabase();
