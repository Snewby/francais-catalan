/**
 * The review screen.
 *
 * A face on `src/review/`, and nothing more. Selection, item building and the
 * write all already exist and are already tested; this module asks, reveals and
 * passes the grade back. It reimplements none of them, and it is the reason
 * `startReviewSession` was built headless.
 *
 * A REVIEW IS A RULE-RECALL ITEM, NOT A TRANSLATION EXERCISE. The authored data
 * holds no French translation of any example, so the card asks which rule an
 * énoncé illustrates, or which Catalan form realises a rule. The copy says so,
 * because a card that looked like a translation prompt would be marked against
 * a reference that is not one.
 *
 * The grade is the learner's own judgement, which is what makes this the only
 * source of graded evidence. The four buttons are that judgement; nothing here
 * infers it.
 */
import { fr, labelled } from '../i18n/fr';
import { leafById } from '../taxonomy';
import { startReviewSession, type ReviewSession } from '../review/session';
import type { ReviewItem } from '../review/item';
import { RATINGS, type Direction, type Rating } from '../srs/evidence';

const RATING_LABEL: Record<Rating, string> = {
  again: fr.review.ratingAgain,
  hard: fr.review.ratingHard,
  good: fr.review.ratingGood,
  easy: fr.review.ratingEasy,
};

export interface ReviewViewOptions {
  readonly start?: typeof startReviewSession;
  /** Called after each grade, so the coverage map can be refreshed. */
  readonly onGraded?: () => void;
}

