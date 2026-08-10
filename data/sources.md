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

### Outside review of CONJ, ADV and SYN, and what it changed

`CONJ`, `ADV` and `SYN` were all seeded with no grammar text retrieved, because
`giec.iec.cat` and `geiec.iec.cat` are JavaScript-rendered. Those 74 leaves were
then put to an outside chat with web research, on the model of the `NEG` review.
It reached GIEC and GEIEC text indirectly, through search snippets and verbatim
secondary quotation (Optimot, ésAdir, the UB and UPF style guides, UOC, CPNL,
and scholarly work including Prieto & Rigau 2007 and _Llengua & Literatura_ 35,
2025), and marked which of its own claims were sourced that way rather than
retrieved. **No rendered GIEC or GEIEC page was reached by either side**, so the
evidence position improved from unsourced to indirectly sourced, not to
verified. Section codes in particular remain unconfirmed, which is why none has
been written into the data even now.

**Three substantive errors were found and corrected.**

- **`ADV.modalitat.dubte` taught a prescriptive error.** It gave
  `Potser vingui` and `Tal vegada tinguis raó` as examples and claimed the
  subjunctive marked stronger doubt. The norm puts these adverbs with the
  indicative; the subjunctive belongs to the distinct construction
  `potser que`, which is a softened suggestion (`Potser que vagis marxant`).
  Examples and note corrected, and the construction moved to a `notes` field.
  This is the first outright wrong rule taught by any leaf in the taxonomy, as
  against the wrong statuses and misplaced keys found before.
- **`ADV.manera.coordinacio_ment` taught the secondary option as the rule.**
  The leaf was built on two coordinated `-ment` adverbs dropping the suffix on
  the first. The mechanics are right, but the norm recommends keeping both
  suffixes, and the reduction is the more literary option. Rewritten so the leaf
  teaches the norm and presents the reduction as something to recognise in
  reading rather than to produce. The contrast note now says the norm agrees
  with French rather than diverging from it.
- **`ADV.collocacio`'s claim was overstated, exactly as its evidence grade
  warned.** The leaf said Catalan does not place an adverb between auxiliary and
  participle. `mai` and `pas` do so freely (`No ha pas vingut`, and free
  placement for `mai`), so the ban is specific rather than general. The leaf now
  says the placement is freer than in French and names the two adverbs that
  intercalate. **The `TASKS.md` entry that recorded this as inferred is what
  made the correction cheap**, and this is the mechanism working as intended:
  the claim was flagged before it was believed.

**One structural decision was reversed on better evidence.** The `CONJ` section
above records that `doncs` and `per tant` were kept under coordination _against_
a weak search-result summary suggesting GIEC groups illatives with causals and
finals. The review confirms that grouping with a much stronger chain: GIEC ch. 25
is coordination, ch. 29 is "Les construccions causals, les finals i les
il·latives", and GIEC itself is quoted as saying illatives "tenen unes propietats
que les apropen a les subordinades i, de fet, recomanarem analitzar-les així".
It further reports that explicatives (`és a dir`, `o sigui`) are analysed as
parenthetical connectors rather than as coordination. Both leaves therefore left
`CONJ.coord`:

- `CONJ.coord.illativa` became `CONJ.illativa`
- `CONJ.coord.explicativa` became `CONJ.explicativa`

Both are now root-level leaves alongside `CONJ.consecutiva`, each carrying a
`notes` field stating why it sits outside coordination. **The IDs were renamed
rather than kept, because nothing outside the fragment and this file referenced
them**: no database, no golden set, no UI. That cost is zero today and rises
with every pass, which is the argument for taking the migration now. It also
vindicates the practice of recording a decision made against contrary evidence:
the note said a later pass could revisit it knowing the evidence had been weak,
and that is precisely what happened.

**Three `transfer` assignments were downgraded to `near-miss`.**

- `CONJ.temporal.abans_despres`, because `després que` admits either mood and a
  future-reference clause takes the subjunctive, which is the same trap that
  already made `CONJ.temporal.quan` a near-miss.
- `CONJ.consecutiva`, because producing the frame means choosing between `tan`
  and `tant`, a split French does not have. This is the principle the `SYN`
  section states: a status has to be true of what the leaf makes the learner
  produce, not only of the rule named in its gloss.
- `ADV.grau.mes_menys`, because everyday Catalan often prefers the correlative
  `com més aviat millor` to the calqued superlative, and nothing in the French
  sentence indicates which is wanted.

**One factual claim in a note was wrong and is fixed.**
`CONJ.condicional.exceptiva` said the standard does not accept `a menys que`.
It does accept it, and merely prefers `llevat que`, `tret que` and
`si no és que`. The note now says dispreferred rather than rejected. Overstating
a proscription is the same class of error as overstating a rule, and it is worth
noting that this one came from reasoning about what a calque from French _ought_
to be.

**Two examples were replaced.**
`SYN.dislocacio.focus` had `Molt has trigat!`, which could not be confirmed: the
documented exclamative degree operator is `que` or `com` (`Que has trigat!`),
which is a different construction from clitic-less focus fronting. Replaced with
a second contrastive-focus sentence of the shape the review did confirm as
native (`Un llibre li va regalar, no un disc`). `CONJ.illativa` had
`Doncs, què vols que hi fem?`, which is the discourse-marker `doncs`, close to
French « eh bien », rather than the illative `doncs` the leaf teaches. Replaced
with `Penso, doncs existeixo`.

**Four findings were declined, and the reasons matter more than the outcomes.**

- **`gaire` is not a gap.** The review reports it missing from `ADV` and
  proposes it as a strong `novel` candidate. It is already
  `DET.quant.polaritat.gaire`, and the `ADV` pass declined to mint a second key
  for it deliberately, on the reasoning recorded above: the polarity restriction
  is one rule and the determiner/adverb split does not make it two. The review
  saw three domains and not the other six, which is the predictable cost of
  scoping an outside review to part of the taxonomy. **When the remaining
  domains go out for review, send the full leaf list even if only part is under
  review**, or expect the same false positive.
- **`SYN.veu.impersonal` stays `near-miss` rather than becoming `novel`.**
  The argument for `novel` is that French `on` has no Catalan counterpart, which
  is true. But `novel` means there is no French analogue to transfer, and French
  has impersonal `se` constructions of exactly this shape (`il se dit que`,
  `ça ne se fait pas`). An analogue exists and the distribution differs, which
  is what `near-miss` names. The leaf's note already tells the learner to
  restructure rather than translate word for word, which is the practical
  content either status would carry.
- **The three proposed extra `false-friend` assignments were declined, two of
  them because the base language is French and not English.** Interrogative
  `mai` meaning "ever" (`Has estat mai a Roma?`) is not a false friend for a
  French speaker, because French `jamais` does the same job in a question
  (`As-tu jamais vu`); the obvious French reading is available and correct.
  `com que` is a production trap rather than a misreading, and `false-friend` is
  reserved for a wrong reading, so it stays `near-miss` as the `CONJ` pass
  argued. `sempre que` was the best of the three, but Catalan itself has both
  readings, conditional with the subjunctive and temporal with the indicative,
  so a French speaker's temporal reading is incomplete rather than wrong. Its
  `notes` field now states the mood split, which is the fact worth teaching.
- **`ben` as an intensifier was not minted.** It is a real gap in the degree
  system, but the review marks it as its own knowledge rather than sourced, and
  this pass does not mint keys on unsourced suggestions. Recorded as owed.

**The comparative expletive `que no pas` is not a gap either**, and the review
allowed as much: it is `NEG.expletiu`, whose examples already include
`Fa més calor a dins que no pas a fora`.

**The GIEC chapter map recovered by the review is recorded here and nowhere
else, deliberately.** Coordination ch. 25, substantive subordinates ch. 26,
relatives ch. 27, comparatives and consecutives ch. 28, causals, finals and
illatives ch. 29, conditionals and concessives ch. 30, temporals ch. 31,
declaratives and marked order ch. 33, interrogatives, exclamatives and
imperatives ch. 34, negation ch. 35. **None of this is written into the data**,
because every one of these anchors came from a snippet rather than a rendered
page, and a section number in a card reads as verified whatever the surrounding
prose says. It is here so a later pass with the print edition can check a list
rather than rediscover one.

**Still owed after this review.** `NEG.anticipada`'s wording, unchanged since
the `NEG` pass and still requiring the print edition around pp. 1310-1313. The
dialect note on `SYN.interrogativa.particula_que` is now well corroborated,
Central Catalan plus Majorcan and Eivissan, against Valencian and Minorcan using
intonation alone; the leaf says "chiefly Central Catalan", which is right but
less precise than the sources now allow. `ben` as an intensifier. The optative
`que`, still keyed nowhere.

### PRON (pronouns)

The first domain seeded that was already `seed only` rather than unseeded, so
2a merged into four leaves the phase 1 seed had authored and glossed
(`PRON.fort.subjecte`, `PRON.feble.en`, `PRON.feble.hi`,
`PRON.feble.combinacio.ci_cd`) instead of authoring an empty tree. It ends at 6
branches and 24 leaves, 20 of them new. No licensed data file, curated list or
database was extracted from, and all Catalan forms and examples are
hand-authored, so neither the compilation-copyright risk nor the EU database
right described above is engaged. The facts are drawn from:

- `docs/01-catalan-structural-map-and-build-plan.md`, the pronoun section at
  lines 115-151, whose clitic table is the source for the `els` syncretism
  between third-person plural indirect object and masculine plural direct
  object.
- The routing decisions recorded above in the `DET`, `PREP`, `ADV`, `CONJ`,
  `NEG` and `SYN` sections, which between them hand three groups of facts to
  this domain and pre-empt a fourth.
- General knowledge of Catalan pronoun morphology at reference-grammar level.
  `giec.iec.cat` and `geiec.iec.cat` were not retrieved during this pass, as
  during `CONJ`, `ADV` and `SYN`, so **no GIEC or GEIEC section number appears
  anywhere in this domain's prose and every grammatical claim here is
  unretrieved**. The chapter map recovered by the earlier outside review puts
  relatives at chapter 27, which is where a later pass with the print edition
  should start; nothing here rests on it.

**Merging into a glossed domain has a failure mode that authoring an empty one
does not, and it fired on the first attempt.** The 2a pass reported the four
pre-existing leaves preserved byte for byte. They were not: every one of the 16
narrow no-break spaces in the file had been silently degraded to an ordinary
space, which is precisely the hazard `CLAUDE.md` warns about, and the only thing
that caught it was `test/gloss-completeness.test.ts` refusing the turn. The
nodes were restored from `git show HEAD:` rather than repaired by a
normalisation regex, because a regex is how the same file got doubled spaces
once before. **A seed-only merge should be verified by diffing the preserved
nodes against `HEAD` field by field, not by believing the pass's own report.**

**The three owed-fact groups are discharged.** The relative-pronoun system,
ruled out of `PREP` and of `ADV`, is `PRON.rel.*`: `que`, `qui`/`què` after a
preposition, the `el qual` series, relative `on`, and the absent counterpart to
French _dont_. The nominal-ellipsis family, widened by the `DET` pass from
preposition-plus-relative to the whole construction, is a single
`PRON.ellipsi_nominal` covering `el que vaig veure`, `el de Barcelona`,
`el vermell`, `els dos` and `el meu`, kept undivided because `DET` ruled they
are one Catalan fact. The pronominal series `algú`, `ningú`, `res`, `tothom` and
`cadascun` is `PRON.indefinit.*`, and the neuter demonstratives are
`PRON.demostratiu_neutre`. `NEG` keeps the negative-concord behaviour of `ningú`
and `res`, as its section requires, and `PRON.indefinit.persona` cross-references
`NEG.concordanca` rather than restating it.

