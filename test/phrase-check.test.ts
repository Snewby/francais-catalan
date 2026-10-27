import { describe, expect, it } from 'vitest';
import { checkPhraseReply, type PhraseCheck } from '../src/api/phrase-check';

/*
 * Hand-written replies. The acceptance box for these checks is ticked only when
 * round 1's recorded replies are added as cases (phase 1 step 5); until then
 * these pin the rules on sentences chosen for the characters that break naive
 * offset arithmetic: accents, the punt volat and straight apostrophes.
 */

/**
 * A reply as it arrives, before any check: loosely typed on purpose, because
 * most cases here are replies that must fail.
 */
interface RawChunk {
  text: string;
  role: string;
  ids: string[];
  unlinked?: string;
  lemma?: string;
}

interface RawReply {
  fr: string;
  ca: string;
  subject: { person: string; expressed: boolean };
  assumptions: string[];
  chunks: RawChunk[];
}

// The spec's worked example, « Phase 1: model response schema », chunk by chunk.
const AHIR: RawChunk = { text: 'Ahir', role: 'time', ids: [], unlinked: 'no_notion' };
const VAIG_COMPRAR: RawChunk = {
  text: 'vaig comprar',
  role: 'verb',
  ids: ['VERB.ind.passat_perifrastic'],
  lemma: 'comprar',
};
const EL_PA: RawChunk = {
  text: 'el pa',
  role: 'object_direct',
  ids: ['ART.def.forma.paradigma'],
};
const AL_MERCAT: RawChunk = {
  text: 'al mercat',
  role: 'place',
  ids: ['ART.contract.a_de'],
};

const SPEC_REPLY: RawReply = {
  fr: 'Hier, j’ai acheté le pain au marché.',
  ca: 'Ahir vaig comprar el pa al mercat.',
  subject: { person: '1sg', expressed: false },
  assumptions: [],
  chunks: [AHIR, VAIG_COMPRAR, EL_PA, AL_MERCAT],
};

function withChunks(chunks: RawChunk[]): RawReply {
  return { ...SPEC_REPLY, chunks };
}

/** AHIR without its unlinked reason. */
function bareAhir(): RawChunk {
  const { unlinked: _dropped, ...bare } = AHIR;
  return bare;
}

/** The derived spans as [text, start, end], or the errors if the check failed. */
function spansOf(result: PhraseCheck): [string, number, number][] {
  if (!result.valid) throw new Error(result.errors.join('\n'));
  for (const chunk of result.phrase.chunks) {
    expect(result.phrase.ca.slice(chunk.start, chunk.end)).toBe(chunk.text);
  }
  return result.phrase.chunks.map((chunk) => [chunk.text, chunk.start, chunk.end]);
}

function errorsOf(result: PhraseCheck): readonly string[] {
  if (result.valid) throw new Error('expected the reply to fail');
  return result.errors;
}