export function mountReviewView(
  host: HTMLElement,
  options: ReviewViewOptions = {},
): void {
  const start = options.start ?? startReviewSession;
  let session: ReviewSession | null = null;
  let revealed = false;
  let busy = false;
  /**
   * Which way the next session runs.
   *
   * Both directions have been implemented in `buildReviewItem` since 5b and
   * `fr.review.askFrToCa` has been authored the whole time, and no caller ever
   * passed one, so `fr_to_ca` was unreachable. Recognising which rule a sentence
   * illustrates and producing the Catalan form of a rule are different skills
   * and only the first was ever asked for.
   *
   * Fixed at session start rather than per card, because the queue is frozen
   * when the session opens and a control that changed mid-session would relabel
   * cards already answered.
   */
  let direction: Direction = 'ca_to_fr';

  const root = document.createElement('section');
  root.className = 'ac-view ac-review';

  const heading = document.createElement('h2');
  heading.className = 'ac-heading';
  heading.textContent = fr.review.heading;

  const note = document.createElement('p');
  note.className = 'ac-hint';
  note.textContent = fr.review.ruleRecall;

  // A select rather than a pair of buttons: two mutually exclusive options that
  // are a sentence each, and French runs long. A select wraps its own popup and
  // does not widen the row, which the toolbar in the Explorer learnt the hard
  // way when a long option pushed that view to 518 px.
  const directionControl = document.createElement('label');
  directionControl.className = 'ac-control';

  const directionCaption = document.createElement('span');
  directionCaption.className = 'ac-control-label';
  directionCaption.textContent = fr.review.directionLabel;

  const directionSelect = document.createElement('select');
  directionSelect.className = 'ac-select';
  for (const [value, label] of [
    ['ca_to_fr', fr.review.directionCaToFr],
    ['fr_to_ca', fr.review.directionFrToCa],
  ] as const) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    directionSelect.append(option);
  }
  directionSelect.addEventListener('change', () => {
    direction = directionSelect.value === 'fr_to_ca' ? 'fr_to_ca' : 'ca_to_fr';
  });
  directionControl.append(directionCaption, directionSelect);

  const startButton = document.createElement('button');
  startButton.type = 'button';
  startButton.className = 'ac-button ac-button--primary';
  startButton.textContent = fr.review.start;

  const progress = document.createElement('p');
  progress.className = 'ac-status';

  const card = document.createElement('div');
  card.className = 'ac-card';

  function renderRatings(item: ReviewItem): HTMLElement {
    const block = document.createElement('div');
    block.className = 'ac-ratings';

    const caption = document.createElement('p');
    caption.className = 'ac-hint';
    caption.textContent = fr.review.rateHeading;
    block.append(caption);

    const buttons = document.createElement('div');
    buttons.className = 'ac-actions';
    for (const rating of RATINGS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ac-button ac-rating';
      button.dataset['rating'] = rating;
      button.textContent = RATING_LABEL[rating];
      button.disabled = busy;
      button.addEventListener('click', () => {
        void grade(rating);
      });
      buttons.append(button);
    }

    block.append(buttons);
    // The item is named so the grade is visibly about one component, which is
    // what src/review/item.ts logs.
    block.dataset['nodeId'] = item.componentId;
    return block;
  }

  /**
   * The rest of what the leaf was authored to teach, at the moment feedback
   * lands.
   *
   * The card spent the reveal on one French line while the leaf carried up to
   * eight Catalan sentences and a contrast note written specifically to say what
   * a French speaker gets wrong. Catalan first and the French account of it
   * second, which is the same order the answer view now uses.
   *
   * THIS SPENDS THE ROTATION, KNOWINGLY. `exampleFor` varies the prompt on
   * `graded_review_count`, and a learner who reads all the examples here has
   * seen the next repetition's prompt already. The trade is that the rotation
   * varies the TEST ITEM while this changes what is TAUGHT once the test is
   * over: the prompt still rotates and the recall itself is unchanged.
   *
   * `notes` is left out on purpose. It is where the authored component IDs live,
   * so 61 of the 300 cards would print a bare identifier mid-session with
   * nothing to tap and nowhere to go. The browse view is where those are links.
   *
   * NOTHING HERE IS CREDITED. `toGradedQueryLog` builds a one-entry
   * decomposition so a grade is about the one component under review, and
   * showing a sentence that incidentally realises five other rules must not
   * start crediting them.
   */
  function renderAfterReveal(item: ReviewItem): HTMLElement | null {
    const leaf = leafById(item.componentId);
    if (leaf === undefined) return null;

    const block = document.createElement('div');
    block.className = 'ac-card-more';

    const rest = leaf.examples.filter((_, index) => index !== item.exampleIndex);
    if (rest.length > 0) {
      const heading = document.createElement('h3');
      heading.className = 'ac-subheading';
      heading.textContent = fr.review.otherExamples;

      const list = document.createElement('ul');
      list.className = 'ac-card-examples';
      list.lang = 'ca';
      for (const example of rest) {
        const entry = document.createElement('li');
        entry.textContent = example;
        list.append(entry);
      }
      block.append(heading, list);
    }

    const contrast = document.createElement('div');
    contrast.className = 'ac-contrast';
    contrast.dataset['status'] = leaf.contrast_fr.status;

    const status = document.createElement('span');
    status.className = 'ac-contrast-status';
    // The shared French table, so the card and the browser cannot drift.
    status.textContent = fr.contrast[leaf.contrast_fr.status];

    const note = document.createElement('p');
    note.className = 'ac-contrast-note';
    note.textContent = leaf.contrast_fr.note;

    contrast.append(status, note);
    block.append(contrast);

    if (leaf.dialect_note !== undefined) {
      const dialect = document.createElement('p');
      dialect.className = 'ac-hint';
      dialect.textContent = labelled(fr.browser.fieldDialect, leaf.dialect_note);
      block.append(dialect);
    }

    return block;
  }

  function render(): void {
    const item = session?.current();

    if (session === null) {
      progress.textContent = '';
      card.replaceChildren();
      startButton.hidden = false;
      directionControl.hidden = false;
      return;
    }

    if (item === undefined) {
      progress.textContent = fr.review.finished;
      card.replaceChildren();
      startButton.hidden = false;
      directionControl.hidden = false;
      return;
    }

    startButton.hidden = true;
    // Fixed for the duration: the queue is frozen at session start, so a
    // control that still moved would relabel cards already answered.
    directionControl.hidden = true;
    progress.textContent = `${fr.review.progress} ${String(session.completed + 1)} / ${String(session.items.length)}`;

    const ask = document.createElement('p');
    ask.className = 'ac-hint';
    ask.textContent =
      item.direction === 'ca_to_fr' ? fr.review.askCaToFr : fr.review.askFrToCa;

    const prompt = document.createElement('p');
    prompt.className = 'ac-card-prompt';
    // The prompt is a Catalan example one way round and a French gloss the
    // other, so the language tag follows the direction rather than the pane.
    prompt.lang = item.direction === 'ca_to_fr' ? 'ca' : 'fr';
    prompt.textContent = item.prompt;

    card.replaceChildren(ask, prompt);

    if (!revealed) {
      const reveal = document.createElement('button');
      reveal.type = 'button';
      reveal.className = 'ac-button ac-button--primary ac-reveal';
      reveal.textContent = fr.review.reveal;
      reveal.addEventListener('click', () => {
        revealed = true;
        render();
      });
      card.append(reveal);
      return;
    }

    const referenceHeading = document.createElement('h3');
    referenceHeading.className = 'ac-subheading';
    referenceHeading.textContent = fr.review.referenceHeading;

    const reference = document.createElement('p');
    reference.className = 'ac-card-reference';
    reference.lang = item.direction === 'ca_to_fr' ? 'fr' : 'ca';
    reference.textContent = item.reference;

    // THE GRADE COMES BEFORE THE READING, and the order is the whole design of
    // this block. The enrichment below runs to a few hundred pixels, and on a
    // 390 px screen putting it above the four buttons would push the only
    // source of graded evidence in the application off the bottom of the card.
    card.append(referenceHeading, reference, renderRatings(item));

    const more = renderAfterReveal(item);
    if (more !== null) card.append(more);
  }

  async function grade(rating: Rating): Promise<void> {
    if (session === null || busy) return;
    busy = true;
    render();
    try {
      await session.grade(rating);
      revealed = false;
      options.onGraded?.();
    } finally {
      busy = false;
      render();
    }
  }

  startButton.addEventListener('click', () => {
    void (async () => {
      session = await start({ direction });
      revealed = false;
      if (session.items.length === 0) {
        progress.textContent = fr.review.empty;
        render();
        return;
      }
      render();
    })();
  });

  root.append(heading, note, directionControl, startButton, progress, card);
  host.replaceChildren(root);
  render();
}
