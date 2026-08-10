/**
 * A review item, built from the taxonomy rather than from the model.
 *
 * Every leaf carries authored `examples` and a `ca` form, so an item needs no
 * API call, no new response shape and nothing further the model can get wrong.
 * The limit of that choice is recorded in data/sources.md: the authored data
 * holds no French translation of any example, so a review is a rule-recall item
 * and not a translation exercise.
 *
 * The logged record is the phase 4 `QueryLog` shape, because `recordQuery` takes
 * that and there is one write path. What each field holds for a locally
 * generated item is argued in data/sources.md under phase 5b.
 */
import type { QueryLog } from '../api/anthropic';
import type { ComponentId } from '../api/schema';
import { validateQueryLog } from '../api/validate';
import {
  INTENT_FOR_DIRECTION,
  type Direction,
  type Intent,
  type Rating,
} from '../srs/evidence';
import type { LeafNode } from '../taxonomy';

/** Thrown when an assembled review record does not satisfy the generated schema. */
export class MalformedReviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MalformedReviewError';
  }
}

export interface ReviewItem {
  readonly componentId: string;
  readonly intent: Intent;
  readonly direction: Direction;
  /** What the learner is shown before grading. */
  readonly prompt: string;
  /** What they should have answered, shown on reveal. */
  readonly reference: string;
  /** The component's own Catalan surface form, which is what the log carries. */
  readonly ca: string;
  /** The French explanation. The only French-language field in the record. */
  readonly answer: string;
}

export interface ItemOptions {
  readonly direction?: Direction;
  readonly intent?: Intent;
  /**
   * How many graded reviews this component has already had, which picks the
   * example. Rotating rather than choosing at random keeps a session
   * reproducible and still varies the sentence across repetitions.
   */
  readonly reviewCount?: number;
}

/** The example this repetition shows, rotating through the authored list. */
export function exampleFor(leaf: LeafNode, reviewCount: number): string {
  const examples = leaf.examples;
  if (examples.length === 0) return leaf.ca;
  const index = ((reviewCount % examples.length) + examples.length) % examples.length;
  return examples[index] ?? leaf.ca;
}

export function buildReviewItem(leaf: LeafNode, options: ItemOptions = {}): ReviewItem {
  const direction = options.direction ?? 'ca_to_fr';
  const example = exampleFor(leaf, options.reviewCount ?? 0);
  const gloss = leaf.glosses.fr;

  return {
    componentId: leaf.id,
    intent: options.intent ?? INTENT_FOR_DIRECTION[direction],
    direction,
    prompt: direction === 'ca_to_fr' ? example : gloss,
    reference: direction === 'ca_to_fr' ? gloss : leaf.ca,
    ca: leaf.ca,
    answer: gloss,
  };
}

/**
 * The graded record for a completed review.
 *
 * The decomposition names exactly one component. `recordQuery` applies a record
 * to every component it lists, and a grade is a judgement about the one thing
 * that was asked: crediting the rules incidentally present in the example
 * sentence would move mastery for structures the learner never demonstrated.
 *
 * `rating` is present because the evidence is graded. That rule is the
 * generated conditional in QUERY_LOG_SCHEMA and is checked below by running the
 * assembled record through it, rather than restated here.
 */
export function toGradedQueryLog(
  item: ReviewItem,
  rating: Rating,
  askedAt: number,
): QueryLog {
  const queryLog: QueryLog = {
    asked_at: askedAt,
    question: item.prompt,
    intent: item.intent,
    direction: item.direction,
    evidence: 'graded',
    rating,
    decomposition: [{ id: item.componentId as ComponentId, ca: item.ca }],
    answer: item.answer,
    // The component's own Catalan form is the whole utterance for a review
    // card, because a card is one rule and its form.
    answer_ca: item.ca,
    answer_lang: 'fr',
  };

  const result = validateQueryLog(queryLog);
  if (!result.valid) {
    throw new MalformedReviewError(
      `The review record failed the schema: ${result.errors.join('; ')}`,
    );
  }
  return queryLog;
}
