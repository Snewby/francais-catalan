# Sources and licence position

Read this before any seeding pass.

## The rule

**Extract facts and re-express them. Never copy a source data file into the
repo, in whole or in substantial part, regardless of its licence.**

Every taxonomy node in this repo is hand-authored in our own schema. The sources
below are consulted for facts (lemmas, conjugation classes, tense labels,
paradigm slots) and then closed.

## Licence status of each source

| Source             | Licence                                                            |
| ------------------ | ------------------------------------------------------------------ |
| Apertium           | GPL-2.0-or-later                                                   |
| catalan-dict-tools | Dual LGPL-2.1 / GPL-2.0                                            |
| verbecc            | Dual LGPL-3.0 / GPL-3.0. Its Catalan list is sourced from catverbs |
| SUBTLEX-CAT        | No reuse grant                                                     |
| verbs.cat          | No licence stated                                                  |
| Softcatalà, AnCora | Spain-based, so the EU database right applies                      |

## Why fact extraction is the safe route, and where it stops being safe

GPLv2 reaches "works based on the Program". Facts are not copyrightable under
the Feist doctrine, so facts re-authored into our own schema are generally not a
derivative work of the source.

Two dangers remain, and both are about copying rather than about facts:

1. **Compilation copyright.** A curated list can carry thin copyright in the
   selection and arrangement even where no individual entry does. Copying a
   list verbatim, including its ordering, can therefore infringe even when
   copying any single row would not.
2. **The EU sui generis database right.** Softcatalà and AnCora are Spain-based.
   That right can restrict extraction of a substantial part of a database even
   when the contents are plain uncopyrightable facts. It is a separate right
   from copyright and is not answered by "these are only facts".

Keep extraction fact-level and hand-authored, and neither danger is engaged.
Signs that a pass has drifted into copying: identical ordering to the source,
source field names surviving into our schema, or suspiciously complete coverage
of an external list. The `schema-validator` agent spot-checks for exactly these.

## Source notes

<!-- Per-domain extracted notes go here as seeding proceeds. One section per
domain, facts only, with the source named. -->

### NOM (nouns: gender, number, derivation)

No dataset from the table above covers nominal morphology; that table is
verb-oriented. The facts for this domain (gender assignment rules, plural
formation classes, adjective agreement, derivational suffixes) are drawn from
two sources only:

- `docs/01-catalan-structural-map-and-build-plan.md`, lines 86-90, the "NOM"
  section header and its pointer to gender/number/derivation as the domain's
  scope.
- General knowledge of Catalan nominal morphology (GIEC-level facts: -o/-a
  gender alternation, -essa/-riu feminine suffixes, sibilant and hidden-n
  plural classes, four-form/two-form adjective agreement, the diminutive,
  augmentative, agent and abstract noun suffixes).

No licensed data file, curated list or database was extracted from for this
domain, so neither the compilation-copyright risk nor the EU database right
described above is engaged here. All examples and Catalan forms are
hand-authored for this repo.

<!-- Later domains: follow the NOM or ART section above. Name the source, list
the facts, and state the licence position explicitly rather than by omission. -->

### ART (articles)

No dataset from the table above covers article morphology; that table is
verb-oriented. The facts for this domain are drawn from two sources only:

- `docs/01-catalan-structural-map-and-build-plan.md`, lines 92-101, the "ART"
  table, which fixes the five second-level codes used here (`ART.def`,
  `ART.indef`, `ART.personal`, `ART.contract`, `ART.salat`) and their
  contrast status.
- General knowledge of Catalan article morphology (GIEC-level facts: the
  el/la/els/les paradigm and its apostrophation before a vowel or mute h, the
  exception for unstressed initial i-/u- in the feminine singular, the
  el/l' split before a consonantal i or u, the un/una/uns/unes paradigm and
  the absence of any partitive article (a bare noun stands where French
  needs du/de la/des, including under negation), the personal article en/na
  and its apostrophated form n', the Central Catalan la Maria alternative,
  the elision and non-doubling of the personal article after a preposition
  (d'en, a l'-, de la), the contraction paradigm al/als/del/dels/pel/pels
  and its suspension before an elided l', article use before a possessive,
  with dates/days/times/years, with language names, with a title plus
  surname, with place names that carry the article as part of the name
  (l'Hospitalet, el Prat, la Seu d'Urgell), and the Balearic salat article
  es/sa as a dialectal system distinct from the standard article.

  `ART.def` is split into a `forma` branch (the shape of the article and
  its elision) and a `us` branch (where and when it is used), because the
  four definite-article paradigm cells were collapsed into a single leaf,
  `ART.def.forma.paradigma`, rather than kept as four separate leaves:
  el/la/els/les are inflectional cells of one transfer-level rule, not four
  independent facts, matching the convention in `data/nom.fragment.json`
  that leaves are rules and classes rather than paradigm cells. The same
  collapse applies to `ART.indef.paradigma` (un/una) and `ART.indef.plural`
  (uns/unes, kept as its own leaf because it is itself the near-miss docs/01
  names, not an inflectional cell of the singular).

  Each docs/01 status binds the leaves that realise its row, and does not
  propagate to every descendant the way a `data/contrast-overrides.json`
  wildcard does. The rows predate this tree, so a literal wildcard reading
  would label the domain's sharpest divergences as free transfer. Two
  consequences worth naming, because they read as drift otherwise:

  - The `ART.def` transfer binds `ART.def.forma.*` only. Every `ART.def.us`
    leaf was judged on its own, and `abans_possessiu`, `hores`, `anys`,
    `paisos` and `titols` came out near-miss.
  - The `ART.contract` transfer binds the `a` and `de` cells, which is what
    its own parenthetical cites (au, du, aux, des). `pel` and `pels` are
    near-miss instead: French does not fuse par with the article, so the
    contraction habit a French speaker already has is lexical to à and de,
    and the expected error is "per el carrer".

No licensed data file, curated list or database was extracted from for this
domain, so neither the compilation-copyright risk nor the EU database right
described above is engaged here. All examples and Catalan forms are
hand-authored for this repo.
