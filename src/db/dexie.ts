import Dexie, { type EntityTable } from 'dexie';
import type { Direction, Evidence, Intent, Rating } from '../srs/evidence';

/**
 * Local persistence. Phase 5 fills in the FSRS and Elo state; phase 0 fixes the
 * store names and keys so the migration path starts from something stable.
 */

export interface ComponentMastery {
  /** Taxonomy component ID. Must exist in taxonomy.json. */
  componentId: string;

  /** Exposure: how often this component has been met, in any way at all. */
  exposureCount: number;

  /** Mastery: how many graded reviews have advanced FSRS for this component. */
  gradedReviewCount: number;

  /** FSRS state. Advanced only by graded evidence. */
  stability: number;
  difficulty: number;

  /** Relative strength, moved by recall attempts and graded reviews alike. */
  elo: number;

  lastReviewed: number | null;
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
}

export class TrainerDatabase extends Dexie {
  mastery!: EntityTable<ComponentMastery, 'componentId'>;
  queries!: EntityTable<QueryLog, 'id'>;

  constructor(name = 'francais-catalan') {
    super(name);
    this.version(1).stores({
      mastery: '&componentId, elo, lastReviewed, exposureCount, gradedReviewCount',
      queries: '++id, askedAt, intent, evidence',
    });
  }
}

export const db = new TrainerDatabase();
