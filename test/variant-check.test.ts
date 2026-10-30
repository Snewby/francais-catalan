import { describe, expect, it } from 'vitest';
import type { Chunk, PhraseReply } from '../src/api/phrase-check';
import {
  changedRoles,
  checkVariantReply,
  sameText,
  type VariantContext,
} from '../src/variants/check';
import {
  parseComboKey,
  startingState,
  timeWordFor,
  type Combination,
} from '../src/variants/combination';
import { recordedReply } from './helpers/recorded-replies';

type Ids = Chunk['ids'];

/** The context a request for `targetKey` from recorded case `n` would carry. */
function contextFor(n: number, targetKey: string, base?: Combination) {
  const reply = recordedReply(n);
  const combination = base ?? startingState(reply).combination;
  const target = parseComboKey(targetKey);
  const timeWord = timeWordFor(
    { combination, hasTimeChunk: reply.chunks.some((chunk) => chunk.role === 'time') },
    target,
  );
  return { original: { chunks: reply.chunks, combination }, target, timeWord };
}

function ok(
  reply: Omit<PhraseReply, 'assumptions'> & {
    assumptions?: PhraseReply['assumptions'];
  },
) {
  return { status: 'ok', assumptions: [], ...reply };
}

const ROW1_AVUI_ELLA = ok({
  fr: 'Aujourd’hui, elle a acheté le pain au marché.',
  ca: 'Avui ha comprat el pa al mercat.',
  subject: { person: '3sg', expressed: false },
  chunks: [
    { text: 'Avui', role: 'time', ids: ['ADV.temps.dixi'] },
    { text: 'ha comprat', role: 'verb', ids: ['VERB.perf.present', 'VERB.conj.1'] },
    { text: 'el pa', role: 'object_direct', ids: ['ART.def.forma.paradigma'] },
    { text: 'al mercat', role: 'place', ids: ['ART.contract.a_de'] },
  ],
});

function errorsOf(candidate: unknown, context: VariantContext) {
  const result = checkVariantReply(candidate, context);
  return result.valid ? [] : result.errors;
}

describe('a valid variant', () => {
  it('passes, spanned, with its French line', () => {
    const result = checkVariantReply(
      ROW1_AVUI_ELLA,
      contextFor(1, 'ella·avui·none·0·0'),
    );
    expect(result.valid).toBe(true);
    if (result.valid && result.variant.status === 'ok') {
      expect(result.variant.fr).toBe('Aujourd’hui, elle a acheté le pain au marché.');
      expect(result.variant.phrase.chunks[1]).toMatchObject({ start: 5, end: 15 });
    }
  });

  it('accepts not_applicable with a reason and nothing else', () => {
    const context = contextFor(19, 'ella·present·estar·0·0');
    expect(
      checkVariantReply(
        { status: 'not_applicable', reason: 'aspect_incompatible' },
        context,
      ),
    ).toEqual({
      valid: true,
      variant: { status: 'not_applicable', reason: 'aspect_incompatible' },
    });
  });
});

describe('the two shapes', () => {
  const context = contextFor(1, 'ella·avui·none·0·0');

  it('rejects not_applicable without a reason, or carrying a variant', () => {
    expect(errorsOf({ status: 'not_applicable' }, context)).toEqual([
      'not_applicable without a reason',
    ]);
    expect(
      errorsOf({ status: 'not_applicable', reason: 'other', ca: 'Avui.' }, context),
    ).toEqual(['not_applicable carries ca']);
  });

  it('rejects ok with a field missing or a reason', () => {
    const { fr: _fr, ...noFr } = ROW1_AVUI_ELLA;
    expect(errorsOf(noFr, context)).toEqual(['ok without fr']);
    expect(errorsOf({ ...ROW1_AVUI_ELLA, reason: 'other' }, context)).toEqual([
      'ok carries a reason',
    ]);
  });

  it('rejects a blank French line', () => {
    expect(errorsOf({ ...ROW1_AVUI_ELLA, fr: ' ' }, context)).toContain('fr is empty');
  });

  it('runs the phase 1 checks: a chunk that is not in ca fails', () => {
    const chunks = [...ROW1_AVUI_ELLA.chunks];
    chunks[2] = {
      text: 'la llet',
      role: 'object_direct',
      ids: ['ART.def.forma.paradigma'],
    };
    expect(errorsOf({ ...ROW1_AVUI_ELLA, chunks }, context)[0]).toMatch(
      /does not occur in ca/,
    );
  });
});

