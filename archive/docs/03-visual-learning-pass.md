# Visual learning support: a UX pass over the four views

Built. `TASKS.md` carries the row; this document carries the argument. Planned
against `acd5478` and implemented in the commit that follows it.

**Three things came out differently from the plan, and the sections below have
been corrected rather than left standing.** They are listed here because the
reasoning is worth more than the outcome.

- **P6 does not put the examples above the gloss.** The plan said examples and
  contrast should lead. On implementation the gloss turned out to be the topic
  sentence: it names the rule the examples illustrate, and three Catalan
  sentences under a bare Catalan heading leave the reader working out what the
  point is before they can read for it. What actually moved was the CEFR level,
  which sat between the gloss and the examples and put a two-character metadata
  field ahead of the Catalan. Gloss, examples, contrast now run unbroken.
- **The four review grades did not fit one row at 390 px, and `TASKS.md` had
  claimed since phase 6 that they did.** Found by measuring, not by reading. A
  flex item's default `min-width: auto` floors it at its content width, so
  `flex: 1 1 5rem` never shrank « À revoir » and « Facile » wrapped alone onto a
  second row. That is the identical failure that pushed the Explorer to 518 px,
  in a second place, and it was live before this pass. Fixed with `min-width: 0`.
- **The measure cap had to reach further than the answer.** Capping `.ac-answer`
  alone would have narrowed the prose and left the grammar points beneath it at
  full width. `.ac-output` is capped instead, and the same argument was then
  applied to the new coverage explanation in the Explorer, which was running to
  1,152 px.

## Why this pass exists

Every piece of teaching content the application owns is authored and already in
the repo: 300 leaves carrying roughly 1,000 Catalan examples, 300
`contrast_fr.note` fields written specifically to say what a French speaker will
get wrong, `notes` on 158 leaves, `dialect_note` on 21, and 69
machine-extractable cross-references between leaves.

Most of it renders in exactly one place, and some of it in none.

- The **answer** names grammar points and prints a gloss per point. No authored
  example, no contrast note, no route to the leaf.
- The **review card** shows one rotated example and one line of reference. The
  contrast note, the other examples, `notes` and `dialect_note` are all absent.
- The **detail pane** is the only place the authored content is all visible, and
  it presents nine fields at equal weight with the raw component ID first.
- `fr.heatmap.exposureHint` and `fr.heatmap.masteryHint` are authored French
  copy with **zero call sites in `src/`**. `masteryHint`, « Fondée uniquement
  sur les révisions évaluées », is close to word for word the sentence that
  would explain why the coverage map is grey.

That last one is the failure this repository has already recorded twice, once
for `CallResult.usage` and once for the IPA: a value carried through an API and
consumed by nothing is a plan for a feature, not a feature. It is now three.

**This pass renders what is already authored and adds navigation along edges the
data already contains. It authors no new teaching content.** That is what keeps
it out of phase 9's territory, and it is the test to apply to any addition
during implementation.

## The steer that ordered it

Asked what should join the expected answer on a review card, the user said they
are more interested in the correct Catalan, and that the French base is
interesting because it is often close and can help them learn. That is a claim
about direction of travel rather than a preference about one card, and it is
applied throughout: **Catalan surface forms lead, the French contrast follows as
the bridge.** It reorders the review card, the answer expansion and the detail
pane, and it is the reason P7 is on the list at all.

## The proposals, ranked

Each states what a learner sees, which authored fields it is built from, the
learning claim, the cost, and the risk. Suggested build order is at the end and
is not the same as this ranking.

### P1. A grammar point expands in place, Catalan first

**Sees.** Under « Points de grammaire relevés », each named component becomes a
`<details>`. The summary is what it is now: Catalan form, gloss, IPA. Expanded,
it shows that leaf's authored `examples` as a Catalan list, then its
`contrast_fr` status label and note. Collapsed by default.

**Built from.** `leafById(entry.id).examples` and `.contrast_fr`. `leafById` is
already imported at `src/ui/query-view.ts:24`.

