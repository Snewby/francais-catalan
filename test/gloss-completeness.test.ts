import { describe, expect, it } from 'vitest';
import { BRANCHES, CONTRAST_STATUSES, LEAVES } from '../src/taxonomy';
import { OVERRIDES, resolveOverride } from '../src/taxonomy/overrides';
import { fr } from '../src/i18n/fr';
import { hasHighPunctuation, highPunctuationOffenders } from './helpers/typography';

describe('every leaf carries a French gloss', () => {
  it('keys the gloss by language rather than flattening it', () => {
    for (const leaf of LEAVES) {
      expect(typeof leaf.glosses, leaf.id).toBe('object');
      expect(Object.keys(leaf.glosses), leaf.id).toContain('fr');
    }
  });

  it('has a non-empty glosses.fr', () => {
    const missing = LEAVES.filter((leaf) => leaf.glosses.fr.trim() === '');
    expect(missing.map((leaf) => leaf.id)).toEqual([]);
  });

  it('leaves no placeholder text behind from a structural seeding pass', () => {
    // 2a seeds structure with placeholders and 2b fills them in. A placeholder
    // that survives reads as an authored gloss, so it has to fail loudly.
    const placeholder = /^(todo|tbd|xxx|placeholder|à faire)/i;
    const stubbed = LEAVES.filter(
      (leaf) =>
        placeholder.test(leaf.glosses.fr) || placeholder.test(leaf.contrast_fr.note),
    );
    expect(stubbed.map((leaf) => leaf.id)).toEqual([]);
  });
});

describe('every leaf carries a contrast_fr', () => {
  it('uses one of the four statuses', () => {
    for (const leaf of LEAVES) {
      expect(CONTRAST_STATUSES, leaf.id).toContain(leaf.contrast_fr.status);
    }
  });

  it('gives a non-empty note', () => {
    const missing = LEAVES.filter((leaf) => leaf.contrast_fr.note.trim() === '');
    expect(missing.map((leaf) => leaf.id)).toEqual([]);
  });

  it('states the contrast concretely rather than gesturing at it', () => {
    // "Proche du français" is explicitly not a note; length is a crude proxy
    // but it catches the one-word shrug.
    const thin = LEAVES.filter((leaf) => leaf.contrast_fr.note.length < 40);
    expect(thin.map((leaf) => `${leaf.id}: ${leaf.contrast_fr.note}`)).toEqual([]);
  });

  it('does not reuse the generic UI label as the per-node note', () => {
    const generic = Object.values(fr.contrast);
    const lazy = LEAVES.filter((leaf) =>
      generic.some((label) => leaf.contrast_fr.note.trim() === label),
    );
    expect(lazy.map((leaf) => leaf.id)).toEqual([]);
  });
});

describe('pre-assigned contrast statuses are applied verbatim', () => {
  it('matches data/contrast-overrides.json for every overridden leaf', () => {
    // The overrides file is the single source of truth for these nodes. A gloss
    // pass that re-derives them by judgement is the failure this catches.
    const drifted: string[] = [];
    for (const leaf of LEAVES) {
      const override = resolveOverride(leaf.id);
      if (override === undefined) continue;
      if (
        leaf.contrast_fr.status !== override.status ||
        leaf.contrast_fr.note !== override.note
      ) {
        drifted.push(leaf.id);
      }
    }
    expect(drifted).toEqual([]);
  });

  it('prefers an exact override over a wildcard one', () => {
    expect(resolveOverride('VERB.ser_estar')?.status).toBe('novel');
  });

  it('applies a wildcard override to the leaves beneath it', () => {
    expect(resolveOverride('VERB.perf.present')?.status).toBe('transfer');
  });

  it('returns nothing for a leaf with no override', () => {
    expect(resolveOverride('VERB.ind.imperfet')).toBeUndefined();
  });
});

