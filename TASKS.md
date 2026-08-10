# Build status

One line per phase. Phases are defined in
`docs/02-claude-code-build-guide.md` section 3; this file records only which of
them are done and what closed them.

**Update this file in the same commit as the work.** A status file that drifts
is worse than none, because it still reads as authoritative.

| Phase                                 | Status      | Prompt   | Closed by                       |
| ------------------------------------- | ----------- | -------- | ------------------------------- |
| 0. Scaffold                           | done        | DONE     | `c8a3e14`, `f6d0a21`, `1c4cc7d` |
| Interaction-model amendment           | done        | n/a      | `d7738c5`                       |
| 1. Taxonomy schema, closed vocabulary | done        | VERBATIM | `7bcb37a`, `bb7ae90`            |
| 2a. Structural seeding, per domain    | done        | ADAPT    | all twelve, see table below     |
| 2b. Gloss and contrast authoring      | done        | ADAPT    | all twelve, see table below     |
| 3. Generated schema enums             | done        | VERBATIM | `7bcb37a`, early with phase 1   |
| Taxonomy browser (read-only)          | done        | VERBATIM | this pass                       |
| 4. API client and prompt caching      | done        | ADAPT    | this pass                       |
| 5. Persistence, FSRS, Elo             | done        | ADAPT    | this pass                       |
| 5b. Review loop                       | done        | ADAPT    | this pass                       |
| 6. UI and coverage heatmap            | not started | ADAPT    |                                 |
| 6b. Pronunciation                     | not started | ADAPT    |                                 |
| 7. GitHub Pages deploy                | done        | DONE     | `1c4cc7d`, `59a88c5`            |

**Prompt** says how to use that phase's prompt in
`docs/02-claude-code-build-guide.md` section 3. `VERBATIM` means every fact in
it has been checked against the repo and it can be pasted as-is. `ADAPT` means
it depends on outputs that do not exist yet, so read the repo first. The labels
are only true as long as someone keeps them true; treat a `VERBATIM` prompt that
mentions a file you cannot find as a bug in this table.

## Seeding, per domain

Phases 2a and 2b are tracked here rather than in the table above, because one
row cannot say "four of twelve". **The unit of work is the domain, not the
phase.** 2a and 2b run back to back on one domain and land in one commit; see
`docs/02` section 3 for why a structure-only fragment cannot be committed at
all. `/clear` between domains, not between the two passes on one domain.

`seed only` means the domain has nodes but not coverage: the phase 1 seed
authored a handful of leaves to have something real to build the machinery
against, and a proper 2a pass over that domain is still owed.

| Domain | Fragment                  | Structure | Glosses | Closed by |
| ------ | ------------------------- | --------- | ------- | --------- |
| `PHON` | `data/phon.fragment.json` | done      | done    | this pass |
| `NOM`  | `data/nom.fragment.json`  | done      | done    | this pass |
| `ART`  | `data/art.fragment.json`  | done      | done    | this pass |
| `VERB` | `data/verb.fragment.json` | done      | done    | this pass |
| `PRON` | `data/pron.fragment.json` | done      | done    | this pass |
| `DET`  | `data/det.fragment.json`  | done      | done    | this pass |
| `PREP` | `data/prep.fragment.json` | done      | done    | this pass |
| `ADV`  | `data/adv.fragment.json`  | done      | done    | this pass |
| `CONJ` | `data/conj.fragment.json` | done      | done    | this pass |
| `NEG`  | `data/neg.fragment.json`  | done      | done    | this pass |
| `SYN`  | `data/syn.fragment.json`  | done      | done    | this pass |
| `LEX`  | `data/lex.fragment.json`  | done      | done    | this pass |

**Seeding is complete, every domain has been reviewed, and the structural work
is done.** All twelve are seeded, at 300 leaves and 89 branches after the
structural pass, and five outside reviews have covered
`CONJ`/`ADV`/`SYN`, `VERB`/`PRON` and `LEX`/`PHON`. The four domains seeded
earliest, `NOM`, `ART`, `DET` and `PREP`, have had internal review only and are
the obvious candidates if a fourth review is ever run. What is still owed
against a printed source is listed under "Carried over".

The domain order above is the closed domain list, which is also the order
`gen-schema` merges fragments in. It is not a recommended seeding order.

## Where things stand

Phase 0 delivered the toolchain, the `.claude/` agentic scaffolding, and an app
shell that builds, tests and renders. The interaction-model amendment then
replaced the single-call-shape design with intent-typed calls and split exposure
from mastery, before any of it was built against.

Phase 1 landed the load-bearing pieces: `taxonomy.schema.json` as the single
source of truth for node shape, the keyed gloss map, `contrast_fr`, the
exposure/mastery split as two separate objects in every leaf's `state`, and a
logged-query schema that accepts all five intents. A hand-authored 10-leaf seed
covers `VERB` and `PRON`, `scripts/gen-schema.ts` generates `src/api/schema.ts`
from it, and `validate-ids` and `check-glosses` are real checks rather than
stubs. Phase 3 closed with it, because the logged-query schema needed the
generated component enum to exist.

The taxonomy build then moved to per-domain fragments, which is what the
`catalan-taxonomy` skill and `.claude/rules/code-style.md` already assumed.
`data/*.fragment.json` is the only editable source; `npm run gen-schema` merges
them into `taxonomy.json` in closed-domain-list order and then regenerates
`src/api/schema.ts`. Both outputs carry a do-not-edit banner and a drift test,
and `taxonomy-guard` blocks hand-edits to `taxonomy.json` at write time. The
block matters because the `Stop` hook that runs the tests does not fire for a
subagent's turn, so during seeding a write-time refusal is the only feedback a
seeding agent gets before its work is overwritten.

Phase 7 then closed. Every CI and Pages run before `59a88c5` had failed, because
`@types/node` was never a declared dependency and TypeScript had been resolving
node builtins from a `node_modules` above the repo on the author's machine. The
site is live at https://snewby.github.io/francais-catalan/ on the default
`github.io` domain, with no custom domain configured. If one is ever added, the
site moves to the domain root and `base` in `vite.config.ts` has to become `/`.

Seeding then started with `NOM`, 30 leaves under 7 branches covering gender,
number, adjective agreement, derivation and compounding. Two phase 1 tests had
to be generalised to let it land: `closed-vocabulary` asserted exactly `PRON`
and `VERB` and exactly ten leaves, and `build-taxonomy` fed the merged
taxonomy's first node to a fragment claiming domain `NOM`, which only mismatched
while `NOM` was unseeded. Both were snapshots of the phase 1 seed rather than
invariants, so both would have broken on whichever domain was seeded first.
Expect no further breakage of this kind; the remaining assertions are shape, not
census.

`NOM` came out 13 transfer, 15 near-miss, 1 novel and 1 false-friend. That skew
is real rather than a lazy pass: Catalan nominal morphology genuinely transfers
from French, which is the whole reason `docs/01` argues a French speaker starts
ahead. The practical consequence is that `NOM` will sort low in the phase 6 gaps
list, and that is correct behaviour, not a bug to be tuned away.

`ART` followed, 36 leaves under 8 branches, and it is the first domain seeded
with the corrected `taxonomy-seeder`: 2a authored a British-English marker per
leaf rather than plausible French, so 2b had nothing it could mistake for an
authored gloss and wrote all 36 from scratch.

Two structural decisions in it are worth knowing before the next domain, because
both are about what a leaf is for:

- **Paradigm cells are not leaves.** 2a first emitted `ART.def.el`, `.la`,
  `.els` and `.les`, plus `ART.indef.un/.una/.uns/.unes`. Eight inflectional
  cells of two transfer-level rules is eight permanent keys that always co-move
  under FSRS and eight heatmap squares that one lookup of `el gat` turns green
  at once. They were collapsed to three leaves before glossing, which matches
  what `NOM` already does: its leaves are rules and classes, never cells. The
  contraction branch keeps all six cells deliberately, because `a l'home`
  against `als homes` is a real split.
- **`ART.def` is split into `forma` and `us`.** For a French speaker the forms
  are free and the usage is the entire difficulty (`el meu llibre`,
  `el senyor Puig`, `compro pa`). Flat, the easy half outnumbers the hard half
  and the domain averages out green. Split, the heatmap can say the true thing.

The five docs/01 statuses were treated as fixed, but they predate this tree, so
they bind the leaves that realise each row rather than propagating like a
`contrast-overrides` wildcard. Forcing `ART.def`'s `transfer` onto every
`ART.def.us` leaf would have labelled the domain's sharpest divergences as
free transfer. Two inherited assignments were challenged on review. `ART.contract.pel`/`pels`,
since merged into `ART.contract.per`,
moved to near-miss: French fuses only `à` and `de` with the article, so the
contraction habit is lexical rather than general and `per el carrer` is the
error to expect, which is exactly what near-miss is for. The docs/01 row itself
cites only au, du, aux and des, so this is the same binding rule applied again,
not an exception to it. `ART.personal.absencia` stayed `novel` despite being the
one case where French and Catalan agree, because the status feeds scheduling
rather than description: nobody learns when to omit the personal article except
while learning the personal article, and `transfer` would sink it away from the
five siblings it should be reviewed beside.

`ART` came out 14 transfer, 13 near-miss, 9 novel and no false-friend. The empty
false-friend column is expected: nothing in the article system looks French and
means something else.

`PREP` followed, 39 leaves under 10 branches, and it is the first domain whose
2a output was revised against an outside review before 2b ran. Four things in
it are worth carrying forward:

- **A branch axis can make a status field unable to be true.** 2a organised
  verb government as `verb_a`, `verb_de`, `verb_en` and `verb_amb`, by the
  Catalan preposition. On inspection the first two were entirely convergent
  with French and the last two entirely divergent, so no single `contrast_fr`
  could be true of any of those leaves. Re-axed to `convergent` plus
  `divergent_en`, `divergent_amb` and `divergent_de`. Check a new branch this
  way before glossing: if its members cannot share a status, the axis is
  wrong, and 2b will paper over it with an average.
- **Two branches exist that docs/01 does not name.** `PREP.formes_no_finites`
  and `PREP.marcatge` hold, respectively, the prepositions before an
  infinitive or gerund and the presence or absence of a preposition on an
  argument. Both are where French interference is worst and neither is
  reachable from a tree organised by the Catalan preposition inventory. A
  docs/01 section is a floor for a domain, not a plan for it.
