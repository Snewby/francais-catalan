# Operational Guide: Building the Catalan Grammar Trainer with Claude Code

*Base language: French. Target language: Central (Barcelona) Catalan.*

## TL;DR
- Build this as a plan-mode-first, TDD-driven Claude Code project where the closed component-ID vocabulary is enforced by machine (JSON schema enums, a schema-validator subagent, and hooks), not by prompting; the taxonomy lives as generated artefacts kept out of the main context, and the app uses Anthropic Structured Outputs with prompt caching of the taxonomy.
- Stock Claude Code in 2026 (plan mode, subagents with `isolation: worktree`, Skills, hooks, checkpoints, `/rewind`) covers almost everything the bespoke oversight orchestration does; reserve the planner/executor/auditor/amender rig for the two genuinely awkward phases (taxonomy seeding and the prompt-eval harness).
- **The French base language adds three small, load-bearing constraints:** glosses are a keyed map from Phase 1, every leaf carries `contrast_fr`, and the CLAUDE.md language rule splits into "French for UI copy and model output, British English for code, comments, docs and commits".
- The biggest real-world risks are legal and mechanical, not AI: the seeding datasets are almost all copyleft (Apertium GPL-2+, Softcatalà dual LGPL-2.1/GPL-2, verbecc dual LGPL-3.0/GPL-3.0), so extract facts and re-author rather than copying files; and the Vite/GitHub Pages base path plus IndexedDB test setup are the mechanical traps.

## Key Findings

### Claude Code feature state (verify before relying, these move weekly)
- **Model default**: as of v2.1.197 (30 June 2026) Claude Sonnet 5 is the default in Claude Code, with Opus one `/model opus` away. Subagents run in the background by default since v2.1.198 (1 July 2026).
- **CLAUDE.md**: loaded into context at session start; target under ~200 lines; `/doctor` proposes trims (v2.1.206+); project-root CLAUDE.md survives compaction. Imports use `@path` syntax but imported files still load at launch, so imports help organisation not token cost.
- **Structured Outputs**: public beta since 14 November 2025, header `structured-outputs-2025-11-13`, `output_format` for JSON outputs and `strict: true` for tool use, with Haiku 4.5 support added subsequently. Requires `additionalProperties: false` on every object and every property listed in `required`. Migration flag: the stable API is deprecating `output_format` in favour of `output_config.format`, so wire against the newer field and keep the beta header as a fallback.
- **Prompt caching**: mark the last static block with `cache_control`; prefix order is tools, then system, then messages; minimum cacheable length is 4,096 tokens for Haiku 4.5 (below threshold, `cache_creation_input_tokens` silently returns 0). Cache reads cost 0.1x base input, writes 1.25x (5-min) or 2x (1-hr); up to 4 breakpoints.
- **Slash commands merged into Skills** (v2.1.101, 11 April 2026): a slash command is now a skill with no extra features; if a skill and command share a name the skill wins.
- **Subagents**: markdown plus YAML frontmatter in `.claude/agents/`; support `isolation: worktree`; the `/agents` interactive wizard was removed in v2.1.198+ (ask Claude to author the file instead).
- **Hooks**: `PreToolUse` (exit code 2 blocks), `PostToolUse`, `UserPromptSubmit`, `SessionStart`, `Stop`, `SubagentStop`; configured in `.claude/settings.json`.

### The client-side API architecture
- Direct browser calls need `anthropic-dangerous-direct-browser-access: true` plus `x-api-key` and `anthropic-version: 2023-06-01`. In a BYOK app the key is the user's own, entered at runtime into localStorage, so there is no leakage the user cannot see.
- Model: `claude-haiku-4-5-20251001` (alias `claude-haiku-4-5`), $1 per million input tokens and $5 per million output tokens, 200K context, up to 64K max output, supports structured outputs and prompt caching. French output runs roughly 10 to 15% longer than English, which is immaterial at this volume.

### Seeding datasets (licensing is the gotcha)
- **UD_Catalan-AnCora**: the UD distribution lists CC BY 4.0, though the treebank README notes a GNU licence inherited from the original AnCora corpus. Treat provenance carefully.
- **Apertium apertium-cat**: GPL-2+ (COPYING is GPLv2, interpreted as "or later"; often mixed with GPLv3 data at compile time).
- **Apertium French-Catalan pair**: newly relevant for French glosses. GPL. Verify the exact package name before depending on it.
- **Softcatalà catalan-dict-tools**: dual LGPL-2.1 and GPL-2, and the dictionary data itself carries this licence.
- **verbecc**: dual LGPL-3.0 / GPL-3.0; its Catalan verb list is imported from the catverbs project (github.com/bpeel/catverbs), an extra upstream provenance to check.
- **verbs.cat** (the website): no visible licence; treat as all rights reserved.
- **SUBTLEX-CAT**: academic supplementary material, no explicit reuse licence.
- **Termcat**: newly relevant, since many records carry French equivalents. Check per-resource terms.

## Details

### 1. Current Claude Code feature set and best practice

#### CLAUDE.md memory files
Hierarchy, broadest to narrowest (narrower wins on conflict): enterprise/managed policy, then project (`./CLAUDE.md`), then user (`~/.claude/CLAUDE.md`), then local (`CLAUDE.local.md`, gitignored). Files in directories above the working directory load in full at launch; subdirectory CLAUDE.md files load on demand.

