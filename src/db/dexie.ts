import Dexie, { type EntityTable } from 'dexie';

/**
 * Local persistence. Phase 5 fills in the FSRS and Elo state; phase 0 fixes the
 * store names and keys so the migration path starts from something stable.
 */

export interface ComponentMastery {
  /** Taxonomy component ID. Must exist in taxonomy.json. */
  componentId: string;
  stability: number;
  difficulty: number;
  elo: number;
  lastReviewed: number | null;
}

export interface QueryLog {
  id?: number;
  askedAt: number;
  question: string;
  componentIds: string[];
}

export class TrainerDatabase extends Dexie {
  mastery!: EntityTable<ComponentMastery, 'componentId'>;
  queries!: EntityTable<QueryLog, 'id'>;

  constructor(name = 'francais-catalan') {
    super(name);
    this.version(1).stores({
      mastery: '&componentId, elo, lastReviewed',
      queries: '++id, askedAt',
    });
  }
}

export const db = new TrainerDatabase();
