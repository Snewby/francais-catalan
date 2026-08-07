---
paths:
  - 'src/**/*.ts'
  - 'test/**/*.ts'
  - 'scripts/**/*.{ts,mjs}'
  - 'docs/**/*.md'
---

# Code style

The repo language is **British English**, which is a different thing from the
application's base language. Code, identifiers, comments, documentation, test
names and commit messages are British English. User-facing copy is French and
lives in `src/i18n/fr.ts`.

This distinction drifts. An agent that has been writing English comments for
twenty minutes will happily write an English UI string. Check which side of the
line you are on before you write text.

- Spelling: colour, behaviour, organise, initialise, serialise, licence (noun),
  license (verb), analyse.
- No em-dashes, in any language. Comma, parentheses, or a full stop.
- Vanilla TypeScript. No framework unless a task explicitly approves one.
- Prefer named exports. Avoid default exports outside config files.
- The API key is entered at runtime into `localStorage`. Never hardcode it,
  never commit it, never write it to a file or log it.
- `src/api/schema.ts` and `src/taxonomy/taxonomy.json` are generated. Never
  hand-edit them; change the source under `data/` and run `npm run gen-schema`.
- Comments explain why, not what. Do not narrate the code beneath them.
