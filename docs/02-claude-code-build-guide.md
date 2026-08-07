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
catalan-trainer/
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

Splitting structural seeding from gloss authoring is worth doing deliberately. They fail differently: a bad structural seed produces a missing or duplicated node, which tests catch; a bad gloss produces plausible-looking wrong French, which only you can catch. Keeping them as separate passes means the gloss review is a distinct, reviewable diff rather than buried inside a 400-node structural commit.

#### Making the work verifiable
Write these tests first, in this order:
1. **Taxonomy schema snapshot test**: assert `taxonomy.json` validates against `taxonomy.schema.json`; snapshot the set of domain codes and leaf-node count so drift fails loudly.
2. **Closed-vocabulary test**: enumerate every ID referenced in `src/` and `test/`; assert each exists in the taxonomy. The single most important invariant test.
3. **Gloss-completeness test**: every leaf has a non-empty `glosses.fr` and a `contrast_fr` with a status from the allowed enum. Cheap, and catches the commonest French-specific regression.
4. **Schema-generation test**: assert `gen-schema` output matches committed `schema.ts`.
5. **Golden-set eval**: 30 to 60 hand-curated Catalan phrases, each with an expected decomposition. Weight the set toward the French-specific risk areas: clitic combinations with both a CI and a CD (where French ordering instinct misfires), passat perifràstic forms (the false friend), and `pas` sentences. Assert: (a) output validates against the schema, (b) no out-of-vocabulary tag ever appears, (c) key expected components are present, (d) `answer_lang` is `fr`. **Do not assert on the French prose itself.** Constrained decoding already makes out-of-vocab enums impossible, so (b) guards against schema/taxonomy drift rather than model misbehaviour.
6. **FSRS/Elo unit tests**: deterministic state transitions given fixed ratings, including that `contrast_fr.status` maps to the intended initial difficulty.

### 3. Phased, prompt-level build sequence

**Phase 0 - Scaffold (plan-mode-first, then execute).** `/clear` before starting.
```
Plan only, do not edit yet. Propose a minimal Vite + vanilla-TypeScript
project scaffold for a single-user static web app deployed to GitHub Pages
at base path /catalan-trainer/. Include vitest with a fake-indexeddb setup
file, Dexie, ts-fsrs, ESLint + Prettier, an src/i18n/fr.ts string table,
and the .claude/ directory layout from CLAUDE.md. List every file you will
create and the exact package.json scripts. Do not add any framework.
```

**Phase 1 - Taxonomy schema and closed-vocabulary machinery (TDD).** New session, `/clear`.
```
TDD. First write failing tests: (1) taxonomy.json validates against
taxonomy.schema.json; (2) a closed-vocabulary test scanning src/ and test/
for component IDs, asserting each exists in taxonomy.json; (3) a
gloss-completeness test asserting every leaf has a non-empty glosses.fr and
a contrast_fr whose status is one of transfer|near-miss|false-friend|novel;
(4) gen-schema output matches committed schema.ts.

Then write taxonomy.schema.json. Leaf nodes carry: id, ca, glosses (a KEYED
MAP, e.g. {"fr": "..."}, not a flat field), cefr, parent, examples[], notes,
dialect_note, contrast_fr {status, note}, and mastery state. Then a 10-node
seed taxonomy.json covering two domains, the gen-schema script, the
validate-ids script, and the check-glosses script. Make all tests pass.
```
The keyed gloss map and `contrast_fr` must land here. Retrofitting either across several hundred nodes later is the one genuinely painful rework in this plan.

**Phase 2a - Structural seeding (delegate to subagent).** One domain at a time, `/clear` between domains.
```
Use the taxonomy-seeder subagent. For domain VERB only: read the notes in
data/sources.md, extract the FACTS we need (lemmas, conjugation classes,
tense labels) and hand-author original taxonomy leaf nodes in our schema.
Do NOT copy any source data file verbatim into the repo. Leave glosses.fr
and contrast_fr as empty placeholders; a separate pass fills those. Emit
data/verb.fragment.json, then run build-taxonomy and validate-ids. Report
the node count and any IDs that failed validation.
```

