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

### DET (determiners)

No dataset from the table above covers determiners; that table is
verb-oriented. The facts for this domain are drawn from two sources only:

- `docs/01-catalan-structural-map-and-build-plan.md`, lines 153-157, the "DET"
  section, which fixes four second-level codes (`DET.dem`, `DET.poss`,
  `DET.quant`, `DET.num`), names the demonstrative and possessive series and
  the eleven quantifiers, assigns `near-miss` to `DET.dem` and `DET.poss` and
  `novel` to `gaire` and `prou`.
- General knowledge of Catalan determiners (GIEC-level facts: the two-degree
  aquest/aquell deixis and its agreeing adnominal paradigm, its discourse-
  anaphoric use, the stressed possessive series with its article, the
  unstressed mon/ton/son series and its kinship restriction, the lexically
  fixed bare-possessive contexts, the postnominal possessive, the ambiguity of
  el seu and the literary llur, the definite article with inalienable
  possession, the three agreement classes of the degree quantifiers, the bare
  quantifier-noun juncture against the closed pseudo-partitive de set, the
  negative-polarity gaire/gens/cap and their licensing environments, algun and
  free-choice qualsevol, tot before the article, cada, the dual tots
  dos/ambdos, the identity and alterity determiners mateix, altres, cert and
  tal, the cardinals and ordinals, the decimal setanta/vuitanta/noranta, the
  interrogative and exclamative quin and quant, and the linear order in which
  determiners stack).

No licensed data file, curated list or database was extracted from for this
domain, so neither the compilation-copyright risk nor the EU database right
described above is engaged here. All examples and Catalan forms are
hand-authored for this repo.

Structural decisions, recorded because they read as drift or as gaps
otherwise:

- **The ART/DET boundary, as amended.** The line is now: ART owns the article
  when it is the sole determiner; DET owns any structure where the article
  co-occurs with, alternates with, or is suppressed by another determiner.
  The earlier line, "ART owns whether the article is present, DET owns the
  determiner's own form", did not survive contact with this tree. It was
  crossed three times inside DET alone: by `DET.quant.universal.tot` (tot el
  dia), by `DET.poss.forma_paradigma` (el meu llibre) and by
  `DET.ordre_intern` (tots els meus amics), each of which is a fact about the
  article co-occurring with something else and none of which can be stated in
  ART without stating the other determiner too. Three crossings is not a set
  of exceptions, it is the wrong boundary, hence the amendment.
  `ART.def.us.abans_possessiu` is a **legacy misfile** under the amended line:
  the article before a possessive is co-occurrence and belongs in DET. It is
  committed, it is referenced, and it is deliberately **not** being migrated,
  because renaming a key is a migration and the fact is correctly stated where
  it sits. `DET.poss.nu_lexical` is its complement, not a duplicate: a closed
  lexical exception set (casa meva, en nom meu, per culpa seva, the vocatives)
  against the default that the other key states.
- **The axis test a branch has to pass.** A branch axis must be a natural
  class in Catalan, and it must predict something about the status
  distribution across its leaves. Both limbs are required, and the natural-
  class limb comes first. Status homogeneity alone is the wrong test, for two
  reasons: re-axeing a tree until every branch has uniform statuses makes the
  tree a restatement of `contrast_fr` rather than an independent description
  of the language, and `contrast_fr` is a revisable judgement field whereas a
  component ID is a permanent key, so a key must never be derived from one.
  An earlier draft of this domain kept a `DET.indef` branch and justified it
  on status grounds. It failed the natural-class limb: it was a residue
  bucket holding an existential (algun), an alterity item (altres), an
  identity item (mateix), a free-choice item (qualsevol) and two
  approximatives (cert, tal), with nothing grouping them except that they had
  not fitted elsewhere. It was re-axed away, into `DET.quant.polaritat`
  (algun and qualsevol, which join cap and gaire on the polarity alternation
  that is a real class) and `DET.identitat` (mateix, altres, cert and tal).
- **The pronominal series is not here.** algu, ningu, res, tothom, and the
  tot el mon / tothom trap, are pronouns and belong to `PRON`. The neuter
  demonstratives aixo, allo and aco go the same way: they never modify a
  noun, so they are not determiners whatever their morphology suggests.
  `cadascun` and `cadascuna` go the same way again, being overwhelmingly
  pronominal, which leaves `cada` as the only distributive determiner here.
- **Nominal ellipsis is not here, in its entirety.** The earlier ruling named
  only `el de` and `el que`. That was too narrow: el de Barcelona, el vermell,
  els dos, el meu and el que vaig veure are one construction, an article plus
  a non-nominal remnant, and splitting it so that the member with a relative
  clause in it goes to `PRON` while the others stay in DET would break a
  single Catalan fact across two domains. The whole family goes to `PRON` or
  `SYN`.
- **Collective and partitive nouns are not here.** parell, dotzena, meitat,
  terc, miler, un munt de and una pila de head a partitive NP and take a
  genuine `de` complement; they are nouns, so `LEX` or `NOM`. Only their
  effect on the quantifier-noun juncture is recorded in DET, inside
  `DET.quant.juncio_nominal`.
- **Numeral hyphenation is not here.** vint-i-un, trenta-dues and the rest are
  a spelling rule for compound numerals, so `PHON`.
  `DET.num.sistema_decimal` is trimmed to the semantic fact only: Catalan
  counts setanta, vuitanta and noranta on a decimal system where French goes
  vigesimal.
- **The obligatory `de` between a quantifier and a following adjective is not
  here.** PREP already holds it, and the same fact must not take a second
  permanent key. What DET holds is the quantifier-noun juncture instead, and
  it holds it as one leaf rather than two: `DET.quant.juncio_nominal` states
  both values of a single parameter, nothing by default (molta aigua, molts
  llibres) and `de` with the closed set (una mica de pa, gens de son, tant de
  temps). An earlier draft split this across `absencia_de` and `mica`, which
  made two keys out of one choice.
- **The preverbal `no` required by cap, gens and gaire is `NEG`.** DET holds
  the polarity sensitivity of the determiners themselves, and, in
  `DET.quant.polaritat.contextos`, the licensing environments that are not
  negation at all: questions, conditionals, comparatives and abans que.
  Routing the preverbal no to NEG had orphaned those, since a learner who
  knows only the negative context will not produce "Tens cap pregunta?".
- **Three additions docs/01 does not name.** `DET.interrogatiu` (quin and
  quant): a determiner domain with no interrogative determiner is not closed,
  and quin is high-frequency from A1. `DET.ordre_intern`: determiner stacking
  is the highest-frequency determiner error for a French speaker, since
  French allows no such stacking at all, and it had no home in a tree
  organised by determiner class because it is a fact about the sequence
  rather than about any one member. `DET.quant.polaritat.contextos`, as
  above.
- **Members, not keys.** `forca` is a member of
  `DET.quant.grau.concordanca` (invariable class) and `mig`/`mitja` a member
  of the numeral leaves; neither takes a key of its own, because a key per
  lemma would turn the taxonomy into a dictionary. `tant` likewise is
  absorbed, into `concordanca` for its agreement and into
  `juncio_nominal` for the `de` it takes.
- **Valencian aqueix is a dialect note, not a third leaf.** The standard
  system seeded in `DET.dem.deixi_espacial` is two-degree; a third-degree leaf
  would make a dialectal system look like a norm the learner must produce.

Each docs/01 status binds the leaves that realise its row, and does not
propagate to every descendant the way a `data/contrast-overrides.json`
wildcard does; that file covers only `VERB` and asserts nothing about `DET`.
Four bindings were applied, one of them overturned:

- The `DET.dem` near-miss binds `deixi_espacial` and `deixi_discursiva`, whose
  own cited reason it is (French collapsed its deixis into ce). It does not
  bind `dem.forma_paradigma`, which is the agreement fact and was judged
  separately.
- The `DET.poss` near-miss binds `poss.forma_paradigma` and `poss.aton`, the
  two series the row itself lists. Its stated reason, that Catalan takes the
  article where French does not, is realised in `ART.def.us.abans_possessiu`
  rather than in DET, so on `forma_paradigma` the reason is merely relocated,
  and on `poss.aton` it is inverted, since that is the article-less series.
  `poss.aton`'s near-miss therefore rests on productivity and register, not
  on the row's argument. This is the clearest case in the taxonomy so far of
  a binding whose reason does not survive the tree it is applied to.
- The `gaire` novel is kept. French guère is the same word with the same
  negative-polarity distribution, so the status is not structurally
  defensible, but it is not in a contemporary speaker's productive grammar
  and the anchor cannot be used to produce with. The note says that rather
  than claiming French has nothing.
- **The `prou` novel is overturned to near-miss.** The row was written
  against a bare `prou`, where "no direct French word" is arguable. The leaf
  that now realises it is `DET.quant.grau.prou_bastant`, whose whole content
  is that assez covers both prou (sufficiency) and bastant (moderate degree),
  which is what near-miss names. Kept as novel, the leaf would have had to
  carry a note asserting that no French word covers prou, which a French
  speaker disbelieves on sight and which would then be read by later passes
  as an established fact about the language. This is the same binding logic
  that moved `ART.contract.pel`/`pels` off transfer, applied again.

`DET` came out 5 transfer, 25 near-miss, 2 novel and no false-friend. The
empty false-friend column is a claim rather than a gap, and two candidates
were considered and rejected. `gens` resembles the French noun gens, which is
a lexical homograph in a different part of speech rather than a structure
being misread, so it fails the definition's first half; the trap is recorded
in the leaf's note and belongs to `LEX` if it is ever keyed. `poss.aton`
fails the second half: mon pare does mean mon père, so the French reading is
right about meaning and wrong only about register, which is a near-miss
failure mode. Accepting either would require widening the status definition,
and widening it for one and not the other is not available.