What belongs in it: build/test commands, non-obvious conventions, invariants, pitfalls, rationale that differs from tool defaults. What does not: anything Claude can derive from the codebase. Keep under ~200 lines; longer files still load fully but adherence drops.

Keep it lean by using `@path` imports for optional detail, putting path-scoped rules in `.claude/rules/`, and using the `#` shortcut in-session to append a durable instruction.

The hard truth: CLAUDE.md is advisory context, not enforcement. Both the closed-vocabulary invariant and the French/English language split must additionally be enforced by hook and test, because instructions in CLAUDE.md are followed most of the time, not every time. The language split is particularly prone to drift: an agent that has been writing British English code comments for twenty minutes will happily write an English UI string.

#### Plan mode and extended thinking
Enter plan mode with Shift+Tab (cycles Normal, Auto-accept, Plan), the `/plan` command, or `claude --permission-mode plan`. It is a hard read-only constraint: read tools available, all write tools blocked until you approve. Use it for multi-file changes, unfamiliar code and schema changes; skip it for single-file edits. Extended thinking is orthogonal. Note a known Windows issue in some 2.1.x builds where Shift+Tab skips plan mode; use `/plan` instead.

#### Subagents
Markdown files in `.claude/agents/` (project) or `~/.claude/agents/` (user), with YAML frontmatter: `name`, `description`, optional `tools`, `model`, `effort`, `permissionMode`, `isolation: worktree`, and `skills:`. Each subagent gets its own context window; only its final summary returns to the parent.

Delegation helps when a side task would flood the main context (bulk file reads, dataset ingestion) or needs parallelism; it hurts when the task is small. The cost is real: Anthropic's "How we built our multi-agent research system" (June 2025) states multi-agent systems use about 15x more tokens than chat interactions, single agents about 4x, and describes a lead agent spinning up 3 to 5 specialised subagents in parallel.

#### Skills vs subagents vs slash commands
Skills are folder-based (`SKILL.md` plus optional scripts/assets) in `.claude/skills/`, loaded by progressive disclosure. Since April 2026 slash commands are merged into skills. Use a Skill for reusable procedural expertise; a subagent when you need context isolation or parallelism; a hook when you need a deterministic guarantee.

For this project author two skills:
- `catalan-taxonomy`: the schema, domain codes, the closed-vocabulary rule.
- `fr-metalanguage`: **new, and worth its own skill.** The French grammatical terminology conventions (*pronoms faibles*, *passé périphrastique*, *gérondif*), the `contrast_fr` status definitions and how to assign them, and French typographic rules for UI copy. This keeps a body of knowledge that is relevant on every seeding task out of the always-on CLAUDE.md budget, and it is the knowledge the agent is most likely to get subtly wrong.

#### Custom slash commands
Authored as `.claude/commands/*.md` (unified with skills), with `argument-hint`, `description`, `allowed-tools` frontmatter, and `$ARGUMENTS` substitution. Good for deterministic parameterised workflows: `/eval`, `/seed-domain VERB`, `/validate-ids`, `/check-glosses`.

#### Hooks
Configured in `.claude/settings.json`. For this project:
- `PostToolUse` matcher `Write|Edit`: run Prettier/ESLint on the changed file.
- `PostToolUse`: if the edited file is `taxonomy.json` or a schema file, run the ID validator **and the gloss-completeness check**.
- `PreToolUse` matcher `Bash`: block `rm -rf`, `git push --force`, and any command touching the API key.
- `PreToolUse` matched to Read: block reading `.env` or key files (exit code 2).
- `Stop`: run the test suite so a turn cannot finish red.

#### Settings and permissions
`.claude/settings.json` (project, committed), `~/.claude/settings.json` (user), `.claude/settings.local.json` (personal, gitignored). Permission modes: default, acceptEdits, plan, bypassPermissions. `--dangerously-skip-permissions` removes guardrails; acceptable only in disposable CI containers, never on a machine holding your Anthropic key. Sandboxed bash (October 2025) is the safer middle ground.

#### MCP servers
Configured via `claude mcp add` or `.mcp.json`. A **Playwright/Chrome MCP** is genuinely useful for the screenshot-and-iterate UI loop, and more so with French UI copy, since French strings run longer than English and will break layouts that looked fine in draft. A GitHub MCP is marginal for a single-user repo. Stateful MCP servers need one instance per worktree if you parallelise.

#### Checkpointing, /rewind, context hygiene
Claude Code auto-checkpoints before every file edit. `/rewind` (or Esc+Esc on an empty prompt) restores conversation, code, or both. `/clear` wipes conversation but keeps code changes; `/compact` compresses and continues (lossy). Rule of thumb: after two failed corrections on the same issue, `/rewind` to before the first wrong turn rather than piling on corrections. `/clear` between unrelated tasks. CLAUDE.md reloads after `/clear` and re-injects after `/compact`.

#### Headless mode and GitHub Actions
`claude -p "prompt"` runs non-interactively; `--output-format json` gives parseable output with `total_cost_usd`. In CI use `anthropics/claude-code-action`, put the key in an Actions secret, and constrain prompts tightly. The app's own deploy does not need Claude in CI at all; keep the deploy workflow plain.

#### Multi-agent patterns
Native `--worktree` support shipped v2.1.49 (February 2026); subagents can set `isolation: worktree`. The canonical loop is explore, plan, code, commit, with TDD and verification loops layered in. For a project this size you rarely need more than 2 to 3 parallel agents, capped by your review capacity.

### 2. Structuring this repository for agentic development