**Neither coverage sweep found the address system, and it was keyed nowhere in
the entire taxonomy.** `vostè` and `vós` appeared in no fragment of any domain.
For a French speaker this is not vocabulary: French _vous_ maps onto `vostè`,
which commands a third-person singular verb, and French has no construction
where a polite address form changes grammatical person. Added as
`PRON.fort.tractament`, with a `notes` field recording that `vós` does take
second-person plural agreement like French but belongs to a formal register.
This is the `DET`-missing-`quin` failure repeating in a domain that had been
told twice to run coverage in both directions, which suggests the French-to-
Catalan sweep is good at finding constructions and bad at finding paradigm
gaps. **The sweep should be run once more over the paradigm itself, not only
over the construction inventory.**

**The domain came out with no `transfer` at all, which is a first, and it was
put to the user rather than recorded quietly.** 0 transfer, 20 near-miss, 2
false-friend, 1 novel across 24 leaves. `SYN`'s 2 was the previous low. The
strongest candidate was `PRON.feble.persona_reflexiu` (`em, et, es, ens, us`
against _me, te, se, nous, vous_), which maps one to one in both form and
function; it stays `near-miss` because French `nous` and `vous` double as tonic
forms while Catalan `ens` and `us` are strictly atonic against `nosaltres` and
`vosaltres`, and because the four-allomorph alternation sitting in the next leaf
means nothing in this series is free. The decision was accepted knowingly, on
the same footing as `PREP`'s empty `novel` column: an empty column is a claim,
and this one says that every part of the Catalan pronoun system a French speaker
meets has a French analogue whose boundary has moved.

**One `false-friend` was downgraded and two were kept.**
`PRON.indefinit.tothom` is textbook: `tot el món` is a Catalan form whose
familiar French reading is available and wrong, the same shape as
`NEG.aspecte.ja_no`. `PRON.rel.absencia_dont` is kept because the familiar
reading of Catalan `que` as absorbing _dont_ is available and produces
`*el llibre que et parlava`. `PRON.fort.tractament` was authored as
`false-friend` and moved to `near-miss`: no Catalan form is misread there, since
`vostè` resembles nothing French, and the error is carried agreement rather than
a wrong reading. That follows the precedent this repo already set twice, when
`gens` was refused `false-friend` for resembling a French word rather than a
French structure, and when `com que` was refused it for being a production trap
rather than a misreading.

**Two contrast notes stated a rule another domain owns, and one contradicted its
own example.** `PRON.indefinit.persona` claimed `ningú` takes `no` only after
the verb and then illustrated the claim with the preverbal `ningú no ha vingut`;
it was also teaching negative concord, which `NEG.concordanca` owns. It now
states a form fact, that the `de` of _quelqu'un d'autre_ does not transpose
(`algú altre`), and cross-references `NEG`. `PRON.interrogatiu` claimed Catalan
fronts an interrogative "sans inversion ni périphrase est-ce que", which is
doubtful on the inversion and belongs to `SYN.interrogativa` either way; it now
states that French splits _que_ preverbally from _quoi_ after a preposition
while Catalan generalises `què`. **Both were caught by reading the authored
prose, not by any check**, which is the third domain running where that has been
true.

**Two examples were wrong in ways the checks cannot see.**
`PRON.rel.absencia_dont` had `La persona de qui et fio`, which is ungrammatical:
_fiar-se_ needs `em fio` with a first-person verb. `PRON.indefinit.tothom`
illustrated `tot el món` with `Tot el món en parlava`, which is the exact calque
the leaf exists to block, so the leaf would have taught the error it warns
against; replaced with `Ha viatjat per tot el món`, where the phrase genuinely
means the whole world.

**An allowlist entry was avoided by making a `ca` field precise.** 2a gave
`PRON.rel.prep_persona_cosa` the bare `ca` of `qui, què`, which collided with
`PRON.interrogatiu` and was recorded as a legitimate overlap. The leaf is
specifically the relative after a preposition, so its `ca` is now
`amb qui, de què`, which is both more accurate and drops the entry.
`data/duplicate-allowlist.json` should hold irreducible overlaps, not overlaps
manufactured by an imprecise field. The remaining new entry, `que` shared by
`CONJ.completiva.que` and `PRON.rel.que`, is a genuine homonym and stays.

**No expired note was found in this pass.** `SYN.clitics.proclisi_enclisi`
already states its boundary positively rather than by the absence of a seeded
`PRON`, so the outstanding note of that shape is `VERB`'s alone.

**Ruled out of this domain:**

- **Clitic placement and clause voicing** stay `SYN`'s, per the division
  recorded in the `SYN` section. `PRON` owns the forms and the internal order of
  a cluster, so `PRON.feble.combinacio.ordre_general` holds the slot template
  and `SYN.clitics.proclisi_enclisi` holds proclisis and enclisis. The argument
  to beat is unchanged and was not challenged here.
- **Interrogative `quin` and `quant`** stay `DET`'s and interrogative `on`,
  `quan`, `com` and `per què` stay `ADV`'s, per the part-of-speech split those
  two domains established against docs/01 line 172. `PRON.interrogatiu` takes
  the pronominal `qui` and `què` only.
- **French `on`, reciprocal _l'un l'autre_ and impersonal _il_** map onto
  `SYN.veu.impersonal` and `SYN.pronominals.reflexiu_reciproc`, both committed.
  The French-to-Catalan sweep confirmed the boundary here rather than finding a
  gap.

**Flagged rather than changed.** `PRON.feble.combinacio.ordre_general` and
`PRON.feble.combinacio.ci_cd` are the likeliest pair in this domain to read as
one node twice. They are kept distinct on the grounds that `ci_cd` is the `l'hi`
fusion specifically while `ordre_general` is the slot template that applies when
nothing fuses, and `check-duplicates` does not fire on them, but the judgement
that they are two facts is this pass's own. `PRON.ellipsi_nominal` and
`PRON.rel.el_qual` were both flagged by the gloss pass as arguable between
`near-miss` and `novel`, the first because French realises the ellipsis with
_celui_ rather than a bare article, the second because the `la qual cosa`
clause-anaphora use has no _lequel_-shaped French analogue. Both stayed
`near-miss` on the grounds that the functional slot is shared.

**The CEFR column is a hypothesis, as in `NEG`, `CONJ` and `ADV`.** The A1 and
A2 calls are safe. `PRON.feble.forma_alomorfs` at B2 and the relative series at
B1 and B2 are judgements about when a learner needs the form productively, not
sourced data.

### VERB (verbs)

The second and last domain seeded that was already `seed only`, and the largest
in the taxonomy. 2a merged into the six leaves the phase 1 seed had authored and
glossed (`VERB.ind.imperfet`, `VERB.ind.passat_perifrastic`,
`VERB.perf.present`, `VERB.conj.3.incoatiu`, `VERB.mod.obligacio`,
`VERB.ser_estar`) rather than authoring an empty tree. It ends at 11 branches
and 32 leaves, 26 of them new. No licensed data file, curated list or database
was extracted from, and all Catalan forms and examples are hand-authored, so
neither the compilation-copyright risk nor the EU database right described above
is engaged. The facts are drawn from:

- `docs/01-catalan-structural-map-and-build-plan.md`, the verb section at lines
  103-113, which is the floor for the domain rather than the plan for it. It
  names the conjugation classes, the non-finite forms, the tense inventory and
  the periphrases; this tree adds the orthographic stem alternations, the velar
  increment, the impersonals and the `haver`/`tenir` split.
- `data/contrast-overrides.json`, which binds four of the six pre-existing
  leaves and is applied verbatim.
- The routing decisions recorded above in the `PREP`, `NEG`, `CONJ` and `SYN`
  sections, which between them hand two facts to this domain and pre-empt two
  more.
- General knowledge of Catalan verbal morphology at reference-grammar level.
  `giec.iec.cat` and `geiec.iec.cat` are JavaScript-rendered and were not
  retrieved during this pass, as during `CONJ`, `ADV`, `SYN` and `PRON`, so **no
  GIEC or GEIEC section number appears anywhere in this domain's prose and every
  grammatical claim here is unretrieved**. That matters more here than in any
  earlier domain, because `VERB` is rules rather than boundaries, and a wrong
  rule is the failure mode self-review does not catch.

**The merge was verified against `HEAD` field by field, and this time it held.**
The `PRON` pass reported its four preserved leaves identical byte for byte and
had in fact degraded all 16 narrow no-break spaces in the file. Here the seeding
script never retyped a preserved node: it read them with `git show HEAD:` and
carried them through as parsed objects, and a separate script diffed every field
of all 12 pre-existing nodes against `HEAD` and counted U+202F on both sides.
Exactly one field differs, deliberately, and it is named below. **Carrying
preserved nodes as objects rather than retyping them is what made this cheap**,
and it is the practice to keep for any future merge.

**One pre-existing leaf was changed on purpose.** `VERB.perf.present`'s `notes`
said only that `haver` is the sole auxiliary. It never said that `he cantat` is
bounded to a span including the present, which is the fact that stops a French
speaker using it for every past, and without which the leaf teaches that the
Catalan and French perfects are distributionally the same. A sentence was
appended. The change is recorded here rather than folded into the merge report,
because the point of the merge discipline is that a diff on a preserved node has
to be intentional and named.

**The `VERB.perf.*` override was rescoped, and it was put to the user rather
than decided quietly.** The wildcard note read « Correspond au passé composé,
mais le catalan emploie haver pour tous les verbes... », written when
`VERB.perf` had exactly one leaf. The 2a pass gave it a second,
`VERB.perf.serie`, which is the whole compound series with `havia cantat` as its
form, and on a pluperfect that sentence is simply false. Three options were put
up: ship it verbatim and flag it, narrow the wildcard, or drop the series leaf.
The user's steer was that the card has to be true and has to explain. So the
wildcard note now states the auxiliary fact for the whole series, and
`VERB.perf.present` **carves itself out with an exact override** carrying the
original passé-composé wording unchanged. That is the mechanism
`src/taxonomy/overrides.ts` already documents, exact beats wildcard, used for
the first time. Statuses are untouched, both leaves are still `transfer`, and
the committed leaf's contrast prose is identical to what it was.
`test/gloss-completeness.test.ts` was updated in the same commit: its wildcard
case asserted on `VERB.perf.present`, which now resolves by the exact path, so
it would have passed while testing nothing. It asserts on `VERB.perf.serie` and
on the resolved override's `id`.

**Paradigm cells are not leaves, and this is the domain where that pressure is
heaviest.** A tense-by-person expansion of Catalan would run to hundreds of
cells. The tree keeps rules instead. `VERB.perf.serie` is one leaf for five
compound tenses, because they are one formation rule. `VERB.irregular` has two
leaves where a verb list would have twenty, split by where in the paradigm the
irregularity lives. `VERB.conj.ortografia` is one leaf for five spelling
alternations. The axis test's two limbs both hold on `VERB.irregular`: stress
position against velar increment is a natural class distinction in Catalan
morphology, and it predicts the statuses, `transfer` for the alternation French
shares and `novel` for the increment it has no analogue of.