The near-miss share, 25 of 31, is the domain working as briefed rather than a
lazy pass: DET is precisely where French has every category with a shifted
boundary. The consequence is that `contrast_fr` alone will barely discriminate
inside DET on the phase 6 gaps list. That is a phase 6 problem, recorded in
`TASKS.md`, and not a reason to retune statuses here.

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

### NEG (negation)

This is a structure-only pass. Every leaf carries a British-English marker in
`glosses.fr` and `contrast_fr.note`, and every leaf carries the same
`contrast_fr.status` (`near-miss`), chosen arbitrarily to satisfy the schema
rather than derived from a judgement on any individual leaf. None of it is to
be read as an assignment; the 2b pass for this domain writes the French
glosses and the real per-leaf status from scratch, exactly as `NOM` and `ART`
did. `notes` and `dialect_note` are deliberately left off every leaf here,
even where the structural argument below names a fact that belongs in one
(the `pas` register split and the several other 2b-owed notes recorded
below), because those fields are French prose too and authoring them is 2b's
job, not 2a's.

No dataset from the table above covers negation; that table is verb-oriented,
and no licensed data file, curated list or database was extracted from for
this domain. Neither the compilation-copyright risk nor the EU database right
described above is engaged here. All examples and Catalan forms are
hand-authored for this repo. The facts are drawn from:

- `docs/01-catalan-structural-map-and-build-plan.md`, lines 169-175 (the
  ADV/CONJ/NEG section and the GIEC paragraph beneath it) and lines 49-61 (the
  status table and the two-traps section). The NEG row names `NEG.no`
  (near-miss), `NEG.pas` (near-miss, flagged high interference), `NEG.cap`,
  `NEG.gens`, `NEG.mai`, `NEG.res`, `NEG.ningú`, `NEG.enlloc`, `NEG.tampoc`,
  and records that `pas` reinforces a simple `no` only, not an already
  negative-concord sentence, and that it is common in the Principat but
  absent from Valencian and Balearic speech. Line 171 also fixes `CONJ.coord`
  at "(i, o, però, sinó, ni)", which matters to the boundary decision below.
- General knowledge of Catalan negation (GIEC-level facts: the single
  preverbal particle `no` where French splits negation across `ne` and a
  second element, negative concord between a preverbal `no` and a postverbal
  negative item, the optional preverbal `no` when the negative item itself
  precedes the verb, a negative-polarity item inside a subordinate clause
  being licensed by negation on the matrix verb without a second local `no`,
  the negation of a non-finite clause, aspectual negation (`ja no`, `encara
no`, `no ... més`), verbless/fragment negation including the bare `no`
  answer particle, constituent negation, restrictive/exceptive negation
  (`no ... sinó`, `no ... més que`), lexicalised minimiser reinforcement
  (`no ... gota`, `ni piu`), and expletive or pleonastic `no` in a
  comparative or a temporal clause).
- A second and a third pass, both run by outside reviewers with access to
  GIEC (Gramàtica de la llengua catalana, IEC 2016) chapter 35, GEIEC
  chapter 32 (and, for the third pass, GEIEC §29.5.1 and §20.4), GBU
  chapter 24, Optimot, ésAdir, and, for the third pass, Pérez Saldanya's "La
  negació i la concordança negativa en català antic" and a La Vanguardia
  language column, checked the domain against those sources and produced the
  corrections and additions recorded below. Facts are extracted and
  re-expressed in this repo's own schema, as the licence rule at the top of
  this file requires; no text from GIEC, GEIEC, GBU, Optimot or ésAdir is
  reproduced here beyond short quoted fragments cited for traceability.

Structural decisions, recorded because they read as drift or as gaps
otherwise. This section has been revised three times against outside review
before 2b runs: once on structure alone, and twice against GIEC chapter 35
specifically, the second of those closing the remaining open questions from
the first. The GIEC-review points are marked as such below.