describe('French metalanguage conventions in taxonomy and overrides prose', () => {
  /**
   * Every French-language string on every node, plus the override notes that
   * become node prose verbatim. A branch carries only `label_fr`, but it is
   * French copy like any other and was going unasserted: the ART seed wrote
   * seven labels with straight apostrophes because nothing here looked at them.
   */
  const frenchProse = [
    ...BRANCHES.map((branch) => ({
      id: branch.id,
      field: 'label_fr',
      text: branch.label_fr,
    })),
    ...LEAVES.flatMap((leaf) => [
      { id: leaf.id, field: 'glosses.fr', text: leaf.glosses.fr },
      { id: leaf.id, field: 'contrast_fr.note', text: leaf.contrast_fr.note },
      ...(leaf.notes === undefined
        ? []
        : [{ id: leaf.id, field: 'notes', text: leaf.notes }]),
      ...(leaf.dialect_note === undefined
        ? []
        : [{ id: leaf.id, field: 'dialect_note', text: leaf.dialect_note }]),
    ]),
    // The overrides file is French copy that becomes leaf prose verbatim, so it
    // is held to the same rules directly rather than only through the leaves
    // that happen to consume it. An override for an unseeded domain has no such
    // leaf, which is exactly when a typography slip would go unnoticed and then
    // arrive pre-broken on the domain that adopts it. `rationale` is excluded:
    // it is repo-language British English and never reaches the learner.
    ...OVERRIDES.map((override) => ({
      id: override.id,
      field: 'contrast-overrides.note',
      text: override.note,
    })),
  ];

  it('uses no em-dashes', () => {
    for (const { id, field, text } of frenchProse) {
      expect(text, `${id} ${field}`).not.toContain('—');
    }
  });

  it('puts a narrow no-break space inside guillemets', () => {
    // smoke.test.ts asserts this over src/i18n/fr.ts. Taxonomy prose is French
    // copy on the same terms and was going unasserted, so every domain seeded
    // after phase 1 drifted to an ordinary space. The difference is invisible
    // in review and wrong in print.
    for (const { id, field, text } of frenchProse) {
      expect(text, `${id} ${field}: ordinary space after «`).not.toMatch(/« /);
      expect(text, `${id} ${field}: ordinary space before »`).not.toMatch(/ »/);
    }
  });

  it('puts a narrow no-break space before : ; ! ?', () => {
    // This was `not.toMatch(/ [:;!?]/)`, which rejects an ordinary space and
    // says nothing about punctuation written with no space at all. The NEG seed
    // wrote `(pas, jamais...);` and passed. Assert the rule positively instead:
    // whatever precedes the mark has to be the narrow no-break space.
    for (const { id, field, text } of frenchProse) {
      expect(highPunctuationOffenders(text), `${id} ${field}`).toEqual([]);
    }
  });

  it('has high punctuation to have checked', () => {
    // Positive control. The assertion above is satisfied vacuously by prose
    // containing no colons, which is not the corpus this repo has, and a future
    // refactor that silently stopped feeding it text would otherwise pass.
    const checked = frenchProse.filter(({ text }) => hasHighPunctuation(text));
    expect(checked.length).toBeGreaterThan(50);
  });

  it('uses the typographic apostrophe in French prose', () => {
    // A Catalan form cited inside French prose keeps its straight apostrophe,
    // because it is data rather than copy. Citations are delimited by
    // guillemets, so stripping them leaves the French words alone; any straight
    // apostrophe surviving that is a French one written the Catalan way.
    const citation = /«[^»]*»/g;
    for (const { id, field, text } of frenchProse) {
      expect(text.replace(citation, ''), `${id} ${field}`).not.toContain("'");
    }
  });

  it('puts a Catalan form cited in French prose inside guillemets', () => {
    // Otherwise the rule above has no way to tell a cited form from a typo.
    const catalanApostrophe = /\S*'\S*/g;
    for (const { id, field, text } of frenchProse) {
      const citations = text.match(/«[^»]*»/g) ?? [];
      for (const token of text.match(catalanApostrophe) ?? []) {
        expect(
          citations.some((citation) => citation.includes(token)),
          `${id} ${field}: ${token} is not inside guillemets`,
        ).toBe(true);
      }
    }
  });

  it('uses the straight apostrophe in Catalan forms and examples', () => {
    for (const leaf of LEAVES) {
      for (const catalan of [leaf.ca, ...leaf.examples]) {
        expect(catalan, leaf.id).not.toContain('’');
      }
    }
  });

  it('gives every leaf at least one Catalan example', () => {
    const bare = LEAVES.filter((leaf) => leaf.examples.length === 0);
    expect(bare.map((leaf) => leaf.id)).toEqual([]);
  });
});
