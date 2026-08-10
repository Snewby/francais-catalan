/**
 * The review loop: select an item, ask it, take the grade, write it once.
 *
 * This is the ONLY source of graded evidence in the application. Nothing else
 * may produce it, now or later: a grade is the learner's own judgement of a
 * recalled answer, and every other path in the application either shows the
 * answer before asking (lookup) or compares a typed attempt automatically
 * (recall). What each of those may move is EVIDENCE_EFFECTS' business.
 *
 * Headless on purpose. Phase 6 puts a face on this; the machinery, the
 * selection function and the write belong here.
 */
import { recordQuery, readAllComponentStates, type QueryOutcome } from '../db/persist';
import { db as defaultDatabase, type TrainerDatabase } from '../db/dexie';
import type { Direction, Intent, Rating } from '../srs/evidence';
import { LEAVES, leafById } from '../taxonomy';
import { buildReviewItem, type ReviewItem } from './item';
import { toGradedQueryLog } from './item';
import { dueSelector, type SelectionCandidate, type Selector } from './select';

/** How many items one session asks for by default. */
export const DEFAULT_SESSION_LIMIT = 10;

export interface ReviewSessionOptions {
  /** Defaults to `due`. A second selector needs no change here or below. */
  readonly selector?: Selector;
  readonly direction?: Direction;
  /**
   * Overrides the intent the direction implies. The later `assess` selector
   * logs its reviews under the `assess` intent through this, which is the whole
   * of that intent: the same machinery under a different selection function.
   */
  readonly intent?: Intent;
  readonly limit?: number;
  /** Injectable so a session is reproducible in a test. */
  readonly now?: () => number;
  readonly database?: TrainerDatabase;
}

/** Every leaf with its stored state, or its seed state if it has never been met. */
export async function readCandidates(
  database: TrainerDatabase = defaultDatabase,
): Promise<SelectionCandidate[]> {
  const states = await readAllComponentStates(database);
  return LEAVES.flatMap((leaf) => {
    const state = states.get(leaf.id);
    return state === undefined ? [] : [{ leaf, state }];
  });
}

/**
 * The queue for one session, built by asking the selector to rank every leaf.
 *
 * The database read happens here rather than inside the selector, so that a
 * selector stays a pure function over plain data.
 */
export async function selectReviewQueue(
  options: ReviewSessionOptions = {},
): Promise<ReviewItem[]> {
  const database = options.database ?? defaultDatabase;
  const selector = options.selector ?? dueSelector;
  const now = (options.now ?? Date.now)();
  const limit = options.limit ?? DEFAULT_SESSION_LIMIT;

  const candidates = await readCandidates(database);
  const byId = new Map(candidates.map((candidate) => [candidate.leaf.id, candidate]));

  return selector
    .select({ candidates, now })
    .slice(0, limit)
    .flatMap((componentId) => {
      const leaf = leafById(componentId);
      if (leaf === undefined) return [];
      return [
        buildReviewItem(leaf, {
          ...(options.direction === undefined ? {} : { direction: options.direction }),
          ...(options.intent === undefined ? {} : { intent: options.intent }),
          reviewCount: byId.get(componentId)?.state.mastery.graded_review_count ?? 0,
        }),
      ];
    });
}

/** Thrown when a grade arrives with nothing left to grade. */
export class NoCurrentItemError extends Error {
  constructor() {
    super('The session has no current item to grade.');
    this.name = 'NoCurrentItemError';
  }
}

/**
 * One pass over a queue: ask, grade, move on.
 *
 * The queue is fixed when the session starts. Re-selecting after every grade
 * would let a card the learner just failed come straight back inside the same
 * session, which is the thing the FSRS schedule decides rather than the loop.
 */
export class ReviewSession {
  private index = 0;

  constructor(
    readonly items: readonly ReviewItem[],
    private readonly database: TrainerDatabase,
    private readonly now: () => number,
  ) {}

  current(): ReviewItem | undefined {
    return this.items[this.index];
  }

  get completed(): number {
    return this.index;
  }

  get remaining(): number {
    return this.items.length - this.index;
  }

  get finished(): boolean {
    return this.remaining === 0;
  }

  /**
   * Grades the current item and advances.
   *
   * The record is written through `recordQuery`, which is the one write path:
   * it dedupes the components, carries the learner rating across them and
   * refuses an out-of-vocabulary ID. The item advances only once that write has
   * resolved, so a failed write leaves the session where it was rather than
   * silently skipping a card.
   */
  async grade(rating: Rating): Promise<QueryOutcome> {
    const item = this.current();
    if (item === undefined) throw new NoCurrentItemError();

    const outcome = await recordQuery(
      { queryLog: toGradedQueryLog(item, rating, this.now()) },
      this.database,
    );
    this.index += 1;
    return outcome;
  }
}

export async function startReviewSession(
  options: ReviewSessionOptions = {},
): Promise<ReviewSession> {
  return new ReviewSession(
    await selectReviewQueue(options),
    options.database ?? defaultDatabase,
    options.now ?? Date.now,
  );
}
