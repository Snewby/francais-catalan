/**
 * The audio control, which is absent far more often than it is present.
 *
 * PROGRESSIVE ENHANCEMENT, not a feature with a disabled state. No platform
 * ships a Catalan voice by default, so on most devices this renders nothing at
 * all and the interface has to read correctly without it. Where a voice does
 * exist, a button appears beside the Catalan.
 *
 * ONE WATCHER FOR THE APPLICATION, and no per-control subscription. The browse
 * detail pane rebuilds on every selection and there are 300 leaves to tap, so a
 * listener per control is a listener per tap, each one holding a button that
 * left the document long ago. The watcher instead updates whatever controls are
 * in the document when the answer changes, which is at most twice a session.
 */
import { fr, labelled } from '../i18n/fr';
import {
  speakCatalan,
  watchCatalanVoice,
  type SynthLike,
  type VoiceLike,
} from '../audio/voice';

const CONTROL = 'ac-speak';
const NOTICE = 'ac-voice-notice';

let current: VoiceLike | null = null;
let stopWatching: (() => void) | null = null;

function refresh(root: ParentNode): void {
  for (const control of root.querySelectorAll<HTMLElement>(`.${CONTROL}`)) {
    control.hidden = current === null;
  }
  for (const notice of root.querySelectorAll<HTMLElement>(`.${NOTICE}`)) {
    notice.hidden = current !== null;
  }
}

/**
 * Starts the watch, once.
 *
 * `getVoices` is empty on its first call in Chrome and fills in
 * asynchronously, so a control drawn from one synchronous read is permanently
 * absent on the platform most likely to have the voice.
 */
export function startVoiceWatch(synth?: SynthLike | null): void {
  stopWatching?.();
  stopWatching = watchCatalanVoice((voice) => {
    current = voice;
    refresh(document);
  }, synth);
}

/** Test seam: drops the watch and forgets the answer. */
export function resetVoiceWatch(): void {
  stopWatching?.();
  stopWatching = null;
  current = null;
}

export interface SpeakControlOptions {
  /** Injectable so a test can assert what was spoken without a speech engine. */
  readonly speak?: typeof speakCatalan;
  /** Names what is being read, for a screen reader and for the title. */
  readonly label?: string;
}

/**
 * A button that says the Catalan aloud, hidden while no Catalan voice exists.
 *
 * Hidden rather than disabled: a disabled control invites the learner to go
 * looking for what would enable it, and the answer is an OS setting this page
 * cannot reach. The explanation belongs once per view, in `voiceNotice`, and
 * never once per button.
 */
export function speakControl(
  text: string,
  options: SpeakControlOptions = {},
): HTMLButtonElement {
  const speak = options.speak ?? speakCatalan;
  const named = options.label ?? text;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = `ac-button ac-button--quiet ${CONTROL}`;
  button.textContent = fr.audio.speak;
  button.title = named;
  button.setAttribute('aria-label', labelled(fr.audio.speak, named));
  // Correct before the first refresh, so a control built while the answer is
  // already known does not flash.
  button.hidden = current === null;

  // The voice is read at press time rather than captured, so a control built
  // before `voiceschanged` still speaks once the voice arrives.
  button.addEventListener('click', () => {
    speak(text, current);
  });

  return button;
}

/**
 * The line shown when no Catalan voice is installed, and why it is not an
 * apology.
 *
 * It says what to install and it says that nothing else will be used, because
 * silence otherwise reads as a missing feature rather than as a refusal. A
 * learner who does not know that a Spanish voice would mislead them will
 * reasonably wonder why an application with nine installed voices will not
 * speak.
 */
export function voiceNotice(): HTMLParagraphElement {
  const notice = document.createElement('p');
  notice.className = `ac-hint ${NOTICE}`;
  notice.textContent = fr.audio.unavailable;
  notice.hidden = current !== null;
  return notice;
}
