import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fr } from '../src/i18n/fr';
import {
  resetVoiceWatch,
  speakControl,
  startVoiceWatch,
  voiceNotice,
} from '../src/ui/speak';
import type { SynthLike, VoiceLike } from '../src/audio/voice';

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

beforeEach(() => {
  document.body.replaceChildren();
});

afterEach(() => {
  resetVoiceWatch();
});

describe('the audio control', () => {
  it('is absent when the device has no Catalan voice', () => {
    // The normal case. No platform ships a Catalan voice by default, and this
    // repository's own Windows runtime has nine voices and none of them.
    startVoiceWatch(synthWith([SPANISH]));
    const button = speakControl('Vaig cantar');
    document.body.append(button);

    expect(button.hidden).toBe(true);
  });

  it('appears when the voice list fills in after the control was drawn', () => {
    const voices: VoiceLike[] = [];
    const synth = synthWith(voices);
    startVoiceWatch(synth);

    const button = speakControl('Vaig cantar');
    document.body.append(button);
    expect(button.hidden).toBe(true);

    voices.push(CATALAN);
    synth.fire();
    expect(button.hidden).toBe(false);
  });

  it('speaks the Catalan it was given, in the voice that was found', () => {
    const spoken: [string, VoiceLike | null][] = [];
    startVoiceWatch(synthWith([CATALAN]));

    const button = speakControl("L'home acaba d'arribar", {
      speak: (text, voice) => {
        spoken.push([text, voice]);
        return true;
      },
    });
    document.body.append(button);
    button.click();

    expect(spoken).toEqual([["L'home acaba d'arribar", CATALAN]]);
  });

  it('reads the voice at press time, not at build time', () => {
    // The control is built before voiceschanged on the platform most likely to
    // have the voice, so capturing the voice in the closure never speaks.
    const voices: VoiceLike[] = [];
    const synth = synthWith(voices);
    startVoiceWatch(synth);

    const spoken: (VoiceLike | null)[] = [];
    const button = speakControl('Vaig cantar', {
      speak: (_text, voice) => {
        spoken.push(voice);
        return voice !== null;
      },
    });
    document.body.append(button);

    voices.push(CATALAN);
    synth.fire();
    button.click();

    expect(spoken).toEqual([CATALAN]);
  });

  it('names what it will read, for a screen reader on a touch device', () => {
    startVoiceWatch(synthWith([CATALAN]));
    const button = speakControl('Vaig cantar una cançó');
    expect(button.getAttribute('aria-label')).toContain('Vaig cantar una cançó');
    expect(button.textContent).toBe(fr.audio.speak);
  });
});

describe('the notice', () => {
  it('explains the silence only when there is one', () => {
    startVoiceWatch(synthWith([SPANISH]));
    const notice = voiceNotice();
    document.body.append(notice);
    expect(notice.hidden).toBe(false);
    expect(notice.textContent).toBe(fr.audio.unavailable);
  });

  it('says nothing when a voice exists', () => {
    startVoiceWatch(synthWith([CATALAN]));
    const notice = voiceNotice();
    document.body.append(notice);
    expect(notice.hidden).toBe(true);
  });

  it('tells the learner that no other language will be substituted', () => {
    // A device with a Spanish voice and no Catalan one will not speak, and the
    // learner is owed the reason: a Spanish voice reading Catalan is
    // confidently wrong and they could not tell.
    expect(fr.audio.unavailable).toContain('espagnole');
  });
});

describe('no per-control subscription', () => {
  it('adds one listener to the engine however many controls are drawn', () => {
    // The browse detail pane rebuilds on every selection and there are 300
    // leaves to tap. A listener per control is a listener per tap, each one
    // holding a button that left the document long ago.
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
      document.body.append(speakControl(`forma ${String(index)}`), voiceNotice());
    }

    expect(listeners).toBe(1);
  });
});