**Phase 2b - Gloss and contrast authoring (separate pass, separate subagent).**
```
Use the gloss-author subagent with the fr-metalanguage skill. For domain
VERB only: for every leaf in data/verb.fragment.json, author glosses.fr
using French grammatical terminology, and assign contrast_fr with a status
and a one-line note explaining the relationship to French.

Apply these known assignments and do not override them:
- VERB.ind.passat_perifrastic is false-friend. "Vaig cantar" = "j'ai
  chante", NOT "je vais chanter". This is the highest-risk node in the
  taxonomy; the note must state the contrast explicitly.
- VERB.perf.* is transfer (passe compose), with the note that Catalan uses
  haver throughout where French splits avoir/etre.
- VERB.ser_estar is novel. French has only etre.
- VERB.conj.3.incoatiu is near-miss (cf. finir/finissons).

Then run check-glosses. Output a table of every node with its assigned
status so I can review the assignments in one place.
```
Review that table yourself. This is the step where the model will be confidently wrong in ways no test catches.

Legal note to bake into `data/sources.md`: Apertium is GPL-2+, catalan-dict-tools is dual LGPL-2.1/GPL-2, verbecc is dual LGPL-3.0/GPL-3.0 (Catalan list sourced from catverbs), SUBTLEX-CAT has no reuse grant, verbs.cat has no licence. Extract facts and re-express; do not copy files. GPLv2 reaches "works based on the Program", and facts are not copyrightable under the Feist doctrine, so re-authored facts are generally not derivative. Two dangers remain: verbatim copying of a curated list can carry thin compilation copyright, and the EU sui generis database right (Softcatalà and AnCora are Spain-based) can restrict extraction of a substantial part of a database even of non-copyrightable facts. Keep extraction fact-level and hand-authored.

**Phase 3 - JSON schema with hundreds of enums (generate, never hand-write).**
```
Extend gen-schema so the decomposition tool's input_schema draws every
component-ID field's enum from taxonomy.json (flattened leaf IDs). Add an
answer_lang field with enum ["fr"]. Set additionalProperties:false on every
object and list all properties in required, per Anthropic strict-schema
rules. The decomposition array must contain only component IDs and Catalan
surface forms, never French prose. Regenerate schema.ts and make the
schema-generation test pass.
```

**Phase 4 - API client and prompt caching (plan-mode-first).**
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

**Phase 5 - Persistence, FSRS, Elo (TDD).** `/clear`.
```
TDD. Wrap ts-fsrs for per-component mastery: each logged query updates the
component's FSRS stability/difficulty plus a simple Elo signal. Seed each
component's INITIAL difficulty from contrast_fr.status: transfer -> low,
near-miss and false-friend -> high, novel -> high. Store in Dexie. Add JSON
export/import. Tests run under fake-indexeddb and must assert the
contrast_fr-to-initial-difficulty mapping.
```

**Phase 6 - UI and coverage heatmap (screenshot-and-iterate).**
```
Build the decomposition view and an SVG coverage heatmap over the taxonomy
tree, colouring by mastery and flagging unexplored nodes. Rank the "gaps"
list by contrast_fr.status so novel and false-friend gaps sort above
transfer gaps. All UI copy in French from src/i18n/fr.ts, using guillemets
and narrow no-break spaces before : ; ! ?. After building, take a
screenshot and iterate until the heatmap is legible. Check that French
string lengths do not overflow any container.
```

**Phase 7 - Vite + GitHub Pages deploy.**
```
Plan then implement GitHub Pages deploy. Set base '/catalan-trainer/' in
vite.config.ts. Ensure .nojekyll ends up in dist (it lives in public/). Add
.github/workflows/deploy.yml using actions/configure-pages,
actions/upload-pages-artifact (path ./dist), actions/deploy-pages, with
permissions pages:write id-token:write and a single concurrency group. Set
<html lang="fr"> in index.html. Remind me to set Settings > Pages > Source
to GitHub Actions.
```

### 4. Specific technical gotchas

**Vite + GitHub Pages.**
- `base` must be `/<repo>/` (here `/catalan-trainer/`) or all asset URLs 404. Use `/` only for a `user.github.io` root repo.
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
