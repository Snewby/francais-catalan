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
import { fr } from '../i18n/fr';
import { startReviewSession, type ReviewSession } from '../review/session';
import type { ReviewItem } from '../review/item';
import { RATINGS, type Rating } from '../srs/evidence';

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

  const root = document.createElement('section');
  root.className = 'ac-view ac-review';

  const heading = document.createElement('h2');
  heading.className = 'ac-heading';
  heading.textContent = fr.review.heading;

  const note = document.createElement('p');
  note.className = 'ac-hint';
  note.textContent = fr.review.ruleRecall;

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

  function render(): void {
    const item = session?.current();

    if (session === null) {
      progress.textContent = '';
      card.replaceChildren();
      startButton.hidden = false;
      return;
    }

    if (item === undefined) {
      progress.textContent = fr.review.finished;
      card.replaceChildren();
      startButton.hidden = false;
      return;
    }

    startButton.hidden = true;
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

    card.append(referenceHeading, reference, renderRatings(item));
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
      session = await start();
      revealed = false;
      if (session.items.length === 0) {
        progress.textContent = fr.review.empty;
        render();
        return;
      }
      render();
    })();
  });

  root.append(heading, note, startButton, progress, card);
  host.replaceChildren(root);
  render();
}
