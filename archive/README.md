# Archive

Material from the vanilla build, kept for reference and excluded from build,
lint, format and tests. The vanilla app itself is one checkout away at the tag
`v1-vanilla` (commit `58ab33a`).

- `TASKS-v1.md`: the old status file, whole. Its "Record corrections" section
  and the per-domain seeding notes are the history behind the current taxonomy.
- `docs/01-catalan-structural-map-and-build-plan.md` (36 KB): reference for the
  taxonomy seeding phases only, which are done. A read hook still gates it on
  `CATALAN_SEEDING_PHASE=1`. Never read it wholesale; grep or read the section
  you need.
- `docs/02-claude-code-build-guide.md`: the vanilla build's phase prompts.
- `docs/03-visual-learning-pass.md`: the argument for the vanilla visual pass.
- `claude/agents/` and `claude/commands/seed-domain.md`: the seeding agents and
  command. Seeding ran in two passes per domain, 2a (structure) then 2b
  (glosses and contrast), with `npm run check-duplicates` between them, because
  a 2a pass cannot see what an earlier domain already keyed.
- `src/review/session.ts`: the vanilla review loop, which wrote through the
  removed Dexie database. Phase 4 decides what review becomes.
- `test/browser-emits-no-evidence.test.ts`: the structural ban that kept the
  vanilla explorer from reaching the modules that write evidence. The explorer
  is gone; the map (phase 5) owns the successor ban.
- `src/eval/golden.ts`, `scripts/eval.ts`, `test/golden-set.test.ts` and
  `test/fixtures/golden/`: the vanilla golden set and its harness, archived in
  phase 1 step 3 when the decomposition reply they replay was removed. Its 10
  fixtures record the old reply shape, 6 are Catalan input and 8 are marked
  « defective » yet passed. `test/fixtures/golden-v2/` replaces it.
