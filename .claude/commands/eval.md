---
description: Run the golden-set evaluation offline and report regressions
argument-hint: '[risk area, e.g. padding]'
allowed-tools: Task, Bash, PowerShell, Read, Grep, Glob
---

Run `npm run eval`. It replays every fixture in `test/fixtures/golden/` through
`callHaiku` with a stub fetch and reports pass count, failures by reason class,
a per-risk-area breakdown, and regressions against `baseline.json`.

**Offline always.** There is no live path and no env flag that adds one. The
replies are recordings; that is the point.

If `$ARGUMENTS` names a risk area, report only that area. The areas present are
whatever the fixtures declare, currently: `padding`, `passat-perifrastic`,
`negation`, `clitics`, `mood`, `correction`, `gerundi`, `orthography`,
`comparative`, `transfer`, `false-friend`.

What is asserted, per case: the reply validates against the generated schema, no
out-of-vocabulary component ID, the case's required components are present, the
gate verdict matches, `answer_lang` is `fr`, the direction is the expected one,
and the French/Catalan pair is two non-empty and different strings.

**Never assert on the French prose.** It varies and asserting on it is noise.
Whether an explanation is true is a reader's judgement, and each fixture already
carries that judgement in `expect.defects`.

**Do not adjust the prompt, the schema, the taxonomy or the fixtures to make the
eval pass.** A recording is evidence and editing it destroys the evidence. If a
change is genuinely an improvement, rerun with `npx tsx scripts/eval.ts
--baseline` and commit the baseline diff on its own, so the change of expected
result is reviewable.

Standing failures are recorded defects, not bugs in the harness. `03-vull-que-vens`
fails on direction because the model read a Catalan question as French, and it
stays failing until that is no longer true.
