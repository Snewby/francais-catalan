# Build status

One line per phase. Phases are defined in
`docs/02-claude-code-build-guide.md` section 3; this file records only which of
them are done and what closed them.

**Update this file in the same commit as the work.** A status file that drifts
is worse than none, because it still reads as authoritative.

| Phase                                 | Status      | Closed by                       |
| ------------------------------------- | ----------- | ------------------------------- |
| 0. Scaffold                           | done        | `c8a3e14`, `f6d0a21`, `1c4cc7d` |
| Interaction-model amendment           | done        | `d7738c5`                       |
| 1. Taxonomy schema, closed vocabulary | next        |                                 |
| 2a. Structural seeding, per domain    | not started |                                 |
| 2b. Gloss and contrast authoring      | not started |                                 |
| 3. Generated schema enums             | not started |                                 |
| 4. API client and prompt caching      | not started |                                 |
| 5. Persistence, FSRS, Elo             | not started |                                 |
| 5b. Review loop                       | not started |                                 |
| 6. UI and coverage heatmap            | not started |                                 |
| 6b. Pronunciation                     | not started |                                 |
| 7. GitHub Pages deploy                | partial     | `1c4cc7d` (workflow only)       |

## Where things stand

Phase 0 delivered the toolchain, the `.claude/` agentic scaffolding, and an app
shell that builds, tests and renders. The interaction-model amendment then
replaced the single-call-shape design with intent-typed calls and split exposure
from mastery, before any of it was built against.

Phase 1 is next and is the load-bearing one: the keyed gloss map, `contrast_fr`,
and the intent/direction/evidence triple all have to land there. Retrofitting
any of them costs either a several-hundred-node migration or a query log whose
missing values cannot be reconstructed.

## Carried over into later phases

- `scripts/gen-schema.ts`, `validate-ids.ts` and `check-glosses.ts` are exit-0
  stubs. Phase 1 replaces the bodies; the files already exist.
- `src/api/schema.ts` is a placeholder with a generated-file banner. Phase 3
  generates it for real.
- `taxonomy.json` does not exist yet. Once it does, the `PostToolUse` hook in
  `.claude/settings.json` starts running the validators on every edit to it, and
  a failure blocks the turn.
- Intents `teach`, `assess` and `pronounce` are representable but not built.
  `assess` is a selection function over the phase 5b review loop, not a separate
  subsystem.

## Manual steps not yet done

- **GitHub Pages**: set Settings, Pages, Source to "GitHub Actions". No agent can
  do this, and the deploy workflow silently publishes nothing until it is done.