describe('spans are derived from the text, in UTF-16 offsets', () => {
  it('places the spec example', () => {
    expect(spansOf(checkPhraseReply(SPEC_REPLY))).toEqual([
      ['Ahir', 0, 4],
      ['vaig comprar', 5, 17],
      ['el pa', 18, 23],
      ['al mercat', 24, 33],
    ]);
  });

  it('counts an accented letter as one code unit', () => {
    const reply: RawReply = {
      fr: 'Demain, on sortira plus tôt.',
      ca: "Demà sortirem més d'hora.",
      subject: { person: '1pl', expressed: false },
      assumptions: [],
      chunks: [
        { text: 'Demà', role: 'time', ids: [], unlinked: 'no_notion' },
        { text: 'sortirem', role: 'verb', ids: ['VERB.ind.futur'], lemma: 'sortir' },
        { text: "més d'hora", role: 'time', ids: [], unlinked: 'no_notion' },
      ],
    };
    expect(spansOf(checkPhraseReply(reply))).toEqual([
      ['Demà', 0, 4],
      ['sortirem', 5, 13],
      ["més d'hora", 14, 24],
    ]);
  });

  it('keeps the punt volat of l·l inside the chunk', () => {
    const reply: RawReply = {
      fr: 'La collection est à l’étage.',
      ca: 'La col·lecció és al pis de dalt.',
      subject: { person: '3sg', expressed: true },
      assumptions: [],
      chunks: [
        { text: 'La col·lecció', role: 'subject', ids: ['ART.def.forma.paradigma'] },
        { text: 'és', role: 'verb', ids: ['VERB.ser_estar'], lemma: 'ser' },
        { text: 'al pis de dalt', role: 'place', ids: ['ART.contract.a_de'] },
      ],
    };
    expect(reply.ca.charCodeAt(6)).toBe(0x00b7);
    expect(spansOf(checkPhraseReply(reply))).toEqual([
      ['La col·lecció', 0, 13],
      ['és', 14, 16],
      ['al pis de dalt', 17, 31],
    ]);
  });

  it('places elided forms with straight apostrophes, adjacent chunks included', () => {
    const reply: RawReply = {
      fr: 'L’homme s’est levé tôt.',
      ca: "L'home s'ha llevat d'hora.",
      subject: { person: '3sg', expressed: true },
      assumptions: [],
      chunks: [
        { text: "L'home", role: 'subject', ids: ['ART.def.forma.elisio'] },
        { text: "s'", role: 'clitic', ids: ['PRON.feble.persona_reflexiu'] },
        {
          text: 'ha llevat',
          role: 'verb',
          ids: ['VERB.perf.present'],
          lemma: 'llevar',
        },
        { text: "d'hora", role: 'time', ids: [], unlinked: 'no_notion' },
      ],
    };
    expect(spansOf(checkPhraseReply(reply))).toEqual([
      ["L'home", 0, 6],
      ["s'", 7, 9],
      ['ha llevat', 9, 18],
      ["d'hora", 19, 25],
    ]);
  });

  it('passes a reply with ’ in ca and straight apostrophes in its chunks', () => {
    const reply: RawReply = {
      fr: 'L’homme s’est levé tôt.',
      ca: 'L’home s’ha llevat d’hora.',
      subject: { person: '3sg', expressed: true },
      assumptions: [],
      chunks: [
        { text: "L'home", role: 'subject', ids: ['ART.def.forma.elisio'] },
        { text: "s'", role: 'clitic', ids: ['PRON.feble.persona_reflexiu'] },
        {
          text: 'ha llevat',
          role: 'verb',
          ids: ['VERB.perf.present'],
          lemma: 'llevar',
        },
        { text: "d'hora", role: 'time', ids: [], unlinked: 'no_notion' },
      ],
    };
    const result = checkPhraseReply(reply);
    expect(spansOf(result)).toEqual([
      ["L'home", 0, 6],
      ["s'", 7, 9],
      ['ha llevat', 9, 18],
      ["d'hora", 19, 25],
    ]);
    // Stored straight, as the golden set spells it; fr stays French prose.
    if (!result.valid) throw new Error('unreachable');
    expect(result.phrase.ca).toBe("L'home s'ha llevat d'hora.");
    expect(result.phrase.fr).toBe('L’homme s’est levé tôt.');
  });

  it('passes the reverse too: straight in ca, ’ in a chunk', () => {
    const reply: RawReply = {
      ...SPEC_REPLY,
      fr: 'Je me suis levé tôt.',
      ca: "M'he llevat d'hora.",
      chunks: [
        { text: 'M’', role: 'clitic', ids: ['PRON.feble.persona_reflexiu'] },
        {
          text: 'he llevat',
          role: 'verb',
          ids: ['VERB.perf.present'],
          lemma: 'llevar',
        },
        { text: 'd’hora', role: 'time', ids: [], unlinked: 'no_notion' },
      ],
    };
    expect(spansOf(checkPhraseReply(reply))).toEqual([
      ["M'", 0, 2],
      ['he llevat', 2, 11],
      ["d'hora", 12, 18],
    ]);
  });

  it('matches exactly: no case folding and no Unicode normalisation', () => {
    expect(
      checkPhraseReply(
        withChunks([{ ...AHIR, text: 'ahir' }, VAIG_COMPRAR, EL_PA, AL_MERCAT]),
      ).valid,
    ).toBe(false);

    // ca composed, the chunk decomposed: the same letters to a reader, and a
    // different string to indexOf.
    const reply: RawReply = {
      ...SPEC_REPLY,
      ca: 'Demà vaig comprar el pa.'.normalize('NFC'),
      chunks: [
        { text: 'Demà'.normalize('NFD'), role: 'time', ids: [], unlinked: 'no_notion' },
        VAIG_COMPRAR,
        EL_PA,
      ],
    };
    expect(checkPhraseReply(reply).valid).toBe(false);
  });
});

