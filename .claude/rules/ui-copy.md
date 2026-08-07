---
paths:
  - 'src/i18n/**/*.ts'
  - 'src/ui/**/*.{ts,html,css}'
  - 'index.html'
---

# UI copy

All user-facing copy in this application is **French**. There is no English UI
and no language switcher.

- Every string lives in `src/i18n/fr.ts`. Never inline a French string in a
  component or in `index.html` body content.
- Guillemets `« »` for quotation, never `" "`, with a narrow no-break space
  (U+202F) inside each.
- A narrow no-break space (U+202F) before `:` `;` `!` `?`.
- No em-dashes. Use a comma, parentheses, or a full stop.
- Catalan surface forms and examples stay in Catalan and are never translated.
  They are data shown to the learner, not copy.
- French grammatical terminology throughout: _pronoms faibles_, _passé
  périphrastique_, _gérondif_, _complément d'objet direct_. See the
  `fr-metalanguage` skill for the full table.
- Typographic apostrophe `’` in French prose; straight apostrophe `'` in Catalan
  forms. The split is deliberate: Catalan forms are data and get exact-match
  assertions.

French strings run roughly 15 to 20 per cent longer than the English equivalent.
Any container sized against a draft English string will overflow. Check the
rendered width, do not assume it.