**Learning claim.** A learner who has just met `vaig cantar` in one sentence has
met one instance, not a rule. The `examples` array is 2 to 8 Catalan sentences
authored to hold one rule constant while everything else varies, which is the
material a rule is induced from. The contrast note then says whether the French
intuition carries. This is the user's own first example, answered with authored
data rather than generated data.

**Cost.** About 40 lines in `renderComponents` (`src/ui/query-view.ts:124-158`),
two `fr.query` keys, about 15 lines of CSS. `app.css` has no `<details>` styling
at all, since `browser.css`'s summary rules are scoped to `.tb`.

**Risk.** Three, all real.

1. `renderComponents` iterates `result.decomposition.decomposition` raw and
   **does not dedupe**. Golden fixture 01 names `NOM.gender.masc_fem_o` twice,
   so the same three sentences would render twice. Dedupe for display in
   first-mention order, the way `componentIdsOf` already does for the write.
2. The examples illustrate the rule in the abstract, not the learner's sentence,
   under a heading a learner reads as "about my sentence". One string inside the
   expansion has to say so.
3. Do **not** reuse the class `ac-utterance`. `test/interactive-views.test.ts:336`
   asserts the full `.ac-utterance` list is exactly the two answer lines.

**Vertical cost at 390 px.** Zero collapsed, about 400 px opened, which pushes
only `.ac-signal` and `.ac-usage` down. Both are explicitly non-primary.

### P2. The review card shows the rest of the Catalan after reveal

**Sees.** After the reveal and **below the four grade buttons**: the examples
`exampleFor` did not pick, as a Catalan list, then the contrast status and note,
then `dialect_note` where there is one.

**Built from.** `leafById(item.componentId)`, so `examples`, `contrast_fr`,
`dialect_note`.

**Learning claim.** Feedback is the moment the rule is available to be learned,
and the card currently spends it on one French line. The remaining examples give
the learner the rest of the Catalan the leaf was authored to show; the contrast
note says whether their French intuition applies. Catalan first, French as the
bridge.

**What it trades away, knowingly.** This spends the rotation. `exampleFor`
(`src/review/item.ts:59`) rotates the prompt on `graded_review_count`, so after
one review the learner has read every example and later repetitions test an item
they have already seen. The defence is that the rotation varies the **test
item** while this changes what is **taught at feedback**: the prompt still
rotates and the recall test is unchanged. Recorded as a trade, not an oversight,
so a later pass can reverse it knowingly.

**Risk, and the one that matters.** About 430 px of new content placed directly
above the grade buttons would put them off a 390 by 844 screen, in the only
interaction in the application that produces graded evidence. `.ac-rating`'s
`flex: 1 1 5rem` exists precisely so grading is one tap with no scrolling.
**Ratings stay immediately under the reference and the enrichment goes below
them.**

`notes` is **excluded** from the card. It is where the 69 raw component IDs
live, so 61 cards would print `PRON.feble.forma_alomorfs` mid-session with
nowhere to tap.

**Direction hazard.** "Remaining examples" must come from an index carried on
`ReviewItem`, never from filtering by string equality against `item.prompt`.
That works today only because `direction` is always `ca_to_fr`; under `fr_to_ca`
the prompt is the gloss and the filter silently returns everything. See P7.

### P3. Related grammar in the detail pane

**Sees.** Below the coverage block: the branch path as a breadcrumb of
`label_fr`; the sibling leaves under the same parent as tappable `ca` forms;
and, where `notes` names another component, that ID rendered inline as a
tappable link that selects the leaf.

**Built from.** `parent` pointers and `BRANCHES[].label_fr`; the 69 IDs already
embedded in `notes`.

**Learning claim.** This is the user's second example. A learner reading
`ART.def.us.abans_possessiu` should be able to reach
`DET.poss.article_obligatori` without knowing it exists, and an author has
already written in prose that the two are related. Turning the 61 leaves that
cross-refer into 69 traversable edges makes an authored judgement navigable
instead of merely readable.

**Cost.** About 100 lines. `renderDetail` grows an `onSelect` callback, so
`renderSelection()` (`src/ui/browse/taxonomy-browser.ts:156`) changes with it.
The ID splitter goes in `src/taxonomy/index.ts` rather than in `browse/`, built
from `DOMAIN_CODES` so the twelve codes stay defined once.
`scripts/lib/scan-ids.ts` cannot be reused: it imports `node:fs` and is
line-oriented rather than offset-oriented.

