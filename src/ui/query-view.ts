/**
 * The query view: ask, get a decomposition, and log what the asking was worth.
 *
 * ATTEMPT-THEN-REVEAL IS THE WHOLE POINT OF THE PRODUCE SIDE. A learner who
 * writes their Catalan before seeing the answer has produced something, and the
 * comparison against the reply is objective, so the event is `recall`. One who
 * reveals without attempting has looked something up, and the event is
 * `lookup`. THE LEARNER IS NEVER ASKED TO RATE THEMSELVES HERE: an unrated
 * attempt is exactly what keeps `recall` distinct from `graded`, and the review
 * loop is the only place a grade comes from.
 *
 * What each of those evidence types then moves is EVIDENCE_EFFECTS' business in
 * src/srs/evidence.ts, and is not restated here or in the copy.
 *
 * `recordQuery` is the one write path. This module assembles nothing: the
 * logged record comes back from `callHaiku` already validated against the
 * generated schema, and is persisted as it stands.
 */
import { fr, labelled } from '../i18n/fr';
import { callHaiku, readApiKey, type CallResult } from '../api/anthropic';
import { recordQuery } from '../db/persist';
import { compareAttempt, type AttemptResult } from '../text/attempt';
import type { Direction } from '../srs/evidence';
import { leafById } from '../taxonomy';
import { INTENT_FOR_DIRECTION } from '../review/item';

export interface QueryViewOptions {
  readonly storage?: Storage;
  /** Injectable so a test drives the view without a key or a network. */
  readonly call?: typeof callHaiku;
  /** Called after a query is written, so the coverage map can be refreshed. */
  readonly onRecorded?: () => void;
}

function labelledControl(caption: string, control: HTMLElement): HTMLLabelElement {
  const label = document.createElement('label');
  label.className = 'ac-control';
  const text = document.createElement('span');
  text.className = 'ac-control-label';
  text.textContent = caption;
  label.append(text, control);
  return label;
}

/**
 * The Catalan the reply actually names.
 *
 * The response carries no field holding an expected Catalan utterance:
 * `answer` is pinned to French by the schema, and the decomposition's `ca` is
 * defined by the prompt as the form realising that point in this énoncé. Those
 * forms are therefore the only reference there is, and the comparison is
 * containment rather than equality; src/text/attempt.ts argues why and records
 * what that cannot catch.
 */
function referenceForms(result: CallResult): string[] {
  return result.decomposition.decomposition.map((entry) => entry.ca);
}

