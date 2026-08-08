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
| `DET`  |                           | not started | not started |           |
| `PREP` |                           | not started | not started |           |
| `ADV`  |                           | not started | not started |           |
| `CONJ` |                           | not started | not started |           |
| `NEG`  |                           | not started | not started |           |
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
free transfer. `ART.personal.absencia` (inherited `novel`, but it is the one
case where French and Catalan agree) and `ART.contract.pel`/`pels` (inherited
`transfer`, though French does not contract `par le`) are the two inherited
assignments most open to challenge; both were flagged rather than changed.

`ART` came out 16 transfer, 11 near-miss, 9 novel and no false-friend. The empty
false-friend column is expected: nothing in the article system looks French and
means something else.

See the per-domain table above for where seeding is up to.

## Carried over into later phases

- The FSRS advance in `src/srs/fsrs.ts` and the Elo update in `src/srs/elo.ts`
  are labelled placeholders. Phase 5 replaces the arithmetic with `ts-fsrs` and
  a two-sided Elo update. What phase 1 fixed is the routing and the gate, which
  is the part that is expensive to retrofit.
- Eight domains remain unseeded. `data/sources.md` has two worked examples of a
  per-domain notes section (`NOM` and `ART`), so later passes have a shape to
  follow rather than an empty placeholder.
- `test/gloss-completeness.test.ts` asserts French typography over leaf fields
  only, so `label_fr` on a branch node is unasserted French prose. The `ART`
  seed walked straight into it and wrote seven labels with straight
  apostrophes, corrected by hand. `NOM` only escapes because none of its labels
  contains an apostrophe.
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
