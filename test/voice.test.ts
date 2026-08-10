import { describe, expect, it, vi } from 'vitest';

import {
  catalanVoiceIn,
  isCatalan,
  speakCatalan,
  watchCatalanVoice,
  type SynthLike,
  type VoiceLike,
} from '../src/audio/voice';

const CATALAN: VoiceLike = { lang: 'ca-ES', name: 'Català' };
const SPANISH: VoiceLike = { lang: 'es-ES', name: 'Helena' };
const FRENCH: VoiceLike = { lang: 'fr-FR', name: 'Denise' };
/** A real tag that a substring test for "ca" would wrongly accept. */
const SPANISH_CANADA: VoiceLike = { lang: 'es-CA', name: 'Ximena' };

interface StubSynth extends SynthLike {
  /** What was actually spoken, in order. */
  readonly spoken: string[];
  /** Fires `voiceschanged`, as the browser does once the list fills in. */
  fire(): void;
  /** How many listeners are still registered, so unsubscribing is checkable. */
  listenerCount(): number;
}

function synthWith(voices: VoiceLike[]): StubSynth {
  const listeners = new Set<() => void>();
  const spoken: string[] = [];
  return {
    spoken,
    getVoices: () => voices,
    speak: (utterance) => spoken.push(utterance.text),
    cancel: vi.fn(),
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
    fire: () => {
      for (const listener of [...listeners]) listener();
    },
    listenerCount: () => listeners.size,
  };
}

/** jsdom has no SpeechSynthesisUtterance, so the object is built by hand. */
function utteranceFactory(text: string): SpeechSynthesisUtterance {
  return { text } as SpeechSynthesisUtterance;
}

describe('choosing a voice', () => {
  it('takes the Catalan one', () => {
    expect(catalanVoiceIn([FRENCH, CATALAN, SPANISH])).toBe(CATALAN);
  });

  it('RETURNS NOTHING RATHER THAN A NEIGHBOURING LANGUAGE', () => {
    // The standing ban, and the reason this module exists. A Spanish voice
    // reading Catalan is confidently wrong, and a learner cannot tell.
    expect(catalanVoiceIn([SPANISH, FRENCH])).toBeNull();
    expect(catalanVoiceIn([])).toBeNull();
  });

  it('does not mistake a Spanish voice for a Catalan one on its region code', () => {
    expect(isCatalan(SPANISH_CANADA)).toBe(false);
    expect(catalanVoiceIn([SPANISH_CANADA])).toBeNull();
  });

  it('accepts a bare tag and an underscored one', () => {
    expect(isCatalan({ lang: 'ca', name: 'x' })).toBe(true);
    expect(isCatalan({ lang: 'ca_ES', name: 'x' })).toBe(true);
    expect(isCatalan({ lang: 'cak', name: 'Kaqchikel' })).toBe(false);
  });

  it('prefers ca-ES to a regional variant', () => {
    const valencian = { lang: 'ca-ES-valencia', name: 'Valencià' };
    expect(catalanVoiceIn([valencian, CATALAN])).toBe(CATALAN);
    // With no ca-ES, the variant is still Catalan and is used.
    expect(catalanVoiceIn([valencian])).toBe(valencian);
  });
});

describe('watching for a voice', () => {
  it('answers at once and again when the list fills in', () => {
    // Chrome returns an empty list from the first getVoices and fires
    // voiceschanged later. A control drawn from one synchronous read is
    // permanently absent on the platform most likely to have the voice.
    const voices: VoiceLike[] = [];
    const synth = synthWith(voices);
    const seen: (VoiceLike | null)[] = [];

    watchCatalanVoice((voice) => seen.push(voice), synth);
    expect(seen).toEqual([null]);

    voices.push(CATALAN);
    synth.fire();
    expect(seen).toEqual([null, CATALAN]);
  });

  it('stops watching when told to', () => {
    const synth = synthWith([]);
    const stop = watchCatalanVoice(() => undefined, synth);
    expect(synth.listenerCount()).toBe(1);
    stop();
    expect(synth.listenerCount()).toBe(0);
  });

  it('reports no voice where the platform has no speech at all', () => {
    const seen: (VoiceLike | null)[] = [];
    const stop = watchCatalanVoice((voice) => seen.push(voice), null);
    expect(seen).toEqual([null]);
    expect(() => stop()).not.toThrow();
  });
});

describe('speaking', () => {
  it('speaks the Catalan in the Catalan voice', () => {
    const synth = synthWith([CATALAN]);
    const spoke = speakCatalan("L'home acaba d'arribar", CATALAN, {
      synth,
      makeUtterance: utteranceFactory,
    });
    expect(spoke).toBe(true);
    expect(synth.spoken).toEqual(["L'home acaba d'arribar"]);
  });

  it('REFUSES TO SPEAK IN A LANGUAGE THAT IS NOT CATALAN', () => {
    const synth = synthWith([SPANISH]);
    for (const voice of [SPANISH, FRENCH, SPANISH_CANADA, null]) {
      expect(
        speakCatalan('Vaig cantar', voice, { synth, makeUtterance: utteranceFactory }),
      ).toBe(false);
    }
    expect(synth.spoken).toEqual([]);
  });

  it('says nothing when there is nothing to say', () => {
    const synth = synthWith([CATALAN]);
    expect(
      speakCatalan('   ', CATALAN, { synth, makeUtterance: utteranceFactory }),
    ).toBe(false);
    expect(synth.spoken).toEqual([]);
  });

  it('reports failure rather than throwing out of a click handler', () => {
    // Found in the browser: `utterance.voice` is a typed attribute and throws
    // on anything that is not a real SpeechSynthesisVoice. Uncaught, that
    // reaches the learner as silence with no explanation.
    const synth = synthWith([CATALAN]);
    const spoke = speakCatalan('Vaig cantar', CATALAN, {
      synth,
      makeUtterance: () => {
        throw new TypeError("Failed to set the 'voice' property");
      },
    });
    expect(spoke).toBe(false);
  });

  it('cancels what is already speaking rather than queueing behind it', () => {
    const synth = synthWith([CATALAN]);
    speakCatalan('Un', CATALAN, { synth, makeUtterance: utteranceFactory });
    speakCatalan('Dos', CATALAN, { synth, makeUtterance: utteranceFactory });
    expect(synth.cancel).toHaveBeenCalledTimes(2);
    expect(synth.spoken).toEqual(['Un', 'Dos']);
  });
});