- **Declarative knowledge about a norm is not a card.** 2a had a `variants`
  leaf for the three GIEC-sanctioned per/per a systems. It is knowledge about
  register rather than a production skill, and it would have co-moved with
  its neighbours regardless. It became a `dialect_note` on the two
  `finalitat` leaves, which is the schema field that exists for it.
- **Preposition plus relative was ruled out of the domain, not forgotten.**
  `de que`, `amb qui` and the absent `dont` are the relative-pronoun system.
  The decision is recorded in `data/sources.md` so `PRON` picks it up rather
  than a second permanent key being minted here.

`PREP` came out 13 transfer, 26 near-miss, and no false-friend or novel at all.
Both empty columns are claims rather than gaps. Nothing in the Catalan
preposition system is anchorless, since French has every one of these
prepositions and uses them for roughly these jobs, so `novel` is genuinely
unavailable; and nothing here inverts meaning the way `vaig cantar` does. The
nearest false-friend candidate is `acabar de`, where a French speaker reads
"finir de" and the sentence means "venir de", but that is a verbal periphrasis
rather than preposition government, so it was ruled out to `VERB` and is now
`VERB.perifrasi.acabar_de`, a `false-friend`; the `notes` on
`PREP.formes_no_finites.inf_regit_de` points at it by ID. The two thirds near-miss share is the domain working as
briefed rather than a lazy pass: two Romance languages with the same
preposition inventory and different mappings is what `near-miss` names, and
`PREP` will consequently sort at the top of the phase 6 gaps list, which is
correct behaviour and not a bug to tune away.

`DET` followed, 31 leaves under 10 branches, and it is the first domain whose
2a output was revised against an outside review before 2b ran, and the first
where a docs/01 status was overturned rather than merely bound narrowly. Four
things in it change how later domains should be seeded:

- **The axis test as PREP stated it was wrong, and the corrected version is
  now the rule.** "A branch axis is wrong if its leaves cannot share a status"
  is not what failed in `PREP.regim`; there the axis was orthogonal to what
  predicted difficulty. Re-axeing until statuses are homogeneous makes the
  tree a restatement of `contrast_fr`, so the heatmap shows French distance
  twice and grammatical coverage never. Worse, it makes a permanent key depend
  on a revisable judgement field. The rule is now: **an axis must be a natural
  class in Catalan, and must predict something about the status
  distribution.** A branch that is a coin flip on status is suspect; one that
  is a coin flip and not a natural class is dead. `DET.indef` was the latter,
  a residue bucket holding an existential, an alterity item, an identity item,
  a free-choice item and two approximatives, and it was re-axed into
  `DET.quant.polaritat` and `DET.identitat`.
- **A domain boundary you cross three times in your own tree is wrong.** DET
  opened with "ART owns whether the article is present; DET owns the
  determiner", and then `poss.nu_lexical`, `poss.inalienable` and
  `universal.tot` all crossed it in the same pass. In Catalan the article is
  itself a determiner, so a line drawn at article presence keeps splitting
  single rules. Amended to: **ART owns the article when it is the sole
  determiner; DET owns any structure where the article co-occurs with,
  alternates with, or is suppressed by another determiner.**
  `ART.def.us.abans_possessiu` was a legacy misfile under the amended line, and
  the structural pass has since migrated it to `DET.poss.article_obligatori`. It
  is committed and is not being migrated; it is recorded as such in
  `data/sources.md` so the next reader finds the decision and not an
  inconsistency.
- **Rule out a construction, not the member of it you happened to think of.**
  PREP routed preposition-plus-relative to `PRON`. That covers `el que vaig
veure` and leaves `el de Barcelona`, `el vermell`, `els dos` and `el meu`
  homeless, though all five are one construction: article plus a non-nominal
  remnant. The ruling is now widened to the whole nominal-ellipsis family.
- **A closed domain has to be closed.** DET was seeded to 32 leaves with no
  interrogative determiner in it at all, because docs/01 does not name one and
  the pass was weighted towards divergences. `quin` is A1 and near-universal.
  Weighting a pass towards interference is right, but coverage of the domain's
  own inventory is a separate check and has to be run separately.

`DET` came out 5 transfer, 25 near-miss, 2 novel and no false-friend. Both
rejected false-friend candidates and the reasoning are in `data/sources.md`;
the short version is that `gens` resembles a French noun rather than a French
structure, and `mon pare` does mean mon père, so neither fits the definition
without widening it.

`NEG` followed, 15 leaves under 4 branches, and it is the first domain whose 2a
output was revised against an outside reference grammar rather than against
review alone. Two rounds of external review against GIEC chapter 35 and GEIEC
chapter 32 ran between 2a and 2b. Five things in it change how the remaining
domains should be seeded:

- **A coverage check run in the target language cannot find a gap that has no
  target-language marker in it.** 2a enumerated the Catalan negation system,
  found nothing missing, and had in fact missed `ja no` (`ne...plus`),
  `encara no` (`pas encore`) and `no ... més que` (`ne...que`). None of them
  contains a negator, so no enumeration of Catalan negators would ever surface
  them: they are an adverb plus the ordinary `no`. **The coverage check has to
  be run twice, once from the Catalan inventory and once from a French-to-
  Catalan mapping**, and the second sweep is the one that finds multi-word and
  particle-plus-adverb constructions. `DET`'s missing interrogative was the
  same failure caught one domain earlier and diagnosed only as "run coverage
  separately from the interference weighting"; that diagnosis was too weak,
  because it does not say which direction to run it in.
- **Where the reference grammar files a phenomenon is evidence about which
  domain owns it.** Constituent negation was seeded, then dropped to `SYN` as
  a scope fact, then reinstated when the review reported GIEC has it as
  §35.2.2 inside the negation chapter. The same evidence settled the opposite
  way for the negative imperative, which GIEC treats at §34.4 under imperative
  clauses and only mentions in passing in chapter 35, so it stays `VERB`'s.
  Both had been argued from first principles first, and in one case first
  principles got it wrong.
- **A source document in this repo can be out of date, and the fix is to
  record the disagreement, not to overwrite it.** `docs/01` says `pas` "only
  reinforces a simple _no_, not an already-double negation". GIEC §35.4.2.2
  supersedes that and licenses `pas` with negative quantifiers and with
  constituent negation. The card teaches GIEC; the docs/01 claim is left
  standing in `data/sources.md` beside what supersedes it, because other
  passes treat `docs/01` as authoritative and a silent edit would read as
  drift. Expect more of these as later domains meet the grammar.
- **An inferred fact must carry its evidence grade into the repo.** GIEC §35.5
  is "La negació anticipada i la doble negació", and its neg-raising half is
  the only phenomenon in chapter 35 that had no key, now `NEG.anticipada`. The
  title is well corroborated, the phenomenon confirmed from GEIEC §20.4, but
  the section's own wording and canonical example were never retrieved,
  because giec.iec.cat is JavaScript-rendered. `data/sources.md` records that
  three-tier grading explicitly. Without it the inference hardens into a fact
  the moment somebody restates it.
- **The CEFR column is our hypothesis, not sourced data.** The published
  Catalan L2 syllabi (Institut Ramon Llull, Generalitat) are organised by
  communicative function and pin only basic `no` and `tampoc` to A1-A2.
  Every other level in this domain is a judgement. Recorded in
  `data/sources.md`, because a field that looks sourced will be trusted later.

Six of the fifteen leaves sit flat at root level, which is unusual against the
other seeded domains and would normally read as a tree nobody finished. Each
traces to a distinct GIEC subsection: §35.2.2, §35.2.3, §35.5, §35.6, the
restrictive frame, and non-finite negation. Catalan negation is a small concord
core plus a scatter of independent constructions, and the flat shape is that
fact rather than an unfinished branch pass.

`NEG` came out 10 near-miss, 3 transfer, 1 false-friend and 1 novel. It is the
first domain outside the phase 1 seed to have a false-friend at all:
`NEG.aspecte.ja_no`, where `ja` is a cognate of « déjà » so `ja no ho faig`
invites the reading « je ne le fais déjà pas » for what means « je ne le fais
plus ». Two transfer assignments were challenged on review and both moved to
near-miss. `NEG.restrictiva` moved because a shared function with « ne...que »
is exactly what produces the calque `*no ... que`, which is not Catalan.
`NEG.expletiu` moved because `transfer` collided with the `gaire` precedent in
`DET`: a form absent from a contemporary speaker's productive grammar is not an
anchor. It stopped at near-miss rather than following `gaire` to novel, because
expletive `ne` is obligatory in French comparatives (GBU §24.5) and so is a
live rule gated by register rather than a fossil. That distinction is the
useful part of the precedent and is recorded in `data/sources.md`.

`CONJ` followed, 32 leaves under 11 branches, and it is the first domain whose
2a and 2b passes both ran without an outside review to lean on: `giec.iec.cat`
and `geiec.iec.cat` are JavaScript-rendered and returned nothing fetchable, so
no section of either was read. The consequence is recorded in `data/sources.md`
as an evidence grade, and no GIEC section number appears anywhere in the
domain's French prose. Four things in it change how the remaining domains
should be seeded:

- **A duplicate key survived every test and was caught by eye in the browser.**
  2b authored `CONJ.completiva.caiguda_preposicio` for the drop of a governed
  preposition before a completive `que`. That is `PREP.regim.caiguda_davant_que`,
  committed two domains earlier, same Catalan form, same rule, overlapping
  example. `validate-ids` checks that IDs resolve and `check-glosses` checks
  that leaves are glossed; two leaves teaching one rule under two keys satisfy
  both, and always will. The `CONJ` leaf was deleted and the completive leaf now
  cross-references `PREP`. **The seeding checklist is missing a duplicate-content
  sweep against the already-seeded domains**, and the cost of not having one
  rises with every domain that lands. Until it exists, the browser review is
  not optional.
- **A domain can be "mostly transfer" in a source and not in the tree, without
  either being wrong.** docs/01 line 171 calls this domain mostly `transfer`,
  and that is defensible for the six conjunctions it actually lists. It stops
  being true on a proper enumeration, because what diverges in Catalan
  subordination is mood selection, and mood selection is invisible at the
  granularity of a conjunction inventory. Left standing in docs/01 with the
  disagreement recorded beside it, on the `pas` precedent.
