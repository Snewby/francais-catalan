---
name: catalan-taxonomy
description: Conventions for the Catalan grammar taxonomy - the twelve domain codes, component-ID naming, the closed-vocabulary rule, and the two-stage gen-schema pipeline from data fragments to taxonomy.json to the API schema. Use whenever authoring, seeding, referencing or validating taxonomy component IDs, or when touching data fragments, taxonomy.json or the generated API schema.
---

# Catalan taxonomy conventions

This skill covers **conventions**. It deliberately does not restate the node
field shape: `src/taxonomy/taxonomy.schema.json` is the single source of truth
for that, and a second copy here would drift. Read the schema when you need
field names, types or required-ness.

## The twelve domains

| Code   | Scope                                                         |
| ------ | ------------------------------------------------------------- |
| `PHON` | Phonology and orthography, including `l·l` and accentuation   |
| `NOM`  | Nouns: gender, number, derivation                             |
| `ART`  | Articles, including the personal article `en`/`na`            |
| `VERB` | Verb morphology: conjugation classes, tense, aspect, mood     |
| `PRON` | Pronouns, above all the weak pronouns (_pronoms febles_)      |
| `DET`  | Determiners: demonstratives, possessives, quantifiers         |
| `PREP` | Prepositions and their contractions                           |
| `ADV`  | Adverbs and adverbial phrases                                 |
| `CONJ` | Conjunctions and subordinators                                |
| `NEG`  | Negation, including `pas` and negative concord                |
| `SYN`  | Syntax: word order, clitic ordering, agreement, subordination |
| `LEX`  | Lexis: register, false friends, collocation                   |

The domain list is closed. Adding a thirteenth domain is a schema change, not a
seeding decision.

## Component-ID naming

Dot-separated, most general segment first, always beginning with the domain code:

```
VERB.ind.passat_perifrastic
PRON.feble.combinacio.ci_cd
NEG.pas.negacio_simple
```

Rules:

- Segments after the domain code are lower case, ASCII, `snake_case`. Never
  accented, never spaced, never hyphenated. The Catalan surface form carries the
  diacritics; the ID does not.
- The ID is a stable key. It is referenced from the database, the generated
  enums, the golden set and the UI. Renaming one is a migration, so choose
  carefully the first time.
- IDs are language-invariant. Never encode French in an ID.
- A wildcard such as `VERB.perf.*` is shorthand in prose and in
  `data/contrast-overrides.json` only. It is never itself a node ID.

## The closed-vocabulary rule

The component-ID vocabulary is **closed**. Every ID emitted by the model,
referenced in `src/`, `test/`, the database or the UI must already exist in
`src/taxonomy/taxonomy.json`.

A new ID is added by exactly one route:

1. Add or edit the fragment under `data/`.
2. Run `npm run gen-schema` (which rebuilds `taxonomy.json` from the fragments
   and regenerates `src/api/schema.ts`).
3. Run `npm run validate-ids`.

There is no other route. In particular, never hand-edit `src/taxonomy/taxonomy.json`
or `src/api/schema.ts`: both are generated artefacts and both carry a banner
saying so. Hand-edits are silently destroyed on the next generation and, worse,
temporarily hide the drift the generation tests exist to catch.

Because the schema enums are generated from the taxonomy and sent to the model
as a constrained output schema, an out-of-vocabulary tag is impossible at
decode time. The tests therefore guard against **taxonomy and schema drift**,
not against model misbehaviour. That is a different failure and a real one.

## Pipeline order

```
data/<domain>.fragment.json   the only editable source
  -> gen-schema stage 1  -> src/taxonomy/taxonomy.json   generated
  -> gen-schema stage 2  -> src/api/schema.ts            generated
  -> validate-ids        (every referenced ID exists)
  -> check-glosses       (every leaf has glosses.fr and contrast_fr)
```

Both stages are one command, `npm run gen-schema`. Run the checks after it,
never before: `validate-ids` on a stale `taxonomy.json` validates the previous
generation and passes happily.

Both outputs carry a do-not-edit banner, and a `PostToolUse` hook blocks any
write to `taxonomy.json`. That is not belt and braces. During a seeding pass the
generated file is where nodes visibly live, so reaching for it is the natural
mistake, and the next generation destroys the edit without a word.

## Context hygiene: never read taxonomy.json wholesale

`taxonomy.json` is a large generated artefact, and it roughly doubles in size
once `glosses`, `notes` and `contrast_fr` are populated. Reading it into context
wastes a great deal of budget for no benefit.

Query it instead:

- `npm run validate-ids` and `npm run check-glosses` for whole-file questions.
- `grep` for a specific ID or domain prefix when you need one node.
- Seed and gloss **one domain per subagent**, so no single context ever holds
  the whole taxonomy.

The same applies to `data/` fragments once they grow: read the fragment for the
domain you are working on, not all twelve.

## Seeding constraints

When seeding from external sources, extract **facts** and hand-author original
nodes. Never copy a source data file into the repo verbatim, even a
permissively licensed one. See `data/sources.md` for the licence position and
why a curated list carries risk that individual facts do not.