#### Proposed repo layout
```
francais-catalan/
  .claude/
    settings.json            # hooks, permission allow/deny, formatter gates
    settings.local.json      # gitignored: personal overrides
    agents/
      taxonomy-seeder.md      # ingests one dataset, emits taxonomy fragment
      gloss-author.md         # authors glosses.fr + contrast_fr for a domain
      schema-validator.md     # checks every referenced component ID exists
      prompt-eval.md          # runs golden-set eval, reports pass/fail
    skills/
      catalan-taxonomy/SKILL.md   # schema, domain codes, closed-vocab rule
      fr-metalanguage/SKILL.md    # FR grammar terms, contrast_fr, typography
    commands/
      validate-ids.md
      check-glosses.md
      seed-domain.md
      eval.md
    rules/
      ui-copy.md              # French copy + FR typography, scoped to src/ui
      code-style.md           # British English, scoped to src/ and docs
  CLAUDE.md
  CLAUDE.local.md            # gitignored
  .gitignore
  index.html
  vite.config.ts
  package.json
  tsconfig.json
  public/
    .nojekyll
  src/
    api/anthropic.ts         # buildHeaders, callHaiku, prompt-caching wiring
    api/schema.ts            # generated JSON schema (enums from taxonomy)
    db/dexie.ts
    i18n/fr.ts               # UI string table
    srs/fsrs.ts              # ts-fsrs wrapper + Elo
    srs/elo.ts
    ui/                      # decomposition view, coverage heatmap (SVG)
    taxonomy/
      taxonomy.json          # generated artefact (large; keep out of context)
      taxonomy.schema.json
      build-taxonomy.ts      # deterministic assembler from data/ fragments
  data/                      # raw extracted facts per domain (fragments)
  test/
    setup.ts                 # fake-indexeddb/auto
    golden/                  # golden-set phrases + expected decompositions
    fixtures/                # recorded API responses for offline eval
  scripts/
    validate-ids.ts
    check-glosses.ts         # every leaf has glosses.fr and contrast_fr
    gen-schema.ts            # taxonomy.json -> schema.ts enums
  .github/workflows/deploy.yml
```

#### What to put in CLAUDE.md
```md
# Catalan Trainer - project memory

## Build / test
- Dev: `npm run dev`  Build: `npm run build`  Preview: `npm run preview`
- Test: `npm test` (vitest). Single file: `npm test -- test/foo.test.ts`
- Regenerate schema after taxonomy edits: `npm run gen-schema`
- Validate IDs: `npm run validate-ids`
- Check gloss coverage: `npm run check-glosses`

## Languages (two different things, do not conflate)
- BASE LANGUAGE is FRENCH. All UI copy, all model-generated explanation
  text, all `glosses.fr` and `notes` fields are in French, using French
  grammatical terminology (pronoms faibles, passe periphrastique, gerondif).
- REPO LANGUAGE is BRITISH ENGLISH. Code, identifiers, comments, docs,
  commit messages, test names. Spelling: colour, organise, licence (noun).
- Catalan surface forms and examples stay in Catalan, never translated.
- No em-dashes anywhere. Use commas, parentheses, or a full stop.
- French typography in UI copy: guillemets « » not quotes, and a narrow
  no-break space before : ; ! ?

## Hard invariants (enforced by test + hook, not just here)
- The component-ID vocabulary is CLOSED. Every ID emitted by the model,
  referenced in UI, DB, or tests MUST exist in src/taxonomy/taxonomy.json.
  New IDs are added ONLY by editing taxonomy.json then running gen-schema.
- Glosses are a KEYED MAP (`glosses: {fr: "..."}`), never a flat field.
- Every leaf node MUST have `glosses.fr` and `contrast_fr`.
  contrast_fr.status is one of: transfer | near-miss | false-friend | novel.
- The API schema enums are GENERATED from taxonomy.json. Never hand-edit
  src/api/schema.ts.
- The `decomposition` array is LANGUAGE-INVARIANT: component IDs and Catalan
  forms only. Only the `answer` field is French. Never put French prose in
  the decomposition.
- taxonomy.json is large. Do NOT read it wholesale into context. Query it
  with scripts or grep for specific IDs/domains.

## Conventions
- Vanilla TS + Vite. No framework unless a task explicitly approves one.
- API key is runtime-entered into localStorage. NEVER hardcode or commit.
- Anthropic calls: model claude-haiku-4-5, structured outputs beta header,
  taxonomy sent as a cached prompt prefix.

## Domains (see catalan-taxonomy skill for full schema)
PHON NOM ART VERB PRON DET PREP ADV CONJ NEG SYN LEX
```

#### Which parts become commands, skills or subagents
| Work | Mechanism | Why |
|---|---|---|
| Taxonomy schema, domain codes, closed-vocab rule | Skill (`catalan-taxonomy`) | Reusable, keep off CLAUDE.md budget |
| French terminology, contrast_fr rubric, FR typography | Skill (`fr-metalanguage`) | Needed on every seeding task, easy to get subtly wrong |
| Ingest one dataset, emit JSON fragment | Subagent (`taxonomy-seeder`) | Bulk reads flood context |
| Author glosses.fr + contrast_fr for a domain | Subagent (`gloss-author`) | Separate concern from structural seeding; different skill set, different review criteria |
| Check all referenced IDs exist | Subagent + `/validate-ids` + `PostToolUse` hook | Deterministic guarantee at three layers |
| Check every leaf has glosses.fr + contrast_fr | `/check-glosses` + `PostToolUse` hook | Catches the most likely French-specific regression |
| Golden-set eval | Subagent (`prompt-eval`) + `/eval` | Isolatable, repeatable |
| Format/lint on edit | Hook (`PostToolUse`) | Must run every time |
| Test gate on turn end | Hook (`Stop`) | Cannot finish red |
| Evidence-to-signal routing | Executable table (`src/srs/evidence.ts`) + test | One authoritative home; prose copies drift and the prose is what gets believed |

