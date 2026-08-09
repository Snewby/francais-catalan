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
| 2a. Structural seeding, per domain    | in progress | ADAPT    | per domain, see table below     |
| 2b. Gloss and contrast authoring      | in progress | ADAPT    | per domain, see table below     |
| 3. Generated schema enums             | done        | VERBATIM | `7bcb37a`, early with phase 1   |
| Taxonomy browser (read-only)          | done        | VERBATIM | this pass                       |
| 4. API client and prompt caching      | not started | ADAPT    |                                 |
| 5. Persistence, FSRS, Elo             | not started | ADAPT    |                                 |
| 5b. Review loop                       | not started | ADAPT    |                                 |
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

| Domain | Fragment                  | Structure   | Glosses     | Closed by |
| ------ | ------------------------- | ----------- | ----------- | --------- |
| `PHON` |                           | not started | not started |           |
| `NOM`  | `data/nom.fragment.json`  | done        | done        | this pass |
| `ART`  | `data/art.fragment.json`  | done        | done        | this pass |
| `VERB` | `data/verb.fragment.json` | seed only   | seed only   | `7bcb37a` |
| `PRON` | `data/pron.fragment.json` | seed only   | seed only   | `7bcb37a` |
| `DET`  | `data/det.fragment.json`  | done        | done        | this pass |
| `PREP` | `data/prep.fragment.json` | done        | done        | this pass |
| `ADV`  |                           | not started | not started |           |
| `CONJ` |                           | not started | not started |           |
| `NEG`  | `data/neg.fragment.json`  | done        | done        | this pass |
| `SYN`  |                           | not started | not started |           |
| `LEX`  |                           | not started | not started |           |

Start on a `not started` domain rather than on `VERB` or `PRON`. Extending a
seeded domain means merging into ten already-glossed leaves whose `contrast_fr`
came from `data/contrast-overrides.json`, which is a more delicate pass than
authoring an empty domain and a poor first exercise of the pipeline.

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
free transfer. Two inherited assignments were challenged on review. `ART.contract.pel`/`pels`
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
rather than preposition government, so it sits in `notes` on
`PREP.formes_no_finites.inf_regit_de` and belongs to `VERB` when `VERB` gets
its proper pass. The two thirds near-miss share is the domain working as
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
  `ART.def.us.abans_possessiu` is a legacy misfile under the amended line. It
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

See the per-domain table above for where seeding is up to.

The read-only taxonomy browser then landed, out of sequence and unnumbered,
between phases 3 and 4. Its immediate job is the one the seeding table above
implies: eight 2b passes are still owed, 2b is the step where the model is
confidently wrong in ways no test catches, and until now the only way to review
one was a pasted markdown table. It lives in `src/ui/` and phase 6 extends the
same component into the coverage heatmap rather than starting a second one.

Three decisions in it are worth knowing before phase 6 touches it:

- **The top level is built from `DOMAIN_CODES`, not from the data.** Six of the
  twelve domains have no nodes at all, not empty branches, so a tree built from
  the taxonomy's roots would show six domains and read as the whole language.
  The unseeded six render as non-expandable rows saying so in French.
- **There is no third "seed only" state, deliberately.** `VERB` at 6 leaves and
  `PRON` at 4 are recorded as seed-only in this file's prose, which is not data
  the browser can read. A list of thin domains hardcoded in `src/ui/` would be a
  second source of truth that goes stale the moment `VERB` gets its 2a pass, so
  the domain rows carry a leaf count instead and let 6 next to `ART`'s 36 say it.
- **Filters retain ancestors rather than regrouping.** Filtering to a CEFR level
  or a contrast status hides non-matching leaves and keeps the branches above
  the ones that match. Grouping the results under `A1` or `novel` headings would
  be a second pedagogic hierarchy competing with the taxonomy, which is what the
  axis rule in the `DET` section rules out.

## Carried over into later phases

- **The browser's no-evidence ban has to survive phase 6, not be deleted by it.**
  `test/browser-emits-no-evidence.test.ts` walks the module graph from every
  file in `src/ui/` and asserts it never reaches `src/db/dexie.ts`,
  `src/srs/apply.ts`, `src/srs/fsrs.ts` or `src/srs/elo.ts`, and that nothing
  there writes `exposure_count`. Phase 6 needs to READ per-component state to
  colour a node, which is legitimate; what stays banned is the write path. Put
  the read queries in their own module and narrow the ban to the writer. A
  session that meets this test red and deletes it has removed the only thing
  stopping a browse from incrementing exposure.
- The FSRS advance in `src/srs/fsrs.ts` and the Elo update in `src/srs/elo.ts`
  are labelled placeholders. Phase 5 replaces the arithmetic with `ts-fsrs` and
  a two-sided Elo update. What phase 1 fixed is the routing and the gate, which
  is the part that is expensive to retrofit.
- **`NEG` is not verified closed against GIEC chapter 35.** Every subsection was
  confirmed except §35.5, whose body never surfaced because giec.iec.cat is
  JavaScript-rendered. `NEG.anticipada` was seeded from the title plus
  corroborating sources, and its card text is owed a check against the print
  edition, roughly pp. 1310-1313. Until then the leaf is right in substance and
  unverified in wording.
- **Three facts are ruled out of `NEG` and owed to domains not yet seeded.** The
  negative imperative (`no vinguis`, present subjunctive) belongs to `VERB` and
  has no key anywhere today. Approximate negation (`gairebé no`, `amb prou
feines`) splits between `ADV` and `LEX`. The contradictory answer particle
  `sí`, which a French speaker reaches for from « si », is positive polarity and
  belongs with response particles in `ADV`. Article behaviour under negation
  (French `pas de` against a bare noun or `cap`) is ruled out of `NEG` and split
  across `ART`, `DET` and `NOM`, so it is the one most likely to fall between
  three domains. All four are argued in `data/sources.md`.
- Five domains remain unseeded. `data/sources.md` has five worked examples of a
  per-domain notes section (`NOM`, `ART`, `DET`, `PREP` and `NEG`), so later passes
  have a shape to follow rather than an empty placeholder. The `PREP` one is
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

- **The narrow no-break space assertion has a hole, and `NEG` fell in it.**
  `test/gloss-completeness.test.ts` checks for U+202F before `: ; ! ?` only
  where the punctuation follows a letter, so a French field ending
  `(pas, jamais...);` passes with no space at all. Found by eye during the `NEG`
  browser review and corrected by hand in `data/neg.fragment.json`, but the test
  is still the one that let it through, and the same hole covers any punctuation
  preceded by a bracket, a quotation mark or a digit. The rule is stated in
  three places and enforced by one assertion, so the assertion is the thing that
  has to be right. Widen it to "the character before the punctuation is U+202F,
  whatever it is", and re-run it over every seeded domain, since only `NEG` has
  been swept by eye.

## Manual steps

- **GitHub Pages**: done. Settings, Pages, Source is set to "GitHub Actions", and
  `59a88c5` produced the first successful deploy. No agent can set that source,
  and the deploy workflow silently publishes nothing until it is set.