- **Mood selection needed a boundary before three leaves could be written.**
  `CONJ` owns which mood a subordinator selects, because that is a lexical
  property of the conjunction; `VERB` owns how the mood is formed; `SYN` owns
  tense sequencing across clauses, including the conditional period that docs/01
  assigns to `SYN.conditional`. Without the line drawn, `CONJ.condicional.si`
  would have been a green leaf whose only hard fact had been exported to an
  unseeded domain.
- **The French-to-Catalan sweep produced four leaves and is now proven twice.**
  `si no` (from _sinon_), `llevat que`/`tret que` (from _à moins que_), `com si`
  and `sense que` are all unreachable from an enumeration of Catalan
  conjunctions. `NEG` learnt this rule from multi-word negation; it generalises,
  and the second sweep should now be treated as part of the definition of 2a
  rather than as a lesson from one domain.

`CONJ` came out 10 transfer, 21 near-miss, 1 false-friend and no novel. The
empty `novel` column is the same claim `PREP` made and rests on the same fact:
French has every category in this tree, so nothing here is anchorless. The
single false-friend is `CONJ.coord.adversativa.si_no`, where French _sinon_
corresponds to Catalan `si no` while the form it resembles, `sinó`, means
« mais ». Two transfer assignments were challenged and both moved to near-miss,
the same count and direction as `NEG`: `CONJ.condicional.si`, because the
irrealis protasis takes the imperfect subjunctive where French takes the
indicative imperfect, and `CONJ.manera.com`, because an undetermined manner
takes the subjunctive where French does not.

`ADV` followed, 24 leaves under 8 branches, and it is the first open class
seeded. Four things in it change how the remaining domains should be seeded:

- **An open class changes what coverage means.** Every domain before this one
  had a finite inventory, so "is the domain closed" was a checkable question and
  `DET` was corrected once for failing it. `-ment` derives an adverb from almost
  any adjective, so the question cannot be asked here. This tree covers the
  systems, formation, deixis, degree, focus, modality and placement, not the
  word list, and an individual adverb earns a leaf only where it carries a rule.
  Do not read the leaf count as an unfinished domain. `LEX` will have the same
  problem in a worse form.
- **The domain boundary is drawn by syntactic behaviour, not by word.** `ADV`
  shares vocabulary with `PREP`, `CONJ` and `DET` more than any earlier domain
  shares with anything, so: **a word is `ADV`'s in its bare adverbial use,
  `PREP` owns it when it governs a complement, and `CONJ` owns it when it
  introduces a clause.** `abans` and `després` split three ways under that rule
  and all three parts were already keyed. Stated once in `data/sources.md` and
  cross-referenced from the leaves.
- **A second duplicate was caught, and that makes it a process failure rather
  than two mistakes.** `CONJ` lost a leaf to `PREP.regim.caiguda_davant_que`;
  `ADV.lloc.amb_complement` was the same rule as
  `PREP.toniques.locucions_amb_de`, one example identical word for word. This
  time the check ran between 2a and 2b rather than after glossing, which is
  where it belongs. 2a reasons from the target language and structurally cannot
  see what an earlier domain has already keyed, so **the sweep is not optional
  and should stop being ad hoc**.
- **Reading the neighbouring domain's committed leaves first is what prevented
  four more.** Catalan degree words are determiners before a noun and adverbs
  before an adjective, so the naive split would have given `ADV` a leaf for
  `gaire`, `prou`, `bastant`, `massa` and `quant`. `DET` already owns all five,
  and `DET.quant.grau.prou_bastant` had already taken the adverbial use
  explicitly with `fa bastant fred`. `molt` is the one exception, because
  `DET`'s three leaves cover agreement and noun junction and none of them states
  the `très`/`beaucoup` merge that actually catches a French speaker.

`ADV` came out 4 transfer and 20 near-miss, with no false-friend and no novel.
Both empty columns are claims and both are argued in `data/sources.md`; the
short version is that French has every adverbial category, and that the Catalan
adverbs met early are either cognate and concordant or wholly opaque, and an
opaque form cannot mislead. `ADV.manera.ment` is the strongest transfer call in
the taxonomy so far, because Catalan is more regular than French here and a
French speaker over-generalising the rule gets Catalan right.

`SYN` followed, 18 leaves under 8 branches, and it is the first domain seeded
with `check-duplicates` available. Four things in it are worth carrying forward:

- **A domain can be defined by subtraction, and this one is.** Six domains were
  seeded before it and each took something a naive reading of "syntax" would
  have put here: `CONJ` the subordinators and their mood, `ADV` adverb
  placement, `NEG` constituent negation, `PRON` pro-drop. `SYN` is smaller and
  sharper for it, and the leaves it keeps are genuinely clause-level. Expect the
  same for `LEX`, which is last and will be defined almost entirely by what the
  other eleven declined.
- **A note that justifies a placement by the absence of a domain has a shelf
  life, and the first one just expired.** `ADV.collocacio` said it sat in `ADV`
  "faute d'un domaine SYN semé". Seeding `SYN` makes that false however the
  question is decided. The leaf stays in `ADV`, and its note now states the
  boundary positively instead of citing a gap. **Two more of that shape are
  outstanding** and will expire when `VERB` and `PRON` are seeded.
- **A status has to be true of what the leaf makes the learner produce, not
  only of the rule named in its gloss.**
  `SYN.subordinacio.periode_condicional` was argued down from `transfer` to
  `near-miss` on exactly that: the tense pairing transfers cleanly, but the leaf
  is the whole conditional period, and producing one means producing a protasis
  where Catalan takes the imperfect subjunctive against the French indicative.
- **`check-duplicates` earned its place on its first live pass, and not in the
  way it was designed to.** It was built for collisions with domains seeded
  passes earlier. Its first catch was a within-branch, within-session error:
  splitting the interrogative particle into its own leaf left
  `SYN.interrogativa.total` still claiming `que vols venir?` as its Catalan
  form. Run it after any restructuring, not only at the 2a/2b boundary.

`SYN` came out 2 transfer, 15 near-miss, 1 false-friend and no novel. Two
transfer is the lowest share of any domain, and the reason is structural: the
two languages have nearly every clause construction in common and differ in
register, frequency or mood, which is what `near-miss` names. The dislocations
are the clearest case, since `Le livre, je l'ai lu` is perfectly good French and
what differs is that Catalan treats it as neutral order. The false-friend is
`SYN.interrogativa.particula_que`, where a French speaker meets initial `que` as
a completive or exclamative, Catalan has the exclamative use too, and so the
familiar reading is available and wrong.

`CONJ`, `ADV` and `SYN` were then reviewed together against an outside chat with
web research, because all three had been seeded with no grammar text retrieved
at all. It reached GIEC and GEIEC indirectly, through search snippets and
verbatim secondary quotation, and marked which of its own claims were sourced
that way. **No rendered GIEC or GEIEC page was reached by either side**, so the
evidence position moved from unsourced to indirectly sourced, not to verified,
and no section number has been written into the data even now. Four things it
changed are worth carrying into the remaining passes:

- **It found the first outright wrong rule in the taxonomy.**
  `ADV.modalitat.dubte` taught `potser` with the subjunctive and claimed the
  subjunctive marked stronger doubt. The norm puts these adverbs with the
  indicative, and the subjunctive belongs to the separate `potser que`
  construction. Everything earlier reviews caught was a wrong status, a
  misplaced key or a duplicate; this was a card that would have taught a learner
  to produce something the standard rejects. **Statuses and boundaries are what
  self-review catches; whether the rule itself is right needs a source.**
- **Two more leaves stated the secondary option as the rule.**
  `ADV.manera.coordinacio_ment` was built on dropping the `-ment` of the first
  coordinated adverb, which the norm treats as the more literary choice rather
  than the rule, and `CONJ.condicional.exceptiva` said the standard rejects
  `a menys que`, which it accepts and merely disprefers. Both came from
  reasoning about what a French speaker would get wrong rather than from what
  the norm says, which is a bias worth watching in the remaining domains.
- **Scoping a review to part of the taxonomy produces false positives.** The
  review reported `gaire` missing from `ADV` and proposed it as a strong `novel`
  candidate. It is `DET.quant.polaritat.gaire`, and `ADV` declined to mint a
  second key for it deliberately. **Send the full leaf list next time even when
  only part is under review.**
- **Three `transfer` calls were downgraded** (`CONJ.temporal.abans_despres`,
  `CONJ.consecutiva`, `ADV.grau.mes_menys`), which is the fourth consecutive
  pass where challenging `transfer` moved something. No downgraded status has
  ever been reinstated. Treat `transfer` as the status that needs an argument.

Four of its findings were declined, each argued in `data/sources.md`: `gaire`
above; `SYN.veu.impersonal` stays `near-miss` because French has impersonal `se`
constructions and so an analogue exists; and three proposed `false-friend`
upgrades, two of which fail specifically because the base language is French
rather than English, since French `jamais` in a question already means "ever".

`PRON` followed, 24 leaves under 6 branches, and it is the first pass over a
domain that was already `seed only` rather than unseeded. Four things in it
change how the remaining passes should be run:

- **A seed-only merge must be verified against `HEAD`, not against the pass's
  own report.** 2a reported the four phase 1 leaves preserved byte for byte.
  They were not: all 16 narrow no-break spaces in the file had been silently
  degraded to ordinary spaces, which is exactly the hazard `CLAUDE.md` names,
  and nothing caught it except `gloss-completeness.test.ts` refusing the turn.
  The nodes were restored with `git show HEAD:` rather than repaired by a
  regex, because a regex is how this file got doubled spaces once before. Diff
  the preserved nodes field by field before believing any merge pass. `VERB` is
  the last domain where this can happen.
- **A coverage sweep run in both directions still missed a paradigm gap.**
  `vostè` and `vós` were keyed nowhere in the entire taxonomy, across eleven
  seeded domains. French _vous_ maps onto a form commanding a third-person verb,
  and French has no construction where politeness changes grammatical person, so
  this is a first-rank interference fact and not vocabulary. It was found by
  reading the tree, not by either sweep. The sweeps are good at finding
  constructions and bad at finding holes in a paradigm; run one pass over the
  paradigm itself.