**The third sweep, over the paradigm itself, is what the `PRON` pass asked for
and it earned its place.** The Catalan-inventory sweep and the French-to-Catalan
sweep between them produced the tenses, the moods, the non-finite forms and the
periphrases. Reading down the paradigm found two more: the compound series
beyond the perfect had no key of its own, and the impersonal and defective verbs
had none at all. Two candidate cells were left uncovered deliberately, both
noted on existing leaves rather than keyed: the `passat anterior`
(`hagué cantat`), a register variant of the simple preterite, and the irregular
imperfects (`era`, `feia`, `deia`), which are five verbs rather than a rule.

**Facts owed by other domains are discharged.**

- **The negative imperative** is `VERB.imperatiu.negatiu`, which `NEG` ruled out
  of itself on the strength of GIEC treating it at §34.4 under imperative
  clauses. The leaf states the mood switch, cross-references
  `SYN.clitics.proclisi_enclisi` for the clitic movement rather than restating
  it, and records in `notes` why it is `VERB`'s.
- **`acabar de`** is `VERB.perifrasi.acabar_de`, `false-friend`, which `PREP`
  identified and recorded as this domain's.
  `PREP.formes_no_finites.inf_regit_de` keeps the government fact and its own
  `near-miss` status, whose justification necessarily cites `acabar de`. That is
  a restatement in prose rather than a second key, the kind `check-duplicates`
  cannot see, and it is left standing because deleting it would leave `PREP`'s
  status unexplained.
- **The expired note is closed.** `PREP.formes_no_finites.inf_regit_de` said the
  periphrasis « relève du domaine VERB », justifying a placement by pointing at
  a domain with no key in it. It now points at `VERB.perifrasi.acabar_de` by ID.
  That was the second and last note of that shape: `ADV.collocacio`'s expired
  when `SYN` landed, `PRON` found none, and none remain.

**The `SYN` boundary was held without challenge, as in `PRON`.** `VERB` owns
verbal morphology; `SYN.clitics.*` owns where a clitic attaches, `SYN.veu.*` the
passives, `SYN.pronominals.*` the reflexive and inherent pronominals, and
`SYN.concordanca_participi` participle agreement. Three leaves here reach that
line and all three cross-reference rather than restate:
`VERB.no_finit.participi` on agreement, `VERB.imperatiu.positiu` and
`VERB.imperatiu.negatiu` on clitic position. The `CONJ` line held too. This
domain says how a mood is formed and never which subordinator selects it, and
`VERB.subj.present`, `VERB.subj.imperfet` and `VERB.ind.futur` each say so
explicitly, routing mood selection to `CONJ` and tense sequencing to
`SYN.subordinacio.consecutio`.

**Ruled out of this domain:**

- **`fa tres anys que no el veig`** stays `PREP.toniques.des_de_fa`, which owns
  both the `des de fa` frame and the `fa ... que` one for elapsed duration.
  `VERB.impersonal` takes only the impersonal verb itself and the point-in-past
  `fa tres anys` rendering _il y a trois ans_, which was keyed nowhere. This is
  the `ADV`-reads-`DET`-first discipline applied again: the naive move was a
  `VERB` leaf for `fa`, and most of it already existed.
- **The existential `hi ha`** was considered and declined. It follows _il y a_
  faithfully in form, value and invariability, so a leaf would state that
  nothing differs. It is a `notes` line on `VERB.haver_tenir` instead.
- **`saber` and `poder`** were considered and declined for the same reason. They
  map one to one onto _savoir_ and _pouvoir_, `saber` plus infinitive for a
  learned ability included.
- **The orthographic stem alternations were nearly routed to `PHON`**, which is
  unseeded and owns orthography. They stayed as `VERB.conj.ortografia` because
  the alternation is conditioned by the conjugation ending rather than by the
  phonological environment at large, and `PHON` will own the grapheme-phoneme
  system this is a special case of. Recorded so the `PHON` pass finds the
  decision rather than minting a second key.

**Statuses.** 8 `transfer`, 19 `near-miss`, 2 `false-friend`, 3 `novel`. The
`transfer` share is the second highest in the taxonomy after `NOM`, and it is an
honest count rather than a lazy pass: Romance verbal morphology transfers in its
**form**, the tense inventory and the formation rules being nearly common
property, and what fails to transfer is concentrated in distribution and in two
lexical splits. Every `transfer` was challenged and one moved.

- **`VERB.ind.futur` was authored `transfer` and moved to `near-miss`.** The
  formation is as transferable as anything in the domain, the infinitive plus
  the `haver` endings, with the same irregular stems French has. But French
  speech confines the simple future to a narrower range than Catalan does,
  because _aller_ plus infinitive takes the near future and Catalan has no such
  tour, so the Catalan future covers both. That is a distributional divergence
  of exactly the kind `near-miss` names, and it is the first thing a French
  speaker gets wrong about the Catalan future. Six consecutive passes have now
  moved a status on challenge.
- **`VERB.ind.condicional`, `VERB.ind.passat_simple` and
  `VERB.irregular.radical_tonic` were challenged and kept at `transfer`.** The
  conditional shares its stem, its formation and all three of its main uses. The
  simple preterite has the same literary-only distribution as the _passé simple_
  on both sides, down to being displaced by a different past in speech. The
  stress-conditioned stem alternation is the French _peux_/_pouvons_ mechanism
  operating on largely the same verbs.
- **`VERB.subj.imperfet` is `novel`, on the `gaire` precedent.** French has a
  homologous form, _chantât_, and that is exactly why the call needed the
  precedent: a form absent from a contemporary speaker's productive grammar is
  not an anchor. It goes further than `NEG.expletiu`, which stopped at
  `near-miss` because expletive _ne_ is a live rule gated by register; the French
  imperfect subjunctive is not gated by register, it is gone. Catalan requires
  its own constantly, after a past matrix, in the irrealis protasis and after
  `com si`, so the learner is producing a mood with nothing behind it.
- **`VERB.irregular.velar` is `novel`** on the plain reading. The velar
  increment has no French analogue of any kind.
- **`VERB.perifrasi.imminent` was authored `false-friend` and moved to
  `near-miss`.** It is the exact converse of the taxonomy's headline false
  friend: the French speaker who calques _aller_ plus infinitive produces a
  past. But that is a production error the French intuition generates, not a
  familiar French reading of a Catalan form that is available and wrong, and
  `PRON` set the precedent when `PRON.fort.tractament` came down for the same
  reason. The trap is stated in the leaf's `notes` and cross-referenced to
  `VERB.ind.passat_perifrastic`, which keeps the `false-friend`.
- **`VERB.perifrasi.acabar_de` is the domain's second `false-friend`** and meets
  the bar squarely: `acabo d'arribar` has an available, grammatical French
  reading, _finir d'arriver_, and it is wrong. **docs/01 line 112 disagrees**,
  calling `acabar de` a clean `transfer` from _venir de_. That is true of the
  French-to-Catalan direction and misses the Catalan-to-French one, which is the
  direction a false friend is defined in. docs/01 is left standing with the
  disagreement recorded beside it, on the `pas` precedent.
- **`VERB.haver_tenir` was considered for `false-friend` and refused.** `haver`
  resembles _avoir_ and is not it, but a learner who reads `he arribat` gets the
  right meaning; the error is production, `*he un cotxe`. Same refusal as `gens`
  and `com que`.

**Six things were caught by reading the authored prose, and none of them by any
check.** One was an outright wrong rule, which is what the `CONJ`/`ADV`/`SYN`
outside review warned needs a source rather than self-review:
`VERB.subj.present`'s `notes` gave the subjunctive endings as -i, -is, -i, -em,
-eu, -in in all three groups, which is wrong at the third, where the first two
plural persons are -im and -iu. It now states the rule that is both true and
more useful, that the plural persons are simply the indicative ones.
`VERB.imperatiu.negatiu`'s `notes` restated `SYN.clitics.proclisi_enclisi`'s rule
instead of pointing at it, the failure `PRON` hit twice. `VERB.ind.present`'s
contrast note offered the absence of an obligatory progressive as a divergence
when French is the same. `VERB.mod.deure` claimed `Ha de ser tard` cannot be a
conjecture, which overstates a norm this pass could not retrieve. Two examples
were poor rather than wrong: `Va marxar corrents` illustrates the gerund with a
lexicalised adverb, and `La carta ja està escrita` illustrated the participle
with an agreement `SYN` owns.

**`check-duplicates` caught one collision and it was removed rather than
allowlisted.** `VERB.subj.imperfet` had taken `Volia que ho fessis tu` as an
example, which is `SYN.subordinacio.consecutio`'s. The overlap was real but not
irreducible: `SYN` owns the tense sequencing that sentence illustrates and
`VERB` owns the form, so the examples moved to `Tant de bo plogués ara mateix`,
an imperfect subjunctive in a main clause, which isolates the form and is a
better card besides. That is the second consecutive pass to drop a candidate
allowlist entry by making the data more precise, after `PRON` did it to a `ca`
field. No entry was added and the allowlist stands at 16.

**The CEFR column is a hypothesis, as in every domain since `NEG`.** A1 and A2
are safe. The `C1` on `VERB.ind.passat_simple` is a claim about register rather
than about difficulty, and the `B1` and `B2` calls across the subjunctive and
the periphrases are judgements about when a learner needs the form productively.

### Outside review of VERB and PRON, and what it changed

The second outside review of this taxonomy, run after both domains had been
seeded with no grammar text retrieved at all. It made 22 field-level changes
across the two fragments and moved no status.

**Evidence position: unchanged in kind, better in degree.** The reviewer could
not render `giec.iec.cat` or `geiec.iec.cat` either, reporting that both return
only metadata boilerplate and that the body is JavaScript-rendered. That is six
consecutive attempts from two independent directions. What it did reach was
substantial verbatim quotation of both grammars carrying matching section URLs,
plus Optimot, CPNL, GALMIC/UIB, DIEC and the Generalitat conjugator, each named
per claim. It graded its own claims three ways as asked, and **flagged that its
two (a) RETRIEVED items rest on a downstream verification pass rather than on
its own fetch**, which is exactly the honesty the grading exists for. This repo
treats all of it as indirectly sourced. **No GIEC or GEIEC section number has
been written into the data, and that still holds.**

**The single most useful thing it said is a pattern rather than a finding.** In
its own words, the taxonomy's recurring weakness is treating a default or
regular pattern as an exceptionless rule, and it found four instances in `VERB`
alone. Each was right for the regular core and wrong for the velar and irregular
verbs, which are precisely the verbs a learner meets first. **This is now the
thing to check for when the remaining domains are seeded**: a rule stated
without its exception class reads as complete and is not.

**Two claims were wrong about French, not about Catalan, and those were fixed
first.** For a French-base app this is the worst category of error, because it
misleads the learner about their own language and destroys the contrastive value
of the card.

- `PRON.feble.en` said Catalan `en` pronominalises a place of origin "là où le
  français doit répéter la préposition et le nom". French `en` does exactly
  this: _j'en viens_ is standard, and Le Robert's own pronoun guide leads with
  it. The note now says so explicitly, which turns the correction into
  something teachable, and states the divergence that is real: Catalan `en`
  also takes the subject of unaccusative and existential verbs with no
  expletive, `En vénen tres`, `No en queda cap`.
