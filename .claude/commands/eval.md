---
description: Run the golden-set evaluation offline and report regressions
argument-hint: '[model id, e.g. claude-haiku-5-5]'
allowed-tools: Task, Bash, PowerShell, Read, Grep, Glob
---

Run `npm run eval`. It replays every recording in
`test/fixtures/golden-v2/recordings/` through `translatePhrase` with a stub
fetch, scores it against the speaker's verdicts in
`test/fixtures/golden-v2/cases/`, and prints one column per model against the
spec's floors (« Floors and selection » in `docs/spec-phases-0-1.md`).

If `$ARGUMENTS` names a model, report only its column and its details.

**Offline always.** `npm run eval` has no live path. The only paid step is
`npm run eval:record`, which Sean runs with the key in the environment. Claude
Code never runs it (decided 26 Oct, phase 1 question A).

What is scored, per model: valid schema and spans after the one retry, the
Catalan accepted by the speaker (« naturel » or « correct mais peu naturel »),
required IDs linked on accepted replies, padded links (a lower bound: must-not-
link IDs, and row 29 left with no unlinked chunk), warm 90th-percentile
latency, and cost warm and cold under both cache lifetimes. Renderings with no
verdict yet show as pending, never as passed.

**No model judges anything.** Whether Catalan is good is the native speaker's
verdict, written into the fixtures by `npm run eval:verdicts` in its own commit.

**Do not edit recordings, verdicts or fixtures to make the eval pass.** A
recording is evidence. A recording made under another prompt is flagged by its
`promptHash`; record again rather than editing it.
