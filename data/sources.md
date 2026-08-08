# Sources and licence position

Read this before any seeding pass.

## The rule

**Extract facts and re-express them. Never copy a source data file into the
repo, in whole or in substantial part, regardless of its licence.**

Every taxonomy node in this repo is hand-authored in our own schema. The sources
below are consulted for facts (lemmas, conjugation classes, tense labels,
paradigm slots) and then closed.

## Licence status of each source

| Source             | Licence                                                            |
| ------------------ | ------------------------------------------------------------------ |
| Apertium           | GPL-2.0-or-later                                                   |
| catalan-dict-tools | Dual LGPL-2.1 / GPL-2.0                                            |
| verbecc            | Dual LGPL-3.0 / GPL-3.0. Its Catalan list is sourced from catverbs |
| SUBTLEX-CAT        | No reuse grant                                                     |
| verbs.cat          | No licence stated                                                  |
| Softcatalà, AnCora | Spain-based, so the EU database right applies                      |

## Why fact extraction is the safe route, and where it stops being safe

GPLv2 reaches "works based on the Program". Facts are not copyrightable under
the Feist doctrine, so facts re-authored into our own schema are generally not a
derivative work of the source.

Two dangers remain, and both are about copying rather than about facts:

1. **Compilation copyright.** A curated list can carry thin copyright in the
   selection and arrangement even where no individual entry does. Copying a
   list verbatim, including its ordering, can therefore infringe even when
   copying any single row would not.
2. **The EU sui generis database right.** Softcatalà and AnCora are Spain-based.
   That right can restrict extraction of a substantial part of a database even
   when the contents are plain uncopyrightable facts. It is a separate right
   from copyright and is not answered by "these are only facts".

Keep extraction fact-level and hand-authored, and neither danger is engaged.
Signs that a pass has drifted into copying: identical ordering to the source,
source field names surviving into our schema, or suspiciously complete coverage
of an external list. The `schema-validator` agent spot-checks for exactly these.

## Source notes

<!-- Per-domain extracted notes go here as seeding proceeds. One section per
domain, facts only, with the source named. -->

_No domains seeded yet. Seeding begins in phase 2a._