- `PRON.feble.hi` said Catalan `hi` resumes the complement of perception verbs
  "où le français n'emploie pas y". French has _je n'y vois rien_ and
  _n'y voir goutte_. The note now grants the parallel and states the actual
  divergence: Catalan has lexicalised `veure-hi` and `sentir-hi` as plain verbs
  meaning to see and to hear, used outside negation, `Hi sent molt bé`.

**Four rules were stated too broadly and are now stated with their exception
class.**

- `VERB.subj.present` said the two plural persons of the present subjunctive
  reproduce the indicative unchanged. True of regular verbs and of `fer` and
  `anar`, false of every velar verb: the standard is `prenguem`, `diguem`,
  `tinguem`, never `prenem`, `diem`, `tenim`. The reviewer supplied Fabra's own
  formulation of the point through an IEC _Converses filològiques_ quotation.
  Rewritten to say that the endings are the indicative ones but the stem is not
  always.
- `VERB.irregular.velar` said the infinitive and the participle bear no trace of
  the increment. True of the infinitive and the gerund, which never velarise,
  and false of the participle in `begut`, `viscut`, `tingut`, `vingut`,
  `volgut`, `pogut`, `valgut`. `pres` and `dit` are the exceptions that made the
  original claim look right. The increment also reaches the simple preterite and
  several imperatives, both now stated, and the contrast note was widened to
  match.
- `VERB.imperatiu.positiu` derived the imperative from the indicative without
  qualification. That fails for `digues`, `fes`, `sigues`, `vine`, `vés`,
  `estigues`, which are the verbs a learner commands with first.
- `VERB.conj.3.incoatiu`, a phase 1 leaf, confined the `-eix-` infix to the
  present indicative. It appears at the same persons of the present subjunctive
  and in the singular imperative.

**One rationale was right in its conclusion and wrong in its reasoning.**
`VERB.perifrasi.imminent` explained the restriction on `anar a` plus infinitive
by a collision with the periphrastic past. The reviewer points out that the two
do not actually collide, since the periphrasis has no preposition, `vaig cantar`
against `vaig a cantar`, and that the norm's own objection is different: GALMIC
and Optimot restrict the construction to a past or conative value and to real
motion, and the futurate use is treated as a castellanism. The note now gives
the norm's account and keeps the one-letter proximity as the practical warning
it is, rather than as the explanation it is not. **A card can reach the right
behaviour through the wrong reason, and only a source catches that.**

**Smaller completions, all applied.** The future of conjecture is not merely
dispreferred but advised against in formal registers, with `deure` recommended
(Optimot 12259), so `VERB.ind.futur` says so. The norm admits the predicative
gerund, `He vist un home fumant`, and only the noun-qualifying one is refused,
so `VERB.no_finit.gerundi` no longer invites over-application of the ban.
`VERB.haver_tenir` claimed `hi ha` was the only non-auxiliary use of `haver`,
which this domain's own `VERB.mod.obligacio` contradicts; it now names both and
adds that `haver-hi` is third-person only. `VERB.conj.ortografia` gained the
`qu`/`qü` pair. `VERB.ind.passat_perifrastic`, a phase 1 leaf, gained the
equally normative `vares`/`vàrem`/`vàreu`/`varen` series.
`VERB.conj.3.pur`'s list was presented as the class and is now presented as its
commonest members, with `tenir` and `venir` added and the warning that `sentir`
is pure while `assentir` and `dissentir` are not. `PRON.fort.tractament` gained
the fact that `vós` takes plural verb agreement but singular adjective and
participle agreement, `Esteu preparat`, which is precisely parallel to French
_vous êtes prêt_ and so strengthens rather than weakens the leaf.
`PRON.feble.combinacio.ci_cd`'s dialect note had `li els` for Valencian, which
should be `li'ls`, and now records that `els hi` is colloquial.

**`VERB.perf.present`'s hodiernal sentence was softened.** It was added during
the `VERB` seed as an exceptionless rule. The reviewer confirms the restriction
but reports it as a strong normative default with recognised exceptions, a very
recent event taking the perfect regardless, `fa una estona ha trucat`. Corrected
in the same pass that introduced it, which is the pattern above catching the
`VERB` pass in the act.

**Three findings were declined, each with an argument.**

- **The `novel` on `PRON.feble.forma_alomorfs` stands.** The reviewer is right
  that French clitics alternate positionally, `me`, `m'`, and `moi` in the
  positive imperative, and that the leaf's "élision binaire" undersold it. But
  `moi` is a tonic pronoun substituting for the clitic, not a fourth allomorph
  of it, so the French clitic still has two forms against Catalan's four,
  conditioned by position and by phonological context at once. The note now
  states the French alternation and says why it is not the same thing, which is
  a better card than either the original or the proposed downgrade. This keeps
  `PRON` at one `novel`.
- **`hom` is not keyed and stays unkeyed.** The reviewer confirms it exists as
  an indefinite subject pronoun and reports it literary and archaic in ordinary
  standard usage, with the IEC's own Albert Jané paper recording Fabra calling
  it "el pronom arcaic hom". The fact a learner needs is that French _on_ has no
  everyday Catalan pronoun, and `SYN.veu.impersonal` already states exactly that
  and routes to `es` plus third singular. A `hom` leaf would be a second key for
  a fact already keyed, plus vocabulary. Noted as owed to `LEX` if anywhere.
- **`segons jo` did not get a key.** The reviewer confirmed, with a GEIEC §14.3
  verbatim snippet, that `segons`, `malgrat` and `mitjançant` select the subject
  form, as do coordination and a pronoun before a governed infinitive. That is
  an exception to the rule `PRON.fort.tonic` already owns, so it went into that
  leaf's `notes`, not into a new leaf. `PREP.toniques.inventari` had been
  illustrating the coordination case with `Entre tu i jo ho farem` without
  stating it, which is how the gap survived both coverage sweeps.

**Verified and left alone.** Worth recording, because a review that only reports
problems leaves no way to tell a checked claim from an unexamined one. Confirmed
correct as written: the imperfect subjunctive endings and full paradigm
(`VERB.subj.imperfet`); the negative imperative and its attribution to GIEC
§34.4, now backed by a verbatim snippet of that section rather than by the
earlier review's chapter map alone (`VERB.imperatiu.negatiu`); the periphrastic
past auxiliary series (`VERB.ind.passat_perifrastic`); the 1sg present in
`-o`/`-e`/`-Ø` across Central, Valencian and Balearic (`VERB.ind.present`);
`soler` as defective to the present and imperfect indicative
(`VERB.perifrasi.habitual`); `servir` and `partir` as inchoative against the
pure class (`VERB.conj.3.pur`); both gerund bans as firmly rejected
(`VERB.no_finit.gerundi`); `haver` as sole auxiliary with `ésser` explicitly
historical (`VERB.perf.present`); relative `on` as strictly locative with
temporal antecedents taking `que` (`PRON.rel.on`); the absence of a _dont_
counterpart and the ungrammaticality of dropping the preposition
(`PRON.rel.absencia_dont`); `tothom` against `tot el món`
(`PRON.indefinit.tothom`); positive-polarity `res` (`PRON.indefinit.res`);
`cadascú` against `cadascun` (`PRON.indefinit.cadascun`); the neuter
demonstrative system with `açò` as Valencian
(`PRON.demostratiu_neutre`); and the clitic combination order with `li` surfacing
as `hi` (`PRON.feble.combinacio.ci_cd`).

**Still not verified.** That GIEC chapter 35 is the negation chapter. The
`VERB`/`NEG` routing of the negative imperative rests on a contrast between
§34.4 and chapter 35, and this review confirmed only the §34.4 half; the chapter
map itself came from the `CONJ`/`ADV`/`SYN` review and remains snippet-grade.
The routing does not depend on it, since §34.4 alone establishes that the
grammar files the fact under the imperative, but the contrast as stated in this
file is half-sourced. Also unverified: the exact GIEC §24.8.5.2 wording on
`anar a`, and the acceptability of `Ha de ser tard` as a pure conjecture, which
rests on usage and academic sources rather than a clean IEC ruling and which
`VERB.mod.deure` already hedges.

**Three phase 1 leaves were edited again in this pass** (`VERB.conj.3.incoatiu`,
`VERB.perf.present`, `VERB.ind.passat_perifrastic`). The merge discipline says a
diff on a preserved node must be intentional and named, not that preserved nodes
are frozen; all three are named above.

### LEX (lexis and register)

The eleventh domain seeded and the smallest but one, at 4 branches and 12
leaves. Authored from nothing, so none of the merge hazards that governed `PRON`
and `VERB` apply. No licensed data file, curated list or database was extracted
from, and every Catalan form and example is hand-authored, which matters more
here than anywhere else in the taxonomy and is argued below. The facts are drawn
from:

- `docs/01-catalan-structural-map-and-build-plan.md`, the lexis section at line
  179, which proposes five branches. Two were built roughly as named
  (`fals_amic`, `castellanismes`), one was rebuilt on a different axis
  (`cognats`), and **two were declined outright**, for reasons given below.
- The routing decisions recorded above in the `DET`, `NEG` and `ADV` sections,
  which between them ruled four groups of fixed locutions into this domain, plus
  the `PRON` decision from the outside review.
- General knowledge of Catalan and French lexis. No grammar was retrieved during
  this pass and none was sought, since almost nothing here is a rule a grammar
  states. **The evidence grade for this domain is different in kind from every
  other one**: the claims are lexical rather than normative, so they are
  checkable against a dictionary rather than against GIEC, and no GIEC or GEIEC
  section is cited or implied anywhere in the domain.

**Two of docs/01's five branches were declined, and the reasons generalise.**

- **`LEX.freq`, frequency-ranked core vocabulary, is not a taxonomy branch.**
  docs/01 proposes seeding it from SUBTLEX-CAT, Leipzig or wordfreq. It fails on
  two independent grounds and either would be enough. First, it is a word list:
  one key per word is the paradigm-cell error at the largest possible scale, and
  it would fill the coverage heatmap with thousands of squares that say nothing
  about grammar. **The rule that paradigm cells are not leaves generalises to
  vocabulary items are not leaves.** Second, the licensing table at the top of
  this file records SUBTLEX-CAT as having no reuse grant, and the compilation
  and database-right discussion above applies directly to a frequency-ordered
  list, whose ordering is the compiled thing. A frequency signal belongs in the
  scheduler as a weight on existing nodes, which is what the phase 6 note in
  `TASKS.md` already asks for, not in the component vocabulary.
- **`LEX.false_friends.es`, a Spanish-interference branch, is unrepresentable.**
  docs/01 offers it as optional if Spanish is also in play. The schema has one
  contrast field, `contrast_fr`, and it is keyed to French by name and by
  definition. A node whose difficulty comes from Spanish has no true value for
  it, so the branch would either carry a false `contrast_fr` or need a second
  contrast dimension, which is a schema change and a whole-taxonomy migration.
  The Spanish-facing facts that do matter reach the learner through
  `LEX.castellanismes`, which states them as norm facts about Catalan rather
  than as interference from a language the base speaker may not have.

