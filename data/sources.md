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

### PREP (prepositions)

No dataset from the table above covers prepositions; that table is
verb-oriented. The facts for this domain are drawn from two sources only:

- `docs/01-catalan-structural-map-and-build-plan.md`, lines 163-167, the
  "PREP" section, which fixes four second-level codes (`PREP.atones`,
  `PREP.a_en`, `PREP.per_pera`, `PREP.toniques`/`PREP.loc`), names the six
  unstressed prepositions and the tonic ones seeded here, assigns `near-miss`
  to `PREP.a_en` and to `PREP.per_pera`, and records that the GIEC sanctions
  three coexisting per/per a systems of which spontaneous Central and Eastern
  speech uses only `per`.
- General knowledge of Catalan prepositional syntax (GIEC-level facts: the
  a/en alternation conditioned by the following determiner rather than by
  meaning, `a` before every place name whatever its gender, the a-plus-article
  time expressions and the bare article before days, dates and years, `en` for
  the time a completed action takes, the per/per a split across cause, agent,
  path, approximate date, nominal purpose and infinitival purpose, the verbs
  governing an infinitive and the adjectival `de` of "facil de fer", the
  gerund's refusal of any preposition against the `en` plus infinitive
  construction, verb government and the fall of a governed preposition before
  a completive `que`, the unmarked direct object, the dative `a`, `a` before
  a stressed pronoun in dislocation, the obligatory `de` between a quantifier
  and a following adjective, the blocking of elision before a consonantal i
  or u, the tonic prepositions, the a-final and de-final locutions, and
  `des de fa` for elapsed duration).

Four structural decisions, recorded because they read as drift otherwise:

- **`PREP.atones` holds three codes docs/01 does not name** (`elisio_de`,
  `de_origen`, `amb_mitja`), and `PREP.formes_no_finites` and `PREP.marcatge`
  are branches with no docs/01 row at all. They exist because the brief
  weighted this domain towards French interference, and the prepositions
  before a non-finite form and the presence or absence of a preposition on an
  argument are where that interference is worst. Neither is reachable from a
  tree organised by the Catalan preposition inventory.
- **`PREP.regim` is split by mismatch, not by Catalan surface form.** An
  earlier draft had `verb_a`, `verb_de`, `verb_en` and `verb_amb`. The first
  two turned out to be entirely convergent with French and the last two
  entirely divergent, so the surface-form axis produced leaves whose members
  could not share one status. `convergent` plus `divergent_en`, `divergent_amb`
  and `divergent_de` restores that.
- **Contraction of `a`, `de` and `per` with the article is not here.** It is
  `ART.contract`, including inside a locution (`fins al`, `des del`), which is
  the same fact and must not take a second permanent key.
- **Preposition plus relative (`de que`, `amb qui`, and the absence of any
  counterpart to French `dont`) is deliberately not here.** A French speaker
  meets it as a preposition-placement problem, which is the argument for
  putting it in PREP, but it is the relative-pronoun system and belongs to
  `PRON` or `SYN`. Recorded so the next seeder finds the decision rather than
  the gap.

Each docs/01 status binds the leaves that realise its row, and does not
propagate to every descendant the way a `data/contrast-overrides.json`
wildcard does; that file covers only `VERB` and asserts nothing about `PREP`.
The `PREP.a_en` and `PREP.per_pera` rows bind ten of their fourteen children.
The other four are transfer on their own merits: `hores` (a les tres against
a trois heures), `durada` (en dues hores against en deux heures), `agent` (the
passive agent per against par) and `recorregut` (entra per la finestra against
entrer par la fenetre). Forcing near-miss onto those would make the status
field describe the branch rather than the leaf, which is not what it is for.
`de_origen` was moved out of `PREP.a_en` entirely, because a `de` fact does
not realise the a/en contrast at all.

No licensed data file, curated list or database was extracted from for this
domain, so neither the compilation-copyright risk nor the EU database right
described above is engaged here. All examples and Catalan forms are
hand-authored for this repo.
