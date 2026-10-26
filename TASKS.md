# Build status

One line per phase of the rebuild. Requirements for phases 0 and 1 are in
`docs/spec-phases-0-1.md`; decisions and the plan live in the plan doc in the
claude.ai Project « Català rebuild ». This file records only which phases are
done and what closed them.

**Update this file in the same commit as the work.** A phase closes only when
every acceptance box in the spec is ticked by a test, a script or a CI run.

| Phase                          | Status      | Closed by                                                                                                                   |
| ------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| 0. Svelte shell and navigation | done        | main `1928a91`, [CI run 40423159926](https://github.com/Snewby/francais-catalan/actions/runs/40423159926); site loads clean |
| 1. Translate and take apart    | not started |                                                                                                                             |
| 2. Variations                  | not started |                                                                                                                             |
| 3. Notion sheet                | not started |                                                                                                                             |
| 4. Carnet, words and review    | not started |                                                                                                                             |
| 5. Map                         | not started |                                                                                                                             |

The vanilla build (tag `v1-vanilla`, commit `58ab33a`) and its 1,875-line status
file are under `archive/`; see `archive/README.md`.
