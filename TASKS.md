# Build status

One line per phase of the rebuild. Requirements for phases 0 and 1 are in
`docs/spec-phases-0-1.md`, and for phase 2 in `docs/spec-phase-2.md`; decisions
and the plan live in the plan doc in the claude.ai Project « Català rebuild ».
This file records only which phases are done and what closed them.

**Update this file in the same commit as the work.** A phase closes only when
every acceptance box in the spec is ticked by a test, a script or a CI run.

| Phase                          | Status      | Closed by                                                                                                                                                                                          |
| ------------------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Svelte shell and navigation | done        | main `1928a91`, [CI run 40423159926](https://github.com/Snewby/francais-catalan/actions/runs/40423159926); site loads clean                                                                        |
| 1. Translate and take apart    | done        | main `1d59a3c`, [CI run 40967788091](https://github.com/Snewby/francais-catalan/actions/runs/40967788091); Opus 5.5 chosen 29 Oct (`docs/model-eval.md`); deployed site installs and loads offline |
| 2. Variations                  | in progress | Spec in repo `docs/spec-phase-2.md` (`0921aa1`); steps 1 to 6 on main (`97a2a46` to `ba9ca62`); waiting on the round 1 variant recording                                                           |
| 3. Notion sheet                | not started |                                                                                                                                                                                                    |
| 4. Carnet, words and review    | not started |                                                                                                                                                                                                    |
| 5. Map                         | not started |                                                                                                                                                                                                    |

The vanilla build (tag `v1-vanilla`, commit `58ab33a`) and its 1,875-line status
file are under `archive/`; see `archive/README.md`.