Splitting structural seeding from gloss authoring is worth doing deliberately. They fail differently: a bad structural seed produces a missing or duplicated node, which tests catch; a bad gloss produces plausible-looking wrong French, which only you can catch. Keeping them as separate passes means the gloss review is a distinct, reviewable diff rather than buried inside a 400-node structural commit.

#### Making the work verifiable
Write these tests first, in this order:
1. **Taxonomy schema snapshot test**: assert `taxonomy.json` validates against `taxonomy.schema.json`; snapshot the set of domain codes and leaf-node count so drift fails loudly.
2. **Closed-vocabulary test**: enumerate every ID referenced in `src/` and `test/`; assert each exists in the taxonomy. The single most important invariant test.
3. **Gloss-completeness test**: every leaf has a non-empty `glosses.fr` and a `contrast_fr` with a status from the allowed enum. Cheap, and catches the commonest French-specific regression.
4. **Schema-generation test**: assert `gen-schema` output matches committed `schema.ts`.
5. **Golden-set eval**: 30 to 60 hand-curated Catalan phrases, each with an expected decomposition. Weight the set toward the French-specific risk areas: clitic combinations with both a CI and a CD (where French ordering instinct misfires), passat perifràstic forms (the false friend), and `pas` sentences. Assert: (a) output validates against the schema, (b) no out-of-vocabulary tag ever appears, (c) key expected components are present, (d) `answer_lang` is `fr`. **Do not assert on the French prose itself.** Constrained decoding already makes out-of-vocab enums impossible, so (b) guards against schema/taxonomy drift rather than model misbehaviour.
6. **Evidence-routing test**: a `lookup` leaves FSRS state byte-identical, a `recall` moves Elo but not FSRS, a `graded` event moves both, and a rating is present exactly when the evidence is `graded`. Assert against `EVIDENCE_EFFECTS` in `src/srs/evidence.ts` rather than restating the rules in the test. This is the invariant most likely to be violated silently: routing lookups into FSRS still produces a heatmap that looks entirely plausible, and no other test would notice.
7. **FSRS/Elo unit tests**: deterministic state transitions given fixed ratings, including that `contrast_fr.status` maps to the intended initial difficulty.

### 3. Phased, prompt-level build sequence

Each prompt below is labelled for how it should be used:

- **[VERBATIM]** - paste as-is. Every fact in it has been checked against the repo as it currently stands.
- **[ADAPT]** - read the repo first, then adjust. These depend on outputs that do not exist yet (which domains were seeded, what the taxonomy actually contains, what the previous phase produced), so a prompt claiming to be paste-ready would be false precision.
- **[DONE]** - already built. Kept for the record; do not re-run.

Two rules apply to every phase and are not repeated in each prompt:

1. **Update `TASKS.md` in the same commit as the work.** It is the only place recording where the build is up to.
2. **Invariants are referenced, never restated.** Assert against `EVIDENCE_EFFECTS` in `src/srs/evidence.ts`, `taxonomy.schema.json` and `data/contrast-overrides.json` rather than copying their content into a test, a doc or a prompt.

**Phase 0 - Scaffold (plan-mode-first, then execute). [DONE]** Closed by `c8a3e14`, `f6d0a21`, `1c4cc7d`. Kept for the record.
```
Plan only, do not edit yet. Propose a minimal Vite + vanilla-TypeScript
project scaffold for a single-user static web app deployed to GitHub Pages
at base path /francais-catalan/. Include vitest with a fake-indexeddb setup
file, Dexie, ts-fsrs, ESLint + Prettier, an src/i18n/fr.ts string table,
and the .claude/ directory layout from CLAUDE.md. List every file you will
create and the exact package.json scripts. Do not add any framework.
```

**Phase 1 - Taxonomy schema and closed-vocabulary machinery (TDD). [VERBATIM]** New session, `/clear`.
```
TDD. First write failing tests: (1) taxonomy.json validates against
taxonomy.schema.json; (2) a closed-vocabulary test scanning src/ and test/
for component IDs, asserting each exists in taxonomy.json; (3) a
gloss-completeness test asserting every leaf has a non-empty glosses.fr and
a contrast_fr whose status is one of transfer|near-miss|false-friend|novel;
(4) gen-schema output matches committed schema.ts; (5) an evidence-routing
test asserting a lookup leaves FSRS state byte-identical, a recall moves Elo
but not FSRS, and a graded event moves both. Assert against EVIDENCE_EFFECTS
in src/srs/evidence.ts rather than restating the routing in the test.

Then write taxonomy.schema.json. Leaf nodes carry: id, ca, glosses (a KEYED
MAP, e.g. {"fr": "..."}, not a flat field), cefr, parent, examples[], notes,
dialect_note, contrast_fr {status, note}, and mastery state. Mastery state
separates EXPOSURE (exposure_count, moved by any encounter) from MASTERY
(FSRS stability and difficulty, plus graded_review_count, moved only by
graded evidence).

Then write the logged-query schema. Every logged query carries intent
(comprehend|produce|teach|assess|pronounce), direction (ca_to_fr|fr_to_ca),
evidence (lookup|recall|graded), and rating (again|hard|good|easy) if and
only if evidence is graded. All five intents emit the SAME decomposition
payload; only the prompt and the surrounding fields differ. Component
entries may carry an optional language-invariant `ipa`. The MVP will use
only comprehend and produce, but the schema must accept all five now.

Then a 10-node seed taxonomy.json covering two domains. Fill in the bodies of
scripts/gen-schema.ts, scripts/validate-ids.ts and scripts/check-glosses.ts,
which already exist as exit-0 stubs; do not recreate them. Make all tests
pass, then update TASKS.md in the same commit.
```
The keyed gloss map, `contrast_fr`, and the intent/direction/evidence triple must all land here. Retrofitting any of them later is the genuinely painful rework in this plan: the first two across several hundred nodes, the third across a live query log where the missing values cannot be reconstructed after the fact.