describe('uncovered text', () => {
  it('passes when it is only punctuation and whitespace', () => {
    const reply: RawReply = {
      fr: 'Il a dit « donne-le-lui ».',
      ca: 'Ha dit «dona-li-ho».',
      subject: { person: '3sg', expressed: false },
      assumptions: [],
      chunks: [
        { text: 'Ha dit', role: 'verb', ids: ['VERB.perf.present'], lemma: 'dir' },
        { text: 'dona', role: 'verb', ids: ['VERB.ind.present'], lemma: 'donar' },
        { text: 'li-ho', role: 'clitic', ids: ['PRON.feble.combinacio.ci_cd'] },
      ],
    };
    expect(spansOf(checkPhraseReply(reply))).toEqual([
      ['Ha dit', 0, 6],
      ['dona', 8, 12],
      ['li-ho', 13, 18],
    ]);

    const question: RawReply = {
      ...SPEC_REPLY,
      ca: 'Hola, què tal?',
      chunks: [
        { text: 'Hola', role: 'other', ids: [], unlinked: 'no_notion' },
        { text: 'què tal', role: 'other', ids: [], unlinked: 'no_notion' },
      ],
    };
    expect(checkPhraseReply(question).valid).toBe(true);
  });

  it('fails on a word no chunk covers, in the middle, first or last', () => {
    expect(
      errorsOf(checkPhraseReply(withChunks([AHIR, VAIG_COMPRAR, AL_MERCAT]))),
    ).toEqual(['/ca "el pa" at offset 17 is not covered by any chunk']);
    expect(
      errorsOf(checkPhraseReply(withChunks([VAIG_COMPRAR, EL_PA, AL_MERCAT]))),
    ).toEqual(['/ca "Ahir" at offset 0 is not covered by any chunk']);
    expect(errorsOf(checkPhraseReply(withChunks([AHIR, VAIG_COMPRAR, EL_PA])))).toEqual(
      ['/ca "al mercat." at offset 23 is not covered by any chunk'],
    );
  });

  it('fails on an uncovered digit or currency sign, which are read like words', () => {
    const reply: RawReply = {
      ...SPEC_REPLY,
      ca: 'Costa 5 €.',
      subject: { person: '3sg', expressed: false },
      chunks: [
        { text: 'Costa', role: 'verb', ids: ['VERB.ind.present'], lemma: 'costar' },
      ],
    };
    expect(errorsOf(checkPhraseReply(reply))).toEqual([
      '/ca "5 €." at offset 5 is not covered by any chunk',
    ]);
  });

  it('allows a chunk boundary inside a word, until round 1 shows whether to forbid it', () => {
    const reply: RawReply = {
      ...SPEC_REPLY,
      ca: 'Cantava.',
      subject: { person: '3sg', expressed: false },
      chunks: [
        { text: 'Canta', role: 'verb', ids: ['VERB.ind.imperfet'], lemma: 'cantar' },
        { text: 'va', role: 'verb', ids: ['VERB.ind.imperfet'] },
      ],
    };
    expect(checkPhraseReply(reply).valid).toBe(true);
  });
});

