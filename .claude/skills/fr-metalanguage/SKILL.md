---
name: fr-metalanguage
description: French grammatical metalanguage for the Catalan trainer - the terminology to use in glosses.fr and notes, the four contrast_fr statuses and how to assign them, French typographic rules for UI copy, and the apostrophe policy. Use when authoring glosses, contrast notes, UI strings, or any French-facing text.
---

# French metalanguage

The base language of this application is **French**. Every gloss, note,
explanation and UI string is written for a French speaker learning Catalan, in
French, using French grammatical terminology.

This is distinct from the repo language, which is British English: code,
identifiers, comments, docs, test names and commit messages. The two are easy to
conflate after twenty minutes of writing English comments. Check which one you
are in before you write a string.

## Terminology

Use the French term a French-educated reader already knows, not a calque of the
Catalan or English one.

| Catalan / English concept     | Use in French                     | Not                   |
| ----------------------------- | --------------------------------- | --------------------- |
| pronoms febles / weak clitics | pronoms faibles                   | pronoms clitiques     |
| passat perifràstic            | passé périphrastique              | passé périphrasique   |
| gerundi                       | gérondif                          | gérondive             |
| perfet / present perfect      | passé composé                     | parfait               |
| imperfet                      | imparfait                         | imperfectif           |
| complement directe            | complément d'objet direct (COD)   | objet direct          |
| complement indirecte          | complément d'objet indirect (COI) | objet indirect        |
| subjuntiu                     | subjonctif                        | subjonctive           |
| conjugació incoativa          | conjugaison inchoative            | conjugaison incoative |
| article personal              | article personnel                 | article devant prénom |
| enllaç / liaison              | liaison                           | enchaînement          |

Write `glosses.fr` as a short noun phrase or a single sentence, not a paragraph.
It appears inline in the UI next to the Catalan form.

## contrast_fr

Every leaf node carries a `contrast_fr` with a `status` and a one-line `note`
saying how the Catalan structure relates to French. The status drives the
initial FSRS difficulty and the ordering of the gaps list, so a wrong status is
not cosmetic: it changes what the learner is shown first.

The four statuses:

| Status         | Means                                                                               | Initial difficulty |
| -------------- | ----------------------------------------------------------------------------------- | ------------------ |
| `transfer`     | French intuition carries over cleanly. The learner can rely on it.                  | low                |
| `near-miss`    | French has an analogue, but the boundary differs. Partial transfer, needs a caveat. | high               |
| `false-friend` | French intuition actively misleads. The obvious French reading is wrong.            | high               |
| `novel`        | No French analogue. Nothing to transfer, must be learnt outright.                   | high               |

### Assigning a status

Ask, in this order:

1. **Does French have this structure at all?** No, and there is nothing close:
   `novel`. French has only _être_, so the Catalan _ser_/_estar_ split is
   `novel`, not `near-miss`: there is no French distinction to be near.
2. **Would a French speaker's first reading of the Catalan form be wrong?**
   Yes: `false-friend`. This is the strongest claim on the list and the rarest.
   Reserve it for cases where the form looks like a French form that means
   something else, not merely for cases that are hard.
3. **Does the structure exist in French but apply over a different range?**
   `near-miss`. The note must say where the boundary differs, not just that it
   does.
4. **Otherwise** `transfer`, and the note says what carries over.

`near-miss` is the default when you are unsure between `near-miss` and
`transfer`. Over-warning costs the learner a little time; under-warning costs
them a wrong belief they will not notice.

The note is one line, in French, and states the contrast concretely. "Proche du
français" is not a note. "Comme _finir_/_finissons_, mais l'infixe s'étend à
plus de verbes qu'en français" is.

### Pre-assigned nodes

A handful of high-risk nodes have their status fixed in advance and must not be
reassigned by judgement during a gloss pass. They live in
`data/contrast-overrides.json`, which the Phase 2b gloss pass reads and applies.
Read that file; do not restate its assignments anywhere else, including here.

If you believe an override is wrong, raise it with the user. Do not silently
override the override.

## French typography in UI copy and notes

- Guillemets `« »` for quotation, never `" "`. A narrow no-break space sits
  inside each guillemet: `« comme ceci »`.
- A narrow no-break space precedes `:` `;` `!` `?`. Use U+202F.
- **No em-dashes anywhere in this repo**, French or English. Use a comma,
  parentheses, or a full stop.
- French strings run roughly 15 to 20 per cent longer than their English
  equivalents. Assume any container sized against English copy will overflow,
  and check it.
- All UI copy lives in `src/i18n/fr.ts`. Never inline a French string in a
  component.

## Apostrophes and non-ASCII

- Catalan surface forms use the **straight apostrophe** `'`: `l'home`,
  `s'ha`, `d'aquí`. This is the conventional form and, more to the point, exact
  match assertions in the golden set break the moment the two forms are mixed.
- French prose uses the **typographic apostrophe** `’`: `l’imparfait`. The two
  policies differ deliberately, because Catalan forms are data and French prose
  is copy.
- Catalan `l·l` uses the interpunct U+00B7: `col·lecció`. Not a full stop, not a
  middle dot from a different block.
- The repo is UTF-8 throughout. Do not add a BOM.

## Catalan stays Catalan

Catalan surface forms and examples are never translated into French. A node
shows the Catalan form, then the French gloss explaining it. Putting French
prose into the `decomposition` array is a hard invariant violation: that array
is language-invariant and holds component IDs and Catalan forms only. Only the
`answer` field is French.