**Risk.** Four.

1. **Ten of the 69 references point at branches, not leaves**:
   `PREP.formes_no_finites`, `SYN.subordinacio`, `CONJ.comparativa`,
   `DET.quant`, `SYN.ordre`, `NEG.concordanca` (twice), `ADV.interrogatiu`,
   `DET.interrogatiu`, `PRON.feble`. `leafById` returns `undefined` for all ten
   and the pane would blank on a tap. Render branch references as **plain
   text**: `selectedId` is leaf-only throughout the browser and widening it is
   not this pass's job.
2. `test/taxonomy-browser.test.ts:190` asserts `detail.textContent` contains
   `leaf.notes` verbatim. Splitting into text nodes plus buttons still passes,
   but only if nothing at all is inserted around the link. No brackets, no
   glyph, no space.
3. Do not reuse `.tb-leaf-button`. `test/taxonomy-browser.test.ts:172` asserts
   its count equals `LEAVES.length`.
4. Siblings are ragged. Seven leaves are only children, so the block needs an
   absent state rather than an empty one; the median is 3 and the maximum 9. And
   23 leaves sit at depth 2, so their breadcrumb is the domain name and says
   almost nothing.

**Honesty about the two halves.** The `notes` references are the substantive
half, because an author judged those related. The siblings are convenient
adjacency, an artefact of where the taxonomy happened to be cut. Both are worth
showing; only the first is a claim.

### P4. Make the grey map say why it is grey

**Sees.** Under the domain grid, in words: exposure counts every encounter,
mastery moves only on a graded review, and grey means no graded review yet
rather than a bad result.

**Built from.** `fr.heatmap.exposureHint` and `fr.heatmap.masteryHint`, both
already authored and rendered by nothing.

**Learning claim.** This is the only proposal here where the interface is
currently making a **false impression**. A learner who only asks questions sees
a grey map and reads it as no progress, or as broken, when the design is
deliberately refusing to credit exposure as mastery. `TASKS.md` names this a
communication problem a visual pass could solve. It is the highest value on the
list and nearly the cheapest.

**Cost.** About 10 lines in `src/ui/browse/heatmap.ts` and no new strings, or
one string and about 8 lines more if the sentence is made conditional.

**Risk.** `test/coverage-heatmap.test.ts:146` asserts the `.tb-legend-row` count
is **exactly 2**. Add a paragraph, never a third row. And the honest sentence is
conditional: "grey because you have graded nothing" is true for a learner with
exposure and false on a fresh install where nothing is anything. Recommended:
place it under the domain grid rather than inside the legend, and derive the
predicate from the coverage map already in scope.

### P5. Cap the reading measure

**Sees.** On a wide screen the answer and the explanation stop running the full
width of the window.

**Built from.** Nothing. Pure CSS.

**Learning claim.** Weak, and stated as weak: a measure cap is a typographic
convention, not a claim about learning. It is on the list because it closes a
recorded open problem, the 1,097 px measure at 1280 px, and because the
asymmetry is indefensible. `.ac-control` is already capped at `max-width: 40rem`
at 48 rem and above, so the **input** side is capped and the **output** side is
not.

**Cost.** About 6 lines inside the existing `@media (min-width: 48rem)` block.

**Risk.** Capping `.ac-answer` alone leaves `.ac-components`,
`.ac-attempt-missing` and `.ac-usage-counts` running to the full 72 rem, so the
answer narrows and the list beneath it does not, which reads as a defect.
`.ac-output` is capped once instead. `.ac-utterance` is deliberately not capped:
it is `flex: 1 1 12rem` inside `.ac-utterance-line`, and a cap there fights the
flex basis and strands the audio button mid-row.

**Built as a token, not a number.** `--ac-measure` is applied to `.ac-control`,
`.ac-output` and `.ac-card`, because the asymmetry between a capped input and an
uncapped output is what went wrong and two literals would let it recur. The same
argument later took `.tb-why-grey`, the only new prose block in the Explorer.