describe('chunks that are not the sentence', () => {
  it('fails on a chunk missing from ca', () => {
    expect(
      errorsOf(
        checkPhraseReply(
          withChunks([AHIR, VAIG_COMPRAR, { ...EL_PA, text: 'el pà' }, AL_MERCAT]),
        ),
      ),
    ).toEqual(['/chunks/2 "el pà" does not occur in ca']);
  });

  it('fails on chunks out of order', () => {
    expect(
      errorsOf(checkPhraseReply(withChunks([AHIR, EL_PA, VAIG_COMPRAR, AL_MERCAT]))),
    ).toEqual([
      '/chunks/2 "vaig comprar" is out of order: it occurs in ca only before offset 23',
    ]);
  });

  it('fails on two chunks claiming the same words', () => {
    expect(
      checkPhraseReply(withChunks([AHIR, VAIG_COMPRAR, EL_PA, EL_PA, AL_MERCAT])).valid,
    ).toBe(false);
  });
});

describe('unlinked is present exactly when ids is empty', () => {
  it('fails on unlinked beside a non-empty ids', () => {
    expect(
      errorsOf(
        checkPhraseReply(
          withChunks([
            AHIR,
            { ...VAIG_COMPRAR, unlinked: 'no_notion' },
            EL_PA,
            AL_MERCAT,
          ]),
        ),
      ),
    ).toEqual(['/chunks/1 has unlinked "no_notion" but links IDs']);
  });

  it('fails on empty ids without an unlinked reason', () => {
    expect(
      errorsOf(
        checkPhraseReply(withChunks([bareAhir(), VAIG_COMPRAR, EL_PA, AL_MERCAT])),
      ),
    ).toEqual(['/chunks/0 links no ID and gives no unlinked reason']);
  });

  it('accepts both reasons on an empty ids', () => {
    for (const unlinked of ['no_notion', 'outside_taxonomy']) {
      expect(
        checkPhraseReply(
          withChunks([{ ...AHIR, unlinked }, VAIG_COMPRAR, EL_PA, AL_MERCAT]),
        ).valid,
      ).toBe(true);
    }
  });
});

describe('the subject', () => {
  it('fails on a subject chunk when subject.expressed is false', () => {
    const reply: RawReply = {
      ...SPEC_REPLY,
      ca: 'Jo vaig comprar el pa.',
      chunks: [
        { text: 'Jo', role: 'subject', ids: ['PRON.fort.subjecte'] },
        VAIG_COMPRAR,
        EL_PA,
      ],
    };
    expect(errorsOf(checkPhraseReply(reply))).toEqual([
      '/chunks/0 is a subject chunk but subject.expressed is false',
    ]);
    expect(
      checkPhraseReply({ ...reply, subject: { person: '1sg', expressed: true } }).valid,
    ).toBe(true);
  });
});

describe('the order of checks', () => {
  it('reports the schema errors alone when the shape is wrong', () => {
    const errors = errorsOf(
      checkPhraseReply(
        withChunks([
          { ...AHIR, role: 'adverbial', text: 'absent' },
          VAIG_COMPRAR,
          EL_PA,
          AL_MERCAT,
        ]),
      ),
    );
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.every((error) => error.startsWith('/chunks/0/role'))).toBe(true);
  });

  it('reports every rule a well-shaped reply breaks, not only the first', () => {
    expect(
      errorsOf(checkPhraseReply(withChunks([bareAhir(), VAIG_COMPRAR, EL_PA]))),
    ).toEqual([
      '/chunks/0 links no ID and gives no unlinked reason',
      '/ca "al mercat." at offset 23 is not covered by any chunk',
    ]);
  });
});