describe('only the expected chunks change', () => {
  it('fails a change to a role no changed axis allows', () => {
    const variant = ok({
      fr: 'Hier, elle a acheté le pain à la boutique.',
      ca: 'Ahir va comprar el pa a la botiga.',
      subject: { person: '3sg', expressed: false },
      chunks: [
        { text: 'Ahir', role: 'time', ids: ['ADV.temps.dixi'] },
        { text: 'va comprar', role: 'verb', ids: ['VERB.ind.passat_perifrastic'] },
        { text: 'el pa', role: 'object_direct', ids: ['ART.def.forma.paradigma'] },
        { text: 'a la botiga', role: 'place', ids: ['PREP.a_en.lloc.a_lloc'] },
      ],
    });
    expect(errorsOf(variant, contextFor(1, 'ella·ahir·none·0·0'))).toEqual([
      'the place chunk changed, which no changed axis (person) allows',
    ]);
  });

  it('passes agreement in a complement on a person change', () => {
    const variant = ok({
      fr: 'Ils sont contents de te voir.',
      ca: "Estan contents de veure't.",
      subject: { person: '3pl', expressed: false },
      chunks: [
        { text: 'Estan', role: 'verb', ids: ['VERB.ser_estar', 'VERB.ind.present'] },
        { text: 'contents', role: 'complement', ids: ['NOM.adj.four_form'] },
        {
          text: "de veure't",
          role: 'complement',
          ids: ['PREP.formes_no_finites.adjectiu_de'],
        },
      ],
    });
    expect(errorsOf(variant, contextFor(28, 'ells·present·none·0·0'))).toEqual([]);
  });

  it('passes a reflexive clitic on a person change', () => {
    const variant = ok({
      fr: 'Hier soir, elle s’est trompée de chemin.',
      ca: 'Ahir a la nit es va equivocar de camí.',
      subject: { person: '3sg', expressed: false },
      chunks: [
        { text: 'Ahir a la nit', role: 'time', ids: ['ADV.temps.dixi'] },
        { text: 'es', role: 'clitic', ids: ['PRON.feble.persona_reflexiu'] },
        { text: 'va equivocar', role: 'verb', ids: ['VERB.ind.passat_perifrastic'] },
        { text: 'de camí', role: 'complement', ids: ['PREP.regim.convergent'] },
      ],
    });
    expect(errorsOf(variant, contextFor(30, 'ella·ahir·none·0·0'))).toEqual([]);
  });

  it('passes elision on a tense change', () => {
    const base = {
      chunks: [
        { text: 'Ahir', role: 'time' as const },
        { text: 'el', role: 'clitic' as const },
        { text: 'vaig comprar', role: 'verb' as const },
      ],
      combination: parseComboKey('jo·ahir·none·0·0'),
    };
    const variant = ok({
      fr: 'Aujourd’hui, je l’ai acheté.',
      ca: "Avui l'he comprat.",
      subject: { person: '1sg', expressed: false },
      chunks: [
        { text: 'Avui', role: 'time', ids: ['ADV.temps.dixi'] },
        { text: "l'", role: 'clitic', ids: ['PRON.feble.forma_alomorfs'] },
        { text: 'he comprat', role: 'verb', ids: ['VERB.perf.present'] },
      ],
    });
    const target = parseComboKey('jo·avui·none·0·0');
    expect(errorsOf(variant, { original: base, target, timeWord: 'Avui' })).toEqual([]);
  });

  it('passes elision on the pronoun swap', () => {
    const variant = ok({
      fr: 'J’en ai acheté.',
      ca: "N'he comprat.",
      subject: { person: '1sg', expressed: false },
      chunks: [
        { text: "N'", role: 'clitic', ids: ['PRON.feble.en'] },
        { text: 'he comprat', role: 'verb', ids: ['VERB.perf.present'] },
      ],
    });
    expect(errorsOf(variant, contextFor(9, 'jo·avui·none·1·0'))).toEqual([]);
  });

  it('ignores the recapitalisation of a word that moves to or from the head', () => {
    const variant = ok({
      fr: 'Je n’ai pas acheté de pain.',
      ca: 'No he comprat pa.',
      subject: { person: '1sg', expressed: false },
      chunks: [
        { text: 'No', role: 'negation', ids: ['NEG.simple.no'] },
        { text: 'he comprat', role: 'verb', ids: ['VERB.perf.present'] },
        { text: 'pa', role: 'object_direct', ids: ['ART.indef.sense_partitiu'] },
      ],
    });
    expect(errorsOf(variant, contextFor(9, 'jo·avui·none·0·1'))).toEqual([]);
  });

  it('pairs chunks of one role in order, so a swap of two is a change', () => {
    const before = [
      { text: 'contenta', role: 'complement' as const },
      { text: "de veure't", role: 'complement' as const },
    ];
    expect(changedRoles(before, [...before].reverse())).toEqual(
      new Set(['complement']),
    );
    expect(changedRoles(before, before)).toEqual(new Set());
    expect(sameText('Ahir', 'ahir')).toBe(true);
    expect(sameText('Ahir', 'avui')).toBe(false);
  });
});