### P6. Simplify the detail pane

The removal on the list.

**Sees.** The Catalan heading, then a small de-emphasised component ID caption,
then examples and the contrast block, then gloss, level, coverage, notes,
dialect. Two labelled rows disappear.

**Removed.** The « Identifiant » row is demoted from a labelled `dl` row to a
caption rather than deleted, which is the user's decision and the right one: the
file's own header says the pane is the instrument a 2b gloss pass is reviewed
with, so the ID is an authoring affordance and not stray metadata, and
`filter.ts:52` puts `leaf.id` first in `searchableText`, so it is also the only
thing on screen hinting that IDs can be typed into the search box. The « Forme
catalane » row goes outright: it repeats the `<h2>` directly above it, and that
`<h2>` already carries `lang="ca"`, so nothing is lost.

**Reordered.** Gloss, examples, contrast, unbroken. The CEFR level moved down to
sit with the coverage counts, which is the other thing in the pane that is about
the leaf rather than in it.

The plan said the examples should lead and the gloss follow. That was wrong, and
the correction is the one place the Catalan-first rule does not apply: the gloss
names the rule the examples illustrate, so removing it from the top leaves the
reader deciding what the Catalan is meant to show them. A label before the
exemplars is what a reference pane is for; pure inductive discovery is not.

**Learning claim.** The two removals are de-duplication and are taste. The
reordering is a claim: nothing may separate the statement of a rule from the
sentences that realise it, and a CEFR level did.

**Cost.** About 10 lines in `src/ui/browse/detail.ts`, and delete
`fr.browser.fieldId` and `fr.browser.fieldCa`, which are used nowhere else.

**Risk.** Low. `test/taxonomy-browser.test.ts:190` checks `data-node-id` as an
attribute and `leaf.ca` anywhere in `textContent`, and both survive. It gives
back roughly 110 px in the pane P3 wants to spend it in, which is why P6 is
sequenced before P3.

### P7. Offer the French-to-Catalan review direction

Adjacent to scope, and last for that reason.

**Sees.** A control on the review screen choosing which way a card runs. One way
asks « Quelle règle cet énoncé illustre-t-il ? » as now; the other asks
« Quelle forme catalane réalise cette règle ? » and expects the Catalan.

**Built from.** Nothing new. `ReviewSessionOptions.direction` is plumbed
(`src/review/session.ts:28`, `:77`), `buildReviewItem` implements both
directions (`src/review/item.ts:67-76`), and `fr.review.askFrToCa` is authored.
The view never passes a direction, so `fr_to_ca` is unreachable dead plumbing,
the same shape as `CallResult.usage` and the IPA before it, and the third
instance this document names.

**Learning claim.** Recognising which rule a sentence illustrates and producing
the Catalan form of a rule are different skills, and only the first is currently
testable. The user asked for more Catalan; this is the direction that demands
it.

**Cost.** About 25 lines, one control, one `fr.review` key.

**Flagged.** This is a functional change rather than a visual one. Cut it
without disturbing anything else.

## What would not be done, and why

- **A node-link graph of the 69 cross-references.** 69 edges over 300 nodes is
  sparse and lopsided, and 239 leaves would render as isolated dots. Reading it
  needs hover, and there is no hover on the primary device. The same edges are
  fully served as inline links in P3, in place, beside the prose that motivates
  them.
- **Any example shown beside its meaning.** No French translation of any
  authored example exists anywhere in the data. Inventing one is phase 9.
- **Icons, illustrations or any image.** None exists and no licence position
  covers acquiring one. `data/sources.md` bans copying source material outright,
  and nothing in it contemplates media.
- **Ordering anything by frequency.** SUBTLEX-CAT is recorded as having no reuse
  grant, so there is nothing to sort on.
- **Grouping filter results under a CEFR or contrast heading.** That is a second
  pedagogic hierarchy competing with the taxonomy, ruled out by the axis rule
  argued in the `DET` section of `data/sources.md`. Filters retain ancestors and
  that stays.