**`LEX.cognats` is docs/01's `cognates_fr` rebuilt as a strategy rather than a
list.** The proposal was positive-transfer vocabulary, "a cheap early win",
which invites exactly the word list declined above. The leaf instead states the
structural fact that generates the list: Catalan's core vocabulary is
Gallo-Romance where Spanish is not, so `menjar`, `taula`, `finestra`, `parlar`,
`formatge`, `mirall`, `ocell` and `blau` answer to the French words and not to
`comer`, `mesa`, `ventana`, `hablar`. Its members are illustrative and
deliberately few. This is knowingly close to the line `PREP` drew when it
refused a leaf for declarative knowledge about the per/per a norm, and it is
kept on the other side of it: knowing to trust a French guess on core vocabulary
changes what the learner produces, where knowing that three per/per a systems
exist does not.

**The domain is defined by subtraction, as `SYN` was and more so.** Eleven
domains were seeded before it. `NOM` took derivation and compounding, `ADV` the
productive adverbial locution frame, `DET` quantification, `VERB` the
grammatical-verb splits, `NEG` and `CONJ` and `SYN` everything clause-level.
What was left is genuinely lexical, and the twelve leaves are smaller and
sharper for it. **Do not read the leaf count as an unfinished domain**, on the
same terms `ADV` established for an open class: `LEX`'s inventory is not finite
and cannot be enumerated, so the tree covers the systems (false friends,
cognates, fixed formulae, collocation, re-cut lexical fields, normative
pressure) and not the vocabulary.

**A boundary had to be drawn inside verb lexis, and it is new.** `VERB` already
owns `VERB.ser_estar` and `VERB.haver_tenir`, which are lexical-choice leaves in
a morphology domain. `LEX.camp.portar_dur` is the same shape and sits here. The
line is that **`VERB` owns splits in the grammatical verbs, the copula and the
auxiliary, and `LEX` owns splits in the lexical verbs.** Without it, either
domain could have taken both, and the next pass that meets a Catalan verb pair
would have had to decide again from scratch.

**Facts owed by other domains are discharged or explicitly declined.**

- **`amb prou feines`** is `LEX.locucions.aproximacio`, ruled out of `NEG` and
  then again out of `ADV` as a fixed locution. The leaf cross-references
  `ADV.grau.aproximacio`, which keeps the productive adverbs `gairebé`, `quasi`
  and `a penes`.
- **`de cap manera`, `en absolut`, `ni de bon tros`** are
  `LEX.locucions.negacio_emfatica`, ruled out of `NEG` on the same grounds.
- **`és clar`, `sens dubte`, `i tant`** are `LEX.locucions.certesa`, ruled out of
  `ADV`. `ADV.modalitat.si` keeps `i tant` as an example without a key of its
  own, and the leaf says so.
- **`gens` as a French homograph** is a member of `LEX.fals_amic.noms`. The `DET`
  pass refused it `false-friend` status there, on the ground that it resembles a
  French noun rather than a French structure, and recorded that the trap
  "belongs to `LEX` if it is ever keyed". It is keyed here as a misreading, and
  the leaf cross-references `DET.quant.polaritat.gens`, which keeps the
  quantifier's distribution. The two are different facts about one word.
- **`hom` stays unkeyed**, as decided when the `VERB`/`PRON` review raised it.
  `SYN.veu.impersonal` already owns the fact that French _on_ has no everyday
  Catalan counterpart, and `hom` on top of that is vocabulary plus a register
  label.
- **`un munt de` and `una pila de` stay unkeyed.** `DET.quant.juncio_nominal`
  notes that they are nouns heading a partitive phrase and "n'ont pas de clé
  propre". They still do not, and this pass declines them: French has the
  identical construction, _un tas de_, _une pile de_, so a leaf would state that
  nothing differs. Same refusal as `hi ha` and `saber`/`poder` in `VERB`.

**Statuses.** 3 `transfer`, 6 `near-miss`, 3 `false-friend`, 0 `novel`. Two
things about that distribution are claims rather than counts.

- **Three `false-friend` is the highest count in the taxonomy**, against two in
  `VERB` and `PRON` and at most one everywhere else. That is not status
  inflation, it is what the domain is: `false-friend` is defined as a familiar
  French reading of a Catalan form that is available and wrong, and a lexical
  domain is where forms are read. `LEX.fals_amic.verbs` has the
  `entendre`/`sentir` swap, `LEX.fals_amic.noms` has `llarg`, `constipat` and
  `embarassada`, and `LEX.locucions.negacio_emfatica` has `en absolut`, which
  resembles _absolument_ and inverts it. Each meets the bar the `gens`,
  `com que`, `PRON.fort.tractament` and `VERB.perifrasi.imminent` refusals set:
  the wrong reading is available and grammatical, not merely a production error.
- **The empty `novel` column is a claim and follows from how the domain is
  built.** Every leaf here states a relation between a French item and a Catalan
  one, so an anchor exists by construction. A Catalan word with no French anchor
  at all is not a `novel` node, it is vocabulary, and this domain deliberately
  does not key vocabulary. `PREP` and `ADV` made emptiness claims of the same
  shape for different reasons.

**Both `transfer` assignments outside `cognats` were challenged.**
`LEX.locucions.cortesia` stays `transfer`: `si us plau` is _s'il vous plaît_
subordinate clause and all, and `de res` is _de rien_, where Spanish builds both
differently. `LEX.castellanismes` is the most arguable status in the domain and
is flagged as such. The leaf's claim is that these errors come from Spanish and
not from French, so a French speaker will hear them without producing them, and
that on `vacances` the French intuition gives the correct Catalan form outright.
That is a real contrastive claim and `transfer` sinks the node down the gaps
list, which is the right scheduling behaviour for a French speaker even though
it would be wrong for a Spanish speaker. **Put this one to the outside review.**

**The browser review caught seven things, and one of them was serious.**
`LEX.castellanismes` had `tenir que, vacacions` in its `ca` field, which are
precisely the forms the norm rejects. Every other leaf in the taxonomy heads its
card with a correct Catalan form, and `ca` feeds the decomposition machinery, so
this leaf would have taught the error it exists to block. It now reads
`adonar-se, vacances` and the rejected forms appear only in the contrast note.
**A leaf whose subject is a proscribed form must still be headed by the correct
one.** The other six were smaller: a claim that French _bonne nuit_ greets as
well as takes leave, which it does not, and which turned out to be a better
contrast once corrected; an overstatement about Spanish courtesy formulae; a
gloss promising one Catalan verb while the form field showed three; a
too-strong claim that the preverbal `no` is always required with the emphatic
locutions, which is false of the standalone reply; a note re-quoting its own
leaf's example; and a thin example sentence.

**Three glosses were written with literal guillemets and ordinary spaces**, and
`test/gloss-completeness.test.ts` refused the turn. The seeding script builds
U+202F from its code point and substitutes it for a placeholder, exactly as
`CLAUDE.md` requires, and these three had been typed directly into the gloss
strings instead. That is the third time this repo has lost narrow no-break
spaces and the second time a test caught it rather than a human. The rule stands
and has now paid for itself twice: **never type the character, always build it.**

**The CEFR column is a hypothesis, as everywhere since `NEG`**, and it is
weaker here than usual. A1 on `LEX.locucions.cortesia` and `LEX.cognats` is
safe. The B1 and B2 calls across the false friends and the locutions are
judgements about when a learner meets the item often enough to need it, and a
frequency source would settle them properly if one were ever licensed.

### PHON (phonology and orthography)

The twelfth and last domain, 4 branches and 13 leaves. Authored from nothing.
No licensed data file, curated list or database was extracted from, and every
Catalan form and example is hand-authored. The facts are drawn from:

- `docs/01-catalan-structural-map-and-build-plan.md`, the phonology section at
  lines 68-85, which is the only place in that document giving a domain as a
  finished twelve-row table with statuses already assigned. Ten rows became
  leaves in some form; **two were declined outright** and are argued below.
- The routing decisions recorded above in the `DET` and `VERB` sections, which
  hand this domain two facts.
- General knowledge of Catalan orthography and Central Catalan phonology.
  `giec.iec.cat` and `geiec.iec.cat` were not retrieved, as in every pass since
  `CONJ`, so **no GIEC or GEIEC section number appears anywhere in this domain's
  prose**. The 2017 diacritic reform and the accentuation rules are the two
  claims here most worth checking against the printed norm.

**docs/01's `PHON.apostrof` row was declined, and the reason is the most
interesting thing in the domain.** That table was written before any domain was
seeded, and it assigned apostrophation to `PHON` because that is where an
orthography chapter would put it. By the time `PHON` was reached, seven
committed leaves already owned it: `ART.def.forma.elisio`,
`ART.def.forma.la_no_elisio`, `ART.def.forma.el_iod`, `ART.personal.n_elisio`,
`ART.personal.contraccio`, `ART.contract.no_contraccio_elisio` and
`ART.salat.elisio` in `ART`, `PREP.atones.elisio_de` in `PREP`, and
`PRON.feble.forma_alomorfs` in `PRON` for the weak-pronoun forms. Every one of
them states its own category's behaviour, which is what a learner actually
needs, and there is no residue left for a general leaf to hold except the
observation that Catalan apostrophates more than French, which is not a card.
**A domain seeded last inherits a plan written first, and the plan may have been
overtaken by the eleven passes in between.** Check what is already keyed before
building from a source table, not after.

**docs/01's `PHON.alph` row was also declined.** Twenty-six letters with `k` and
`w` confined to loanwords is declarative knowledge about an inventory a French
speaker already has, and it fails the same test that turned `PREP`'s per/per a
`variants` leaf into a `dialect_note`: it would never be produced, only known.

**Two owed facts are discharged.** The hyphen in compound numerals, ruled out of
`DET` with `DET.num.sistema_decimal`'s note saying explicitly that "trait
d'union et accentuation relèvent de PHON", is `PHON.grafia.guionet`. The general
graphic alternation that keeps a stem consonant's sound before a front vowel,
which the `VERB` pass nearly routed here and recorded as owed, is
`PHON.grafia.alternanca`; `VERB.conj.ortografia` remains the verbal case and now
carries a pointer to the general rule, so the cross-reference runs both ways.
That leaf also closes a small gap nobody had noticed: the alternation in nominal
plurals, `plaça`/`places` and `amic`/`amics`, was keyed nowhere, because `NOM`'s
plural leaves are about the ending and not about the spelling of the stem.

**The domain is mostly orthography, and that is deliberate rather than a
retreat.** Three leaves are about sound that the spelling does not show, and
they are the ones a text-only application can least exercise. They are kept for
two reasons. The first is that each has a written consequence a learner meets
immediately: vowel reduction is why unstressed `a` and `e` cannot be spelled by
ear, final devoicing is why the feminine has to be consulted to know what the
final consonant is, and the silent final `r` is why `carrer` is not spelled the
way it sounds. Each contrast note leads with that consequence rather than with
the phonetics. The second is that phase 6b adds pronunciation, and these three
nodes are what it will attach to; minting them later would mean minting keys
into a live query log, which is the trap the `intent` field was designed to
avoid.

**No IPA appears anywhere in the domain.** It was tempting for the three sound
leaves and was refused: the `ca` field is defined as a Catalan surface form and
feeds the decomposition machinery, so a transcription there would be neither
Catalan nor a form, and IPA in a gloss would be a second notation the learner
has not been taught. The sound facts are stated in French prose against French
examples the reader already pronounces correctly, which is what the base
language is for.

**Statuses.** 2 `transfer`, 7 `near-miss`, 4 `novel`, 0 `false-friend`.