- **The domain came out with no `transfer` at all, and that was accepted
  knowingly.** 0 transfer, 20 near-miss, 2 false-friend, 1 novel.
  `PRON.feble.persona_reflexiu` was the candidate and stays `near-miss` because
  French _nous_ and _vous_ double as tonic forms while `ens` and `us` are
  strictly atonic. An empty column is a claim, and this one says every part of
  the Catalan pronoun system a French speaker meets has a French analogue whose
  boundary has moved. Argued in `data/sources.md`.
- **A `false-friend` was downgraded, which is the mirror of the `transfer`
  discipline and had not come up before.** `PRON.fort.tractament` was authored
  `false-friend` and moved to `near-miss`: no Catalan form is misread, since
  `vostè` resembles nothing French, and the error is carried agreement rather
  than a wrong reading. That follows the precedent set when `gens` and `com que`
  were both refused `false-friend`. Five consecutive passes have now moved a
  status on challenge, and this is the first time one moved in this direction.

Two contrast notes stated a rule another domain owns, one of them contradicting
its own parenthetical example, and two Catalan examples were wrong: an
ungrammatical `de qui et fio` for `de qui em fio`, and a `tot el món` example
that was the exact calque its own leaf exists to block. All four were caught by
reading the authored prose, not by any check.

`VERB` followed, 32 leaves under 11 branches, and it is the largest domain in
the taxonomy and the second merge into a domain that was already `seed only`.
Five things in it change how the remaining two passes should be run:

- **The merge held, and the reason is mechanical rather than careful.** The
  seeding script never retyped a preserved node: it read the six phase 1 leaves
  with `git show HEAD:` and carried them through as parsed objects, and a
  separate script then diffed all 12 pre-existing nodes against `HEAD` field by
  field and counted U+202F on both sides. Exactly one field differed, and it was
  the one intended change. `PRON` lost 16 narrow no-break spaces doing this by
  hand and reported success. **Carry preserved nodes as objects, verify against
  `HEAD`, and do not trust the pass's own report.**
- **An override outlived the shape of the data it was written for, and the
  wildcard mechanism absorbed it without a status moving.** `VERB.perf.*` said
  « Correspond au passé composé », written when `VERB.perf` had one leaf. The 2a
  pass gave it a second, `VERB.perf.serie`, whose form is `havia cantat`, and on
  a pluperfect that sentence is false. Put to the user rather than decided
  quietly. The wildcard note now states the auxiliary fact for the whole series
  and `VERB.perf.present` carves itself out with an exact override keeping the
  original wording, which is the exact-beats-wildcard rule in
  `src/taxonomy/overrides.ts` being used for the first time. **An override is
  data about a tree shape, and re-seeding the domain beneath it can falsify it.**
  Check the overrides that bind a domain against the tree the pass actually
  built, not against the tree they were written for.
- **The third sweep, over the paradigm itself, found what the other two
  missed**, exactly as `PRON` predicted. The Catalan-inventory and
  French-to-Catalan sweeps produced the tenses, moods, non-finite forms and
  periphrases between them. Reading down the paradigm found that the compound
  series beyond the perfect had no key of its own, and that the impersonal and
  defective verbs had none at all. Three sweeps is now the definition of 2a.
- **Self-review caught an outright wrong rule, in the domain where that was
  predicted.** `VERB.subj.present` gave the subjunctive endings as -i, -is, -i,
  -em, -eu, -in in all three groups, which is wrong at the third, where the
  plural persons are -im and -iu. The `CONJ`/`ADV`/`SYN` review had concluded
  that self-review catches statuses and boundaries but not whether a rule is
  right; this one was caught only because `VERB` is dense enough in paradigm
  detail to be checked against itself. It does not disturb the conclusion:
  **the domain is unretrieved and owes an outside review.**
- **A `transfer` moved and a `false-friend` came down, both for the sixth
  consecutive pass.** `VERB.ind.futur` went to `near-miss` because French speech
  confines the simple future to a narrower range, `aller` plus infinitive taking
  the near future where Catalan has no such tour. `VERB.perifrasi.imminent` was
  authored `false-friend` and came down to `near-miss` on the
  `PRON.fort.tractament` precedent: the French speaker who calques `aller` plus
  infinitive produces a past, but that is a production error rather than an
  available wrong reading.

`VERB` came out 8 transfer, 19 near-miss, 2 false-friend and 3 novel. The
transfer share is second only to `NOM` and is an honest count: Romance verbal
morphology transfers in its form, and what fails to transfer is concentrated in
distribution and in two lexical splits, `ser`/`estar` and `haver`/`tenir`. The
second false-friend is `VERB.perifrasi.acabar_de`, where `acabo d'arribar` reads
_finir d'arriver_ and means _venir d'arriver_, against docs/01 line 112 which
calls it a clean transfer; the disagreement is recorded in `data/sources.md` on
the `pas` precedent.

`VERB` and `PRON` were then reviewed together against an outside chat with web
research, with the full 281-leaf list attached. It made 22 field-level changes
and moved no status. Four things it changed matter beyond these two domains:

- **The recurring weakness is stating a default as an exceptionless rule**, and
  it found four in `VERB` alone: the present-subjunctive plural persons, the
  velar increment's absence from the participle, the imperative derived from the
  indicative, and the `-eix-` infix confined to the present indicative. Each was
  right for the regular core and wrong for the velar and irregular verbs, which
  are the verbs a learner meets first. **Check for the missing exception class
  when seeding `PHON` and `LEX`**: a rule stated without it reads as complete.
- **Two claims were wrong about French rather than about Catalan**, which for a
  French-base app is the worst category there is. `PRON.feble.en` said French
  must repeat the preposition for a place of origin when _j'en viens_ is
  standard, and `PRON.feble.hi` said French does not use _y_ with perception
  verbs when _je n'y vois rien_ is ordinary. Both notes now grant the parallel
  and state the divergence that is actually there. **Self-review has never
  caught an error on the French side**, because the French side is the side
  nobody checks.
- **A card can reach the right behaviour through the wrong reason.**
  `VERB.perifrasi.imminent` restricted `anar a` plus infinitive for the right
  practical outcome but explained it by a collision with the periphrastic past.
  The two do not collide, since the periphrasis has no preposition, and the
  norm's own objection is that the futurate use is a castellanism. Only a source
  catches this class of error.
- **The one status the review challenged was defended and kept.**
  `PRON.feble.forma_alomorfs` stays `novel`: French clitics do alternate
  positionally, but `moi` is a tonic pronoun substituting for the clitic rather
  than a fourth allomorph of it. Two other findings were declined, `hom` and
  `segons jo`, both because an existing leaf already owns the fact. The
  arguments are in `data/sources.md`.

The evidence position is unchanged in kind. The reviewer could not render
`giec.iec.cat` or `geiec.iec.cat` either, which is six consecutive failures from
two independent directions, and reached both grammars only through verbatim
snippets carrying section URLs. It graded its own claims three ways as asked and
flagged that its two strongest citations rested on a second-hand verification
pass rather than its own fetch. **No GIEC or GEIEC section number is written
into the data, and that still holds.**

`LEX` followed, 12 leaves under 4 branches, and it is the eleventh domain and
the one most defined by subtraction. Five things in it matter for `PHON`, the
last one:

- **Two of docs/01's five proposed branches were declined**, and both refusals
  generalise. `LEX.freq`, frequency-ranked core vocabulary, is a word list: one
  key per word is the paradigm-cell error at the largest possible scale, and
  the licensing table records SUBTLEX-CAT as having no reuse grant, whose
  compiled ordering is exactly the protected thing. **The rule that paradigm
  cells are not leaves generalises to vocabulary items are not leaves**, and a
  frequency signal belongs in the scheduler as a weight, not in the component
  vocabulary. `LEX.false_friends.es`, the optional Spanish-interference branch,
  is unrepresentable: the schema has one contrast field and it is keyed to
  French by name, so a Spanish-driven node has no true value for it.
- **A proposed word list was rebuilt as a strategy.** docs/01's `cognates_fr`
  invited a vocabulary dump. `LEX.cognats` states the structural fact that
  generates the list instead, that Catalan's core is Gallo-Romance where Spanish
  is not, with a handful of illustrative members. That is knowingly close to the
  line `PREP` drew against declarative knowledge, and it is kept on the other
  side of it because trusting a French guess changes what the learner produces.
- **A new boundary was drawn inside verb lexis.** `VERB` owns `ser`/`estar` and
  `haver`/`tenir`, which are lexical-choice leaves in a morphology domain, and
  `LEX.camp.portar_dur` is the same shape. The line is that **`VERB` owns splits
  in the grammatical verbs, the copula and the auxiliary, and `LEX` owns splits
  in the lexical verbs.**
- **A leaf about a proscribed form must still be headed by the correct one.**
  `LEX.castellanismes` had `tenir que, vacacions` in `ca`, the very forms the
  norm rejects. `ca` feeds the decomposition machinery and heads the card, so
  the leaf would have taught the error it exists to block. Caught by eye in the
  browser, by nothing else, and fixed to `adonar-se, vacances`.
- **The narrow no-break space was lost for the third time**, in three glosses
  written with literal guillemets instead of the placeholder the seeding script
  substitutes. `test/gloss-completeness.test.ts` refused the turn, the second
  time a test has caught this rather than a human. **Never type the character,
  always build it from its code point.**

`LEX` came out 3 transfer, 6 near-miss, 3 false-friend and no novel. Three
false-friend is the highest count in the taxonomy, and it is what the domain is
rather than status inflation: the status is defined as a familiar French reading
that is available and wrong, and a lexical domain is where forms get read. The
empty novel column follows from construction, since every leaf states a relation
between a French item and a Catalan one. `LEX.castellanismes` is the most
arguable status in the domain, `transfer` on the ground that these errors come
from Spanish and French is a protection, and it is flagged for outside review.

`PHON` closed the seeding phase, 13 leaves under 4 branches. Four things in it
are worth carrying into the review and build phases:

- **A domain seeded last inherits a plan written first, and the plan had been
  overtaken.** docs/01 gives `PHON` as a finished twelve-row table with statuses
  already assigned, the only domain it treats that way, and one of those rows
  was `PHON.apostrof`. By the time `PHON` was reached, **nine committed leaves
  across `ART`, `PREP` and `PRON` already owned apostrophation**, each stating
  its own category's behaviour, and no residue was left for a general leaf. The
  row was declined. `PHON.alph` was declined too, as declarative knowledge about
  an inventory a French speaker already has. **Check what is already keyed
  before building from a source table, not after.**
