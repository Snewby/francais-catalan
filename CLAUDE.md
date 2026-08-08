# francais-catalan - project memory

## Build / test

- Dev: `npm run dev` Build: `npm run build` Preview: `npm run preview`
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

- SINGLE SOURCE OF TRUTH. Every invariant lives in exactly one executable
  place. This file and the skills NAME that place and never restate its
  content, because two copies drift and the prose copy is the one that gets
  believed. Field shape: src/taxonomy/taxonomy.schema.json. Contrast
  assignments: data/contrast-overrides.json. Evidence routing:
  src/srs/evidence.ts.
- The component-ID vocabulary is CLOSED. Every ID emitted by the model,
  referenced in UI, DB, or tests MUST exist in src/taxonomy/taxonomy.json.
  taxonomy.json is GENERATED from data/*.fragment.json, so new IDs are added
  ONLY by editing the domain fragment then running gen-schema. A PostToolUse
  hook blocks hand-edits to taxonomy.json outright.
- Glosses are a KEYED MAP (`glosses: {fr: "..."}`), never a flat field.
- Every leaf node MUST have `glosses.fr` and `contrast_fr`.
  contrast_fr.status is one of: transfer | near-miss | false-friend | novel.
- The API schema enums are GENERATED from taxonomy.json. Never hand-edit
  src/api/schema.ts.
- The `decomposition` array is LANGUAGE-INVARIANT: component IDs and Catalan
  forms only. Only the `answer` field is French. Never put French prose in
  the decomposition.
- EXPOSURE IS NOT MASTERY. Every logged query carries `intent`, `direction`
  and `evidence`, plus `rating` if and only if evidence is `graded`. Which
  signal each evidence type may move is defined by EVIDENCE_EFFECTS in
  src/srs/evidence.ts, which is AUTHORITATIVE; do not restate the routing
  here or anywhere else. The FSRS wrapper rejects any evidence that table
  does not mark FSRS-advancing. Without this split the coverage heatmap is a
  log of your interests presented as a skill map.
- MVP ships intents `comprehend` and `produce` only, but the schema accepts
  all five from Phase 1. Retrofitting `intent` across a live query log is the
  same trap as the gloss map.
- taxonomy.json is large. Do NOT read it wholesale into context. Query it
  with scripts or grep for specific IDs/domains.
- `docs/01-catalan-structural-map-and-build-plan.md` (36 KB) is reference
  material for the SEEDING PHASES ONLY. Do NOT read it during Phase 0 or
  Phase 1: it is full of grammar tables that are not needed yet, and
  pulling it into context
  wastes tokens. Open it only once seeding starts, and even then read the
  specific section required, not the whole document.

## Conventions

- Check staging with `git status`, never `git diff`, before committing.
  `git diff` does not report untracked files, so a `git add -A` can sweep in
  another session's in-progress work and the check will look clean. This has
  already happened once (see Record corrections in TASKS.md).
- Build status lives in TASKS.md, one line per phase. A phase transition
  updates TASKS.md in the SAME commit as the work. Read it first in a new
  session; it is the only place that records where the build is up to.
- Vanilla TS + Vite. No framework unless a task explicitly approves one.
- Vite `base` is '/francais-catalan/' and must match the repo name, or every
  asset 404s on Pages. The build guide's '/catalan-trainer/' is a placeholder.
- Apostrophes: straight ' in Catalan forms (l'home, s'ha), typographic ’ in
  French prose. Mixing them breaks exact-match assertions in the golden set.
  Catalan l·l uses U+00B7. Repo is UTF-8, no BOM.
- contrast_fr statuses for high-risk nodes are fixed in
  data/contrast-overrides.json and applied verbatim. Do not re-derive them.
- API key is runtime-entered into localStorage. NEVER hardcode or commit.
- Anthropic calls: model claude-haiku-4-5, structured outputs beta header,
  taxonomy sent as a cached prompt prefix.

## Domains (see catalan-taxonomy skill for full schema)

PHON NOM ART VERB PRON DET PREP ADV CONJ NEG SYN LEX