- **Four `novel` is the highest count in the taxonomy**, against three in `LEX`
  and `VERB` and one or none almost everywhere else, and it is the honest shape
  of the domain. `PHON.grafia.ela_geminada`, `PHON.accent.regles`,
  `PHON.so.reduccio_vocalica` and `PHON.so.ensordiment` each name something with
  no French counterpart of any kind: a diacritic French does not have, a lexical
  stress system French does not have, and two phonological processes French does
  not run. This is the one domain where `novel` is easy to justify, because
  orthography and phonology are where two Romance languages actually diverge in
  kind rather than in distribution.
- **The empty `false-friend` column is a claim, and it was argued rather than
  assumed.** A spelling convention a learner has not met produces ignorance, not
  a confident wrong reading, so most of this domain cannot be `false-friend` by
  construction. The one real exception is `ll`: French `ll` is ordinarily a
  simple `l`, in _aller_ and _belle_, so `llibre` read the French way is a
  familiar reading that is available and wrong. It sits inside
  `PHON.grafia.digrafs`, whose four members do not share that property, so it is
  recorded in the leaf's `notes` and the leaf keeps the status true of the
  group. That is the `si bé` precedent from `CONJ`, applied for the second time.
- **Both `transfer` assignments were challenged and both stand.**
  `PHON.accent.agut_greu` is the cleanest transfer in the taxonomy: French é
  against è is the same closed-against-open opposition, marked with the same two
  signs. The Catalan system is in fact more regular, since `a` only ever takes
  the grave and `i` and `u` only ever the acute, which is a rule French lacks;
  that is stated in `notes` and does not disturb the status, because a rule that
  removes choices cannot make the node harder. `PHON.so.essa` is the French
  _poison_ against _poisson_ rule operating on the same letters, `ç` included.

**The browser review caught two consistency defects rather than errors.**
`PHON.accent.regles` named the three stress classes as "aiguës", "planes" and
"proparoxytons", mixing a Catalan-derived pair with a French technical term for
the third; it now names all three in Catalan with a French gloss.
`PHON.grafia.alternanca` listed four graphic pairs where `VERB.conj.ortografia`
lists six, so the general rule looked narrower than its own special case; the
lists now match.

**`check-duplicates` caught one collision.** `PHON.accent.diacritic` had taken
`Avui fa sol` as its example for the unaccented `sol`, which is
`ADV.temps.dixi`'s. Replaced rather than allowlisted, on the now-standard
grounds that the overlap was incidental. That is the third consecutive pass to
remove a candidate entry instead of recording one, and the allowlist has stood
at 16 since `PRON`.

**One test had to change, and it is the second census-shaped test this build has
outgrown.** `test/taxonomy-browser.test.ts` asserted that the tree says in
French that some domain is not yet seeded, reading the live taxonomy. Seeding
the twelfth domain makes that false. Deleting the case would have dropped the
only cover on `renderUnseededDomain`, which still exists in `src/ui/tree.ts` and
is still correct, so the two unseeded cases now drive `renderTree` with a node
set that omits one domain, and a third case asserts the live fact that nothing
is unseeded any more. `NOM` had to generalise `closed-vocabulary` for the same
underlying reason, that a test written against the data of the day is a snapshot
rather than an invariant. **There is no next seeding pass, so this is the last
time this particular class of breakage can occur.**

**The CEFR column is a hypothesis, as in every domain since `NEG`.** It is
unusually defensible here for the A2 rows, since digraphs, the interpunct and
vowel reduction are met in the first weeks whether or not anyone teaches them,
and unusually weak for `PHON.accent.diacritic` at B2, which is a proofreading
skill rather than a production one and could sit anywhere from B1 to C1.

### Outside review of LEX and PHON, and what it changed

The third outside review, and the last two domains to have one. Seventeen
field-level changes, no status moved, no leaf added or removed.

**The evidence position improved for the first time.** Every previous attempt on
`giec.iec.cat` and `geiec.iec.cat` failed and this one failed too, which is now
seven attempts from three directions. But `PHON` and `LEX` do not depend on the
grammars: their authorities are the orthographic norm, Optimot and the
dictionaries, and those rendered. The reviewer read `iec.cat`'s announcement of
the diacritic reform, the Optimot blog on the diacritic in derivatives, the DCVB
entry for `endur-se`, and on the French side CNRTL, Larousse, the Académie's
ninth edition and the 1990 rectifications in the _Journal officiel_. **The right
source for a domain is not always the reference grammar**, and two passes spent
failing to reach GIEC could have reached Optimot instead.

**A pattern is now confirmed rather than suspected: this project gets French
wrong more often than it gets Catalan wrong.** The `VERB`/`PRON` review found
two such errors; this one found two more, and they are the two `WRONG` verdicts
in the whole reply.

- **`PHON.dieresi` claimed the u-sounding tréma is "un second emploi que le
  français n'a pas".** French has exactly it, in _ambiguïté_ and _aiguille_, and
  the 1990 rectifications moved the mark onto the u itself, _aigüe_. The
  reviewer quoted the _Journal officiel_ text. The real difference is extent,
  not function: Catalan systematises it to `güe`, `güi`, `qüe`, `qüi`. Rewritten
  to say so.
- **`LEX.fals_amic.verbs` listed `parar` as "arrêter et non parer".** French
  _parer_ means to adorn or to ward off a blow and never to stop, so it offers
  no available reading of the Catalan at all and `parar` is not a false friend.
  The note now says that explicitly and adds the senses the leaf was missing,
  `parar taula` and `parar la mà`.

**Four claims about Catalan were wrong or too narrow.**

- **`PHON.so.erra_final` had the partition backwards for the words it named.**
  It said the final r is silent in infinitives and many nouns but kept "dans la
  plupart des monosyllabes, `cor`, `mar`, `dur`". Per Optimot, `dur` and `clar`
  drop it, patterning with the adjectives that have an r-bearing feminine
  (`dura`, `clara`), and `por` drops it too, while `cor`, `mar`, `amor` and
  `futur` keep it. **The conditioning is lexical, not a matter of syllable
  count**, and the leaf now says so. This is the single worst factual error the
  three reviews have found in a card, because it was stated as a rule and the
  rule was the wrong rule.
- **`LEX.camp.portar_dur` named `endur-se` as the only directional marker.** The
  IEC treats `emportar-se` as the main form with `endur-se` as a cross-reference
  to it. Both are named now.
- **`PHON.accent.regles` gave the accentuation rule without its exception
  class**, which is this project's documented weakness appearing for the fifth
  time. The rule as stated is correct and incomplete: the second vowel of a
  falling diphthong does not count, so `canteu` and `remei` take no accent, and
  a `plana` unaccented in the singular can take one in the plural, `examen`
  against `examens`. Those two are where writers actually fail.
- **`PHON.accent.diacritic` omitted the derivative rule.** Compounds and
  derivatives written solid lose the diacritic, `rodamon`, `entresol`,
  `subsol`, `a contrapel`, while hyphenated ones keep it, `pèl-roig`,
  `déu-n'hi-do`. Added, along with the dating: approved 2016, published in the
  _Ortografia catalana_ 2017, where the leaf had said only "depuis 2017".

**Three notes were completed rather than corrected.**
`LEX.fals_amic.noms` gave the right gloss for `constipat` without naming the
French reading it inverts, so the card stated the answer without the trap.
`PHON.grafia.digrafs` gave `ig` and `tx` the same value with no positional
restriction, when `ig` has it only word-finally after a vowel and `tj`/`tg`
alternate by following vowel. `PHON.so.ensordiment` implied the feminine always
reveals the underlying consonant, which holds only where a feminine or
derivative exists; `serp` and `amb` offer none.

**Three findings were declined or adapted rather than taken verbatim.**

- **`LEX.castellanismes` keeps `transfer`.** The reviewer marked the status
  arguable at medium confidence and proposed no change, and its stated reason is
  muddled: it says French _il faut_ and _devoir_ "reinforce the calque", but
  those support the correct `haver de`, not `tenir que`. One half of the point
  survives and was taken: the structure of _se rendre compte_ can support
  `donar-se compte` against the correct `adonar-se`, so the claim that a French
  speaker hears these without producing them is too absolute. The note now says
  the protection is real but not total. **A finding can be right about the data
  and wrong about the reasoning, and only the first part should be applied.**
- **`PHON.accent.agut_greu` keeps `transfer`.** The challenge is good: French
  é/è is not a clean closed-open mapping, since an open e can go unaccented in
  _mer_, and the grave of _à_ and _où_ is purely distinctive. But that means
  French has cases the mapping does not cover, not that the mapping fails to
  carry over; the sign-to-aperture convention is exactly what transfers. The
  status stands and the note no longer claims the francophone has "rien à
  apprendre".
- **The reviewer's list of diacritic-losing derivatives was pruned.** It came
  from an Optimot blog post titled "Redéu, adéu a l'accent dels derivats", and
  the reply listed `adéu` and `adéu-siau` among the words that lose the
  diacritic. That looks like the article's own pun read as data: `adéu` is the
  standard spelling. Only the examples that could be checked independently were
  kept. **A retrieved source can still be misread, and a verbatim-looking list
  is the easiest thing to over-trust.**

**One member was added on this pass's own judgement.** The reviewer proposed
`truita`, which covers both omelette and trout where French separates _truite_
from _omelette_, but graded it LOW purely for want of remaining budget. The fact
is not in doubt, and it was added as a member of `LEX.fals_amic.abast` rather
than as a key, which is the form the pack asked for. This is not the `ben`
precedent: that was an unsourced suggestion of a new key, this is a well-known
lexical fact joining a leaf that already exists.

**One field label in the reply was wrong and it mattered.** The `ll`-as-French-l
observation was filed against `PHON.grafia.digrafs`'s `glosses.fr`, and it is in
that leaf's `notes`. The edit script asserts the text it expects before writing,
so it would have refused rather than silently written to the wrong field, but
**a reply in a machine-shaped format still needs its field names checked against
the data**. The phonetic point behind it was taken: describing Catalan `ll` as
"le mouillé de fille" is dated, since French _ill_ is now a yod, so the note now
says French has lost the palatal lateral instead of pretending it still has one.

**Verified and left alone.** Recorded because a review that lists only problems
cannot distinguish a checked claim from an unexamined one. Confirmed correct as
written: the `entendre`/`sentir` swap and its `false-friend` status; `carrer`
and `gens` as false friends, `gens` against Larousse; the `demanar`/`preguntar`
split; `si us plau` and `de res` as word-for-word French and the `transfer` that
rests on them; the four-way greeting split and the claim that French _bonne
nuit_ only takes leave; `sens dubte` as fully affirmative against a weakened
_sans doute_, confirmed against the Académie's ninth edition; `en absolut` as a
false friend; `amb prou feines` and `si fa no fa` as opaque; `fer` as the
default light verb; the Gallo-Romance cognate claim; the `l·l` node as `novel`;
the graphic alternation; the numeral hyphen; the b/v merge and the cognate
strategy that mitigates it; the fifteen diacritic pairs and their membership;
vowel reduction as `novel`; final devoicing as `novel`, checked against the
observation that standard French preserves final voicing; and the s/ss/ç rule
as a clean transfer from _poison_ against _poisson_.