- **Three leaves are about sound in a text-only application, and they were kept
  deliberately.** Each has an immediate written consequence and each contrast
  note leads with it: vowel reduction is why unstressed `a` and `e` cannot be
  spelled by ear, final devoicing is why the feminine must be consulted, the
  silent final `r` is why `carrer` is not spelled as it sounds. Phase 6b will
  attach pronunciation to exactly these three, and minting them then would mean
  minting keys into a live query log.
- **No IPA anywhere, and the reason generalises.** The `ca` field is defined as
  a Catalan surface form and feeds the decomposition machinery, so a
  transcription there would be neither Catalan nor a form. If phase 6b needs
  transcriptions they want their own field, not the reuse of one that means
  something else.
- **The second census-shaped test outgrew the data.** `taxonomy-browser` asserted
  that some domain reads as unseeded, which seeding the twelfth makes false.
  Deleting the case would have dropped the only cover on `renderUnseededDomain`,
  which is still live code, so the two unseeded cases now drive `renderTree`
  with a node set that omits one domain and a third asserts that nothing is
  unseeded any more. `NOM` generalised `closed-vocabulary` for the same reason.
  **There is no next seeding pass, so this class of breakage is now closed.**

`PHON` came out 2 transfer, 7 near-miss, 4 novel and no false-friend. Four novel
is the highest in the taxonomy and is the honest shape of the domain: an
interpunct French does not have, a lexical stress system it does not have, and
two phonological processes it does not run. Orthography and phonology are where
two Romance languages diverge in kind rather than in distribution. The empty
false-friend column is argued: an unmet spelling convention produces ignorance
rather than a confident wrong reading, and the one real exception, `ll` read as
a simple French `l`, sits in `notes` on `PHON.grafia.digrafs` under the `si bé`
precedent.

`LEX` and `PHON` were then reviewed together against an outside chat with web
research, with the full 306-leaf list attached. Seventeen field-level changes,
no status moved. Four things it changed matter beyond these two domains:

- **The evidence position improved for the first time, by going somewhere
  else.** `giec.iec.cat` and `geiec.iec.cat` failed again, seven attempts from
  three directions now. But these two domains do not depend on the grammars, and
  their authorities did render: the IEC announcement of the diacritic reform,
  the Optimot blog, the DCVB, and on the French side CNRTL, Larousse, the
  Académie and the 1990 rectifications. **The right source for a domain is not
  always the reference grammar.**
- **This project gets French wrong more often than it gets Catalan wrong, and
  that is now confirmed rather than suspected.** Both `WRONG` verdicts in the
  reply were about French: `PHON.dieresi` denied French the u-sounding tréma it
  has had since before 1990, and `LEX.fals_amic.verbs` claimed French _parer_
  means to stop. That is four such errors across two reviews and none ever
  caught internally. **Whatever a card asserts about French deserves the same
  check as what it asserts about Catalan, and gets less.**
- **A finding can be right about the data and wrong about its reasoning.** The
  challenge to `LEX.castellanismes`'s `transfer` argued that French _il faut_
  and _devoir_ reinforce the calque `tenir que`, which is backwards, since they
  support the correct `haver de`. Half of it was sound and was taken: the shape
  of _se rendre compte_ can support `donar-se compte`. Apply the half that
  holds, not the verdict.
- **A retrieved source can still be misread.** The reviewer's list of
  derivatives that lose the diacritic came from an Optimot post titled "Redéu,
  adéu a l'accent dels derivats" and included `adéu` itself, which looks like
  the article's pun read as data. Only the independently checkable examples were
  kept. A verbatim-looking list is the easiest thing to over-trust.

The worst single card error the three reviews have found was here:
`PHON.so.erra_final` had the final-r partition backwards for the words it named,
putting `dur` and `clar` among the monosyllables that keep the r when they drop
it, and the conditioning is lexical rather than a matter of syllable count. It
was stated as a rule, and the rule was the wrong rule.

`NOM` and `ART` were then reviewed together, the fourth outside review and the
largest reply received. 49 field-level changes applied, six structural findings
accepted and specified but not yet executed. Four things in it generalise:

- **A `ca` field taught the error its leaf exists to block, for the second
  time.** `NOM.adj.invariable` was headed by `marró`, which is not invariable,
  and its own example `Uns pantalons marró` was ungrammatical. `LEX` had the
  same failure with `tenir que`. **Validate every `ca` against a dictionary**:
  it heads the card and feeds the decomposition machinery, so an error there is
  worse than an error in prose.
- **Two leaves contradicted each other outright and nothing could see it.**
  `NOM.number.hidden_n` said stressed final -a restores an -n, and
  `NOM.number.stressed_vowel` said it always takes a simple -s, with the -í
  class sitting in both at once. `check-duplicates` compares forms and examples,
  not claims, and always will. **Two leaves stating incompatible rules is a
  failure mode with no gate at all**, and this is the first confirmed instance.
- **A status was being used as a sort key, and that is now explicitly
  forbidden.** `ART.personal.absencia` was kept `novel` although French and
  Catalan agree there, so it would sort beside its five siblings. The tree
  already grouped them, so the status was doing nothing but lying. It is now
  `transfer`. **A status is a claim about the language, never a scheduling
  hint.** If the phase 6 gaps list needs a second ordering signal, it needs its
  own field, which is the same conclusion the `DET` near-miss problem reached
  from the other direction.
- **The French side is still the weak side.** Three more false claims about
  French, none caught in four internal passes, bringing the count to seven
  across four reviews. The most valuable single finding was an omission of the
  same kind: `NOM.adj.position` never said that French preposes `petit`,
  `grand`, `bon`, `jeune`, `vieux` by default where Catalan postposes them,
  which is a first-week error the card could not have prevented.

`DET` and `PREP` closed the review programme, 14 field-level changes and no
status moved. Three things in it generalise:

- **Two leaves contradicting each other is now a named failure mode with a count
  of two.** `PREP.marcatge.cd_sense_prep` denied any preposition before a
  personal direct object while `PREP.marcatge.a_pronom_tonic`, three leaves
  away, supplied the counterexamples. `NOM` had the same shape one review
  earlier. **No gate can see this**: `check-duplicates` compares forms and
  examples, not claims, and a cheap checker for incompatible prose does not
  exist. Both instances were found by outside readers, which is an argument for
  reviewing rather than for building another script.
- **The output contract this repo wrote caused a false positive.** It tells
  reviewers to ignore typography, because hand-typed narrow no-break spaces
  corrupt in transit. The reviewer therefore wrote without diacritics, read its
  own stripped text back, and reported `DET.num.ordinals` as stating the
  Valencian and Central ordinals identically when the entire contrast is acute
  against grave. The instruction stays, but **a finding about accents or
  apostrophes from a review that strips them must be checked against the data
  before it is believed.**
- **A decline can depend on work done since the decision was made.**
  `DET.quant.polaritat.gens` was refused `false-friend` again, but not on the
  original reasoning: `LEX.fals_amic.noms` now keys the misreading and
  cross-references `DET`, so the trap is taught and `DET` keeps the polarity
  distribution. Two keys, two facts, one word. Had `LEX` not been seeded, the
  answer might have gone the other way.

The count of false claims about French now stands at nine across five reviews,
none of them ever caught internally. Set against that, `PREP`'s two empty
columns were checked and confirmed, and no structural defect was found in either
domain, which is a real result given both had their axes argued during seeding.

See the per-domain table above for where seeding is up to.

The read-only taxonomy browser then landed, out of sequence and unnumbered,
between phases 3 and 4. Its immediate job is the one the seeding table above
implies: eight 2b passes are still owed, 2b is the step where the model is
confidently wrong in ways no test catches, and until now the only way to review
one was a pasted markdown table. It lives in `src/ui/` and phase 6 extends the
same component into the coverage heatmap rather than starting a second one.

Three decisions in it are worth knowing before phase 6 touches it:

- **The top level is built from `DOMAIN_CODES`, not from the data.** When the
  browser landed, six of the twelve domains had no nodes at all, not empty
  branches, so a tree built from the taxonomy's roots would have shown six
  domains and read as the whole language; they rendered as non-expandable rows
  saying so in French. All twelve are seeded now and no such row appears, but
  **keep the top level built from `DOMAIN_CODES`**: it is what makes a missing
  or broken fragment visible instead of silently shrinking the language.
- **There is no third "seed only" state, deliberately.** When the browser
  landed, `VERB` sat at 6 leaves and was recorded as seed-only in this file's
  prose, which is not data the browser can read. A list of thin domains
  hardcoded in `src/ui/` would have been a second source of truth going stale the
  moment `VERB` got its 2a pass, so the domain rows carry a leaf count instead.
  Both `PRON` and `VERB` have since left that state and the browser needed no
  change for either, which is the design working. The state no longer exists at
  all.
- **Filters retain ancestors rather than regrouping.** Filtering to a CEFR level
  or a contrast status hides non-matching leaves and keeps the branches above
  the ones that match. Grouping the results under `A1` or `novel` headings would
  be a second pedagogic hierarchy competing with the taxonomy, which is what the
  axis rule in the `DET` section rules out.

Phase 4 then landed: `src/api/anthropic.ts` is a real client, and the cached
prefix it wraps lives in the new `src/api/prompt.ts`. The split is the point.
`prompt.ts` holds everything that never varies (the French instruction, the
five-intent and two-direction tables, and the 300-leaf vocabulary as
`id`/`ca`/`glosses.fr`), with the single `cache_control` breakpoint on its last
block; `anthropic.ts` holds the transport and puts the question, and only the
question, after that breakpoint. Six things in it matter later:

- **The vocabulary is 37 KB of prefix, and that is the design rather than a
  problem.** Render order at the API is tools, then system, then messages, so
  the reusable part has to be `system`. At roughly six characters per token
  worst case it clears Haiku's 4,096-token minimum by a wide margin, which is
  the number that matters: **a prefix under the minimum does not error, it
  silently reports zero cache reads for ever.** `taxonomy.json` itself is 314 KB
  and is never sent; only leaves are, and only the French gloss, never the whole
  keyed map.
