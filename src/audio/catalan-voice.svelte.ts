/**
 * The one Catalan-voice watch for the application.
 *
 * ONE WATCHER, NO PER-CONTROL SUBSCRIPTION. A screen can draw dozens of speak
 * controls and rebuild them on every tap, so a listener per control is a
 * listener per tap. The answer is held here as reactive state instead, and
 * every control reads it.
 *
 * `getVoices` is empty on its first call in Chrome and fills in
 * asynchronously, so a control drawn from one synchronous read would be
 * permanently absent on the platform most likely to have the voice.
 */
import { watchCatalanVoice, type SynthLike, type VoiceLike } from './voice';

const state = $state<{ voice: VoiceLike | null }>({ voice: null });
let stopWatching: (() => void) | null = null;

/** Starts the watch, once; a second call replaces the first. */
export function startVoiceWatch(synth?: SynthLike | null): void {
  stopWatching?.();
  stopWatching = watchCatalanVoice((voice) => {
    state.voice = voice;
  }, synth);
}

/** Test seam: drops the watch and forgets the answer. */
export function resetVoiceWatch(): void {
  stopWatching?.();
  stopWatching = null;
  state.voice = null;
}

/** The Catalan voice found so far, or null. Reactive inside components. */
export function catalanVoice(): VoiceLike | null {
  return state.voice;
}
