import { describe, expect, it } from 'vitest';
import { isLeaf, nodeById } from '../src/taxonomy';
import { SWITCH_NOTES, switchNoteFr } from '../src/variants/notes';
import { highPunctuationOffenders, NNBSP } from './helpers/typography';

/**
 * The fifteen notions the variation panel can switch to, as the phase 2 spec
 * lists them under « Switch notes ». Each must have an approved note.
 */
const REQUIRED = [
  'VERB.ind.present',
  'VERB.ind.passat_perifrastic',
  'VERB.perf.present',
  'VERB.ind.imperfet',
  'VERB.ind.futur',
  'VERB.ind.condicional',
  'VERB.mod.obligacio',
  'VERB.perifrasi.acabar_de',
  'VERB.perifrasi.progressiva',
  'PRON.feble.cd_3a',
  'PRON.feble.en',
  'PRON.feble.ho',
  'PRON.feble.forma_alomorfs',
  'NEG.simple.no',
  'PRON.fort.subjecte',
];

/** The only straight-apostrophe tokens the approved notes contain: Catalan forms. */
const CATALAN = new Set(["d'arribar,", "l',", "l'he", "n',"]);

describe('data/variation-notes.json', () => {
  it('has an entry for each of the fifteen switchable notions, and no other', () => {
    const missing = REQUIRED.filter((id) => SWITCH_NOTES[id] === undefined);
    expect(missing).toEqual([]);
    expect(Object.keys(SWITCH_NOTES).sort()).toEqual([...REQUIRED].sort());
  });

  it('keys every note by a taxonomy leaf', () => {
    for (const id of Object.keys(SWITCH_NOTES)) {
      const node = nodeById(id);
      expect(node, id).toBeDefined();
      expect(node !== undefined && isLeaf(node), id).toBe(true);
    }
  });

  it('keys the text by language, like glosses, never as a flat string', () => {
    for (const [id, note] of Object.entries(SWITCH_NOTES)) {
      expect(Object.keys(note), id).toEqual(['fr']);
      expect(note.fr.trim(), id).not.toBe('');
    }
  });

  it('follows French typography: narrow no-break spaces, typographic apostrophes, no em-dash', () => {
    for (const [id, note] of Object.entries(SWITCH_NOTES)) {
      expect(highPunctuationOffenders(note.fr), id).toEqual([]);
      expect(note.fr, id).not.toMatch(/« | »/);
      expect(note.fr, id).not.toContain('—');
    }
    // French prose takes ’ and a Catalan form takes ', which is what keeps
    // exact matching on Catalan text possible wherever it is cited.
    expect(SWITCH_NOTES['VERB.perifrasi.acabar_de']?.fr).toContain(
      "acabo d'arribar, je viens d’arriver",
    );
    expect(SWITCH_NOTES['PRON.feble.forma_alomorfs']?.fr).toContain(
      "el devient l', l'he cantat",
    );
    expect(SWITCH_NOTES['PRON.feble.en']?.fr).toContain("en, n', ne, -ne");
    const straightOutsideCatalan = Object.entries(SWITCH_NOTES)
      .map(([id, note]) => [
        id,
        note.fr.replace(/\S*'\S*/g, (token) => (CATALAN.has(token) ? '' : token)),
      ])
      .filter(([, fr]) => fr?.includes("'"));
    expect(straightOutsideCatalan).toEqual([]);
    expect(SWITCH_NOTES['VERB.ind.passat_perifrastic']?.fr).toContain(
      `«${NNBSP}j’ai chanté${NNBSP}»`,
    );
  });
});

describe('switchNoteFr', () => {
  it('returns the authored note where one exists', () => {
    expect(switchNoteFr('NEG.simple.no')).toBe(SWITCH_NOTES['NEG.simple.no']?.fr);
  });

  it('falls back to the leaf contrast note where there is none', () => {
    const leaf = nodeById('VERB.ser_estar');
    expect(leaf !== undefined && isLeaf(leaf)).toBe(true);
    if (leaf !== undefined && isLeaf(leaf)) {
      expect(switchNoteFr('VERB.ser_estar')).toBe(leaf.contrast_fr.note);
    }
  });

  it('returns nothing for a branch', () => {
    expect(switchNoteFr('VERB')).toBeUndefined();
  });
});