- **The prefill in docs/01 was declined, not forgotten.** docs/01 line 250 says
  to prefill the assistant turn with the opening `{`. Structured outputs and
  message prefilling are mutually exclusive, and a last-assistant-turn prefill
  is a 400 on current models regardless. Constrained decoding does the job the
  prefill was for, and does it better: an out-of-vocabulary tag is undecodable
  rather than merely rejected. The disagreement is recorded in `data/sources.md`
  on the `pas` precedent rather than edited into docs/01.
- **The generated schema is sent stripped and validated whole.**
  `DECOMPOSITION_SCHEMA` carries `minLength` constraints that constrained
  decoding does not implement, so `toStructuredOutputSchema` drops those
  keywords on the way out while `validate.ts` compiles the unmodified schema
  with Ajv on the way back. That is a second compile of one generated schema,
  not a second copy of the enum: a new component ID still arrives only through
  `npm run gen-schema`.
- **The client assembles the logged query and refuses to return an invalid
  one.** `callHaiku` takes `intent`, `direction`, `evidence` and an optional
  `rating`, and runs the assembled record through `validateQueryLog` before
  returning it. The rating rule is enforced by the generated conditional, not
  restated here, and the client says nothing at all about what each evidence
  type may move. Phase 5 persists `result.queryLog`; it should not rebuild it.
- **`cache_read_input_tokens` has never been observed.** No live call has been
  made, by design: the key is runtime-entered and there is none in this
  environment. The 13,104 in `test/fixtures/decomposition-response.json` is an
  invented plausible value, not a recording, and the eval is offline precisely
  so it stays free. **The first person to run this against the live API owes a
  check that the second identical query reports a non-zero cache read**, and
  `CallResult.usage` exists to make that a one-line check rather than a
  debugging session.
- **The `output_format` fallback is untestable except against a stub.** The
  phase prompt asks for a fallback if the stable `output_config` field errors,
  so a 400 whose body names `output_config` retries once under the older key.
  The match is deliberately narrow, because retrying any other 400 hides the
  cause behind a second identical failure. If the live API never rejects
  `output_config`, this path is dead code and should be deleted rather than
  left to rot.

The prompt is French prose that is not user-facing, so it sits outside
`src/i18n/fr.ts` and outside the smoke test that guards that file.
`test/anthropic-client.test.ts` holds it to the same typography rule, which is
the only thing enforcing it. The narrow no-break space is now exported from
`src/i18n/fr.ts` and imported rather than defined a third time.

Phase 5 then replaced the two placeholders with the real thing. `src/srs/fsrs.ts`
wraps `ts-fsrs` at its default parameters, `src/srs/elo.ts` does a two-sided
update, and the new `src/db/persist.ts` holds the transaction that applies a
logged query to every component it touched. Five things in it matter later:

- **The component's Elo rating is now its DIFFICULTY, and the sign flipped.**
  Phase 1's placeholder was one-sided, so its single number stood for the
  learner's strength at that component and rose when they got it right. A
  two-sided update cannot have both sides mean strength, so the component side
  is difficulty (higher is harder), the learner has a rating of their own, and
  the learner's strength at a component is the difference. The phase 1 assertion
  that asserted the old sign was updated rather than deleted, and says why.
  **This is the second ordering signal phase 6 was told it would need**, and it
  is a field of its own rather than a retuned `contrast_fr`, which is exactly
  what the `ART.personal.absencia` finding demanded.
- **The learner's rating is a row in the database, not a scalar beside it.** It
  is written in the same transaction as the components it was updated against.
  Split across two stores, a crash between them would leave the two halves of
  one two-sided update disagreeing, permanently and silently, and nothing would
  ever recompute them.
- **The rating is carried across the components of one query rather than
  re-read.** A query touching three components is three outcomes against three
  opponents. Re-reading the stored learner rating for each would apply the first
  result three times over. A component realised twice in one sentence is
  deduplicated first, because the exposure counter answers how often a component
  has been met, not how many words matched.
- **The contrast-seeded difficulty is a prior, and FSRS overwrites it at the
  first graded review.** A New card's difficulty is initialised by ts-fsrs from
  the rating, which is evidence where `INITIAL_DIFFICULTY_VALUE` is a guess from
  the contrast status. What the seed buys is the period before that review,
  which is when every component is unreviewed and the gaps list has nothing else
  to sort on. That is what "seed the initial difficulty" can honestly mean
  inside FSRS, and a test states it so nobody later reads the overwrite as a bug.
- **The stored row is a projection, and the mapping is tested rather than
  trusted.** The row is flat and camelCase because the version 1 indexes were
  declared that way; the runtime state is nested and snake_case because that is
  what the taxonomy seed uses. Two naming conventions for one thing is how
  drift starts, so `toRow`/`fromRow` are the single crossing point and a
  round-trip test covers both a seeded and a reviewed component.

The Dexie schema is at version 2, which adds the learner store. Both versions
are declared, and the version 1 stores are repeated in version 2 because Dexie
reads each version as a full schema rather than a delta. JSON export and import
are `exportSnapshot` and `importSnapshot`; the import validates the format
version and every component ID before it writes anything, and replaces rather
than merges, because a merge would have to invent a rule for a component present
in both and a half-applied import would strand the learner rating.

`src/db/persist.ts` is in the banned list of
`test/browser-emits-no-evidence.test.ts` from the moment it existed, rather than
after phase 6 meets the test red.

Phase 5b then made the mastery half of the model move at all. `src/review/` is
three modules and no interface: `select.ts` ranks, `item.ts` builds a card from
the taxonomy and assembles its logged record, and `session.ts` is the loop that
asks, takes a grade and writes it once through `recordQuery`. It is headless,
and phase 6 puts a face on it. Five things in it matter later:

- **A review makes no API call, and the reason it can is the authored data.**
  All 300 leaves carry `examples` and a `ca` form, so an item needs no new
  response shape and nothing further the model can get wrong. The limit is
  recorded rather than left to be discovered: there is no French translation of
  any example anywhere in the data, so a review is a rule-recall item and not a
  translation exercise. A translation card needs a new field or a generated
  item, and both are new work rather than a tweak.
- **The `answer` field being French by definition decided the produce
  direction.** A `fr_to_ca` review expects a Catalan answer, which cannot go in
  a field the schema pins to `fr`. It travels in the decomposition, where
  Catalan forms belong, and `answer` carries the French gloss in both
  directions. The language-invariance rule did real work here rather than being
  restated. The full field mapping is in `data/sources.md` under phase 5b.
- **One component per grade.** `recordQuery` applies a record to every component
  it lists and an example sentence realises many, so an item names exactly the
  component under review. A grade is a judgement about one recalled answer, and
  spreading it would move mastery for structures the learner never demonstrated.
- **The selector's contrast weights are a second table, not a reuse of
  `INITIAL_DIFFICULTY_VALUE`.** That one collapses near-miss, false-friend and
  novel to a single 7, which is the right prior for FSRS and cannot express the
  ordering this phase was asked for. `CONTRAST_SELECTION_WEIGHT` is separate,
  which is the `ART.personal.absencia` conclusion applied again: a second
  ordering gets its own field and is never obtained by retuning one that means
  something else.
- **`assess` needs no seam of its own, and that is now demonstrated rather than
  asserted.** It is a selector plus an intent, both already parameters of
  `startReviewSession`. The test drives the whole loop from a second selector
  written inside the test file, logging under the `assess` intent, with no
  change to `session.ts`.

Two smaller things. `readAllComponentStates` in `src/db/persist.ts` reads every
leaf's state in one query, unmet components at their seed state, because a
selector ranks the whole taxonomy and the alternative is 300 single-key gets per
session; phase 6 will want it moved when it narrows the browser ban. And
`test/helpers/source.ts` now holds `stripComments` and `sourceFiles`, which
`browser-emits-no-evidence.test.ts` used to own: the review test needs the same
source scan to assert that exactly one module emits a graded event, and
importing one test file from another silently re-registered all seven of the
browser test's cases under the importing file.

## Carried over into later phases

- **The prompt cache is unverified against the live API.** Everything phase 4
  can check offline is checked: one breakpoint, on the last static block; a
  prefix that renders byte-identically whatever the question is; a prefix well
  clear of Haiku's 4,096-token minimum. What no test can check is whether the
  cache is actually hit, because that is a property of a second live call.
  Read `usage.cacheReadTokens` on the second identical query the first time a
  key is entered. A persistent zero means the prefix is not byte-stable or is
  under the minimum, and it reports as silence rather than as an error.
- **The browser's no-evidence ban has to survive phase 6, not be deleted by it.**
  `test/browser-emits-no-evidence.test.ts` walks the module graph from every
  file in `src/ui/` and asserts it never reaches `src/db/dexie.ts`,
  `src/srs/apply.ts`, `src/srs/fsrs.ts` or `src/srs/elo.ts`, and that nothing
  there writes `exposure_count`. Phase 6 needs to READ per-component state to
  colour a node, which is legitimate; what stays banned is the write path. Put
  the read queries in their own module and narrow the ban to the writer. A
  session that meets this test red and deletes it has removed the only thing
  stopping a browse from incrementing exposure.
- **The app is used mostly on a phone, and the desktop site has to be good too.**
  Recorded because it is a fact about the user rather than about the code, so
  nothing in the repo implies it and a phase 6 session will otherwise design for
  the screen it happens to be screenshotting. **Design mobile first and widen**,
  rather than building for a desktop and shrinking, which is how a tree of 300
  leaves and an SVG heatmap end up unusable on the surface they are actually
  used on. Specifics that follow from it:
  - **There is no hover on a touch screen.** The heatmap carries two dimensions
    in hue and opacity, and the gaps list ranks by two more. If reading any of
    that depends on a tooltip or a hover state, it is unreadable on the primary
    device. Tapping a node already selects it, so the detail pane is the place
    that must say in words what the colour says in paint.
  - **Touch targets, not mouse targets.** The existing tree renders one button
    per leaf, 300 of them, sized for a pointer. Check them at a thumb's width.
  - **French strings run 15 to 20 per cent longer than the English equivalent**,
    which `src/i18n/fr.ts` already warns about and which bites hardest in a
    narrow container. Check the rendered width at phone width, not just at
    desktop width.
  - **Screenshot and iterate at both widths.** The phase 6 prompt says to take a
    screenshot and iterate until the heatmap is legible; legible at 1280 px and
    legible at 390 px are two different findings, and only the second one is
    about how this app is actually read.
