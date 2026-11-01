import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  replayVariantRecording,
  variantCall,
  type VariantFixture,
  type VariantRecording,
} from '../src/eval/variants';
import { checkVariantReply } from '../src/variants/check';

/**
 * The validator on the replies the models really returned in round 1 (31 Oct),
 * which is what ticks the spec's « Unit tests from recorded replies » box. The
 * hand-written cases in variant-check.test.ts stay for what no reply showed.
 */
const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'test/fixtures/variants-v1');

const FIXTURES: VariantFixture[] = readdirSync(path.join(DIR, 'cases'))
  .sort()
  .map(
    (name) =>
      JSON.parse(readFileSync(path.join(DIR, 'cases', name), 'utf8')) as VariantFixture,
  );

function recording(model: string): VariantRecording {
  return JSON.parse(
    readFileSync(path.join(DIR, 'recordings', model, 'run-1.json'), 'utf8'),
  ) as VariantRecording;
}

const OPUS = recording('claude-opus-5-5');
const HAIKU = recording('claude-haiku-5-5');

/** The model's reply on its first call for one combination, as JSON. */
function firstReply(source: VariantRecording, id: string): Record<string, unknown> {
  const recorded = source.cases.find((c) => c.combination === id);
  const fetched = recorded?.fetches[0];
  if (fetched === undefined || !('body' in fetched))
    throw new Error(`no reply for ${id}`);
  const body = fetched.body as { content: { type: string; text?: string }[] };
  const text = body.content.find((block) => block.type === 'text')?.text ?? '';
  return JSON.parse(text) as Record<string, unknown>;
}

function contextOf(id: string) {
  const n = Number(id.slice(0, -1));
  const fixture = FIXTURES.find((f) => f.n === n);
  const combination = fixture?.combinations.find((c) => c.id === id);
  if (fixture === undefined || combination === undefined) throw new Error(id);
  return variantCall(fixture, combination).context;
}

function errorsOf(reply: unknown, id: string): readonly string[] {
  const result = checkVariantReply(reply, contextOf(id));
  return result.valid ? [] : result.errors;
}

type Chunks = { text: string; role: string }[];

describe('round 1 replies through the validator', () => {
  it('passes all sixty Opus replies on the first call', async () => {
    const replies = await replayVariantRecording(OPUS, FIXTURES);
    expect(replies).toHaveLength(60);
    for (const reply of replies) {
      expect(reply.result.status, reply.combination.id).toBe('ok');
      expect(reply.result.attempts, reply.combination.id).toHaveLength(1);
    }
  });

  it('passes agreement in a complement on a person change (28c)', () => {
    const reply = firstReply(OPUS, '28c');
    expect(reply['ca']).toBe("Estan contents de veure't.");
    expect(errorsOf(reply, '28c')).toEqual([]);
  });

  it('passes elision on a tense and pronoun change (1b) and on the pronoun alone (9a)', () => {
    expect(firstReply(OPUS, '1b')['ca']).toBe("Avui l'he comprat al mercat.");
    expect(errorsOf(firstReply(OPUS, '1b'), '1b')).toEqual([]);
    expect(firstReply(OPUS, '9a')['ca']).toBe("N'he comprat.");
    expect(errorsOf(firstReply(OPUS, '9a'), '9a')).toEqual([]);
  });

  it('gives a base with no time chunk none, and passes the reply that adds none (9b)', () => {
    expect(contextOf('9b').timeWord).toBeUndefined();
    expect(firstReply(OPUS, '9b')['ca']).toBe('Vaig comprar pa.');
    expect(errorsOf(firstReply(OPUS, '9b'), '9b')).toEqual([]);
  });

  it('fails a recorded reply whose time word is changed to the wrong one (1a)', () => {
    const reply = firstReply(OPUS, '1a');
    const chunks = (reply['chunks'] as Chunks).map((chunk) =>
      chunk.role === 'time' ? { ...chunk, text: 'Ahir' } : chunk,
    );
    const wrong = { ...reply, ca: String(reply['ca']).replace('Avui', 'Ahir'), chunks };
    expect(errorsOf(wrong, '1a')).toEqual([
      'timeWord is "Avui" but the time chunk is "Ahir"',
    ]);
  });

  it('fails a recorded drop reply with the time chunk put back (1e)', () => {
    const reply = firstReply(OPUS, '1e');
    expect(reply['ca']).toBe('Compro el pa al mercat.');
    const kept = {
      ...reply,
      ca: `Ahir ${String(reply['ca'])}`,
      chunks: [
        { text: 'Ahir', role: 'time', ids: ['ADV.temps.dixi'] },
        ...(reply['chunks'] as Chunks),
      ],
    };
    expect(errorsOf(kept, '1e')).toContain(
      'timeWord is drop but a time chunk "Ahir" is left',
    );
  });

  it('fails a recorded reply with a change outside the allowed roles (1c)', () => {
    const reply = firstReply(OPUS, '1c');
    const chunks = (reply['chunks'] as Chunks).map((chunk) =>
      chunk.role === 'place' ? { ...chunk, text: 'a la botiga' } : chunk,
    );
    const moved = {
      ...reply,
      ca: String(reply['ca']).replace('al mercat', 'a la botiga'),
      chunks,
    };
    expect(errorsOf(moved, '1c')).toEqual([
      'the place chunk changed, which no changed axis (person) allows',
    ]);
  });

  it('fails Haiku’s first reply on 1a, which leaves out assumptions', () => {
    expect(errorsOf(firstReply(HAIKU, '1a'), '1a')).toEqual(['ok without assumptions']);
  });

  it('accepts the trap answers as given (19b, 22a)', () => {
    expect(firstReply(OPUS, '19b')).toEqual({
      status: 'not_applicable',
      reason: 'aspect_incompatible',
    });
    expect(errorsOf(firstReply(OPUS, '22a'), '22a')).toEqual([]);
  });
});