describe('the time word', () => {
  it('fails a wrong time word', () => {
    const chunks = [...ROW1_AVUI_ELLA.chunks];
    chunks[0] = { text: 'Aquest matí', role: 'time', ids: ['ADV.temps.dixi'] };
    const variant = {
      ...ROW1_AVUI_ELLA,
      ca: 'Aquest matí ha comprat el pa al mercat.',
      chunks,
    };
    expect(errorsOf(variant, contextFor(1, 'ella·avui·none·0·0'))).toEqual([
      'timeWord is "Avui" but the time chunk is "Aquest matí"',
    ]);
  });

  it('fails a missing time word', () => {
    const variant = {
      ...ROW1_AVUI_ELLA,
      ca: 'Ha comprat el pa al mercat.',
      chunks: ROW1_AVUI_ELLA.chunks
        .slice(1)
        .map((chunk, index) =>
          index === 0 ? { ...chunk, text: 'Ha comprat' } : chunk,
        ),
    };
    expect(errorsOf(variant, contextFor(1, 'ella·avui·none·0·0'))).toEqual([
      'timeWord is "Avui" but the time chunk is missing',
    ]);
  });

  it('accepts the word in lower case where it does not open the sentence', () => {
    const variant = ok({
      fr: 'Tu y es allé hier ?',
      ca: 'Hi vas anar ahir?',
      subject: { person: '2sg', expressed: false },
      chunks: [
        { text: 'Hi', role: 'clitic', ids: ['PRON.feble.hi'] },
        { text: 'vas anar', role: 'verb', ids: ['VERB.ind.passat_perifrastic'] },
        { text: 'ahir', role: 'time', ids: ['ADV.temps.dixi'] },
      ],
    });
    const context = contextFor(6, 'tu·ahir·none·0·0');
    expect(context.timeWord).toBe('Ahir');
    expect(errorsOf(variant, context)).toEqual([]);
  });

  it('fails drop with a time chunk left', () => {
    const variant = ok({
      fr: 'Hier, elle achète le pain au marché.',
      ca: 'Ahir compra el pa al mercat.',
      subject: { person: '3sg', expressed: false },
      chunks: [
        { text: 'Ahir', role: 'time', ids: ['ADV.temps.dixi'] },
        { text: 'compra', role: 'verb', ids: ['VERB.ind.present'] },
        { text: 'el pa', role: 'object_direct', ids: ['ART.def.forma.paradigma'] },
        { text: 'al mercat', role: 'place', ids: ['ART.contract.a_de'] },
      ],
    });
    expect(errorsOf(variant, contextFor(1, 'ella·present·none·0·0'))).toEqual([
      'timeWord is drop but a time chunk "Ahir" is left',
    ]);
  });

  it('fails a time chunk added to a base that had none', () => {
    const variant = ok({
      fr: 'Hier, j’ai acheté du pain.',
      ca: 'Ahir vaig comprar pa.',
      subject: { person: '1sg', expressed: false },
      chunks: [
        { text: 'Ahir', role: 'time', ids: ['ADV.temps.dixi'] },
        { text: 'vaig comprar', role: 'verb', ids: ['VERB.ind.passat_perifrastic'] },
        { text: 'pa', role: 'object_direct', ids: ['ART.indef.sense_partitiu'] },
      ],
    });
    const context = contextFor(9, 'jo·ahir·none·0·0');
    expect(context.timeWord).toBeUndefined();
    expect(errorsOf(variant, context)).toEqual([
      'no timeWord was sent but the time chunk changed',
    ]);
  });
});

