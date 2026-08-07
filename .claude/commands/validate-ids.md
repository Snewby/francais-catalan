---
description: Check that every component ID referenced anywhere exists in the taxonomy
allowed-tools: Bash, PowerShell, Read, Grep, Glob
---

Run `npm run validate-ids`.

If it fails, report every orphan ID with the file and line that references it,
and say which of the two causes applies to each:

- the ID is a typo or a stale reference, in which case fix the reference;
- the ID is genuinely new, in which case it must be added to the taxonomy
  through `data/` and `npm run gen-schema`, never by hand-editing
  `src/taxonomy/taxonomy.json` or `src/api/schema.ts`.

Do not add IDs to the taxonomy to make this command pass without saying so
explicitly. Widening the closed vocabulary to silence a validation failure
defeats the invariant.