- **Rich exercise generation is not designed anywhere, and is not phase 6's
  job.** Phase 6 is a UI over machinery that already exists; it adds nothing to
  what an exercise can be. What 5b ships is a rule-recall card built from the
  authored data, and the limit is recorded there: no French translation of any
  example exists anywhere in the data, so a translation exercise needs either a
  new authored field or model-generated items. Neither appears in `docs/01`,
  `docs/02`, the schema or any phase, so **whoever builds it is designing it**,
  and four decisions have to be made and recorded before any code:
  - **The response shape does not exist.** `decomposition` is language-invariant
    by rule and `answer` is the single French field, pinned to `fr`. A generated
    exercise needs a French prompt and an expected Catalan answer, so it is a
    new sibling structure added to `scripts/gen-schema.ts`, reusing the same
    closed component enum rather than minting a second one. This is the shape
    problem phase 6b's respelling had, and it takes the same answer.
  - **An auto-marked exercise is `recall`, not `graded`.** 5b is explicit that
    the learner's own grade is the only source of graded evidence. Comparing a
    typed answer against an expected one is an objective outcome with no
    self-rating, which is what `recall` names. Getting this wrong lets generated
    content advance FSRS, and the heatmap would still look plausible.
  - **"One component per grade" collides with sentence-level exercises.** 5b
    narrowed a grade to the single component under review deliberately, because
    crediting everything incidentally present in a sentence moves mastery for
    structures the learner never demonstrated. A sentence-translation exercise
    exercises a dozen at once. Decide attribution explicitly: target one and
    treat the rest as context, or invent a partial-credit rule and defend it.
    This is the one most likely to be got wrong invisibly.
  - **The golden set stops being optional.** A wrong explanation is a bad card;
    a wrong expected answer marks a right answer wrong and teaches the error.
    `docs/01` already warns that French-Catalan resources are thin and the model
    is the main source rather than a lookup table.
  - Generated items probably want persisting rather than regenerating, which is
    a new store and a Dexie version 3. Cost is not the argument; reproducibility
    is, since an item the learner is graded against should not silently change
    between repetitions.
  - **Order: phase 6 first, then the golden set, then this as its own phase.**
    Until the authored cards have been used for a fortnight, nobody knows
    whether they are insufficient, and phase 6 builds the answer-normalising
    comparator that any auto-marked exercise needs anyway. **Do not bolt this
    onto the query view during phase 6**, which is where it would do the most
    damage to the evidence model.
- **Phase 6b drops the French respelling. Audio is the pronunciation output,
  and IPA is what remains when there is no voice.** The user asked for this and
  the availability question that was blocking it is now answered both ways:
  **the Catalan voice is confirmed installed on the Android phone**, which is
  the primary device, and it is confirmed absent from the Windows desktop, where
  a check of this repo's own runtime found nine voices, none Catalan and none
  Spanish. Same app, same user, audio on one device and none on the other.
  - **This overrides the phase 6b prompt in `docs/02`**, which specifies the
    respelling in detail and with worked examples (`Barcelona` as
    "beur-seu-LO-neu", `fred` as "frèt"). The disagreement is recorded here
    rather than edited into `docs/02`, on the `pas` precedent that has been
    applied to every other source disagreement in this repo.
  - **The cost is real and is being accepted, not overlooked.** The respelling
    existed to make two things visible to a French reader in text: Central
    Catalan vowel reduction and final devoicing. Audio makes them audible
    instead, which is better where there is a voice. Where there is not, IPA
    carries them, and IPA is less legible to an untrained French reader than
    "beur-seu-LO-neu" is. A later reader should know this was a choice about
    what to build, not a gap.
  - **Keep the IPA.** It is per-component, language-invariant, already in
    `ComponentEntry` in `src/api/anthropic.ts` and in the generated schema, and
    costs nothing to carry. Dropping both would leave the desktop with nothing
    at all.
  - **Pronunciation depends on an OS voice pack, not on the browser.** Chrome on
    Android carries no voices itself; `speechSynthesis` hands off to the system
    engine, so a Catalan voice exists only if Google Text-to-speech has
    downloaded the Català voice data, and on iOS only if Spoken Content has. A
    web page cannot install either, so the control has to be built to be absent.
  - **The standing ban holds and matters more on a phone**, where `es-ES` is
    commonly installed alongside Català: **never fall back to a Spanish or
    French voice.** It produces confidently wrong pronunciation, which is the
    worst outcome a contrastive tool can produce. Absent voice means hide the
    control, not substitute a neighbour.
  - The three `PHON` leaves phase 6b attaches to are unchanged:
    `PHON.so.reduccio_vocalica`, `PHON.so.ensordiment` and `PHON.so.erra_final`,
    which were kept in a text-only application precisely because each has an
    immediate written consequence.
- **Both placeholders are gone**: `src/srs/fsrs.ts` wraps `ts-fsrs` and
  `src/srs/elo.ts` does a two-sided update. What phase 1 fixed was the routing
  and the gate, and neither needed changing to take the real arithmetic, which
  is the whole argument for having fixed them first. **The component-ID
  vocabulary is now persisted**, so renaming or deleting one is a data
  migration against `mastery.componentId` and `queries.componentIds` rather
  than a free edit.
- **FSRS runs on default parameters and should stay there for a while.**
  docs/01 is explicit that optimising them needs on the order of a thousand
  reviews, and this application has none. Revisit only with that many in the
  query log, and treat any earlier tuning as fitting noise.
- **`graded` evidence now has exactly one producer, and it is headless.**
  `src/review/` emits it and nothing else does, which
  `test/review-loop.test.ts` asserts structurally over `src/`. What that scan
  cannot see is a caller passing a variable through to the API client's
  `evidence` option, so `EVIDENCE_EFFECTS` still names the producer of each type
  in prose. Nothing is wired into the interface yet: a review can only be run
  from a test or a console until phase 6 mounts it.
- **The `recall` producer named in `EVIDENCE_EFFECTS` still does not exist.** It
  is the attempt-then-reveal affordance, and it is phase 6's. Until then the
  application emits `lookup` and `graded` and nothing in between.
- **That GIEC chapter 35 is the negation chapter is still unverified**, and two
  claims lean on it. The `VERB`/`PRON` review confirmed §34.4 on the negative
  imperative with a verbatim snippet of that section, but could confirm nothing
  about chapter 35's scope, so the "§34.4 rather than chapter 35" contrast used
  to route the negative imperative to `VERB` is half-sourced. The routing itself
  does not depend on the other half. The chapter map recovered by the
  `CONJ`/`ADV`/`SYN` review, recorded in `data/sources.md` and nowhere else,
  remains snippet-grade throughout.
- **`NEG` is not verified closed against GIEC chapter 35.** Every subsection was
  confirmed except §35.5, whose body never surfaced because giec.iec.cat is
  JavaScript-rendered. `NEG.anticipada` was seeded from the title plus
  corroborating sources, and its card text is owed a check against the print
  edition, roughly pp. 1310-1313. Until then the leaf is right in substance and
  unverified in wording.
- **The four facts ruled out of `NEG` are discharged but one.** The negative
  imperative is `VERB.imperatiu.negatiu`; approximate negation split as planned,
  `gairebé` and `a penes` to `ADV.grau.aproximacio` and `amb prou feines` to
  `LEX.locucions.aproximacio`; the contradictory answer particle `sí` is
  `ADV.modalitat.si`. **Article behaviour under negation is the one still
  open**: French `pas de` against a bare noun or `cap` was split across `ART`,
  `DET` and `NOM`, and it is the fact most likely to have fallen between three
  domains, since no leaf states it as such. Worth a targeted check now that
  every domain is seeded and nothing can be deferred to a later pass.
- **Duplicate content across domains is now checked, after happening twice.**
  `CONJ` minted a leaf that already existed as `PREP.regim.caiguda_davant_que`;
  `ADV` minted one that already existed as `PREP.toniques.locucions_amb_de`.
  Every check passed both times, and always would have. `npm run check-duplicates`
  now closes it, and runs last in CI. Both historical duplicates were reinstated
  to confirm it catches them before it was wired in. What it does not do is the
  token-overlap comparison the ad-hoc version tried: that fires on every shared
  function word, and a noisy check cannot be a gate. `ADV` also removed a smaller
  version of the same failure in the other direction: `CONJ.causal.perque`
  restated the `per què` / `perquè` split that `ADV.interrogatiu.per_que` now
  owns, and is a pointer to it instead. Nothing catches that kind, a restatement
  in prose rather than a second key, and nothing cheaply could.
- **The four facts ruled out of `CONJ` are discharged but one.** The
  interrogative particle `que` is `SYN.interrogativa.particula_que`, with the
  recorded disagreement with docs/01 line 175 standing beside it; `tan`/`tant`
  and the degree words went to `ADV` and `DET`; the protasis/apodosis
  correlation is `SYN.subordinacio.periode_condicional`. **The optative `que`
  (`Que tinguis sort!`) is still keyed nowhere**, `SYN` having declined to mint
  it because it parallels _Qu'il entre !_ exactly. That was defensible while
  domains remained unseeded and is now a standing decision rather than a
  deferral: taking it would mean widening `SYN.interrogativa` to clause type
  generally.
- **`CONJ.coord.illativa` was placed against weak contrary evidence, and the
  outside review then reversed it.** The `CONJ` pass had only a search-engine
  synthesis of GIEC snippets suggesting that GIEC groups illatives with causals
  and finals rather than with coordination, and kept `doncs` and `per tant`
  under `CONJ.coord` on the grounds that second-hand chapter grouping is not
  enough to override the coordinator/subordinator axis. The review confirmed the
  grouping with a much stronger chain, including GIEC quoted as recommending
  that illatives be analysed as subordinate-like, and reported that explicatives
  are treated as parenthetical connectors rather than coordination.
  `CONJ.coord.illativa` is now `CONJ.illativa` and `CONJ.coord.explicativa` is
  now `CONJ.explicativa`, both root-level, argued in `data/sources.md`. **The
  practice is what made the reversal cheap**: the decision was recorded as made
  against contrary evidence, so the later pass revisited it knowingly instead of
  rediscovering the question. Keep doing that. Note that renaming was free only
  because nothing outside the fragment referenced the IDs; after phase 5 it
  would be a data migration.