- **Any new use of colour.** Hue carries mastery and opacity carries exposure in
  the heatmap, and `browser.css:428-446` already runs a **second** semantic
  palette for the four contrast statuses. Those two already half-collide, since
  `transfer` tints green and mastered hues green, which is an argument for
  spending no more colour rather than for spending it more carefully. Every
  proposal above distinguishes by position and by words.
- **Tapping a grammar point to jump to the Explorer tab.** This is the obvious
  reading of "navigation between related grammar" and it is the wrong one here.
  There is no view caching, so `show('browse')` destroys the reply; getting back
  means retyping the question and paying for another API call. P1 expands in
  place instead. Revisit only if view state ever survives a tab switch, which is
  a larger change than this pass.
- **Fixing the gaps ranking.** Two thirds of the taxonomy is `near-miss` and
  `INITIAL_DIFFICULTY_VALUE` collapses three of the four statuses to 7, so only
  `transfer` discriminates. That needs a **new authored field**, not a visual
  change, and a status is a claim about the language rather than a sort key. The
  binding consequence for this pass: **no proposal above may imply a ranking the
  data cannot support.**
- **Reopening « notions » against « points de grammaire ».** They name two
  different things deliberately and both are right. A **notion** is a permanent
  taxonomy entry, which is what the Explorer and the gaps list enumerate; a
  **point de grammaire** is what one reply named in one utterance. P1 is the
  first place the two meet, because expanding a point de grammaire reveals the
  notion behind it, and that is exactly the transition the distinction exists to
  mark. The fix is one string inside the expansion, not a change of vocabulary.

## Testable, taste, and invisible to every test

**Testable in jsdom, and each should get a test:**

- P1: the expansion renders `leaf.examples.length` items for a named component,
  and renders each component **once** given a decomposition that names one
  twice.
- P2: nothing enriched is in the DOM before reveal, and after reveal the rating
  buttons precede the enrichment in document order.
- P3: the ID splitter finds 69 references across 61 leaves with zero dangling,
  and yields a button for leaf targets and plain text for the ten branch
  targets. This is a real invariant rather than a snapshot: deleting a component
  ID that a `notes` field names would now be a broken link rather than merely
  stale prose.
- P3: sibling and reference links carry the target's `data-node-id`.
- P4: the legend still has exactly two `.tb-legend-row`.
- P6: the detail pane still exposes `leaf.id` and `leaf.ca` somewhere.
- P7: a card built `fr_to_ca` prompts with the gloss and references `leaf.ca`.
- `test/browser-emits-no-evidence.test.ts` continues to pass **unchanged**.
  Nothing above may make it necessary to relax it.

**Taste, and no test can settle it:** 40 rem against 36 rem in P5, field order
in P6, collapsed-by-default in P1, and exactly where P4's sentence sits.

**Layout, which nothing in this repository can catch.** jsdom lays nothing out.
Every proposal here changes height, and P1 and P2 change it by hundreds of
pixels. This needs a browser, and the check has to cover the view that was not
touched.

## Two guard rails on the evidence model

Stated because this pass opens the doors that would cross them.

1. **Nothing displayed may be recorded.** `exposureCount` is written in exactly
   one place, `src/db/persist.ts:135`, over `componentIdsOf(queryLog)`, which
   reads only `decomposition[].id`. P1 puts new UI inside `query-view.ts`, a
   module that already imports `recordQuery`. A future "count the expansion as a
   lookup" would be a legal import, would not match the `EXPOSURE_WRITE` pattern
   in `test/browser-emits-no-evidence.test.ts`, would not import Dexie, and
   would pass every existing test. The expansion handler carries a comment
   saying so.
2. **A grade stays about one component.** `toGradedQueryLog` builds a one-entry
   decomposition on purpose (`src/review/item.ts:83-92`). P2 puts sibling-ish
   material on the card, and crediting the rules an example incidentally
   realises is the exact failure that argument exists to prevent.

## Files