**Still not verified.** The `Ortografia catalana` itself was not retrieved as a
rendered primary document, so the fifteen-pair list, the derivative rule and the
diaeresis exceptions rest on the IEC announcement plus Optimot and CPNL
reproductions that agree with each other. Whether `dur` is genuinely more
frequent in writing than `portar` was not settled and the claim has been dropped
from the leaf rather than softened. A systematic account of which Catalan
monosyllables sound the final r would need the CTILC corpus. And GIEC chapter
35's scope remains unconfirmed, as it has since the `VERB`/`PRON` review.

### Outside review of NOM and ART, and what it changed

The fourth outside review, covering two of the four domains seeded before the
review habit existed. It is the largest reply received, and it did not use the
requested record format, so every finding was triaged and re-verified against
the data by hand. Forty-nine field-level changes were applied. **Six structural
findings were accepted and are not yet executed**; they are set out at the end
so the next pass finds a specification rather than a memory.

**The review confirms, for the third time, that this project's French claims are
weaker than its Catalan ones.** Three of the errors it found are outright false
statements about French, and none had been caught in four internal passes.

- **`NOM.number.regular` said the plural mechanism is identical "à l'oral comme
  à l'écrit".** The French plural -s is silent and the plural is carried by the
  determiner, _le chat_ against _les chats_, while the Catalan -s is pronounced.
  The card now says so.
- **`NOM.number.sibilant` said French adds -es after a final sibilant.** French
  nouns already ending in -s, -x or -z are invariable, _un bras_ and _des bras_.
  There is no French model at all here, which is the opposite of what the card
  taught.
- **`NOM.deriv.abstract_ment` called nominal -ment "plus rare" in French.** It is
  one of the largest deverbal noun classes the language has, _changement_,
  _gouvernement_, _sentiment_.

**The single most valuable finding is an interference point the domain missed
entirely.** `NOM.adj.position` said the position can shift meaning "comme en
français" and left it there. What it never said is that French **preposes a
whole closed class of frequent adjectives by default**, _petit_, _grand_, _bon_,
_jeune_, _vieux_, _beau_, where Catalan postposes them: `una casa petita`, not
`*una petita casa`. That is a systematic error a French speaker will make in
their first week, and the card as written would not have prevented it.

**Two cards taught a wrong Catalan form.**

- **`NOM.adj.invariable` was headed by `marró`, which is not invariable.** The
  plural is `uns pantalons marrons`, and the leaf's own example
  `Uns pantalons marró` was therefore ungrammatical. The invariable class is the
  compound colours, `blau marí`, `verd oliva`, which is now the headword;
  `marró` survives as the counter-example it always was. Its contrast note also
  claimed French would agree compound colours, when _bleu marine_ is invariable
  there too. **This is the second time a `ca` field has taught the error its
  leaf exists to block**, after `LEX.castellanismes`.
- **`NOM.adj.two_form` listed `feliç` among adjectives that add only -s.** It
  takes `feliços` and `felices` and belongs to the sibilant class, which the
  `NOM.number.sibilant` leaf already states. Removed, with a cross-reference.

**A direct self-contradiction between two leaves was found and resolved.**
`NOM.number.hidden_n` said stressed final -a restores an -n, `mà`/`mans`,
`germà`/`germans`. `NOM.number.stressed_vowel` said stressed -a and -e "prennent
toujours un simple -s". Both cannot stand, and the -í class sat in both leaves
at once, as `camí`/`camins` in one and `rubí`/`rubins` in the other. The two are
now scoped against each other: **`hidden_n` owns every word that restores the
-n**, whatever the vowel, and **`stressed_vowel` owns the simple-s class**,
`esquí`/`esquís`, `bambú`/`bambús`, `cafè`/`cafès`. The reviewer proposed merging
them into one leaf with the -s class as an exception set; scoping them against
each other was preferred because it keeps two keys for what are, for a learner,
two things to know, and because the -s class is the productive one. That
re-scoping moved `stressed_vowel` from `near-miss` to `transfer`, since a simple
-s after a stressed vowel is exactly what French does. Also corrected: `tribu`
was cited as an example of final stress, and it is stressed on the first
syllable.

**A membership list was three-fifths wrong.** `NOM.gender.diverge_fr` is the
leaf for nouns whose gender differs from the French cognate, and it listed
`el corrent`, `el dubte` and `els afores`, all three of which are masculine in
both languages. The genuine divergences are `la llet`, `la sal`, `la sang`,
`la resta`, `el costum` and `el deute`, and the list is now those.

**In `ART`, the most interference-prone card in the domain was marked
`transfer`.** `ART.def.forma.la_no_elisio` teaches that `la` does not elide
before unstressed i or u, `la universitat`, `la idea`. French elides before any
vowel at all, _l'université_, _l'idée_, so the mechanism does not carry over and
`*l'universitat` is precisely the calque to expect. Moved to `near-miss`, and
the old note's appeal to _la ouate_ and _la yourte_ was dropped: that concerns
semi-consonants, which is `ART.def.forma.el_iod`'s territory, and the Académie
allows _de l'ouate_ anyway.

**`ART.personal.absencia` is no longer `novel`, and the reasoning matters beyond
this leaf.** The project had knowingly kept it `novel` although French and
Catalan agree, so that it would sort beside the five personal-article leaves it
should be reviewed with. The reviewer called this what it is: using a field with
documented semantics as a sort key, which makes it mean two things and defeats
any audit of the status distribution. The tree already groups those six leaves,
so the pedagogic goal was met structurally and the status was doing nothing but
lying. Now `transfer`. **A status is a claim about the language, never a
scheduling hint**; if the gaps list needs a second ordering signal, it needs its
own field.

**Other `ART` corrections.** `ART.def.us.paisos` said French takes the article
"systématiquement", when it drops it after _en_ and for a list of countries.
`ART.personal.la_alternativa` and `.absencia` both said French never puts an
article before a name; _la Callas_, _les Dupont_ and popular _la Marie_ say
otherwise. `ART.def.forma.paradigma` said French lost a plural gender
distinction, when its oblique plural was already _les_ for both genders and what
it lost was case. `ART.indef.plural` said French has no plural indefinite
article of this type, when _des_ is exactly that and obligatory, where the
Catalan `uns`/`unes` is optional and usually dropped: the real interference is
that a French speaker **overproduces** `uns`, which is now what the card
teaches. `ART.def.us.toponims` cited _La Rochelle_ as contracting, and French
contracts only _le_ and _les_. `ART.personal.contraccio` called `d'en` a
contraction when it is the elision of `de`, and illustrated it with an unnatural
`Vaig a l'Anna`. Missing exception classes were added to
`ART.def.forma.elisio` (French _h aspiré_ blocks elision and Catalan `h` never
does, so the risk is failing to elide), `ART.def.us.titols` (the article drops in
direct address) and `ART.def.us.llengues` (it also drops after `aprendre`,
`estudiar` and `saber`).

**The personal-article CEFR levels were inverted for the reference variety.**
`na` sat at A2 and `la Maria` at B1, when Central Catalan, which this project
takes as its reference, uses `la` as the everyday form and treats `na` as formal
or Balearic. Swapped: `la_alternativa` to A2, `na` to B2, with a note on each.

**Two findings were declined with arguments.**

- **`ART.personal.la_alternativa` stays `novel` rather than becoming
  `false-friend`.** The reviewer flagged this as a reasoned recommendation
  rather than a settled fact, and it fails the project's own bar twice over:
  popular _la Marie_ is regional and register-marked rather than available in an
  ordinary speaker's grammar, which is the `gaire` precedent, and a difference
  that is only of register is what got `mon pare` refused `false-friend` during
  the `DET` pass.
- **`NOM.deriv.augment` stays `novel` rather than becoming `near-miss`.** French
  _-asse_ and _-ard_ are productive but **pejorative**, not augmentative, so they
  anchor a nuance the Catalan suffix carries incidentally and not the size value
  that is its point. The reviewer's related observation was taken: the leaf never
  mentioned the `-n-` interfix, so a learner would produce `*homàs` for
  `homenàs`. The charge of inconsistency with `NOM.deriv.dimin` was answered by
  softening that leaf instead, which now records that French _-et_/_-ette_ is
  productive but far more lexicalised than the Catalan suffix.

**Accepted and not yet executed: six structural changes.** These delete or
rename IDs and one of them moves a leaf into `DET`, which has a review of its
own pending. Doing them while that reply is outstanding would mean touching
`DET` twice and risking a conflict, so they are specified here and left for the
pass that follows it. **This is a deferral with a specification, not a
maybe.**

1. **`ART.contract`, seven leaves to two.** `al`, `als`, `del`, `dels`, `pel`,
   `pels` and `no_contraccio_elisio` are six paradigm cells and a rule, in the
   domain that first established that paradigm cells are not leaves. Replace
   with `ART.contract.a_de`, covering `a` and `de` with `el`/`els` and folding
   in the no-contraction-when-elided rule, `transfer`; and `ART.contract.per`,
   `near-miss`. The split follows the statuses, which the single-leaf version
   could not. Add the missing facts: contraction with `ca` (`ca l'Anna`) and on
   the second element of `cap a` and `des de`; and the block before a title
   keeping its own article (`el llibre de El Periódico`).
2. **`ART.salat`, three leaves to one.** Central Catalan is the reference
   variety and dialect facts live in `dialect_note` everywhere else in the
   taxonomy. Collapse to a single leaf carrying the paradigm, the `s'` elision
   and the `so`/`sos` form after `amb`. Correct the geography while doing it:
   the salat article is not only Balearic, it survives at Cadaqués and in
   toponyms across the old Costa Brava.
3. **`ART.def.us.abans_possessiu` moves to `DET`.** The `DET` pass amended the
   boundary so that `ART` owns the article only when it is the sole determiner,
   and this leaf is the article co-occurring with a possessive. It was recorded
   as a legacy misfile and left; the reviewer adds that
   `DET.poss.forma_paradigma` already shows `el meu`, so it is a duplicate as
   well as a misfile. Add the missing exception class on arrival: the article
   drops in `a casa meva`, `en nom meu`, `amic meu`.
4. **`NOM.gender.ista` and `NOM.deriv.ista` are one suffix under two keys**,
   both A2, both `transfer`, both citing `artista`. Keep one, or split them
   explicitly into epicene gender and word formation with no shared example.
5. **`NOM.adj.agree` is a branch with a single leaf.** Either promote
   `agree.coord` or give the branch a second member.
6. **The Catalan quarters system is a real gap.** `un quart de quatre`,
   `dos quarts de quatre` is keyed nowhere in 306 leaves and is genuinely
   `novel` for a French speaker. It is not `ART`'s, since it is not about the
   article; placing it is the open question, and `LEX` is the likeliest home.

**Still unverified.** The DIEC spelling of `portaavions` against `porta-avions`,
which is why that example was replaced rather than corrected; whether
`un pantaló` is standard in the singular; Optimot's preference between
`estem al 2024` and `som al 2024`; and `a en Joan` against the older
`an en Joan`. `NOM.gender.suffix_essa` is owed a note that GIEC accepts both
`la metge` and `la metgessa`, which was not applied only because it needs the
leaf text checked first.

### Outside review of DET and PREP, and what it changed

The fifth outside review, and the last domain pair to have one. Fourteen
field-level changes, no status moved, no leaf added or removed. It used the
requested record format, which made triage roughly three times faster than the
`NOM`/`ART` reply, and it is the first review to report its own coverage gaps
honestly instead of filling them.