The evidence routing itself lives in `src/srs/evidence.ts` as an executable table (`EVIDENCE_EFFECTS`), not as prose in a document. Reference it; do not restate it.

**The unit of work is the domain, not the phase.** 2a and 2b run back to back on one domain and land in a single commit. They are still two passes with two subagents and two review points, but the repo is never committed in the state between them.

This is a correction forced by phase 1, and it matters. The earlier version of 2a below said to leave `glosses.fr` and `contrast_fr` as empty placeholders for 2b to fill. Phase 1 made both fields required with `minLength: 1`, and `check-glosses` additionally rejects anything matching `/^(todo|tbd|placeholder|à faire)/i`. A structure-only fragment therefore fails schema validation, fails `check-glosses`, blocks the seeding subagent's own turn through the `PostToolUse` hook, and reddens CI. It cannot be committed, and that is the invariant working rather than failing: it is refusing to let a half-authored domain look finished.

Do not work around this by excluding un-glossed fragments from the merge or flagging them as drafts. That creates a class of taxonomy data the checks deliberately cannot see.

Run `/clear` between domains, not between 2a and 2b on the same domain: 2b needs 2a's output in context.

**Phase 2a - Structural seeding (delegate to subagent). [ADAPT]** Substitute the domain, and read `data/sources.md` first: what facts are available differs per domain, and the prompt below assumes VERB. `NOM` and `ART` are worked examples of the per-domain notes section; follow their shape, and state the licence position explicitly rather than by omission.

The marker paragraph in the prompt below is now redundant: `.claude/agents/taxonomy-seeder.md` carries the rule, including that the marker is written in British English precisely so that 2b cannot mistake it for an authored gloss. It is left here because a prompt that silently depends on an agent file is a prompt that breaks quietly when the agent file changes.
```
Use the taxonomy-seeder subagent. For domain VERB only: read the notes in
data/sources.md, extract the FACTS we need (lemmas, conjugation classes,
tense labels) and hand-author original taxonomy leaf nodes against
src/taxonomy/taxonomy.schema.json. Do NOT copy any source data file
verbatim into the repo. Record the extracted facts in data/sources.md under
a section for this domain.

Author placeholder glosses.fr and contrast_fr good enough to satisfy the
schema, and mark them for the 2b pass; do NOT leave them empty, and do NOT
use the words todo, tbd or placeholder, both of which fail check-glosses
and will block your turn.

Emit data/verb.fragment.json, then run gen-schema and validate-ids. Do not
edit src/taxonomy/taxonomy.json; it is generated and a hook will block you.
Report the node count, the tree shape, and any IDs that failed validation.
```
Review the node list before running 2b. A wrong ID is a migration later, because IDs are keys in the database, the generated enums and the golden set.

**Phase 2b - Gloss and contrast authoring (separate pass, separate subagent). [ADAPT]** Same session as 2a for that domain. The pre-assigned nodes now live in `data/contrast-overrides.json` and are applied from there. Do not restate them in the prompt; the list below is reproduced only to show what the file contains.
```
Use the gloss-author subagent with the fr-metalanguage skill. For domain
VERB only: for every leaf in data/verb.fragment.json, replace the
placeholder glosses.fr with a real gloss in French grammatical terminology,
and assign contrast_fr with a status and a one-line note explaining the
relationship to French.

Apply data/contrast-overrides.json verbatim for the nodes it covers,
including its wildcards. Do not re-derive those statuses or reword those
notes; if you think one is wrong, say so rather than changing it.

Where docs/01 assigns a status to a domain code, that status binds the
leaves realising that row, and does NOT propagate to every descendant the
way an overrides wildcard does. The docs/01 rows predate the seeded tree.
Judge the remaining leaves and mark in your report which is which.

Then run gen-schema and check-glosses. Output a table of every node with
its assigned status so I can review the assignments in one place.
```
Review that table yourself. This is the step where the model will be confidently wrong in ways no test catches.

Then commit: the fragment, the regenerated `taxonomy.json` and `schema.ts`, the `data/sources.md` section, and the domain's row in `TASKS.md`, together.

Legal note to bake into `data/sources.md`: Apertium is GPL-2+, catalan-dict-tools is dual LGPL-2.1/GPL-2, verbecc is dual LGPL-3.0/GPL-3.0 (Catalan list sourced from catverbs), SUBTLEX-CAT has no reuse grant, verbs.cat has no licence. Extract facts and re-express; do not copy files. GPLv2 reaches "works based on the Program", and facts are not copyrightable under the Feist doctrine, so re-authored facts are generally not derivative. Two dangers remain: verbatim copying of a curated list can carry thin compilation copyright, and the EU sui generis database right (Softcatalà and AnCora are Spain-based) can restrict extraction of a substantial part of a database even of non-copyrightable facts. Keep extraction fact-level and hand-authored.

