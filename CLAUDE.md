# francais-catalan - project memory

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
- `docs/01-catalan-structural-map-and-build-plan.md` (36 KB) is reference
  material for the SEEDING PHASES ONLY. Do NOT read it during Phase 0 or
  Phase 1: it is full of grammar tables that are not needed yet, and
  pulling it into context
  wastes tokens. Open it only once seeding starts, and even then read the
  specific section required, not the whole document.

## Conventions
- Vanilla TS + Vite. No framework unless a task explicitly approves one.
- API key is runtime-entered into localStorage. NEVER hardcode or commit.
- Anthropic calls: model claude-haiku-4-5, structured outputs beta header,
  taxonomy sent as a cached prompt prefix.

## Domains (see catalan-taxonomy skill for full schema)
PHON NOM ART VERB PRON DET PREP ADV CONJ NEG SYN LEX