**Two more false claims about French, bringing the count to nine across five
reviews.**

- **`DET.quant.juncio_nominal` said French imposes `de` everywhere.** It imposes
  it after adverbial quantifiers, _beaucoup de_, _trop de_, and not after
  determiners, _quelques livres_, _plusieurs livres_, _chaque jour_. The Catalan
  side was right and the contrast was overstated in the learner's favour, which
  is the more dangerous direction.
- **`DET.identitat.mateix_emfatic` said Catalan keeps `mateix` "sans pronom
  repris".** Catalan varies the pronoun exactly as French does, `jo mateix`,
  `ell mateix`, `elles mateixes`. The real difference is that French appends an
  invariable _-même_ while Catalan postposes an adjective that agrees.

**The second confirmed case of two leaves contradicting each other.**
`PREP.marcatge.cd_sense_prep` said the direct object carries no preposition
"même quand il désigne une personne", full stop, while
`PREP.marcatge.a_pronom_tonic` sits three leaves away supplying the
counterexamples: the marked `a` before a tonic pronoun, in reciprocals, before
`tothom`, `tots`, `ningú` and `qui`, and under dislocation. The first case was
`NOM.number.hidden_n` against `NOM.number.stressed_vowel`, found in the previous
review. **Both were found by outside readers and neither is detectable by any
gate this repo has or could cheaply build**, since `check-duplicates` compares
forms and examples rather than claims. Two leaves stating incompatible rules is
now a named failure mode with a count of two.

**One finding was a false positive, and its cause is worth recording because
this repo created it.** The reviewer marked `DET.num.ordinals`'s `dialect_note`
WRONG on the ground that it states the Valencian and Central forms identically.
It does not: it reads "Valencien : cinqué, sisé, contre les formes centrales
cinquè, sisè", and the whole contrast is acute against grave. The reviewer wrote
its entire reply without diacritics, because **the output contract this repo
wrote tells reviewers to ignore typography**, and reading its own stripped text
back made the distinction vanish. The instruction is still right, since
hand-typed narrow no-break spaces corrupt in transit, but it has a cost: **a
finding about accents or apostrophes coming back from a review that strips them
must be checked against the data before it is believed.** Add that to the
contract when it is next used.

**Other corrections applied.** `DET.num.sistema_decimal` presented the vigesimal
system as simply French, when Belgian and Swiss speakers already say _septante_
and _nonante_, for whom the leaf is a plain transfer; that is a dialect anchor
worth recording in a French-base application. `DET.quant.grau.concordanca` put
`bastant` in the number-only class, when the modern standard admits `bastanta`
and `bastantes`. `DET.quant.polaritat.gaire`'s note claimed French "n'a aucune
case pour lui", when _ne... guère_ is precisely that case in the formal
register. `PREP.regim.divergent_amb` presented `parlar amb` as diverging from
French when it covers _parler avec_ as much as _parler à_, and gave `somiar amb`
as the norm when `somiar en` and the transitive use are also admitted.
`PREP.a_en.lloc.en_sense_definit` mixed temporal and figurative uses of `en`
into a leaf about place, and called `viu a una casa gran` a fault when the norm
merely disprefers it. `PREP.per_pera.temps_aproximat` gave _à Noël_ as the only
French model when _pour Noël_ exists and predicts `per Nadal` correctly.
`PREP.a_en.temps.parts_del_dia` generalised French _en_ across the seasons,
which fails for _au printemps_. `PREP.per_pera.finalitat_nominal` lost
`Estudia per a metge`, which is doubtful before a bare profession noun.

**Three findings were declined, each with an argument.**

- **`DET.quant.polaritat.gens` stays `near-miss` rather than becoming
  `false-friend`.** The reviewer's case is the strongest yet made for it: the
  written definition is that a familiar French reading is available and wrong,
  the French noun _gens_ is exactly that, and the leaf's own note tells the
  learner not to read it. What defeats it is new since the `DET` pass:
  **`LEX.fals_amic.noms` now keys the misreading**, with `gens` as a member
  cross-referenced back here. The trap is therefore taught, and `DET` keeps what
  `DET` owns, which is the quantifier's polarity distribution. Two keys, two
  facts, one word. Had `LEX` not existed the answer might have gone the other
  way.
- **`DET.quant.polaritat.gaire` stays `novel`**, but the tension is real and is
  recorded rather than smoothed over. The reviewer is right that _ne... guère_
  is a live negative-polarity item in the formal register, and the
  `NEG.expletiu` precedent says a rule that is alive but gated by register earns
  `near-miss`, not `novel`. Against that: `guère` is a determiner nowhere, and
  the leaf is about a determiner. The note now states the formal-register anchor
  instead of denying it. **This one matters beyond itself**, because the `gaire`
  decision is the precedent that `VERB.subj.imperfet` and the `LEX` empty-column
  argument both lean on. If it is ever revisited, those must be revisited with
  it.
- **`DET.num.ordinals` keeps its dialect note**, per the false positive above.

**Coverage, reported rather than faked.** The reviewer named eighteen `DET`
leaves and sixteen `PREP` leaves it never reached with a targeted search, and
filed no verdict on them rather than an unearned CORRECT. That is exactly what
the output contract asked for and the first time a review has done it. The two
it flagged as priority re-checks are `DET.identitat.altres_nu`, on whether
`altres llibres` truly needs no `de` against French _d'autres livres_, and
`DET.quant.grau.prou_bastant`, on the `prou`/`bastant` split against _assez_.
Both are owed. It also could not close two French questions: _d'autres_ against
_des autres_, and whether _en prison_ against _dans la prison_ is a fair
characterisation of the determiner conditioning.

**No structural finding, and that is itself a result.** The reviewer looked for
paradigm-cell leaves and branch axes that do not work, and reported none in
either domain. `DET` had already been re-axed once during its own pass, when
`DET.indef` was dissolved as a residue bucket, and `PREP.regim` had been re-axed
from the Catalan preposition to convergence against French. Both hold up. The
contrast with `ART`, seeded in the same early period and carrying seven
contraction leaves, suggests the difference is not when a domain was seeded but
whether anything forced its axis to be argued at the time.

### The structural pass, and what it settled

The six structural changes accepted from the `NOM`/`ART` review, executed
together once the `DET`/`PREP` reply had landed. The taxonomy goes from 306
leaves and 91 branches to **300 leaves and 89 branches**: eleven leaves and two
branches removed, five leaves added, one leaf migrated between domains, one
renamed. Nothing outside the fragments referenced any of the deleted IDs except
the generated `src/api/schema.ts`, which regenerates.

**`ART.contract`, eight leaves to three.** The review counted seven; there was
also `ART.contract.cap_al`, which it never saw named in its own question. The
old set was `al`, `als`, `del`, `dels`, `pel`, `pels`, the
no-contraction-when-elided rule, and the compound-preposition case: six
inflectional cells and two rules, in the very domain that first established that
paradigm cells are not leaves. It is now:

- **`ART.contract.a_de`**, `transfer`, covering `a` and `de` with `el` and
  `els`, with the elided-article block folded in as the exception it always was.
  Gains two facts the old set never carried: the block before a title keeping
  its own article, `el llibre de El Periódico`, and the parallel contraction of
  `ca`, giving `cal metge` and `can Joan`.
- **`ART.contract.per`**, `near-miss`, because French fuses only _à_ and _de_
  with the article and never _par_.
- **`ART.contract.cap_al`**, `near-miss`, kept rather than folded in. The review
  proposed putting the compound-preposition facts inside the `a_de` leaf; that
  would have put a `near-miss` fact inside a `transfer` leaf, which is the
  status-homogeneity problem the two-leaf split exists to avoid. Broadened
  instead to state the rule for `cap a`, `des de` and `fins a` together.

**The split follows the statuses, and that is the point.** A single
all-contractions leaf would have had to carry `transfer` and `near-miss` at
once. Three leaves on the axis "which preposition, and is it simple or
compound" is a natural class in Catalan and predicts the status distribution,
which is both limbs of the axis rule satisfied.

**`ART.salat`, three leaves to one.** Three `C1` leaves for a dialect article,
in a project whose reference variety is Central Catalan and which files dialect
facts in a `dialect_note` everywhere else, was over-weighting. The branch is
gone and `ART.salat` is now a single root-level leaf carrying the whole
paradigm, the `s'` elision and the Majorcan `so`/`sos` after `amb`. The
geography was wrong and is corrected: the review supplied, and this pass
accepted, that the salat article is not simply Balearic but survives at Cadaqués
and in toponyms such as Sant Joan Despí and Sant Esteve Sesrovires.

**`ART.def.us.abans_possessiu` is now `DET.poss.article_obligatori`.** The `DET`
pass had amended the boundary so that `ART` owns the article only when it is the
sole determiner; this leaf is the article co-occurring with a possessive, and it
had been recorded as a legacy misfile and left alone. **The migration turned up
something the review did not predict.** It proposed adding the exception class
on arrival, the article dropping in `a casa meva` and `en nom meu`. That class
is already `DET.poss.nu_lexical`, which owns exactly those forms, and which
carried a cross-reference pointing back at the old `ART` id. So the migrated
leaf cross-references it rather than restating it, and the stale pointer is
fixed in the same move. **Migrating a misfiled leaf is also the moment its
duplicates become visible**, because the leaf lands next to them.

**`NOM.gender.ista` and `NOM.deriv.ista` were kept, against the review's first
option.** It offered "keep at most one, or split them explicitly with no shared
example". They are two facts: that `-ista` nouns are epicene and marked by the
article, and that `-ista` derives an agent noun from a base. The examples never
collided; the only overlap was the token `art/artista` sitting in the derivation
leaf's notes. Removed, and each leaf now names the other. That is the same
resolution `PRON` used when it made a `ca` field precise rather than allowlist a
collision, and it is preferred to deletion whenever the two facts are real.

**`NOM.adj.agree` was a branch with one leaf, and is gone.**
`NOM.adj.agree.coord` is now `NOM.adj.coord` directly under `NOM.adj`. A branch
that never acquired a sibling is a claim about a subdivision that does not
exist.

**The Catalan quarters system is keyed, as `LEX.hores_quarts`, `novel`.**
`un quart de quatre` is 3.15 and `dos quarts de quatre` is 3.30, the quarters
counting **towards** the hour to come. It was keyed nowhere in 306 leaves, and
it is the sharpest kind of gap: every word is transparent to a French speaker
and the natural reading is wrong by a whole hour. Placement was the open
question. Not `ART`, because it is not about the article; not `DET.num`, because
`DET` owns determiners rather than reckoning systems. `LEX` takes it on the
ground that has defined that domain from the start, that it holds what the other
eleven decline, and the leaf cross-references `ART.def.us.hores` for the article
itself. A `dialect_note` records that Valencian counts from the hour elapsed,
like French.

**Two wording slips were caught in the browser review of the new prose**, which
is the fourth consecutive pass in which reading the rendered cards has found
something no gate could: a doubled preposition in `ART.contract.a_de`'s contrast
note, and a strawman in `ART.contract.per` warning against `*pel'amistat`, a
form no learner would produce.

**This closes the structural work, and the window it depended on.** Renaming and
deleting component IDs is free today because nothing persists them; after phase
5 the same six changes would be a data migration against a live query log. That
was the argument for doing them now rather than later, and it no longer applies
to anything outstanding.