**Phase 3 - JSON schema with hundreds of enums (generate, never hand-write). [VERBATIM]**
```
Extend gen-schema so the decomposition tool's input_schema draws every
component-ID field's enum from taxonomy.json (flattened leaf IDs). Add an
answer_lang field with enum ["fr"]. Set additionalProperties:false on every
object and list all properties in required, per Anthropic strict-schema
rules. The decomposition array must contain only component IDs and Catalan
surface forms, never French prose. Regenerate schema.ts and make the
schema-generation test pass.
```

**Phase 4 - API client and prompt caching (plan-mode-first). [ADAPT]** `src/api/anthropic.ts` already exists with `buildHeaders`, `readApiKey`/`storeApiKey`, the `Decomposition` type and an injectable `fetchFn` on `callHaiku`. Extend it; do not rewrite from scratch. Check the taxonomy's actual token count before assuming the cached prefix clears Haiku's 4,096-token minimum.
```
Plan then implement src/api/anthropic.ts. Headers: x-api-key from
localStorage, anthropic-version 2023-06-01,
anthropic-dangerous-direct-browser-access true, and the structured-outputs
beta header. Model claude-haiku-4-5.

System prompt (in the cached block) instructs: answer in French using
French grammatical terminology; keep Catalan forms and examples in Catalan;
emit only component IDs from the supplied vocabulary. Send the taxonomy as
a large static system block marked with cache_control as the last static
breakpoint, then the user question as the dynamic suffix. Send only
glosses.fr in the cached block, not the whole glosses map, to keep the
prefix small.

Use output_config.format (json_schema) with our generated schema; fall back
to output_format if the stable field errors. Return the parsed
decomposition. Add a unit test using a recorded fixture, no live call.
```
Verify the cache is actually hit: log `cache_read_input_tokens` during development. If it stays zero, the prefix is not byte-stable or it is under the 4,096-token Haiku minimum.

**Phase 5 - Persistence, FSRS, Elo (TDD). [ADAPT]** `/clear`. `src/db/dexie.ts` already defines `ComponentMastery` and `QueryLog` with the exposure, mastery and evidence fields, and `src/srs/fsrs.ts` already carries `INITIAL_DIFFICULTY` and the `assertAdvancesFsrs` gate. Extend those; check them before writing.
```
TDD. Wrap ts-fsrs for per-component mastery, routing each logged query by
its evidence type through EVIDENCE_EFFECTS in src/srs/evidence.ts, which is
authoritative. The FSRS wrapper accepts ONLY evidence that table marks
FSRS-advancing and throws otherwise; exposure and Elo update on their own
paths, independently of FSRS.

Seed each component's INITIAL difficulty from contrast_fr.status: transfer
-> low, near-miss and false-friend -> high, novel -> high. Store in Dexie,
keeping exposure_count and graded_review_count as separate fields from the
FSRS state. Add JSON export/import.

Tests run under fake-indexeddb and must assert both the
contrast_fr-to-initial-difficulty mapping and the full evidence routing:
lookup leaves FSRS state byte-identical, recall moves Elo but not FSRS,
graded moves both.
```
The routing is the invariant most likely to be violated silently, because getting it wrong still produces a plausible-looking heatmap. Nothing but the test will catch it.

**Phase 5b - Review loop (TDD). [ADAPT] Not optional.** Until this exists, nothing anywhere emits `graded` evidence, so FSRS never advances and the mastery model is inert.
```
TDD. Build the review loop: select an item, ask, take the answer, grade it
again|hard|good|easy. The grade is the ONLY source of graded evidence in the
whole application.

Selection must be a PLUGGABLE FUNCTION, not hardcoded. Ship one selector,
`due`, weighting FSRS due dates plus contrast_fr-weighted gaps so novel and
false-friend nodes surface above transfer ones.

A second selector, `assess`, arrives in a later phase and weights unpractised
and unexplored nodes instead. That is the whole of the `assess` intent: the
same asking, answering and grading machinery under a different selection
function. Do NOT build assessment as a separate subsystem.

Tests assert that a completed review writes exactly one graded event with a
rating, and that the selector interface admits a second implementation
without touching the loop.
```

**Phase 6 - UI and coverage heatmap (screenshot-and-iterate). [ADAPT]** `src/i18n/fr.ts` already holds the heatmap legend strings and a `quote()` helper; add to the table rather than starting one.
```
Build the decomposition view and an SVG coverage heatmap over the taxonomy
tree. Exposure and mastery are TWO DIMENSIONS, never one colour: hue carries
mastery, opacity carries exposure. A node known well but rarely met reads as
pale green; one met often but still weak reads as solid red. Label both
dimensions in the legend.

The gaps list distinguishes UNEXPLORED (zero exposure) from UNPRACTISED
(exposure above zero, zero graded reviews). Rank within each by
contrast_fr.status so novel and false-friend gaps sort above transfer gaps.

Add attempt-then-reveal to the produce view: the user may type a Catalan
attempt before revealing the answer. The attempt is auto-compared against the
reference, normalised for case, accents and the straight-apostrophe policy,
and emits a `recall` event carrying that objective outcome. Never ask the
user to rate themselves here; an unrated attempt is what keeps recall
distinct from graded. Revealing without attempting is a `lookup`.

All UI copy in French from src/i18n/fr.ts, using guillemets and narrow
no-break spaces before : ; ! ?. After building, take a screenshot and iterate
until the heatmap is legible. Check that French string lengths do not
overflow any container.
```