- **`si bé` is a false-friend inside a `near-miss` leaf.** It is concessive and
  renders _quoique_, while `si bien que` in French is consecutive; it sits inside
  the four-member `CONJ.concessiva.tot_i_que`, so the trap is in `notes` and the
  leaf keeps the status that is true of the group. If the status is ever wanted
  for it, split the leaf rather than restating the group's status.
- **`ADV.collocacio` was kept on inferred evidence, and the review found the
  claim overstated.** The leaf said Catalan does not place an adverb between
  auxiliary and participle where French does. `mai` and `pas` do exactly that
  (`No ha pas vingut`), so the ban is specific rather than general; the leaf now
  says the placement is freer than in French and names the two adverbs that
  intercalate. **This is the evidence-grading mechanism paying for itself**: the
  claim was flagged as inferred before anyone believed it, so correcting it cost
  one note rather than an argument about a settled fact. Whether `*He ja fet` is
  itself ungrammatical remains unsourced. The leaf stays in `ADV` per the
  decision recorded above.
- **The `NEG` pass's owed facts are discharged except two.** `gairebé` and
  `a penes` are now `ADV.grau.aproximacio`, the answer particle `sí` is
  `ADV.modalitat.si`, and `tampoc`'s categorial status as an additive focal
  adverb is stated in `notes` on `ADV.modalitat.additius`. All of it is now
  discharged: `amb prou feines` is `LEX.locucions.aproximacio` and the emphatic
  reply locutions `de cap manera`, `en absolut` and `ni de bon tros` are
  `LEX.locucions.negacio_emfatica`. `hom`, raised by the `VERB`/`PRON` review,
  stays unkeyed in both domains, because `SYN.veu.impersonal` already owns the
  fact that French _on_ has no everyday Catalan counterpart.
- **`SYN` pre-empted `VERB` and `PRON`, and both halves are now settled.**
  `SYN.veu.*` takes the passives and `SYN.clitics.*` takes clitic placement. The
  line is that **`VERB` owns verbal morphology and `PRON` owns pronoun forms and
  cluster order, while `SYN` owns where the clitic attaches and how the clause
  is voiced.** Both passes held it without challenging it:
  `PRON.feble.combinacio.ordre_general` holds the slot template,
  `SYN.clitics.proclisi_enclisi` keeps proclisis and enclisis, and `VERB`'s two
  imperative leaves cross-reference that leaf rather than restating it. Nothing
  is open here now.
- **`ben` as an intensifier (`ben calent`, `ben aviat`) has no key.** Raised by
  the outside review as a gap in the degree system, but marked there as its own
  knowledge rather than sourced, and this repo does not mint keys on unsourced
  suggestions. Check it when `ADV` is next touched.
- **`SYN.interrogativa.particula_que`'s dialect note is now under-precise
  rather than unsourced.** It says "chiefly Central Catalan". Two independent
  scholarly sources put it in Central, Majorcan and Eivissan, against Valencian
  and Minorcan using intonation alone. Tighten it when convenient.
- **The optative `que` is still not keyed anywhere.** `CONJ` routed it to `SYN`
  at medium confidence; the `SYN` pass declined to mint it, because it is a
  direct parallel to `Qu'il entre !` and the leaf would state that nothing
  differs. Recorded rather than lost, and taking it would mean renaming
  `SYN.interrogativa` to cover clause type generally.
- **The `VERB` and `PRON` review has been run and applied**, with the full leaf
  list attached, and it produced no false positive of the `gaire` kind. Sending
  the whole list works; keep doing it. Details in `data/sources.md`.
- **All twelve domains have now had an outside review**, across five of them.
  Nothing is owed a first review.
- **The six structural changes are done**, in the pass recorded at the end of
  `data/sources.md`. The taxonomy stands at **300 leaves and 89 branches**.
  Nothing structural is outstanding, and **the window that made it cheap is
  now closed by choice rather than by deadline**: renaming or deleting a
  component ID is free only while nothing persists it, so any further change of
  that kind should be weighed against a data migration once phase 5 lands.
- **Thirty-four leaves in `DET` and `PREP` were never reached by their review**,
  named in that section of `data/sources.md`. Two are flagged as priority
  re-checks: `DET.identitat.altres_nu` and `DET.quant.grau.prou_bastant`. This
  is recorded rather than treated as coverage, because the reviewer declined to
  file unearned verdicts and that honesty is only useful if it is carried
  forward.
- **The `Ortografia catalana` has never been retrieved as a primary document.**
  `PHON`'s fifteen diacritic pairs, the rule on derivatives and the diaeresis
  exception list all rest on the IEC's announcement plus Optimot and CPNL
  reproductions which agree with each other. That is better than the GIEC
  position but it is not the norm itself.
- Every domain is seeded and none is owed a 2a
  pass. `data/sources.md` has twelve worked examples of a per-domain
  notes section, one for each domain, so later passes
  have a shape to follow rather than an empty placeholder. The `PRON` and `VERB`
  ones are the
  models for a domain that was already seed-only, because they record what a
  merge into glossed leaves can silently break. The `PREP` one is
  the model for a domain whose tree departs from its docs/01 row, because it
  records what was added, what was re-axed and what was ruled out to another
  domain. The `DET` one is the model for a domain that also amends a boundary
  and overturns a docs/01 status, because it records the argument rather than
  just the outcome.
- **`contrast_fr` alone will not order the phase 6 gaps list.** `DET` is 25 of
  31 near-miss and `PREP` is 26 of 39, and both are honest counts rather than
  lazy passes: two Romance languages sharing a category inventory with shifted
  boundaries is exactly what near-miss names. But a status that applies to two
  thirds of a domain cannot rank within it, and
  `INITIAL_DIFFICULTY_VALUE` in `src/srs/fsrs.ts` already collapses near-miss,
  false-friend and novel to the same 7, so only `transfer` currently
  discriminates at all. Phase 6 needs a second dimension, either a frequency
  or cost weight or a subtyping of near-miss (extra morphology, absent
  morphology, different distribution, split mapping). Do not solve it by
  retuning statuses domain by domain, which would make the field describe the
  ranking rather than the language.
- `DET.quant.polaritat.contextos` holds the licensing environments and
  `DET.quant.polaritat.cap` holds an item that needs one, so the two
  necessarily share examples: an environment can only be shown with an item
  inside it. The glosses are written against each other, but the pair will
  surface adjacently in the gaps list and read as one node twice. If phase 6
  needs a fix, it is a display concern, not a taxonomy one.
- The `notes` on `DET.interrogatiu.quin` warns that the `de` of combien de
  transposes to neither interrogative. That is really a fact about
  `DET.interrogatiu.quant`, which is the leaf a French speaker will put a `de`
  into. Move it there when `DET` is next touched.
- `test/gloss-completeness.test.ts` used to assert French typography over leaf
  fields only, so `label_fr` on a branch node was unasserted French prose. The
  `ART` seed walked straight into it and wrote seven labels with straight
  apostrophes, corrected by hand; the test now covers all 25 branches too.
- **The narrow no-break space was a rule nobody followed.** `CLAUDE.md`,
  `.claude/rules/ui-copy.md` and the `fr-metalanguage` skill all require U+202F
  inside guillemets and before `: ; ! ?`, and `test/smoke.test.ts` enforced it
  over `src/i18n/fr.ts`. Nothing enforced it over taxonomy prose, so every
  domain seeded after phase 1 used an ordinary space: 209 guillemet pairs
  across `NOM`, `ART` and `PREP` against 14 correct ones in the phase 1 seed
  and `data/contrast-overrides.json`. All normalised, and
  `gloss-completeness.test.ts` now asserts both rules over every French field
  on every node. The tie was broken towards U+202F because the overrides file
  is applied verbatim and compared by exact string equality, so it would have
  put both conventions inside a single leaf the first time a `VERB.perf.*`
  node took its note.
- `.claude/agents/taxonomy-seeder.md` no longer instructs leaving `glosses` and
  `contrast_fr` empty, which phase 1 made impossible. The seeder now authors a
  British-English marker per leaf, deliberately not French, so that the 2b pass
  has nothing it could mistake for an authored gloss. The `NOM` pass carried
  that override in the prompt; later seeding prompts do not have to.
- Intents `teach`, `assess` and `pronounce` are representable but not built.
  `assess` is a selection function over the phase 5b review loop, not a separate
  subsystem.
- `data/contrast-overrides.json` had its French typography corrected in
  `7bcb37a` (typographic apostrophes, narrow no-break spaces inside guillemets).
  The statuses and the wording are untouched; only the characters changed, and
  the notes are now applied verbatim into the seed.

## Record corrections

- **`7ddaa48` contains more than its message says.** It is described as a
  documentation pass over `docs/02`, and it is, but it also contains the six
  Phase 1 test files (`taxonomy-schema`, `closed-vocabulary`,
  `gloss-completeness`, `gen-schema`, `evidence-routing` and
  `helpers/taxonomy.ts`, 765 lines) written concurrently in another session.
  They were swept in by a `git add -A` whose staging was checked with
  `git diff --stat`, which does not report untracked files. History was left
  alone rather than rewritten, since the commit was already pushed and the
  files are wanted regardless. Recorded here so the commit log is not silently
  wrong.

- **CI was red for the whole of the `NOM` seed, and nobody noticed.** Every run
  from `57b08f0` to `09dff34` failed, first on `npm run format:check`
  (`data/nom.fragment.json` was never Prettier-formatted) and then on
  `npm run typecheck` (`test/closed-vocabulary.test.ts` used
  `id.split('.')[0]` where `noUncheckedIndexedAccess` types it
  `string | undefined`). Both steps run before the taxonomy checks, so
  `validate-ids` and `check-glosses` never executed in CI for that pass. Green
  again from `14f8078`. Local `npm test` passing is not evidence CI is passing:
  it skips lint, typecheck and format.

## Known-bad, not yet fixed

- `test/helpers/taxonomy.ts` computes `repoRoot` from `import.meta.url`, which
  is not a `file://` URL under the `jsdom` test environment, so `fileURLToPath`
  throws `The URL must be of scheme file`. This is distinct from the expected
  Phase 1 TDD failures and will persist after `src/taxonomy/` exists. Use
  `process.cwd()` or put the file-reading tests in the `node` environment.

## Manual steps

- **GitHub Pages**: done. Settings, Pages, Source is set to "GitHub Actions", and
  `59a88c5` produced the first successful deploy. No agent can set that source,
  and the deploy workflow silently publishes nothing until it is set.
