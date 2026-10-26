import { render } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { resetVoiceWatch, startVoiceWatch } from '../src/audio/catalan-voice.svelte';
import type { SynthLike, VoiceLike } from '../src/audio/voice';
import { fr } from '../src/i18n/fr';
import Speak from '../src/ui/Speak.svelte';
import VoiceNotice from '../src/ui/VoiceNotice.svelte';

const CATALAN: VoiceLike = { lang: 'ca-ES', name: 'Català' };
const SPANISH: VoiceLike = { lang: 'es-ES', name: 'Helena' };

function synthWith(voices: VoiceLike[]): SynthLike & { fire: () => void } {
  const listeners = new Set<() => void>();
  return {
    getVoices: () => voices,
    speak: vi.fn(),
    cancel: vi.fn(),
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
    fire: () => {
      for (const listener of [...listeners]) listener();
    },
  };
}

function button(container: HTMLElement): HTMLButtonElement {
  const found = container.querySelector('button');
  if (!found) throw new Error('no button rendered');
  return found;
}

afterEach(() => {
  resetVoiceWatch();
});

describe('the audio control', () => {
  it('is absent when the device has no Catalan voice', () => {
    // The normal case. No platform ships a Catalan voice by default.
    startVoiceWatch(synthWith([SPANISH]));
    const { container } = render(Speak, { text: 'Vaig cantar' });

    expect(button(container).hidden).toBe(true);
  });

  it('appears when the voice list fills in after the control was drawn', () => {
    const voices: VoiceLike[] = [];
    const synth = synthWith(voices);
    startVoiceWatch(synth);

    const { container } = render(Speak, { text: 'Vaig cantar' });
    expect(button(container).hidden).toBe(true);

    voices.push(CATALAN);
    synth.fire();
    flushSync();
    expect(button(container).hidden).toBe(false);
  });

  it('speaks the Catalan it was given, in the voice that was found', () => {
    const spoken: [string, VoiceLike | null][] = [];
    startVoiceWatch(synthWith([CATALAN]));

    const { container } = render(Speak, {
      text: "L'home acaba d'arribar",
      speak: (text: string, voice: VoiceLike | null) => {
        spoken.push([text, voice]);
        return true;
      },
    });
    button(container).click();

    expect(spoken).toEqual([["L'home acaba d'arribar", CATALAN]]);
  });

  it('reads the voice at press time, not at build time', () => {
    // The control is drawn before voiceschanged on the platform most likely to
    // have the voice, so capturing the voice at build time never speaks.
    const voices: VoiceLike[] = [];
    const synth = synthWith(voices);
    startVoiceWatch(synth);

    const spoken: (VoiceLike | null)[] = [];
    const { container } = render(Speak, {
      text: 'Vaig cantar',
      speak: (_text: string, voice: VoiceLike | null) => {
        spoken.push(voice);
        return voice !== null;
      },
    });

    voices.push(CATALAN);
    synth.fire();
    flushSync();
    button(container).click();

    expect(spoken).toEqual([CATALAN]);
  });

  it('names what it will read, for a screen reader on a touch device', () => {
    startVoiceWatch(synthWith([CATALAN]));
    const { container } = render(Speak, { text: 'Vaig cantar una cançó' });
    expect(button(container).getAttribute('aria-label')).toContain(
      'Vaig cantar una cançó',
    );
    expect(button(container).textContent).toBe(fr.audio.speak);
  });
});

describe('the notice', () => {
  it('explains the silence only when there is one', () => {
    startVoiceWatch(synthWith([SPANISH]));
    const { container } = render(VoiceNotice);
    const notice = container.querySelector('p');
    expect(notice?.hidden).toBe(false);
    expect(notice?.textContent).toBe(fr.audio.unavailable);
  });

  it('says nothing when a voice exists', () => {
    startVoiceWatch(synthWith([CATALAN]));
    const { container } = render(VoiceNotice);
    expect(container.querySelector('p')?.hidden).toBe(true);
  });

  it('tells the learner that no other language will be substituted', () => {
    expect(fr.audio.unavailable).toContain('espagnole');
  });
});

describe('no per-control subscription', () => {
  it('adds one listener to the engine however many controls are drawn', () => {
    // A screen can draw dozens of controls and redraw them on every tap. A
    // listener per control is a listener per tap.
    let listeners = 0;
    const synth: SynthLike = {
      getVoices: () => [CATALAN],
      speak: vi.fn(),
      cancel: vi.fn(),
      addEventListener: () => {
        listeners += 1;
      },
      removeEventListener: () => {
        listeners -= 1;
      },
    };
    startVoiceWatch(synth);

    for (let index = 0; index < 50; index += 1) {
      render(Speak, { text: `forma ${String(index)}` });
      render(VoiceNotice);
    }

    expect(listeners).toBe(1);
  });
});