**Phase 6b - Pronunciation (text first, audio only if a voice exists). [ADAPT]**
```
For any Catalan word or sentence, return IPA plus a French-oriented
respelling. IPA attaches PER COMPONENT in the decomposition, where it belongs
because it is language-invariant. The respelling is whole-utterance and sits
in a sibling block outside the decomposition, because it is French and the
decomposition forbids French.

The respelling spells Catalan pronunciation using French spelling
conventions, so a French reader can simply read it aloud. It must make
visible the two things a French reader gets wrong:
- Central Catalan vowel reduction: unstressed a/e -> schwa, written "eu" as
  in bleu; unstressed o -> [u]. So Barcelona is "beur-seu-LO-neu", never
  "bar-ce-lo-na".
- Final devoicing: fred is "frèt" with a hard final [t], not a French -de.

Audio is PROGRESSIVE ENHANCEMENT, not a requirement. Enumerate voices after
the voiceschanged event, look for a ca-* voice, and when none is found hide
the audio control and show a French line explaining how to install one.
NEVER fall back to a Spanish or French voice reading Catalan text: it
produces confidently wrong pronunciation, which is the worst possible
outcome for a contrastive tool.
```
Browser support was checked rather than assumed, in August 2026. Catalan `ca-ES` voices exist on every major platform: Microsoft Herena on Windows; Montse, Jordi and Pau on macOS and iOS; a Google network voice on Android and Chrome OS; and two Microsoft Online Natural voices at higher quality. **None of them is present by default**, and every one needs an OS-level language or speech pack the app cannot install. A spot check of one Windows runtime found nine voices, none Catalan and none even Spanish. Treat audio as a bonus that is usually absent, and design the text output to stand alone.

**Phase 7 - Vite + GitHub Pages deploy. [DONE, except one manual step]** Built in Phase 0 (`1c4cc7d`), pulled forward because the workflow was cheap to add early.

Already in place: `base: '/francais-catalan/'` in `vite.config.ts`, `public/.nojekyll`, `<html lang="fr">`, and `.github/workflows/deploy.yml` using configure-pages, upload-pages-artifact (`./dist`) and deploy-pages, with `contents:read pages:write id-token:write` and a `concurrency: group: pages` block.

**What remains is not a prompt.** Set repo Settings, Pages, Source to "GitHub Actions". No agent can do it, and until it is done the deploy workflow builds successfully and publishes nothing.

> The original prompt for this phase said `base '/catalan-trainer/'`. That was a placeholder from the research draft and is wrong for this repo: the base must match the repository name or every asset 404s. Recorded here because the wrong value is the kind of thing that gets pasted back in from an old note.

### 4. Specific technical gotchas

**Vite + GitHub Pages.**
- `base` must be `/<repo>/` (here `/francais-catalan/`) or all asset URLs 404. Use `/` only for a `user.github.io` root repo.
- Set repo Settings, Pages, Source to "GitHub Actions". A manual one-time step the agent cannot do.
- Workflow needs `permissions: contents:read, pages:write, id-token:write` and a `concurrency: group: pages` block.
- `.nojekyll`: place it in `public/` so Vite copies it to `dist/`; without it any files or directories starting with `_` are stripped.
- SPA routing: this app is effectively single-view. If you add routing, Pages has no server rewrites, so use hash routing or a `404.html` fallback.
- Set `<html lang="fr">` so screen readers and browser translation behave.

**Testing IndexedDB/Dexie under Node.** Use `fake-indexeddb`. In vitest, `import 'fake-indexeddb/auto'` in a setup file referenced by `test.setupFiles` in `vitest.config.ts`. The common failure is expecting Jest's implicit `setupFiles` behaviour; vitest requires it explicitly. fake-indexeddb v5+ dropped the `structuredClone` polyfill, which matters under jsdom. For a fresh DB per test, construct a new `IDBFactory`.

**Mocking the Anthropic API in tests.** Record real responses once into `test/fixtures/` and have `callHaiku` accept an injectable `fetchFn`, so tests pass a stub returning fixtures. This keeps the golden-set eval fully offline and free. For a cheap live eval, run the same set against the real API behind an env flag (`LIVE_EVAL=1`), capped to a handful of phrases; with a cached prefix a 50-phrase live pass costs cents.

**Non-ASCII in fixtures and tests.** French accents and guillemets, plus Catalan `l·l` and apostrophes, will all appear in test data. Ensure the repo is UTF-8 throughout, and prefer the typographic apostrophe policy you pick (straight `'` in Catalan forms is conventional) to be stated in CLAUDE.md, or you will get inconsistent forms that break exact-match assertions. This is a small thing that wastes an hour if unaddressed.

**Keeping the API key out of git.** The key is never built in; it is entered at runtime. `.gitignore` `CLAUDE.local.md`, `.claude/settings.local.json`, `.env*`, and any live fixtures. Add a `PreToolUse` hook blocking reads of `.env` or key files.