describe('the target is realised', () => {
  it('fails a verb chunk without the target tense', () => {
    const chunks = [...ROW1_AVUI_ELLA.chunks];
    chunks[1] = { text: 'ha comprat', role: 'verb', ids: ['VERB.conj.1'] as Ids };
    expect(
      errorsOf({ ...ROW1_AVUI_ELLA, chunks }, contextFor(1, 'ella·avui·none·0·0')),
    ).toEqual(['no verb chunk carries avui with tournure none']);
  });

  it('fails a subject in the wrong person', () => {
    const variant = { ...ROW1_AVUI_ELLA, subject: { person: '1sg', expressed: false } };
    expect(errorsOf(variant, contextFor(1, 'ella·avui·none·0·0'))).toEqual([
      'subject.person is 1sg, not 3sg for ella',
    ]);
  });

  it('counts a tournure with no tense ID as Présent (F4)', () => {
    const variant = ok({
      fr: 'Nous sommes en train de préparer le dîner.',
      ca: 'Estem preparant el sopar.',
      subject: { person: '1pl', expressed: false },
      chunks: [
        { text: 'Estem preparant', role: 'verb', ids: ['VERB.perifrasi.progressiva'] },
        { text: 'el sopar', role: 'object_direct', ids: ['ART.def.forma.paradigma'] },
      ],
    });
    expect(errorsOf(variant, contextFor(17, 'nosaltres·present·estar·0·0'))).toEqual(
      [],
    );
  });

  it('fails a tournure the target does not ask for', () => {
    const variant = ok({
      fr: 'Elle prépare le dîner.',
      ca: 'Està preparant el sopar.',
      subject: { person: '3sg', expressed: false },
      chunks: [
        {
          text: 'Està preparant',
          role: 'verb',
          ids: ['VERB.perifrasi.progressiva', 'VERB.ind.present'],
        },
        { text: 'el sopar', role: 'object_direct', ids: ['ART.def.forma.paradigma'] },
      ],
    });
    expect(errorsOf(variant, contextFor(17, 'ell·present·none·0·0'))).toEqual([
      'no verb chunk carries present with tournure none',
    ]);
  });

  it('skips the tense check on a greyed tense axis (row 22, ella)', () => {
    const context = contextFor(22, 'ella·-·none·0·0');
    expect(context.target.tense).toBeNull();
    const variant = ok({
      fr: 'Elle veut que tu viennes.',
      ca: 'Vol que vinguis.',
      subject: { person: '3sg', expressed: false },
      assumptions: ['addressee_tu'],
      chunks: [
        { text: 'Vol', role: 'verb', ids: ['VERB.irregular.velar'] },
        { text: 'que', role: 'connector', ids: ['CONJ.completiva.que'] },
        { text: 'vinguis', role: 'verb', ids: ['VERB.subj.present'] },
      ],
    });
    // The main verb carries no tense ID here, which would fail any target
    // that names a tense; with the axis greyed there is none to realise.
    expect(errorsOf(variant, context)).toEqual([]);
  });
});