| File                                                          | Proposals      |
| ------------------------------------------------------------- | -------------- |
| `src/ui/query-view.ts` (`renderComponents`)                    | P1             |
| `src/ui/review-view.ts` (`render`)                             | P2, P7         |
| `src/review/item.ts` (`ReviewItem` carries the example index)  | P2             |
| `src/ui/browse/detail.ts` (`renderDetail`)                     | P3, P6         |
| `src/ui/browse/taxonomy-browser.ts` (`renderSelection`)        | P3             |
| `src/taxonomy/index.ts` (ID splitter, from `DOMAIN_CODES`)     | P3             |
| `src/ui/browse/heatmap.ts`                                     | P4             |
| `src/i18n/fr.ts`                                               | all            |
| `src/ui/app.css`, `src/ui/browse/browser.css`                  | P1, P2, P5, P6 |

Reused rather than rebuilt: `leafById`, `nodeById` and `DOMAIN_CODES` from
`src/taxonomy/index.ts`; `fr.contrast[status]` as the shared status wording, per
`detail.ts:52`; `labelled()` and `quote()` from `src/i18n/fr.ts`; `field()` at
`detail.ts:14`, which already accepts a `Node`; `coverageSummary` and
`gapKindOf` from `src/ui/browse/coverage.ts`.

`NNBSP` is imported from `src/i18n/fr.ts` and never typed. It has been lost
three times.

## Build order

P4, P5 and P6 first: about 25 lines together, they break nothing, and P6 frees
the pixels P3 wants. Then P1, then P3, then P2, then P7 if it is wanted at all.

## Verification

Static gates, in this order. Lint before tests, because `TASKS.md` records CI
red for a whole domain seed on `format:check` while local tests passed.

```
npm run lint
npm run typecheck
npm run format:check
npm run test:run
npm run eval
npm run validate-ids
npm run check-glosses
npm run check-duplicates
```

Browser check, which is the only thing that can see any of this. Drive the query
view with a stubbed `fetch` rather than a live key, as phase 6c did.

- At **390 px**: the four grade buttons are on screen without scrolling after a
  reveal, which is P2's whole risk; the detail pane does not overflow
  horizontally on a nine-sibling leaf with a 675-character `notes`; a component
  expands and collapses without shifting the answer above it; the toolbar
  `select`s still fit, since the 518 px regression was a string change with no
  markup change.
- At **1280 px**: the answer measure is capped and the component list is capped
  with it; the domain grid still fills six columns.
- Leaves to drive it with: `PHON.accent.regles` (675-character `notes`, novel),
  `LEX.fals_amic.verbs` (false-friend, long note), a depth-2 leaf such as
  `NEG.anticipada` whose breadcrumb says almost nothing, and one of the ten
  leaves whose `notes` names a branch.
- Screenshot both widths. If the Browser pane cannot composite a frame, measure
  geometry instead and **say that measurement is what was done**, per the phase
  6c precedent.

## What was actually verified, and how

**By geometry, not by screenshot.** The Browser pane was not displayed in the
implementing session, so every `computer{screenshot}` timed out. The page was
driven live at 390 x 844 and 1280 x 800 with a stubbed `fetch`, and the numbers
below were read off `getBoundingClientRect`. Nobody has looked at this pass.

- No horizontal overflow at 390 px anywhere: query, review and Explorer all
  report `scrollWidth === clientWidth`, and the widest element in the detail
  pane sits at 366 px against a 390 px viewport.
- The reading measure is **640 px at 1280 px**, down from the recorded 1,097,
  and `.ac-components` is capped with it at 640 rather than running wide beneath
  a narrowed answer.
- The four grade buttons are **one row of four**, none clipped, ending at 487 px
  of an 844 px viewport, with the enrichment below them.
- Expanding a grammar point does not move the answer above it.
- A reply naming one component three times renders **two blocks**, keeping both
  distinct forms.
- The domain grid is 6 by 2 at 1280 px and the legend is still two rows.
- Worst detail panes checked: 8 siblings (wrapping to 3 rows, 40 px tap targets),
  a 675-character `notes`, the 76-character `ca` of `DET.dem.forma_paradigma`,
  and a depth-2 leaf whose breadcrumb is one item.
- All 300 leaf buttons were clicked in sequence with no error and no loss of the
  tree.

The coverage explanation rendered with stance `ungraded` on the author's own
profile, which holds 8 components with exposure and none graded. That is exactly
the population it was written for, met by accident rather than by construction.
