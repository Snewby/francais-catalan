/**
 * Catalan speech, or none at all.
 *
 * THE STANDING BAN IS THE WHOLE MODULE. A Spanish or French voice reading
 * Catalan produces confidently wrong pronunciation, which is the worst thing a
 * contrastive tool can do: the learner cannot tell it is wrong, and every
 * `PHON` leaf about vowel reduction or final devoicing is contradicted by the
 * sound. So there is no fallback, anywhere, and `catalanVoiceIn` is the only
 * way a voice is ever chosen.
 *
 * Absence is the normal case rather than the error case. Catalan voices exist
 * on every major platform and NONE is installed by default: each needs an
 * OS-level language or speech pack that a web page cannot install. This
 * repository's own Windows runtime has nine voices, no Catalan and no Spanish;
 * the author's Android phone, which is the primary device, has the Catalan
 * voice. Same application, same user, audio on one and none on the other. The
 * control has to be built to be absent, not built and then hidden.
 *
 * Nothing here touches the DOM or the store, and the engine is injected, so the
 * decision logic is testable under jsdom, which implements no speech at all.
 */

/** The part of `SpeechSynthesisVoice` this module reads. */
export interface VoiceLike {
  readonly lang: string;
  readonly name: string;
}

/** The part of `speechSynthesis` this module drives. */
export interface SynthLike {
  getVoices(): readonly VoiceLike[];
  speak(utterance: SpeechSynthesisUtterance): void;
  cancel(): void;
  addEventListener(type: 'voiceschanged', listener: () => void): void;
  removeEventListener(type: 'voiceschanged', listener: () => void): void;
}

/**
 * A Catalan BCP 47 tag, and nothing that merely starts with those letters.
 *
 * Anchored and bounded on purpose. `es-CA` is Spanish, and a substring test for
 * "ca" would take it, which is exactly the fallback this module exists to
 * refuse. The separator may be a hyphen or an underscore, because platforms
 * disagree and one of them is not worth losing a voice over.
 */
const CATALAN_TAG = /^ca([-_]|$)/i;

export function isCatalan(voice: VoiceLike): boolean {
  return CATALAN_TAG.test(voice.lang.trim());
}

/**
 * The Catalan voice to use, or null.
 *
 * Null means the control does not exist. It never means "use something else".
 */
export function catalanVoiceIn(voices: readonly VoiceLike[]): VoiceLike | null {
  const catalan = voices.filter(isCatalan);
  // `ca-ES` before a bare `ca` or a regional variant: it is what every platform
  // ships and what the taxonomy's Central Catalan describes.
  return (
    catalan.find((voice) => /^ca[-_]es$/i.test(voice.lang.trim())) ?? catalan[0] ?? null
  );
}

/** The browser's speech engine, or null where there is none (jsdom, old Safari). */
export function defaultSynth(): SynthLike | null {
  const synth = (globalThis as { speechSynthesis?: SynthLike }).speechSynthesis;
  return synth ?? null;
}

/**
 * Watches for a Catalan voice, and reports every answer including the first.
 *
 * `getVoices` is empty on the first call in Chrome and fills in asynchronously,
 * so a control drawn from one synchronous read is permanently absent on the
 * platform most likely to have the voice. The callback therefore fires now with
 * what is known and again on `voiceschanged`.
 *
 * Returns an unsubscribe, because a view that is torn down and remounted would
 * otherwise leave a listener holding a detached button.
 */
export function watchCatalanVoice(
  onVoice: (voice: VoiceLike | null) => void,
  synth: SynthLike | null = defaultSynth(),
): () => void {
  if (synth === null) {
    onVoice(null);
    return () => undefined;
  }

  const report = (): void => {
    onVoice(catalanVoiceIn(synth.getVoices()));
  };

  report();
  synth.addEventListener('voiceschanged', report);
  return () => {
    synth.removeEventListener('voiceschanged', report);
  };
}

export interface SpeakOptions {
  readonly synth?: SynthLike | null;
  /** Injectable because jsdom has no SpeechSynthesisUtterance constructor. */
  readonly makeUtterance?: (text: string) => SpeechSynthesisUtterance;
}

/**
 * Says the Catalan aloud in the voice given, and refuses every other case.
 *
 * Returns whether anything was spoken, so a caller cannot report success by
 * assumption. A null voice is not an error and not a fallback: it is silence.
 */
export function speakCatalan(
  text: string,
  voice: VoiceLike | null,
  options: SpeakOptions = {},
): boolean {
  const synth = options.synth === undefined ? defaultSynth() : options.synth;
  if (synth === null || voice === null || !isCatalan(voice) || text.trim() === '') {
    return false;
  }

  const make =
    options.makeUtterance ?? ((value: string) => new SpeechSynthesisUtterance(value));

  // Engines vary and this whole path is optional. `utterance.voice` in
  // particular is a typed attribute that throws on anything that is not a real
  // SpeechSynthesisVoice, and a throw inside a click handler reaches the
  // learner as silence with no explanation. Failing to `false` keeps the one
  // guarantee that matters: nothing is ever read in the wrong language.
  try {
    const utterance = make(text);
    // Both, not either: the voice carries the phonetics and the lang tag tells
    // an engine that ignores the voice which language it is reading.
    utterance.voice = voice as SpeechSynthesisVoice;
    utterance.lang = voice.lang;

    // A second press should replace the first rather than queue behind it.
    synth.cancel();
    synth.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