**Not burning tokens re-reading taxonomy.json.** The key context-hygiene rule:
- Treat `taxonomy.json` as a generated artefact, not source. State this in CLAUDE.md.
- Give the agent scripts (`validate-ids`, `check-glosses`, a `grep-id` helper) so it queries by ID or domain rather than loading the file.
- Put schema and terminology knowledge in the two skills so it is available without the raw file.
- Seed one domain per subagent so no single context holds the whole taxonomy.
- Note that adding `glosses.fr`, `notes` and `contrast_fr` roughly doubles the byte size of the taxonomy versus a bare structural version, which makes this rule more important, not less. It also pushes the cached prefix comfortably over Haiku's 4,096-token minimum, which is a small bonus.

### 5. Fit with the existing oversight tooling

The oversight orchestration (planner/executor/auditor/amender over persistent disk state with cold subagent sessions) and the taskspace file-based protocol overlap heavily with what stock Claude Code now ships:

| Bespoke capability | Stock 2026 equivalent | Verdict |
|---|---|---|
| Planner (cold) | Plan mode, hard read-only | Stock sufficient |
| Executor | Main session / general-purpose agent | Stock sufficient |
| Auditor | `schema-validator` and `prompt-eval` subagents; `Stop`/`PostToolUse` hooks | Stock sufficient, and hooks give guarantees a prompt-based auditor cannot |
| Amender | `/rewind` plus re-prompt | Stock has caught up |
| Persistent disk state | CLAUDE.md, auto-memory, git, JSON export | Stock sufficient for single-user |
| taskspace task files | TodoWrite plus a checked-in `TASKS.md` | Stock adequate at this scale |

Where the bespoke rig still earns its keep:
- **Phase 2 (seeding), and more so now that it is two passes across twelve domains.** It is long-running, repetitive, and needs an independent auditor that never shares context with the executor, to catch verbatim copying, out-of-vocab IDs, and, newly, wrong `contrast_fr` assignments. The seed, audit, amend, re-audit cycle across twenty-four fragment passes is exactly the shape the oversight pattern was built for.
- **The prompt-eval harness**, which benefits from persistent versioned eval state across sessions, tracking which golden phrases regressed over time. The taskspace file protocol handles this more durably than in-session todos.

Where stock is equal or better and the rig adds overhead not worth paying: Phases 0, 1, 3, 5, 6 and 7 are ordinary TDD and plan-mode work. Driving these through four-role orchestration costs real tokens (Anthropic's own figure is roughly 15x for multi-agent versus chat) and coordination latency for no quality gain.

Honest recommendation: stock plan mode, TDD and hooks for the bulk; the oversight pattern for Phase 2 and the eval harness only.

## Recommendations
1. **Start with the invariant machinery, not the app.** Closed-vocabulary test, gloss-completeness test, schema snapshot and gen-schema pipeline, all in Phase 1.
2. **Land the keyed gloss map and `contrast_fr` in Phase 1.** These are the only structural changes French forces, and both are cheap now and painful later.
3. **Split structural seeding from gloss authoring into two passes with two subagents.** They fail differently, and only one of the two failure modes is catchable by test.
4. **Split the language rule in CLAUDE.md and back it with a path-scoped rule file.** French for UI and model output, British English for code and docs. Expect drift; the `.claude/rules/` scoping is what actually holds the line.
5. **Enforce the vocabulary at three layers**: constrained decoding, CI test, edit-time hook.
6. **Weight the golden set toward French-specific risk**: CI+CD clitic combinations, passat perifràstic, `pas`. Assert on codes, never on French prose.
7. **Keep the deploy workflow plain.** No Claude in the critical deploy path; add a separate optional Haiku-powered review job if you want it.
8. **Reserve the oversight rig for Phase 2 and the eval harness.**

**Thresholds that change the plan:**
- If Haiku 4.5 structured-output support regresses or the beta header changes, fall back to forced tool use (`tool_choice: {type:"tool"}`) with `strict:true`, which gives the same enum guarantee.
- If the taxonomy with French glosses grows past a few tens of thousands of tokens such that cached reads dominate cost, route first and decompose second: one cheap call picks the relevant domain subtree, the second call sends only that subtree.
- If you later want an English mode, the keyed gloss map means adding `glosses.en` is additive. Do not build it until you want it.

## Caveats
- Claude Code version-specific behaviour changes weekly; reconfirm every version-tagged claim against the current documentation. Fast-movers: default model, `/agents` wizard removal, worktree isolation semantics, `/doctor` trim availability.
- Structured Outputs is a beta feature and the stable API is migrating `output_format` to `output_config.format`; verify both the header value and the parameter name, and that `claude-haiku-4-5` remains supported.
- **The `contrast_fr` assignments given in the seeding prompts are analysis, not sourced from a published French-Catalan contrastive grammar.** They are a strong starting hypothesis. Revise them against your own error data, which is what the mastery tracking exists to produce.
- **French-Catalan pedagogical resources are thinner** than Spanish-Catalan or English-Catalan, so the model is doing more original work on glosses than it would in an English build. Review the gloss-authoring output more carefully than you would review structural seeding.
- UD_Catalan-AnCora licence is reported as CC BY 4.0 in the UD distribution but the treebank README references an inherited GNU licence. Treat conservatively: fact extraction, not file copying.
- SUBTLEX-CAT and verbs.cat carry no explicit reuse grant. verbecc's Catalan data derives from catverbs, whose own terms should be checked upstream.
- The licensing analysis is a research aid, not legal advice. Facts are generally not copyrightable and GPL reaches only derivative works, but compilation copyright and the EU sui generis database right add risk for bulk extraction. For any distributed use, get a lawyer's opinion.