export function mountQueryView(
  host: HTMLElement,
  options: QueryViewOptions = {},
): void {
  const storage = options.storage ?? localStorage;
  const call = options.call ?? callHaiku;

  let direction: Direction = 'ca_to_fr';
  let busy = false;

  const root = document.createElement('section');
  root.className = 'ac-view ac-query';

  const heading = document.createElement('h2');
  heading.className = 'ac-heading';
  heading.textContent = fr.query.heading;

  const directionSelect = document.createElement('select');
  directionSelect.className = 'ac-select';
  for (const [value, caption] of [
    ['ca_to_fr', fr.query.directionCaToFr],
    ['fr_to_ca', fr.query.directionFrToCa],
  ] as const) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = caption;
    directionSelect.append(option);
  }

  const question = document.createElement('textarea');
  question.className = 'ac-input ac-textarea';
  question.rows = 3;

  const attempt = document.createElement('input');
  attempt.type = 'text';
  attempt.className = 'ac-input';
  attempt.lang = 'ca';
  attempt.autocomplete = 'off';
  // Autocorrect on a phone rewrites Catalan as French. The apostrophe it
  // substitutes is folded by the comparator; a rewritten word is not.
  attempt.spellcheck = false;

  const attemptControl = labelledControl(
    `${fr.query.attemptLabel} (${fr.query.attemptOptional})`,
    attempt,
  );

  const attemptHint = document.createElement('p');
  attemptHint.className = 'ac-hint';
  attemptHint.textContent = fr.query.attemptHint;

  const submit = document.createElement('button');
  submit.type = 'button';
  submit.className = 'ac-button ac-button--primary';

  const status = document.createElement('p');
  status.className = 'ac-status';

  const output = document.createElement('div');
  output.className = 'ac-output';

  /**
   * The produce side is the only one with an attempt, because producing is the
   * only thing an attempt can be an attempt at. Reading a Catalan sentence and
   * being shown its explanation is a lookup however it is dressed up.
   */
  function applyDirection(): void {
    const producing = direction === 'fr_to_ca';
    attemptControl.hidden = !producing;
    attemptHint.hidden = !producing;
    question.placeholder = producing
      ? fr.query.placeholderFrToCa
      : fr.query.placeholderCaToFr;
    question.lang = producing ? 'fr' : 'ca';
    updateSubmit();
  }

  function updateSubmit(): void {
    const attempting = direction === 'fr_to_ca' && attempt.value.trim() !== '';
    submit.textContent = attempting ? fr.query.submitCheck : fr.query.submitReveal;
    submit.disabled = busy;
  }

  function renderComponents(result: CallResult): HTMLElement {
    const list = document.createElement('ul');
    list.className = 'ac-components';
    for (const entry of result.decomposition.decomposition) {
      const item = document.createElement('li');

      const form = document.createElement('span');
      form.className = 'ac-component-form';
      form.lang = 'ca';
      form.textContent = entry.ca;

      const gloss = document.createElement('span');
      gloss.className = 'ac-component-gloss';
      // The French wording comes from the taxonomy the model was given, not
      // from the reply: the id is drawn from a closed vocabulary, so the gloss
      // is authored rather than generated.
      gloss.textContent = leafById(entry.id)?.glosses.fr ?? entry.id;

      item.append(form, gloss);
      list.append(item);
    }
    return list;
  }

  function renderAttempt(outcome: AttemptResult): HTMLElement {
    const block = document.createElement('div');
    block.className = 'ac-attempt-result';
    block.dataset['correct'] = String(outcome.correct);

    const verdict = document.createElement('p');
    verdict.className = 'ac-attempt-verdict';
    verdict.textContent = outcome.correct
      ? fr.query.attemptCorrect
      : fr.query.attemptIncomplete;
    block.append(verdict);

    if (!outcome.correct) {
      const missing = document.createElement('ul');
      missing.className = 'ac-attempt-missing';
      missing.lang = 'ca';
      for (const form of outcome.missing) {
        const item = document.createElement('li');
        item.textContent = form;
        missing.append(item);
      }
      block.append(missing);
    }

    return block;
  }

  /**
   * What the prompt cache did, in the interface rather than in a breakpoint.
   *
   * The taxonomy is a 37 KB cached prefix and everything that can be checked
   * offline already is. What cannot is whether the cache is HIT, because that is
   * a property of a second live call, and a miss reports as silence: a zero here
   * on a repeated question means the prefix is not byte-stable, or has fallen
   * under the model's minimum cacheable length. `CallResult.usage` exists to
   * make that a one-line check, and phase 6 shipped the only caller without
   * reading it, which left the check available to nobody.
   */
  function renderUsage(result: CallResult): HTMLElement {
    const block = document.createElement('div');
    block.className = 'ac-usage';
    block.dataset['cacheRead'] = String(result.usage.cacheReadTokens);

    const heading = document.createElement('h3');
    heading.className = 'ac-subheading';
    heading.textContent = fr.query.usageHeading;

    const counts = document.createElement('p');
    counts.className = 'ac-usage-counts';
    counts.textContent = [
      labelled(
        fr.query.usageRead,
        `${String(result.usage.cacheReadTokens)} ${fr.query.usageTokens}`,
      ),
      labelled(
        fr.query.usageWritten,
        `${String(result.usage.cacheCreationTokens)} ${fr.query.usageTokens}`,
      ),
    ].join(', ');

    block.append(heading, counts);

    // The hint is shown only on a miss. A reader who has just seen a non-zero
    // read does not need telling what a zero would have meant, and a permanent
    // caveat under a working number is noise that gets scrolled past.
    if (result.usage.cacheReadTokens === 0) {
      const hint = document.createElement('p');
      hint.className = 'ac-hint';
      hint.textContent = fr.query.usageHint;
      block.append(hint);
    }

    return block;
  }

  function renderResult(result: CallResult, outcome: AttemptResult | null): void {
    const answerHeading = document.createElement('h3');
    answerHeading.className = 'ac-subheading';
    answerHeading.textContent = fr.query.answerHeading;

    const answer = document.createElement('p');
    answer.className = 'ac-answer';
    answer.textContent = result.decomposition.answer;

    const componentsHeading = document.createElement('h3');
    componentsHeading.className = 'ac-subheading';
    componentsHeading.textContent = fr.query.componentsHeading;

    output.replaceChildren(
      ...(outcome === null ? [] : [renderAttempt(outcome)]),
      answerHeading,
      answer,
      componentsHeading,
      renderComponents(result),
      renderUsage(result),
    );
  }

  async function run(): Promise<void> {
    if (busy) return;

    const asked = question.value.trim();
    if (asked === '') {
      status.textContent = fr.query.emptyQuestion;
      return;
    }

    const apiKey = readApiKey(storage);
    if (apiKey === null) {
      status.textContent = fr.apiKey.prompt;
      return;
    }

    const typed = direction === 'fr_to_ca' ? attempt.value.trim() : '';
    const attempted = typed !== '';

    busy = true;
    updateSubmit();
    status.textContent = fr.query.pending;
    output.replaceChildren();

    try {
      const result = await call({
        apiKey,
        question: asked,
        direction,
        intent: INTENT_FOR_DIRECTION[direction],
        // An attempt compared automatically is recall; a reveal is a lookup.
        // Nothing here says what either then moves.
        evidence: attempted ? 'recall' : 'lookup',
      });

      const outcome = attempted ? compareAttempt(typed, referenceForms(result)) : null;

      await recordQuery(
        outcome === null
          ? { queryLog: result.queryLog }
          : { queryLog: result.queryLog, correct: outcome.correct },
      );

      renderResult(result, outcome);
      status.textContent = attempted
        ? fr.query.recordedRecall
        : fr.query.recordedLookup;
      options.onRecorded?.();
    } catch {
      // The message is not shown: an API error body can carry the request, and
      // the request carries nothing secret, but a thrown value is not something
      // to render into the page unchecked.
      status.textContent = fr.query.failed;
    } finally {
      busy = false;
      updateSubmit();
    }
  }

  directionSelect.addEventListener('change', () => {
    direction = directionSelect.value as Direction;
    applyDirection();
  });
  attempt.addEventListener('input', updateSubmit);
  submit.addEventListener('click', () => {
    void run();
  });

  root.append(
    heading,
    labelledControl(fr.query.directionLabel, directionSelect),
    labelledControl(fr.query.questionLabel, question),
    attemptControl,
    attemptHint,
    submit,
    status,
    output,
  );

  applyDirection();
  host.replaceChildren(root);
}