- **Aspectual negation was missing, and it is the domain's highest-frequency
  gap.** `NEG.aspecte` is new: `ja_no` (`ja no`, "no longer"), `encara_no`
  (`encara no`, "not yet") and `no_mes` (`no ... més`, "no more"). All three
  are near-universal, and none is guessable from a Catalan-side enumeration
  of negators, because `ja` and `encara` and `més` are not negators
  themselves; they are adverbs that combine with the ordinary negator `no`
  to mark aspect. `ja no` is also a live **false-friend candidate**, not
  merely a coverage gap: `ja` is a cognate of French "déjà", so `ja no ho
faig` reads to a French eye as if it meant "je ne le fais déjà pas" when
  it means "je ne le fais plus". This pass does not assign that reading a
  status, since status is 2b's call and every leaf here carries the uniform
  placeholder, but 2b should weigh `false-friend` for `NEG.aspecte.ja_no`
  seriously; it would be the domain's first, since `NEG` currently has none
  among its uniform markers to compare against and `DET` and `PREP` both
  came out with an empty false-friend column.
  **Methodological lesson, worth carrying into every domain still
  unseeded:** the inventory coverage check in the brief for the first draft
  of this pass was run against an enumeration of Catalan negators, and `ja
no` was missed by that method precisely because it contains no negator a
  Catalan-side list would surface, only an adverb plus the ordinary `no`.
  The coverage check has to be run against a French-to-Catalan mapping of
  the domain (here: how does a French speaker say "ne...plus", "pas
  encore", "ne...jamais", "ne...que", and so on) as well as against the
  Catalan inventory, because a source-language mapping surfaces multi-word
  and adverb-plus-particle constructions that a target-language enumeration
  of single lexical items does not. The lesson generalised a second time in
  this same pass: the GIEC review, working from the grammar rather than from
  a French-side sweep, independently surfaced `NEG.restrictiva` (below),
  which the first French-side sweep had also missed. Two different coverage
  methods missing two different constructions in the same domain is a
  stronger argument for running both than either miss was alone.
  **Example correction, third pass:** `NEG.aspecte.ja_no` cited `Ja no el
veig mai`, which stacks `ja no` with `mai`, a second negator introducing
  its own concord relation that muddies the pure phasal-cessation point the
  leaf is for. Replaced with `Ja no fumo`; the other two examples (`Ja no hi
vaig`, `Ja no viu aquí`) were unaffected.
- **`NEG.no_finita` was under-described, third pass, and is broadened.**
  The `ca` field and every example covered `no` plus an infinitive only,
  which understates the leaf: `no` precedes a negated gerund exactly as it
  precedes an infinitive, and participial clauses pattern the same way
  (compare GEIEC §29.5.1). `ca` was broadened from `no fer-ho` to `no
fer-ho / no havent avisat`, and a gerund example, `No havent avisat
ningú, va marxar`, was added alongside the existing infinitive examples.
  The review is high confidence on the usage itself but only medium
  confidence that an explicit rule statement exists in the grammars, which
  show the pattern by example rather than stating it as a named rule; that
  confidence level is recorded here rather than presented as a flatly
  sourced grammatical statement.
- **`ni` and `sinó` (the adversative coordinator) are routed out to `CONJ`,
  not kept here; confirmed on GIEC review.** The first draft minted
  `NEG.coordinacio_ni` and `NEG.si_no_sino`, crossing a line docs/01 already
  draws: line 171 assigns both to `CONJ.coord`'s inventory. That is a
  different situation from `PREP.formes_no_finites` and `PREP.marcatge`,
  which were added with no docs/01 row claiming them at all; here a row
  already claims the items, so keeping them would not be filling a gap, it
  would be pre-empting `CONJ`'s row before `CONJ` is seeded. The DET/NEG
  line applies instead: DET keeps the determiner's own distribution and NEG
  keeps only the concord requirement it triggers. Checked against `ni` on
  those terms, there turned out to be no separate NEG-owned residue to
  keep: `ni`'s negative-concord behaviour is exactly the same rule
  `NEG.concordanca.postverbal` and `.preverbal` already state for `cap`,
  `gens`, `mai`, `res`, `ningú`, `enlloc` and `tampoc`, so `ni` was added to
  those two leaves as a further member rather than given a key of its own.
  `sinó` **as the adversative coordinator** ("but rather") fails the same
  test for a different reason: its NEG-relevant fact, that it requires a
  preceding negated clause to be grammatical, is a selectional property of
  the coordinator itself (comparable to `cap`'s own polarity sensitivity,
  which DET keeps), not a concord requirement NEG adds on top of ordinary
  `no`. Its remaining content there, the `si no` (conditional "if not")
  against `sinó` word-boundary and spelling distinction, is orthography over
  an adversative coordinator. Both stay ruled out of `NEG`: `CONJ`, when
  seeded, owns the coordinator inventory, the adversative `sinó`'s
  negation-licensing requirement and the `si no`/`sinó` spelling split.
  **This paragraph now needs one qualification, added after `NEG.restrictiva`
  landed (below): `sinó` has a second use, the restrictive/exceptive frame
  `no ... sinó` meaning "only" (`no fa sinó plorar`), parallel to `no ...
més que`. That use is NEG's, not CONJ's, because it is not coordinating
  two constituents at all, it is a fixed exceptive frame built on the
  negator, the same shape as `no ... més que`. `CONJ`'s row is therefore the
  adversative coordinator and the `si no`/`sinó` spelling split only; the
  restrictive frame is kept here as `NEG.restrictiva` and must not be
  re-claimed by `CONJ` when it is seeded.**
- **`NEG.enunciat` failed the axis rule and was dissolved, not patched.**
  The branch grouped `resposta` (the bare `no` answer) and `expletiu` (the
  pleonastic `no` of `més alt que no sembla`) under "negation above
  clause-internal concord", which is a residue description rather than a
  natural class, the same failure mode that killed `DET.indef`. `expletiu`
  is a genuine natural class by itself and was kept as a root-level
  singleton leaf, `NEG.expletiu`, on the `DET.ordre_intern` pattern.
  `resposta` needed a second look once the point below reinstated
  constituent negation; see that point for where each example now sits.
- **Constituent negation is reinstated, on GIEC review, and `NEG.fragment`
  is narrowed to resolve the overlap it creates.** The first revision had
  dropped the verb-bearing half of the old `abast_constituent`
  (`No tots els alumnes van aprovar`, `No sempre té raó`) as nearer `SYN`,
  reasoning that it was a fact about quantifier scope and word order rather
  than about any one negative item. The GIEC review reports that GIEC gives
  constituent negation its own named subsection, §35.2.2 "La negació de
  constituent", inside the negation chapter itself, and cites exactly this
  pattern plus the contrastive frame `no (pas) X sinó Y` (its example:
  "Els membres de la direcció han donat el xec no al conserge sinó a
  l'administradora"). If GIEC files it under negation, this domain's
  earlier SYN routing does not hold: a fact GIEC treats as a negation fact
  is this domain's to key, not deferred on the strength of a plausible
  alternative home. `NEG.abast_constituent` is restored as a root-level
  leaf, holding both the bare quantifier-scope examples and the
  `no (pas) X sinó Y` contrastive pattern.
  This reopens the line between `NEG.abast_constituent` and `NEG.fragment`,
  because the first draft of `NEG.fragment` also held a contrastive
  fragment, `No pas jo, sinó tu`. The line drawn here: **`NEG.fragment` is
  negation with no clause at all, verb elided or never present** (a bare
  answer to a yes/no question, and nothing else); **`NEG.abast_constituent`
  is narrow-scope negation of one constituent, whether inside a full clause
  with a verb (`No tots els alumnes van aprovar`) or inside an elliptical
  contrastive frame that still has the shape of a clause with something
  understood (`No pas jo, sinó tu` reads as "[it was] not [pas] me, but
  you", the ellipsis of an understood copula or verb, not the absence of
  any clause structure at all)**. `No pas jo, sinó tu` and the GIEC
  `no al conserge sinó a l'administradora` example accordingly moved to
  `NEG.abast_constituent`; `NEG.fragment` was left holding only the bare
  answer-particle examples (`Vols venir? No.`, `Ho saps? No pas.`). Checked
  against the axis rule on its own: `NEG.fragment` is now a single fact
  about one construction (the answer particle), so the natural-class limb
  is trivially satisfied by there being exactly one member, the same way a
  root-level singleton passes throughout this domain; there is no
  second-limb question to ask of a one-member class.
  **Confirmed by the third pass, and not to be re-litigated by a later
  one.** A further GIEC-access review checked this exact line and reports
  that GIEC draws it in the same place under two separate named
  subsections: §35.2.2 "La negació de constituent" for
  `NEG.abast_constituent`, and §35.2.3 "La negació com a resposta o
  rèplica" for `NEG.fragment`. `NEG.fragment` is therefore not a taxonomy
  artefact of collapsing two things into a one-member leaf; it reflects a
  division GIEC itself makes. The same review also confirms that
  `NEG.abast_constituent` is one learner fact and must not be split
  further: GIEC's own §35.2.2 groups quantifier scope (`No tots els alumnes
van aprovar`), adverb scope (`No sempre té raó`) and the contrastive
  `no (pas) X sinó Y` frame inside a single subsection, on the shared
  property that `no` attaches to a constituent rather than to the clause.
  Splitting those three by surface form, as an earlier draft of this pass
  nearly did, would re-introduce the axis mistake this domain has already
  corrected once (`PREP.regim`'s surface-form axis, `DET.indef`'s residue
  bucket): the grammar's own grouping is the natural-class evidence, and a
  narrower axis here would cut across it rather than follow it.
- **`NEG.restrictiva` is new, on GIEC review, and absorbs the one
  genuinely NEG-shaped fact the old `NEG.si_no_sino` leaf held.**
  Restrictive/exceptive negation, meaning "only", maps French `ne...que` to
  Catalan `no ... sinó` and `no ... més que`. This is the second sweep-(b)
  gap named above. It is kept as a root-level leaf because it is a fixed
  frame built on the ordinary negator `no`, the same shape as the
  aspectual and minimiser frames elsewhere in this domain, not a fact about
  the coordinator `sinó`'s own distribution; see the amendment to the
  `ni`/`sinó` paragraph above for the boundary this draws against `CONJ`.
- **`NEG.concordanca.minimitzadors` is new, on GIEC review, and was
  narrowed on the third pass to the `ni`-reinforced forms only.**
  Lexicalised minimisers (`ni gota`, `ni un cèntim`, `ni piu`) are
  postverbal negative-polarity items requiring a preverbal negator, and
  GIEC treats them as their own class at §35.4.2.3 "Els reforços
  minimitzadors", separate from the ordinary negative pronouns,
  determiners and adverbs. The first version of this leaf led with a bare
  `No hi veig gota`, with no `ni`. The third-pass review reports that bare
  `gota` is instead a negative-polarity quantifier that GIEC groups with
  `gens` at §17.3 ("gens de vi, gota de vent"), which `DET` already owns;
  keeping it here would have restated a fact `DET` states rather than the
  distinctive one this leaf is for. The bare-quantifier example was
  dropped and the leaf now leads with the emphatic `ni`-minimiser
  reinforcement GIEC's §35.4.2.3 actually names (`No va dir ni piu`, `No en
tinc ni un cèntim`, `No en queda ni gota`), and the `ca` field was
  amended so it no longer implies a bare `gota` reading. **Axis check:**
  natural class, yes; these are a closed set of concrete nouns used
  idiomatically as emphatic minimal-quantity intensifiers under negation,
  a different lexical origin from `ningú`/`res`/`cap`/`mai` even though the
  concord mechanics look the same on the surface, which is exactly why GIEC
  gives them a separate subsection rather than folding them into the general
  reinforcement class. Predicts a distribution: French has partial
  analogues in fixed expressions ("n'y voir goutte") but not a productive,
  synonymous set, so 2b is likely to find this leaf sits apart from
  `NEG.concordanca.postverbal` on status as well as on form, which is the
  second limb satisfied. Kept as a sibling of `postverbal` inside
  `NEG.concordanca` rather than folded into it, because GIEC's own
  subsectioning is the natural-class evidence and folding it in would lose
  that distinction the branch is meant to preserve.
- **`NEG.anticipada` is new, on the third-pass GIEC review.** GIEC §35.5 is
  titled "La negació anticipada i la doble negació". Its doble negació half
  is negative concord, already fully keyed by `NEG.concordanca`; its
  negació anticipada half is neg-raising, matrix negation over `creure`,
  `pensar`, `semblar`, `voler` interpreted as negating the subordinate
  clause, so `No crec que vingui` is understood as `crec que no vindrà`.
  This was the one phenomenon named in chapter 35 with no key before this
  pass. It is kept as **the scope fact only**: that the matrix negator can
  take subordinate scope, and how that interacts with `NEG.expletiu`
  (itself at GIEC §35.6, per the review). The subjunctive morphology the
  subordinate clause takes under this reading stays `VERB`'s, exactly as
  the negative imperative's mood switch does; this leaf states the scope
  relation, not the paradigm cell. **Axis check:** a root-level singleton,
  the same pattern as `NEG.expletiu` and `NEG.fragment`; the natural-class
  question is trivially satisfied by there being one member, and GIEC's own
  chapter structure is independent evidence that this is a distinct, named
  phenomenon rather than a residue bucket. See the evidence-grading note
  below on how confidently this leaf's content is sourced.
- **The `pas` example was wrong, on GIEC review, and is corrected.**
  `NEG.simple.pas` cited `No hi vaig pas anar`, which intercalates `pas`
  between the auxiliary and the main verb. GIEC §35.4.2.2, per the review,
  states the particle generally appears at the end of the periphrasis and
  that the intercalated slot is a marked variant found in some varieties
  ("No vaig veure'l pas" as the general case against "No vaig pas veure'l").
  The example is now `No hi vaig anar pas`, matching the general case; the
  other two examples (`No és pas fàcil`, `No ho sap pas`) were already
  unproblematic, since neither has a periphrastic auxiliary to intercalate
  before. **Recorded for 2b:** the intercalated variant belongs in a `notes`
  field on `NEG.simple.pas`, as a documented but marked alternative, not as
  the illustrative example.
- **A conflict between docs/01 and GIEC on `pas`, recorded rather than
  silently resolved, and now settled in GIEC's favour with the source text
  itself.** docs/01's GIEC paragraph (the source cited at the top of this
  section) states that `pas` "reinforces a simple `no` only, not an
  already-double negation". The GIEC chapter 35 review reports that GIEC
  §35.4.2.2 supersedes that older prescriptive norm and explicitly licenses
  `pas` alongside a negative quantifier and inside constituent negation. The
  third-pass review supplies the verbatim text: "Notem, finalment, que
  l'adverbi pas pot usar-se també amb altres mots negatius: Això, no ho pot
  negar pas ningú; No en fa pas gens, de fred; No he dit pas ni una
  paraula", plus, for constituent negation, "Parlen de literatura i no pas
  de política". This repo does not delete or quietly rewrite the docs/01
  claim: docs/01 is treated as authoritative elsewhere in this taxonomy, and
  a future reader has to be able to find both the claim and the argument
  against it rather than a single silently updated line. **Both are
  recorded here as a documented disagreement, not as drift.** The card for
  `NEG.simple.pas` will teach the GIEC position (that `pas` co-occurs with a
  negative quantifier and with constituent negation), because GIEC is the
  more current and more authoritative grammatical source on this specific
  point and its own text is now quoted above rather than only reported at
  one remove. **Flagged for 2b:** the `notes` field on `NEG.simple.pas`
  must not teach the superseded "simple `no` only" constraint as the rule; if
  it is mentioned at all, it should be as the older prescriptive norm that
  GIEC has moved past, not as the current one.
- **The expletive example was ambiguous, on GIEC review, and is corrected.**
  `NEG.expletiu` cited `Tinc por que no vingui`. With a fear verb plus the
  subjunctive this is ambiguous rather than cleanly expletive: the expletive
  reading equals `Tinc por que vingui`, but the string also supports a
  true-negation reading, and Catalan disambiguates the true-negation reading
  with an indicative future (`Tinc por que no vindrà`) rather than leaving it
  to context the way the cited example does. It is replaced with a
  comparative, `Fa més calor a dins que no pas a fora`, which the review
  reports is the clean paradigm case alongside the two examples already kept
  (`És més alt que no sembla`, `Ho farem abans que no arribi`). **Recorded
  for 2b:** the fear-verb case is optional expletive negation, real but
  harder to illustrate cleanly, and belongs in a `notes` field rather than
  as the headline example.
- **The negative imperative is ruled out of `NEG` and assigned to `VERB`;
  this stands against a reviewer counter-proposal, and is now confirmed by
  where the grammar itself files it.** Catalan `no vinguis` substitutes the
  present subjunctive for the (non-existent) negative imperative, where
  French `ne viens pas` keeps the ordinary imperative form. The
  GIEC-chapter review proposed a `NEG.imperatiu_negatiu` leaf for this, on
  the grounds that the trigger is negation and `VERB` is unseeded so the
  fact currently has no home either way. The counter-argument, and the one
  this repo keeps: there is no NEG-owned concord fact riding on top of the
  trigger the way there is for `cap` or `ni`, where NEG states an
  obligatory or optional preverbal `no` that is a genuinely separate fact
  from the item's own form. Here it is just `no` plus a mood switch, and
  the mood switch itself, which paradigm cell of which conjugation class
  stands in for the missing negative imperative, is `VERB`'s morphology and
  cannot be stated without restating `VERB`'s imperative and subjunctive
  paradigms. `VERB` being seed-only is a scheduling fact about this repo's
  build order, not a reason to place a permanent key in the wrong domain; a
  domain being unseeded is exactly the situation the routing-decision
  convention (see the `PREP` preposition-plus-relative case) exists for.
  **The third-pass review adds independent support for this decision from
  the grammar itself, rather than only from this repo's own reasoning:**
  GIEC gives the negative imperative no dedicated subsection in chapter 35
  at all; it is treated at §34.4 "Oracions imperatives" ("Si l'oració
  imperativa és negativa, el mode verbal és el subjuntiu... No ploris; No
  es moguin, vostès"), and in the mood material at GEIEC §20.4. Chapter 35
  touches it only in passing, at §35.1 (`No vinguis tard` as an
  illustrative example of `no`) and at §35.4.2.2 (`pas` in commands). GIEC
  filing the fact under the imperative mood chapter rather than under
  negation is itself evidence for the `VERB` routing: the grammar treats
  this as a fact about the imperative paradigm that happens to be triggered
  by negation, not as a fact about negation that happens to involve a verb
  form. This is recorded here so whichever pass gives `VERB` its proper
  seeding finds the decision rather than either dropping the fact or a
  second seeder minting it in `NEG` by accident: it belongs under `VERB`'s
  imperative branch, as the paradigm's negative-context suppletion rule.
- **`sense` as a negator is still not here**, for the reason already given:
  it is `PREP.formes_no_finites.sense`, which states the preposition and the
  fact that a negative-polarity word in its scope keeps a positive value.
  Routing it to NEG a second time would key it twice.
- **`cap`, `gens` and `gaire`'s own polarity-sensitive distribution is still
  not here.** `data/sources.md`'s DET section already states it, in
  `DET.quant.polaritat.cap`, `.gens` and the licensing environments in
  `DET.quant.polaritat.contextos` (questions, conditionals, comparatives,
  `abans que`). `cap` and `gens` appear in `NEG.concordanca.postverbal` only
  as members of the general concord rule.
- **`algú`, `ningú`, `res` and `tothom` are still not here.** PRON owns the
  pronominal series and the `tot el món` / `tothom` trap, per DET's section.
  docs/01 nonetheless lists `NEG.res` and `NEG.ningú` in its row. Resolved by
  splitting the fact: PRON owns form and meaning, NEG owns only the
  negative-concord behaviour, folded into `NEG.concordanca.postverbal` and
  `.preverbal` as members. No `NEG.res` or `NEG.ningú` leaf exists.
- **`mai`, `enlloc` and `tampoc` are one NEG fact, not three, and their own
  semantics are not here; three further points about them are recorded for
  2b rather than keyed, per the GIEC review.** All three are adverbs by part
  of speech, and `ADV` is unseeded. Their negative-concord behaviour is
  stated once, as membership in `NEG.concordanca.postverbal` and
  `.preverbal`. The review adds three facts that stay notes rather than
  keys: **(a)** `tampoc` is categorially an additive focal adverb (GIEC
  §35.4.2.1), not a negative quantifier, unlike `cap`, `gens`, `res` and
  `ningú`; it sits in `NEG.concordanca` only by its concord behaviour, and
  2b should not let the card imply it is grammatically the same kind of
  word as the others it is listed beside. **(b)** the seven concord members
  do not share the preverbal slot evenly: `res`, `ningú`, `cap` and `mai`
  take it readily, `gens` and `enlloc` rarely. This belongs as a `notes`
  field on `NEG.concordanca.postverbal`, per the review's own placement of
  it, not as a second key, because `NEG.concordanca.preverbal` already
  states the general rule the note qualifies. **(c)** in formal registers,
  preverbal `ni` retains `no` ("Ni ell ni jo no hi vam anar"), unlike the
  no-less form `NEG.concordanca.preverbal` currently illustrates (`Ni ell ni
jo hi vam anar`), which stays valid as the general-register form; the
  register split is a `notes` or `dialect_note` addition for 2b, not a
  reason to change the example.
- **`pas`'s dialectal restriction to the Principat is still not a leaf**,
  and is still not written into a `dialect_note` on `NEG.simple.pas` in this
  pass, for the reason given at the top of this section. The next pass over
  this leaf owes it a `dialect_note` for the Principat restriction, a
  `notes` field for the GIEC-versus-docs/01 point above, and a `notes` field
  for the intercalated-position variant above; that is three separate
  2b-owed notes on one leaf, which is worth flagging so 2b does not stop
  after writing one of them.
- **Article behaviour under negation is a real interference point and is
  ruled out of `NEG`, on GIEC review; recorded so it is not lost.** French
  `pas de` / `pas d'` has no single Catalan counterpart: Catalan uses a bare
  noun (`No tinc pa`) or `cap` (`No tinc cap llibre`), and a French speaker
  reliably over-produces a partitive that Catalan does not have (`no tinc
pas de pa`). The machinery involved, the article's absence, the bare noun
  under negation and `cap`'s own distribution, is owned by `ART`, `DET` and
  `NOM` respectively; `NEG` contributes only the ordinary `no` those domains
  already assume. Ruled out of `NEG` in its entirety and recorded here so
  the interference point itself is not lost between three domains none of
  which currently owns "no French `pas de` in Catalan" as a named fact.
- **Four further facts, surfaced by the French-side sweep or the GIEC
  review, ruled out of `NEG` on the third pass and recorded so they are not
  re-found and re-argued by whichever domain seeds next.** **(a)**
  Approximate negation: `gairebé no`, `amb prou feines`, `a penes` (French
  `guère`, `presque pas`, `à peine`). Out of `NEG`: `gairebé` is an adverb
  modifying an already-keyed `no`, and `amb prou feines` is a fixed
  locution, `LEX`'s. `NEG` adds no independent rule on top of the ordinary
  negator these combine with. **(b)** The contradictory answer particle
  `sí` (French `si`, answering a negative question). A real interference
  point, but positive polarity, so it belongs with response particles in
  `ADV`, not in a domain scoped to negation. **(c)** The marginal
  initial-position negator `poc` (`Poc s'ho pensava`, GEIEC §32.2).
  Register-restricted and largely not produced by a learner, so a note
  rather than a card; if `NEG` grows a genuinely productive fact that needs
  it as a member later, it can join one, but it does not justify a leaf of
  its own now. **(d)** Emphatic reply locutions `de cap manera`, `en
absolut`, `ni de bon tros`: fixed idioms, `LEX`'s, on the same grounds
  `amb prou feines` is.
- **Paradigm cells were not minted for the concord rule.** A draft
  considered one leaf per negative-polarity item. The concord behaviour is
  one rule with a closed set of members illustrated in its examples, so it
  stays a single leaf per position (`postverbal`, `preverbal`), matching the
  "members, not keys" convention `DET` set for `forca` and `mig`/`mitja`.
- **Singleton branches were folded to root-level leaves.** `NEG.expletiu`,
  `NEG.anticipada`, `NEG.fragment`, `NEG.abast_constituent`,
  `NEG.restrictiva` and `NEG.no_finita` sit directly under `NEG` rather
  than each under a single-child branch invented to hold them, the same
  pattern `DET.ordre_intern` uses.
- **CEFR calls made across this pass, revisited on the third review.**
  `NEG.aspecte.no_mes` stays at **B1**, but on one argument only, corrected
  on review: `no ... més` splits around the verb and any clitic that
  intervenes (`No hi aniré més`, `No en vull més`), which is a harder
  production task than the compact preverbal `ja no`/`encara no` units, and
  that structural argument alone justifies B1. The second argument this
  pass originally gave, that `no_mes`'s near-synonymy with `ja no` argues
  for B1 because the distinction is subtler, does not hold: the review
  points out that near-synonymy with an already-A2 form is if anything an
  argument for scheduling `no_mes` at A2 too, alongside the form it is
  confusable with, not for placing it later. That second argument is
  dropped from the reasoning kept here; only the structural one stands.
  `NEG.simple.pas` stays at **A2** on interference-priority grounds
  (unchanged from the previous pass), with a caveat the review adds and
  this pass records for 2b: `pas`'s presuppositional semantics (what its
  presence versus absence commits the speaker to) are genuinely B1-level
  material, so the A2 card should aim at recognition and at avoidance of
  overuse, not at full productive command of when a fluent speaker would
  and would not choose it; that distinction belongs in the card's scope,
  not in a CEFR number the schema does not have room to split further.
  `NEG.fragment`'s CEFR was not set with a stated argument in the previous
  pass and needed one: the review notes that a bare `No` answering a
  yes/no question is genuinely A1, and A2 is defensible only if the card
  also drills the reinforced `No pas`. **The call taken:** `NEG.fragment`
  stays at **A2**, because its examples already include `Ho saps? No pas.`
  alongside two bare-`No` examples, so the leaf as seeded does drill both
  the A1-level bare form and the more marked reinforced form together; a
  leaf that taught only the bare answer would have been re-set to A1.
  **A caveat on the whole CEFR column, recorded because a field that looks
  sourced but is not will be trusted later:** published Catalan L2 syllabi
  (Institut Ramon Llull, Generalitat de Catalunya) are organised by
  communicative function rather than by grammatical structure, and between
  them they pin only basic `no` and `tampoc` to A1-A2 with any documented
  authority. Every other CEFR value in this domain, including both calls
  revisited above, is this repo's own defensible hypothesis about
  acquisition order and exposure priority, not a value read off a sourced
  syllabus. 2b and any later reviewer should treat the CEFR field
  accordingly.
- **Open item, not yet closed, with the evidence behind `NEG.anticipada`
  graded rather than asserted flat.** The GIEC-chapter review confirmed
  every subsection of chapter 35 against public sources except §35.5,
  whose body it could not retrieve directly because the giec.iec.cat app is
  JavaScript-rendered, so the leaf built from it, `NEG.anticipada`, rests on
  triangulated rather than directly quoted evidence. The third-pass review
  grades that evidence rather than presenting it as uniformly solid, and
  this repo records the grading rather than flattening it: the section
  **title** ("La negació anticipada i la doble negació") is **high
  confidence**, corroborated from the chapter's own navigation structure
  and independently from a La Vanguardia language column by Màrius Serra
  (26/11/16) that cites chapter 35 by that title; the **phenomenon** itself
  (neg-raising over `creure`, `pensar`, `semblar`, `voler`) is **medium-high
  confidence**, confirmed from GEIEC §20.4 and from Pérez Saldanya's "La
  negació i la concordança negativa en català antic" rather than from GIEC
  §35.5's own text; the **wording** used for `NEG.anticipada`'s `ca` field
  and examples is **medium confidence**, since the canonical GIEC §35.5
  example is inferred from the surrounding grammatical literature rather
  than quoted from the section itself. This distinction matters because an
  inferred claim restated enough times without its caveat hardens into an
  established fact; it is not being allowed to here. `NEG` is not verified
  closed against chapter 35 until §35.5 is checked directly against the
  print edition (GIEC, IEC 2016, roughly pp. 1310-1313 in the print
  edition) rather than the JavaScript-rendered web app; a future pass
  should do that, and confirm `NEG.anticipada`'s card text against it,
  before this domain's structure is treated as final against chapter 35.

No `contrast_fr` status differentiation was attempted in this pass; see the
note at the top of this section. A future 2b pass should expect the domain to
skew towards `near-miss`, since Catalan's negative-concord machinery has a
partial structural analogue in French's `ne` plus a negative word, but the
`ne` side is semantically empty and frequently dropped in speech, which `no`
is not, and French requires a second `ne` inside an embedded clause where
Catalan needs no second `no` at all. `transfer` is a plausible candidate for
`NEG.simple.no` on the basic preverbal-particle mechanics, `false-friend` is
a plausible and, on the argument above, the likely candidate for
`NEG.aspecte.ja_no`, and `NEG.restrictiva` is a plausible `novel` or
`near-miss` candidate depending on how directly 2b judges `no ... sinó`
against French `ne...que`. All three are 2b's call, not asserted here.

**2b addendum, after coordinator review of the first `contrast_fr` pass.**
Three status calls were revisited once the pass was checked against the
`gaire` precedent in the DET section above (the `gaire` novel, kept despite
French `guère` sharing its exact negative-polarity distribution, on the
grounds that an anchor the learner cannot currently produce with is not an
anchor). `INITIAL_DIFFICULTY_VALUE` in `src/srs/fsrs.ts` collapses
`near-miss`, `false-friend` and `novel` to the same initial difficulty, so
`transfer` is the only status that discriminates at all, and each `transfer`
call in this domain has to earn that on its own merits rather than by
default.

- **`NEG.expletiu` was moved from `transfer` to `near-miss`, partially
  following the `gaire` precedent and partially departing from it.** French
  `ne` explétif occupies exactly the same syntactic slot in exactly the same
  environments (comparatives, `avant que`) as Catalan explétive `no`, which
  is the same shape of clean-transfer argument `gaire` had against `guère`.
  The part of the `gaire` reasoning that carries over: expletive `ne` is a
  register-marked feature in retreat from ordinary spoken French, and a
  learner who does not spontaneously produce or parse it there is not
  getting this for free, so `transfer` overclaimed. The part that does not
  carry over, which is why this leaf lands on `near-miss` rather than
  following `gaire` all the way to `novel`: `guère` is receding across
  registers, including formal writing, to the point of being largely a fixed-
  expression fossil; expletive `ne`, by contrast, remains an actively taught
  and produced feature of educated written and formal-spoken French, and a
  second outside reviewer reports GBU §24.5 makes it grammatically obligatory
  in French comparatives specifically, which is the same environment this
  leaf's headline example uses. That is a usable anchor, gated by register
  rather than absent, which is what `near-miss` is for. The note states the
  register gap rather than claiming either a clean match or no analogue at
  all.
- **`NEG.restrictiva` was moved from `transfer` to `near-miss`.** The
  original `transfer` call rested on the functional match between `no ...
sinó` / `no ... més que` and French `ne ... que`. On reassessment that
  functional match is exactly what makes this a silent-error risk rather
  than a free transfer: a French speaker reaching for the cognate
  realisation produces `*no ... que`, which is not Catalan, and has to learn
  `sinó` or `més que` as the obligatory second element instead of `que`
  alone. This is the near-miss shape by definition, superficially identical
  function, differing in the exact lexical frame, with the boundary being
  precisely where the silent error happens. The note also flags that
  everyday Catalan more often expresses this value with the single adverb
  `només` than with either negation frame, which further weakens any claim
  that the negation-frame mapping is the learner's primary, free-riding
  anchor.
- **`NEG.aspecte.no_mes` stays `transfer`, with the note now stating
  explicitly why that does not contradict its B1 CEFR value.** The B1 call,
  recorded above, rests only on the positional difficulty of splitting `no
... més` around the verb and any intervening weak pronoun (`No hi aniré
més`); that is a production-mechanics fact, not a claim about whether the
  underlying French-to-Catalan mapping is reliable. `transfer` is a claim
  about the mapping, not about placement difficulty, and the two are
  independent: the semantic and structural correspondence to French `ne ...
plus` is clean enough to transfer, while the CEFR level reflects that
  producing it correctly still requires handling clitic placement, a fact
  French offers no help with either way. The note now says this explicitly
  so the two fields do not read as contradicting each other.

Net effect on the domain-level count: two `transfer` calls were downgraded to
`near-miss`, none were upgraded, and no other leaf's status changed.

### CONJ (conjunctions and subordinators)

Both passes ran in one session, structure first and glosses second, with the
tree shown for review between them. No dataset from the table above covers
conjunctions, and no licensed data file, curated list or database was
extracted from for this domain, so neither the compilation-copyright risk nor
the EU database right described above is engaged. All examples and Catalan
forms are hand-authored for this repo. The facts are drawn from:

- `docs/01-catalan-structural-map-and-build-plan.md`, line 171, which is the
  whole of what that document says about this domain: `CONJ.coord`
  "(i, o, però, sinó, ni)" and `CONJ.subord`
  "(que, perquè, si, quan, encara que, malgrat que)", plus the assessment
  "Mostly `transfer`". Both the inventory and that assessment are departed
  from below, and the departures are argued rather than assumed.
- The `NEG` pass's routing decisions, recorded in the `NEG` section above,
  which hand `ni`, the adversative `sinó` and the `si no`/`sinó` spelling
  split to this domain and explicitly withhold the restrictive frame
  `no ... sinó`.
- General knowledge of Catalan conjunctions and subordination at
  reference-grammar level, hand-authored into leaves here.

**Evidence grade on the GIEC chapter structure, which is weaker than in
`NEG`.** Both `giec.iec.cat` and `geiec.iec.cat` are JavaScript-rendered and
returned no body to any fetch in this pass, exactly as during `NEG`. What was
obtainable was a search-engine synthesis of snippets, which reports GIEC
treating coordination in chapter 25 and grouping causals, finals and
illatives in one chapter, conditionals with concessives in another, and
temporals in a third. **That is second-hand and unverified, no section was
read, and consequently no GIEC section number appears anywhere in this
domain's French prose.** It is recorded here only because one part of it bore
on a structural decision, and is owed a check against the print edition.

The one decision it bore on was `CONJ.coord.illativa`. If GIEC really does
file `doncs` and `per tant` alongside causals and finals, that is evidence
under the `NEG` rule ("where the reference grammar files a phenomenon is
evidence about which domain owns it") for taking them out of coordination.
They were kept under `CONJ.coord` anyway, because a second-hand chapter
grouping is not strong enough to override the coordinator/subordinator axis,
which is the top-level split of the tree and a natural class in Catalan.
Recorded so that a later pass with the print edition in hand can revisit it
knowing the decision was made against weak contrary evidence, not in
ignorance of it.

**`CONJ.subord` was not minted, though docs/01 names it.** A single
subordination branch would have held 23 of the 32 leaves under no axis at
all, which is the residue-bucket failure `DET.indef` was dissolved for. The
subordinate side is split into `CONJ.completiva` plus seven adverbial
classes, each of which is a natural class in Catalan and each of which
predicts something about the status distribution: coordination is where the
free transfer sits (`i`, `o`, `és a dir`), while `temporal`, `manera` and
`concessiva` are where the subordinator selects a mood French does not.

**docs/01's "Mostly `transfer`" for this domain is not borne out, and is left
standing rather than edited.** The pass came out 10 `transfer` against 22
others before the duplicate below was removed. Following the `pas` precedent
in the `NEG` section, the docs/01 claim is recorded here beside what
supersedes it rather than being overwritten, because other passes read that
document as authoritative and a silent edit reads as drift. The claim is
defensible at the level of the six forms docs/01 actually lists, most of
which are indeed transfer; it stops being true as soon as the domain is
enumerated properly, because what diverges is mood selection, and mood
selection is invisible at the granularity of a conjunction inventory.

**The mood-selection boundary, stated once here because three leaves depend
on it.** `CONJ` owns which mood a subordinator selects, on the grounds that
this is a lexical property of the conjunction. `VERB` owns how the mood is
formed. `SYN` owns tense sequencing across two clauses, including the
protasis/apodosis correlation of the conditional period, which docs/01
assigns to `SYN.conditional`. This is what allows `CONJ.condicional.si`,
`CONJ.temporal.quan` and `CONJ.manera.com_si` to carry the fact that makes
them hard without pre-empting `SYN`.

**Ruled out of this domain, argued rather than forgotten:**

- **The restrictive frame `no ... sinó` stays `NEG.restrictiva`**, as the
  `NEG` section requires in terms. `CONJ` takes the adversative `sinó` and
  the `si no`/`sinó` spelling split only.
- **Relative `que`, and `el que`/`el de`/`el meu`, stay with `PRON` and the
  widened nominal-ellipsis ruling** made in `DET`. Nothing here mints a
  second key for them.
- **The interrogative particle `que` (`Que vols venir?`) goes to `SYN`**,
  with docs/01 assigning interrogatives to `SYN.questions`. **This carries a
  disagreement with docs/01 worth recording**: line 175 says Catalan has no
  _est-ce que_, and this particle is functionally close to one. The
  disagreement is left standing beside the document rather than edited into
  it, as above. `SYN` will need to decide whether it is a clause-type marker
  or a conjunction; the argument for `SYN` is that it marks the clause rather
  than joining two.
- **The optative `que` (`Que tinguis sort!`) goes to `SYN`** as clause
  modality. Confidence: medium. It rests on the general principle that
  main-clause modality is not subordination, not on a retrieved grammar
  section, and it is the ruling here most likely to be wrong.
- **`tan`/`tant` selection and the degree words `més`/`menys` go to `ADV` and
  `DET`.** `CONJ` owns the frames `tan ... com`, `més ... que` and
  `tan(t) ... que`, that is, the second term of the comparison and the result
  clause, not the quantifier that opens them.
- **`abans de` and `després de` plus infinitive, and `tot i` plus gerund,
  stay with `PREP.formes_no_finites`.**

**The French-to-Catalan sweep, run as a separate mandatory pass, produced
four of the thirty-two leaves.** The `NEG` section's rule is that a coverage
check run from the target-language inventory cannot find a construction with
no target-language marker in it; the same rule here is that it cannot find a
Catalan conjunction a French speaker will never reach for by enumerating
Catalan conjunctions. Enumerating French subordinators instead produced
`CONJ.coord.adversativa.si_no` (from _sinon_), `CONJ.condicional.exceptiva`
(from _à moins que_, and its calque), `CONJ.manera.com_si` (from _comme si_,
where the two languages differ in mood) and `CONJ.manera.sense_que` (from
_sans que_). None is reachable from the Catalan side, because each is either
a fixed locution or a form whose Catalan counterpart looks unremarkable.

**A duplicate key was caught by the browser review, not by any test.** 2b
first authored `CONJ.completiva.caiguda_preposicio` for the drop of a governed
preposition before a completive `que` (`confio que vindrà`). That is
`PREP.regim.caiguda_davant_que`, already committed, with the same Catalan
form, the same rule and an overlapping example. The `CONJ` leaf was deleted
rather than the `PREP` one, because the phenomenon is preposition government
and `PREP` reached it first; `CONJ.completiva.que` carries a `notes`
cross-reference so the fact stays findable from this side. Nothing in the
test suite could have caught this: `validate-ids` checks that IDs resolve and
`check-glosses` checks that leaves are glossed, and two leaves teaching the
same rule under different keys satisfy both. **A duplicate-content check
across domains is the gap this exposes**, and it will get worse as more
domains land.

**`CONJ.consecutiva` is a root-level leaf** rather than a branch with one
child, on the `NEG` precedent. Consecutive subordination in Catalan is a
single frame, intensity plus result clause, and a branch over one leaf would
be shape without content.

**Two `transfer` assignments were challenged during 2b and both moved to
`near-miss`**, which is the same count and the same direction as `NEG`.

- **`CONJ.condicional.si` moved.** The `transfer` call rested on `si` being
  the same form as French `si` and banning the future in the protasis exactly
  as French does, which is true. What it missed is that the irrealis takes
  the imperfect subjunctive (`Si tingués temps, hi aniria`) where French takes
  the indicative imperfect (`Si j'avais le temps`). That is a mood the
  conjunction selects, so under the boundary stated above it belongs to this
  leaf and not to `SYN`, and it is precisely the kind of divergence a French
  speaker will not notice they are getting wrong.
- **`CONJ.manera.com` moved.** `comme` transfers for a settled manner
  (`Ho vaig deixar tal com estava`), but an as-yet-undetermined manner takes
  the subjunctive in Catalan (`Fes-ho com vulguis`) where French keeps the
  indicative (`comme tu veux`). The leaf covers both, so `transfer` would have
  been true of half of it.

**The ten surviving `transfer` calls were each re-examined against the fact
that `INITIAL_DIFFICULTY_VALUE` in `src/srs/fsrs.ts` collapses the other three
statuses to one value**, so `transfer` is currently the only status that
discriminates and assigning it is a claim the learner gets the item free. The
ones worth recording are `CONJ.final.per_tal_que` and `CONJ.causal.ja_que`,
both of which contain a form with no French counterpart of similar shape
(`per tal que`, `atès que`). They stayed `transfer` because the status is a
claim about the rule, not about the vocabulary: the purpose clause takes the
subjunctive after a conjunctive locution in both languages, and only the
lexical shape of one member has to be learnt. `CONJ.temporal.abans_despres`
stayed `transfer` because Catalan reproduces the French asymmetry exactly,
subjunctive after `abans que` with an optional expletive `no`, indicative
after `després que` for a past fact.

**A false-friend inside a four-member leaf is recorded rather than split
out.** `CONJ.concessiva.tot_i_que` covers `tot i que`, `malgrat que`,
`per bé que` and `si bé`. The last of these is concessive and renders
_quoique_, while the French string it resembles, `si bien que`, is
consecutive. That is a false-friend shape, but it is true of one member of a
four-member leaf, so the leaf keeps `near-miss` and the trap is stated in
`notes`. If a later pass wants the `false-friend` status for it, the right
move is to split `si bé` into its own leaf, not to restate the status of the
group.

**No leaf in this domain is `novel`, and that is a claim.** French has every
category in the tree: coordination in all five of its Catalan subtypes,
completives, and all seven adverbial classes. Nothing here is anchorless in
the way `ser`/`estar` is, so `novel` is genuinely unavailable rather than
overlooked. This is the same argument `PREP` made, and it is the second
domain to come out with an empty `novel` column for the same structural
reason.

**The CEFR column is a hypothesis, as in `NEG`.** The published Catalan L2
syllabi are organised by communicative function, and nothing in them pins
most of these locutions to a level. The A1 and A2 calls (`i`, `o`, `que`,
`si`, `quan`, `però`, `perquè`) are safe; everything at B2 is a judgement
about register and frequency, not sourced data.

### ADV (adverbs)

Both passes ran in one session, with the tree reviewed between them. No dataset
from the table above covers adverbs, and no licensed data file, curated list or
database was extracted from for this domain, so neither the
compilation-copyright risk nor the EU database right described above is
engaged. All examples and Catalan forms are hand-authored for this repo. The
facts are drawn from:

- `docs/01-catalan-structural-map-and-build-plan.md`, line 170, which gives the
  domain one line: manner in `-ment` marked `transfer`, then place, time,
  quantity and affirmation/doubt. That five-way split is taken as the floor for
  the tree and extended, not replaced.
- The `NEG` section above, which routes four facts here, and the `CONJ` section,
  which routes two more.
- General knowledge of Catalan adverbs at reference-grammar level, hand-authored
  into leaves here. As in `CONJ`, `giec.iec.cat` and `geiec.iec.cat` are
  JavaScript-rendered and returned nothing fetchable, so **no GIEC or GEIEC
  section number appears anywhere in this domain's prose**, and every
  grammatical claim here is an unretrieved one. That is a weaker evidence
  position than `NEG` had and the same one `CONJ` had.

**This is the first open class seeded, and it changes what coverage means.**
`NOM`, `ART`, `DET`, `PREP`, `NEG` and `CONJ` all have finite inventories, so
"is the domain closed" was a checkable question, and `DET` was corrected once
for failing it. The adverb inventory is not finite: `-ment` derives an adverb
from almost any adjective, and the locution frames are productive. **This tree
therefore covers the systems, formation, deixis, degree, focus, modality and
placement, and not the word list**, and a later pass should not read the leaf
count as an unfinished domain. Individual adverbs earn a leaf only where they
carry a rule; the rest are members of the leaf for their class.

**One boundary does most of the work in this domain, and it is new.** `ADV`
shares its vocabulary with `PREP`, `CONJ` and `DET` more than any earlier domain
shares with anything. The line is drawn by syntactic behaviour rather than by
word:

> A word belongs to `ADV` in its bare adverbial use; `PREP` owns it when it
> governs a complement; `CONJ` owns it when it introduces a clause.

`abans` and `després` split three ways under that rule and all three parts were
already keyed before this pass: `ADV.temps.situacio` (`Ho farem després`),
`PREP.formes_no_finites.abans_despres` (`abans de sortir`),
`CONJ.temporal.abans_despres` (`abans que arribin`). The same rule governs
`davant`, `darrere`, `dins`, `fora`, `fins` and `com`. It is stated once here
and cross-referenced from the leaves rather than restated in each.

**The `DET` boundary is the one that cost the most, and it was settled by
looking rather than by reasoning.** Catalan degree words are determiners before
a noun and adverbs before an adjective or verb, so the naive split would give
`ADV` a leaf for every one of them. Reading the committed `DET` leaves first
showed that `DET` had already taken the rule in each case, and in one instance
had taken the adverbial use explicitly: `DET.quant.grau.prou_bastant` uses
`fa bastant fred` as its own example. **`ADV` therefore mints nothing for
`gaire`, `prou`, `bastant`, `massa` or `quant`.** The reasoning is the one the
`CONJ` duplicate taught: the polarity restriction on `gaire` is a single rule,
and determiner-versus-adverb does not make it two.

`molt` is the exception and the argument for it is worth recording, because it
looks like the same case and is not. `DET` has three leaves on it and they
cover agreement (`molta gent`), noun junction (`massa de gent`), and the
`prou`/`bastant` split. None of them states the thing that actually catches a
French speaker, which is that one Catalan form covers both `très` and
`beaucoup` (`és molt alt`, `treballa molt`). That is a distinct rule about
adverbial modification, so `ADV.grau.molt` exists and carries a `notes`
cross-reference to `DET.quant.grau.concordanca` so the two cannot be mistaken
for each other.

**A second duplicate was caught, this time before glossing.** The `CONJ` pass
recorded that nothing checks for duplicate content across domains, and an
ad-hoc version of that check was run here between 2a and 2b. It found
`ADV.lloc.amb_complement` (`davant de casa`, `a prop del riu`) to be the same
rule as the committed `PREP.toniques.locucions_amb_de`, with one example
identical word for word and the same French contrast about `devant la maison`
taking no preposition. The `ADV` leaf was deleted. **Two consecutive domains
have now minted a leaf that already existed**, which makes this a systematic
failure of the seeding process rather than two mistakes: 2a reasons from the
target language and cannot see what an earlier domain already keyed. The check
is cheap and should become part of the pipeline.

**A restatement was also removed in the other direction.** `CONJ.causal.perque`
carried a `notes` field spelling out the `per què` / `perquè` / `el perquè`
three-way split. `ADV.interrogatiu.per_que` now owns the interrogative form, so
the `CONJ` note was rewritten as a pointer to it. Two leaves stating the same
distinction is the same failure as two leaves teaching the same rule, one step
smaller.

**Interrogative adverbs are `ADV`'s, against docs/01, following the precedent
`DET` already set.** Line 172 assigns `on, quan, com, per què` to `PRON.int`
along with `qui`, `què`, `quin` and `quant`. `DET` already departed from that
row by minting `DET.interrogatiu.quin` and `DET.interrogatiu.quant`, so the
repo has already decided that interrogatives are split by part of speech rather
than collected under `PRON`. This pass applies the same decision to the
adverbs. Relative `on` (`el lloc on`) stays with `PRON.rel`, and interrogative
`quant` stays with `DET` rather than being split again by function, because
splitting it would recreate exactly the `gaire` problem above.

**Ruled out of this domain:**

- **`hi` and `en` as pro-adverbs** stay with `PRON.feble.hi` and
  `PRON.feble.en`, which are committed.
- **`amb prou feines`, `de cap manera`, `en absolut`, `ni de bon tros`** stay
  `LEX`'s, as the `NEG` section already ruled. `ADV` keeps the productive
  locution frame (`ADV.manera.locucions`) and not the fixed idioms that fill it.
- **Certainty locutions (`és clar`, `sens dubte`, `i tant`)** are left to `LEX`
  on the same grounds. `ADV.modalitat` keeps `potser` and its siblings, which
  are single adverbs selecting a mood, and `i tant` appears only as an example
  inside `ADV.modalitat.si`.
- **`poc` as a marginal initial-position negator** (`Poc s'ho pensava`) is not
  keyed here either, as the `NEG` section decided. It is register-restricted and
  `poc` as a quantifier is `DET`'s.
- **General constituent order** is `SYN`'s. `ADV.collocacio` is a deliberate
  exception, argued below.

**The `NEG` pass's four owed facts are now discharged or accounted for.**
`gairebé` and `a penes` landed in `ADV.grau.aproximacio`. The contradictory
answer particle `sí` landed in `ADV.modalitat.si`. `tampoc`'s categorial status
as an additive focal adverb rather than a negative quantifier, which the `NEG`
review recorded as owed, is now stated in `notes` on `ADV.modalitat.additius`
and cross-referenced to `NEG.concordanca.postverbal`. `amb prou feines` and the
emphatic reply locutions remain `LEX`'s and are not keyed anywhere yet.

**`ADV.collocacio` is kept on inferred evidence, and the grade is recorded
here rather than implied.** The claim is that French intercalates an adverb
between auxiliary and participle (`J'ai déjà mangé`, `Je ne l'ai jamais vu`)
and Catalan does not, placing it before the auxiliary or after the participle
(`Ja ho he fet`, `No ho he vist mai`). **No grammar section was retrieved for
this, and the French half of the contrast is the well-attested half.** It is
kept because it is a high-frequency production error with no other home, `SYN`
being unseeded, and because the alternative was to lose it between two domains
in exactly the way the `NEG` section warns about for article behaviour under
negation. The leaf carries a `notes` field saying it is placed here for want of
a seeded `SYN`. This is the `NEG.anticipada` situation repeated: right in
substance, unverified in sourcing, and recorded as such so it does not harden
into a fact the first time somebody restates it.

**Four `transfer` assignments survived, and each was tested against the fact
that it is the only status that discriminates.** `ADV.manera.ment` is the
strongest transfer call in the taxonomy so far: the rule is identical, feminine
adjective plus `-ment`, and Catalan is more regular than French because it has
no counterpart to the `-amment` / `-emment` doublets, so a French speaker
over-generalising the rule gets Catalan right. `ADV.grau.mes_menys` and
`ADV.interrogatiu.on_quan_com` map term for term, and the second removes a
difficulty rather than adding one, since Catalan interrogates without
`est-ce que` and without inversion. `ADV.grau.aproximacio` stayed `transfer`
because `quasi` and `a penes` are the French forms themselves and `gairebé`
behaves exactly as `presque` does, including before a negation; the opacity of
the form `gairebé` is vocabulary rather than rule, which is the same reasoning
that kept `CONJ.final.per_tal_que` at `transfer`.

**One assignment was corrected on the browser review, for accuracy rather than
status.** `ADV.manera.simples` first claimed the suppletion reproduces
`bien`/`mieux` and `mal`/`pis`. The second half is wrong for the contemporary
language: the ordinary French comparative of adverbial `mal` is `plus mal`,
`pis` being archaic, so Catalan `pitjor` has no everyday one-word French
counterpart. The note now says that, which strengthens rather than weakens the
`near-miss` call.

**No leaf in this domain is `false-friend` or `novel`, and both are claims.**
`novel` is unavailable for the same reason it was in `PREP` and `CONJ`: French
has every adverbial category here. `false-friend` was actively searched for and
not found, which is worth recording because the empty column will otherwise
read as a lazy pass. The reason is structural: the Catalan adverbs a French
speaker meets early are either cognate and concordant (`sovint`, `quasi`,
`a penes`, `tard`, `encara`, `així`) or opaque (`gairebé`, `aviat`, `força`,
`enlloc`), and an opaque form cannot mislead. The nearest candidate considered
and rejected was `així`, on the theory that it resembles `aussi`; it was
rejected because the true French cognate is `ainsi`, which means the same
thing, so the resemblance points the learner right rather than wrong.

**The CEFR column is a hypothesis, as in `NEG` and `CONJ`.** The A1 calls
(`aquí`, `ara`, `molt`, `bé`, `sí`, `on`) are safe. Everything at B1 and B2 is a
judgement about frequency and register rather than sourced data.

### SYN (syntax)

Both passes ran in one session, with the tree reviewed between them and
`check-duplicates` run between 2a and 2b, which is the first pass to have that
tool available. No dataset from the table above covers syntax, and no licensed
data file, curated list or database was extracted from for this domain, so
neither the compilation-copyright risk nor the EU database right described above
is engaged. All examples and Catalan forms are hand-authored for this repo. The
facts are drawn from:

- `docs/01-catalan-structural-map-and-build-plan.md`, line 177, which lists
  `SYN.word_order`, `SYN.questions`, `SYN.subordination`, `SYN.conditional`,
  `SYN.passive`, `SYN.pronominal_constr` and `SYN.info_structure`. Every one of
  those seven is realised here, which is unusual: this is the first domain whose
  docs/01 row needed extending rather than departing from.
- The routing decisions recorded above in the `CONJ` and `ADV` sections, which
  hand four facts to this domain.
- General knowledge of Catalan syntax at reference-grammar level.
  `giec.iec.cat` and `geiec.iec.cat` remain JavaScript-rendered and returned
  nothing fetchable, as during `CONJ` and `ADV`, so **no GIEC or GEIEC section
  number appears anywhere in this domain's prose and every grammatical claim
  here is unretrieved**. docs/01 cites GEIEC chapter 33 for information
  structure; that chapter was not read, and nothing here rests on it.

**This domain is defined by subtraction, which no earlier one was.** Six domains
were seeded before it and each took something that a naive reading of "syntax"
would have put here. `CONJ` owns the subordinator inventory and the mood each
selects, so `SYN.subordinacio` keeps only tense sequencing and the conditional
period, both explicitly routed here by the mood-selection boundary recorded in
the `CONJ` section. `ADV` owns adverb placement. `NEG` owns constituent
negation, reinstated during that pass on the strength of GIEC filing it inside
the negation chapter. `PRON.fort.subjecte` already owns pro-drop, so
`SYN.ordre` does not re-mint it and holds only unmarked order and the postverbal
subject. What is left is genuinely clause-level, and the domain is smaller and
sharper for it.

**Two boundaries here pre-empt domains that are still seed-only, and both were
put to the user rather than decided quietly.** `SYN.veu.*` takes the passives
and `SYN.clitics.*` takes clitic placement, while `VERB` sits at six leaves and
`PRON` at four, each owing a proper 2a pass. Both were kept on the strength of
the repo's own documents: docs/01 line 177 names `SYN.passive`, and the domain
table in `CLAUDE.md` gives `SYN` "word order, clitic ordering, agreement,
subordination". The division to hold when those passes run is that **`VERB` owns
verbal morphology and `PRON` owns pronoun forms and the internal order of a
clitic cluster, while `SYN` owns where the clitic attaches and how the clause is
voiced.** `SYN.clitics.proclisi_enclisi` carries a `notes` field saying so, and
`PRON.feble.combinacio.ci_cd` is the committed leaf that fixes the other half of
that line. If a later pass disagrees, the argument to beat is that proclisis and
enclisis are a fact about the verb the clitic leans on, not about the clitic.

**`ADV.collocacio`'s justification was retired rather than left to rot.** That
leaf was placed in `ADV` during its pass with a `notes` field saying it sat
there "faute d'un domaine SYN semé". Seeding `SYN` makes that sentence false
whatever else is decided, so the leaf stays in `ADV`, on the grounds that it is
a fact about where adverbs go and `ADV` owns adverbs, and its note now states
the boundary positively: general constituent order is `SYN.ordre`'s, and the
leaf keeps only the adverb's place around the verb. **A note that justifies a
placement by the absence of a domain has a shelf life, and this is the first
time one expired.** Two others of the same shape are outstanding and will expire
when `VERB` and `PRON` are seeded.

**The docs/01 disagreement opened during `CONJ` is now resolved, in favour of
docs/01 being incomplete rather than wrong.** Line 175 says Catalan has no
_est-ce que_. The interrogative particle `que` (`Que vols venir?`) is
functionally very close to one, and it is now
`SYN.interrogativa.particula_que`. The claim in docs/01 is left standing with
this recorded beside it, on the `pas` precedent: what line 175 gets right is
that Catalan has no obligatory, register-neutral interrogative frame the way
French does, and what it misses is that the particle exists at all. **Evidence
grade: the particle is well attested to me but nothing was retrieved**, and the
dialectal restriction written into its `dialect_note`, that it is chiefly
Central Catalan, is the least certain part of the leaf.

**The particle was split into its own leaf during 2b, which changed a status.**
2a had it inside `SYN.interrogativa.total` alongside intonation questions. It
came out as the only `false-friend` in the domain, and a status true of one
member of a two-member leaf is the `si bé` problem the `CONJ` section records.
The `si bé` ruling was that if you want the status, split the leaf; here the
split was independently justified, because the particle was routed to this
domain from `CONJ` as a fact in its own right. **The `false-friend` call rests
on the exclamative reading**: a French speaker meets initial `que` as a
completive or an exclamative, Catalan has the exclamative use too (`Que bonic`),
and so the familiar reading is available and wrong. That is the definition the
`fr-metalanguage` skill reserves the status for, rather than merely hard.

**`check-duplicates` caught an error in this pass, on a leaf this pass itself
had just created.** Splitting the particle out left
`SYN.interrogativa.total` with `que vols venir?` still as its `ca`, so two
leaves in the same branch claimed the same Catalan form. The check failed on it
immediately and it was corrected to `véns demà?`. Worth recording because the
tool was built for cross-domain collisions with leaves seeded passes earlier,
and its first live catch was neither: it was a within-branch, within-session
mistake made while restructuring. The 15 recorded overlaps in
`data/duplicate-allowlist.json` needed no additions for this domain.

**Ruled out of this domain:**

- **Relative clauses and the missing counterpart to `dont`** stay with `PRON`,
  as the `PREP` section ruled and the `DET` section widened to the whole
  nominal-ellipsis family. `SYN.subordinacio` holds no relative-clause leaf.
- **The optative `que`** (`Que tinguis sort!`) was routed here by `CONJ` at
  medium confidence as clause modality. **It is not keyed in this pass.** The
  interrogative particle earned a leaf because it has a French contrast worth
  teaching; the optative is a direct parallel to French `Qu'il entre !` and
  would be a `transfer` leaf stating that nothing is different. It is recorded
  here rather than minted, and if a later pass wants it, `SYN.interrogativa`
  would need renaming to something covering clause type generally.
- **Exclamatives** (`Que bonic!`, `Quin dia!`) are not keyed either. `Quin` is
  `DET.interrogatiu.quin`'s, which the `DET` pass named "interrogatifs et
  exclamatifs", so the exclamative determiner already has a home.
- **Word order inside the noun phrase** is `NOM`'s and `DET`'s;
  `DET.ordre_intern` already owns the determiner stack.

**Only two leaves are `transfer`, which is the lowest share of any domain so
far, and the reason is structural rather than pessimistic.** `SYN.ordre.svo` and
`SYN.pronominals.reflexiu_reciproc` are the two places where a French speaker
can build the Catalan structure by direct transfer. Everywhere else the two
languages have the same construction available and differ in how often, in what
register, or with what mood they use it, which is precisely what `near-miss`
names. The dislocations are the clearest case: `Le livre, je l'ai lu` is
perfectly good French, so the structure transfers and the register does not,
and a learner who transfers the French frequency will sound stilted rather than
wrong. That is recorded in the notes as a register contrast rather than a
structural one, because overstating it would be as misleading as missing it.

**`SYN.subordinacio.periode_condicional` was argued down from `transfer` to
`near-miss` on scope grounds.** The tense pairing itself does transfer: present
with future, imperfect with conditional, pluperfect with past conditional, all
as in French. But the leaf is the conditional period, and producing one means
producing the protasis, where Catalan takes the imperfect subjunctive
(`Si vingués`) against the French indicative imperfect. Marking the leaf
`transfer` would have told the learner the whole sentence was free when half of
it is the divergence `CONJ.condicional.si` exists to warn about. **A status has
to be true of what the leaf makes the learner produce, not only of the rule
named in its gloss.**

**No leaf is `novel`, and the claim is the same one `PREP`, `CONJ` and `ADV`
made.** French and Catalan are both Romance languages with largely parallel
clause architecture, including the `en` and `hi` clitics that Spanish lacks, so
nothing in this domain is anchorless. The nearest candidate was
`SYN.veu.impersonal`, on the grounds that French `on` has no Catalan
counterpart; it was rejected because French also has impersonal `se`
constructions (`il se dit que`, `ça ne se fait pas`), so an analogue exists and
the difference is distributional.

**An example was corrected on the browser review for contradicting its own
leaf.** `SYN.concordanca_participi` had `Quants n'has llegits?` among its
examples, agreement with the partitive `en`, while the note on the same leaf
restricts agreement to third-person accusative clitics. Replaced with
`Les hem comprades avui`. No test could have caught a card whose example
undercuts its own rule, and this is the second consecutive domain where the eye
review found an accuracy error rather than a taxonomic one.

**The CEFR column is a hypothesis, as in every domain since `NEG`.** This one
skews high, with eleven of eighteen leaves at B1 or above, which is a claim
about the domain rather than a hedge: dislocation, clitic placement and the
sequence of tenses are not A-level material even though the learner meets them
in A-level input.
