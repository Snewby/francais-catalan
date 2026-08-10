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
import { recordQuery, signalReply } from '../db/persist';
import { compareAttempt, type AttemptResult } from '../text/attempt';
import { speakControl, voiceNotice } from './speak';
import { leafById } from '../taxonomy';

type SignalReply = typeof signalReply;

export interface QueryViewOptions {
  readonly storage?: Storage;
  /** Injectable so a test drives the view without a key or a network. */
  readonly call?: typeof callHaiku;
  /** Injectable for the same reason, and so a test can assert what was filed. */
  readonly signal?: SignalReply;
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
  const signal = options.signal ?? signalReply;

  let busy = false;

  const root = document.createElement('section');
  root.className = 'ac-view ac-query';

  const heading = document.createElement('h2');
  heading.className = 'ac-heading';
  heading.textContent = fr.query.heading;

  const question = document.createElement('textarea');
  question.className = 'ac-input ac-textarea';
  question.rows = 3;
  question.placeholder = fr.query.placeholder;

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
   * The attempt field is always offered, because whether a question is a
   * production question is no longer known before the reply arrives. Filling it
   * in is the learner's own declaration that they were producing, which is what
   * the evidence type turns on; the detected direction does not override it.
   */
  function updateSubmit(): void {
    const attempting = attempt.value.trim() !== '';
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

      // The IPA has been in the schema and in `ComponentEntry` since phase 4
      // and was displayed by nothing. It is per-component and
      // language-invariant, it costs nothing to carry, and on a device with no
      // Catalan voice it is the only pronunciation the learner gets.
      if (entry.ipa !== undefined && entry.ipa !== '') {
        const ipa = document.createElement('span');
        ipa.className = 'ac-component-ipa';
        ipa.textContent = `[${entry.ipa}]`;
        ipa.title = fr.audio.ipa;
        item.append(ipa);
      }
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
    // Three outcomes, not two. "Different wording, same grammar" is a real and
    // common result, and reporting it as a plain pass would hide that the
    // reference says something else.
    verdict.textContent = outcome.exact
      ? fr.query.attemptExact
      : outcome.correct
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

  function renderUtterance(
    language: 'ca' | 'fr',
    caption: string,
    text: string,
  ): HTMLElement[] {
    const heading = document.createElement('h3');
    heading.className = 'ac-subheading';
    heading.textContent = caption;

    const utterance = document.createElement('p');
    utterance.className = 'ac-utterance';
    // Tagged so a screen reader, browser translation and the pronunciation
    // control each read the line as the language it is in.
    utterance.lang = language;
    utterance.textContent = text;

    // Audio on the Catalan only. This is the line the question about phase 6b
    // was asking after: before `answer_ca` existed there was nothing here an
    // audio button could have pronounced.
    if (language !== 'ca') return [heading, utterance];

    const line = document.createElement('div');
    line.className = 'ac-utterance-line';
    line.append(utterance, speakControl(text, { label: text }));
    return [heading, line];
  }

  /**
   * The sentence, in both languages, above the explanation of it.
   *
   * This is the headline because it is what was asked for, and it is a PAIR
   * because either half alone buries the other side's answer. Phase 6 gave the
   * reply a Catalan line and left the French meaning somewhere inside the
   * explanation, which was the same gap it had just closed, fixed on one side.
   * The Catalan leads in both directions: it is the language being learnt, and
   * a fixed order is one less thing on screen that moves.
   */
  function renderAnswerCa(result: CallResult): HTMLElement {
    const block = document.createElement('div');
    block.className = 'ac-answer-ca';

    const detected = document.createElement('p');
    detected.className = 'ac-hint';
    detected.dataset['direction'] = result.decomposition.direction;
    // Named rather than assumed: the direction is read off the question now, so
    // a misreading has to be visible instead of quietly shaping the answer.
    detected.textContent = labelled(
      fr.query.detectedLabel,
      result.decomposition.direction === 'ca_to_fr'
        ? fr.query.directionCaToFr
        : fr.query.directionFrToCa,
    );

    block.append(
      ...renderUtterance(
        'ca',
        fr.query.answerCaHeading,
        result.decomposition.answer_ca,
      ),
      ...renderUtterance(
        'fr',
        fr.query.answerFrHeading,
        result.decomposition.answer_fr,
      ),
      detected,
      // Once per reply, not once per Catalan string. Shown only when there is
      // no voice; it explains a silence rather than announcing a feature.
      voiceNotice(),
    );
    return block;
  }

  /**
   * The explanation, one paragraph per paragraph.
   *
   * The prompt asks for blank-line-separated paragraphs; this renders them as
   * such instead of pouring the whole reply into a single unbroken block, which
   * is what it did and which nobody reads.
   */
  function renderAnswer(result: CallResult): HTMLElement {
    const block = document.createElement('div');
    block.className = 'ac-answer';
    for (const paragraph of result.decomposition.answer.split(/\n+/)) {
      const text = paragraph.trim();
      if (text === '') continue;
      const line = document.createElement('p');
      line.textContent = text;
      block.append(line);
    }
    return block;
  }

  /**
   * The grammar points, or an explanation of their absence.
   *
   * A reply that named a Catalan form its own sentence does not contain has had
   * its whole decomposition dropped by the client, and nothing was credited to
   * any component. Saying so matters: an empty section reads as "this sentence
   * has no grammar in it", which is a different and false claim.
   */
  function renderComponentSection(result: CallResult): HTMLElement[] {
    if (result.unverified.length > 0) {
      const notice = document.createElement('p');
      notice.className = 'ac-hint';
      notice.dataset['unverified'] = String(result.unverified.length);
      notice.textContent = fr.query.componentsUnverified;
      return [notice];
    }

    const heading = document.createElement('h3');
    heading.className = 'ac-subheading';
    heading.textContent = fr.query.componentsHeading;
    return [heading, renderComponents(result)];
  }

  /**
   * The signal control, which is not a grade.
   *
   * It writes to its own store and emits no evidence at all: a learner who
   * thinks an explanation is wrong has told us about the model, not about what
   * they know. Recording it as a bad outcome would put their opinion of a
   * paragraph into a skill map, which is the failure the exposure/mastery split
   * exists to prevent.
   *
   * It exists because a review can only look at replies somebody kept, and the
   * six reviews so far depended on replies copied out of the network tab by
   * hand. This is the sampling frame ordinary use can produce.
   */
  function renderSignal(result: CallResult, queryId: number | null): HTMLElement {
    const block = document.createElement('div');
    block.className = 'ac-signal';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ac-button ac-button--quiet';
    button.textContent = fr.query.signal;

    const hint = document.createElement('p');
    hint.className = 'ac-hint';
    hint.textContent = fr.query.signalHint;

    const outcome = document.createElement('p');
    outcome.className = 'ac-status';

    button.addEventListener('click', () => {
      void (async () => {
        button.disabled = true;
        try {
          await signal({
            question: question.value.trim(),
            decomposition: result.queryLog,
            unverified: result.unverified,
            ...(queryId === null ? {} : { queryId }),
          });
          block.dataset['signalled'] = 'true';
          outcome.textContent = fr.query.signalled;
        } catch {
          button.disabled = false;
          outcome.textContent = fr.query.signalFailed;
        }
      })();
    });

    block.append(button, hint, outcome);
    return block;
  }

  function renderResult(
    result: CallResult,
    outcome: AttemptResult | null,
    queryId: number | null,
  ): void {
    const answerHeading = document.createElement('h3');
    answerHeading.className = 'ac-subheading';
    answerHeading.textContent = fr.query.answerHeading;

    output.replaceChildren(
      ...(outcome === null ? [] : [renderAttempt(outcome)]),
      renderAnswerCa(result),
      answerHeading,
      renderAnswer(result),
      ...renderComponentSection(result),
      renderSignal(result, queryId),
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

    const typed = attempt.value.trim();
    const attempted = typed !== '';

    busy = true;
    updateSubmit();
    status.textContent = fr.query.pending;
    output.replaceChildren();

    try {
      const result = await call({
        apiKey,
        question: asked,
        // No direction and no intent: the model reads the first off the
        // question and the client derives the second from it.
        //
        // An attempt compared automatically is recall; a reveal is a lookup.
        // Nothing here says what either then moves.
        evidence: attempted ? 'recall' : 'lookup',
      });

      const outcome = attempted
        ? compareAttempt(typed, result.decomposition.answer_ca, referenceForms(result))
        : null;

      const recorded = await recordQuery(
        outcome === null
          ? { queryLog: result.queryLog }
          : { queryLog: result.queryLog, correct: outcome.correct },
      );

      renderResult(result, outcome, recorded.queryId);
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

  attempt.addEventListener('input', updateSubmit);
  submit.addEventListener('click', () => {
    void run();
  });

  root.append(
    heading,
    labelledControl(fr.query.questionLabel, question),
    attemptControl,
    attemptHint,
    submit,
    status,
    output,
  );

  updateSubmit();
  host.replaceChildren(root);
}
