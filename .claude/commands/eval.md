---
description: Run the golden-set evaluation offline and report regressions
argument-hint: '[risk area, e.g. clitics]'
allowed-tools: Task, Bash, PowerShell, Read, Grep, Glob
---

Use the `prompt-eval` agent to run the golden set against the recorded fixtures
in `test/fixtures/`. Offline by default: make no live API call unless the user
has explicitly set `LIVE_EVAL=1`.

If `$ARGUMENTS` names a risk area, restrict the report to it. Otherwise report
all areas.

Assert per phrase: output validates against the generated schema, no
out-of-vocabulary component ID, key expected components present, `answer_lang`
is `fr`. Do not assert on the French prose.

Report the pass count, failures with a reason class each, regressions against
the previous run called out separately from standing failures, and a breakdown
by risk area (clitic COI plus COD combinations, `passat perifràstic`, `pas`
negation).

Do not adjust the prompt, the schema or the golden set to make the eval pass.
