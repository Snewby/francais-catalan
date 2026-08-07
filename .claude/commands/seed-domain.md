---
description: Seed one taxonomy domain, structure first then glosses, as two reviewed passes
argument-hint: <DOMAIN, e.g. VERB>
allowed-tools: Task, Bash, PowerShell, Read, Grep, Glob
---

Seed domain `$ARGUMENTS` in two separate passes. Do not merge them.

**Pass 1, structure.** Use the `taxonomy-seeder` agent for domain `$ARGUMENTS`
only. It extracts facts from the notes in `data/sources.md`, hand-authors leaf
nodes, leaves `glosses` and `contrast_fr` as placeholders, writes
`data/$ARGUMENTS.fragment.json`, then runs `gen-schema` and `validate-ids`.

Report the node count and any validation failure, then stop and let the user
look at the diff.

**Pass 2, glosses.** Only after the user has accepted pass 1, use the
`gloss-author` agent for the same domain. It applies
`data/contrast-overrides.json` verbatim, authors `glosses.fr` and `contrast_fr`
for every leaf, runs `check-glosses`, and outputs a table of every node with its
assigned status.

Surface that table in full. It is the artefact the user reviews, and the
contrast assignments are the step where the model is most likely to be
confidently wrong in a way no test catches.

Only one domain per invocation, so no single context holds the whole taxonomy.
