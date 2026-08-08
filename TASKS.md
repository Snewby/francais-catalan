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
| 1. Taxonomy schema, closed vocabulary | done        | VERBATIM | this commit                     |
| 2a. Structural seeding, per domain    | next        | ADAPT    |                                 |
| 2b. Gloss and contrast authoring      | not started | ADAPT    |                                 |
| 3. Generated schema enums             | done        | VERBATIM | this commit, early              |
| 4. API client and prompt caching      | not started | ADAPT    |                                 |
| 5. Persistence, FSRS, Elo             | not started | ADAPT    |                                 |
| 5b. Review loop                       | not started | ADAPT    |                                 |
| 6. UI and coverage heatmap            | not started | ADAPT    |                                 |
| 6b. Pronunciation                     | not started | ADAPT    |                                 |
| 7. GitHub Pages deploy                | partial     | DONE     | `1c4cc7d` (workflow only)       |

**Prompt** says how to use that phase's prompt in
`docs/02-claude-code-build-guide.md` section 3. `VERBATIM` means every fact in
it has been checked against the repo and it can be pasted as-is. `ADAPT` means
it depends on outputs that do not exist yet, so read the repo first. The labels
are only true as long as someone keeps them true; treat a `VERBATIM` prompt that
mentions a file you cannot find as a bug in this table.

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

Phase 2a is next: the remaining ten domains, one per subagent, structure first.

## Carried over into later phases

- The FSRS advance in `src/srs/fsrs.ts` and the Elo update in `src/srs/elo.ts`
  are labelled placeholders. Phase 5 replaces the arithmetic with `ts-fsrs` and
  a two-sided Elo update. What phase 1 fixed is the routing and the gate, which
  is the part that is expensive to retrofit.
- `gen-schema` reads the hand-authored `taxonomy.json` directly. Merging
  per-domain fragments under `data/` into it is a phase 2a concern, and the
  pipeline order in the `catalan-taxonomy` skill assumes that step exists.
- Intents `teach`, `assess` and `pronounce` are representable but not built.
  `assess` is a selection function over the phase 5b review loop, not a separate
  subsystem.
- `data/contrast-overrides.json` had its French typography corrected in this
  commit (typographic apostrophes, narrow no-break spaces inside guillemets).
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

## Manual steps not yet done

- **GitHub Pages**: set Settings, Pages, Source to "GitHub Actions". No agent can
  do this, and the deploy workflow silently publishes nothing until it is done.
