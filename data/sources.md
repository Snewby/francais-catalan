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
