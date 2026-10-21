# francais-catalan: spec, phases 0 and 1

Signed off by Sean on 21 Oct 2026, all seven sections. These are the requirements for phases 0 and 1. Phase 0 leaves a running Svelte shell with nothing learner-facing; phase 1 delivers French in, natural Catalan out, taken apart into taxonomy-linked chunks, on a model picked by eval.

Source of record: the Claude Doc « francais-catalan: spec, phases 0 and 1 ». This file is its repository copy. If the two disagree, ask Sean; do not pick one.

Written against commit `58ab33a` (10 Aug 2026), the review and plan doc (rev 13) and the Català core flow canvas. Out of scope: variations (phase 2), the notion sheet (3), carnet, words and review (4), the map (5).

## Phase 0: Svelte shell and navigation

Phase 0 replaces the vanilla TS entry point with a Svelte app that has the final navigation and routes, and no learner features.

### Stack

| Part | Choice | Why |
| --- | --- | --- |
| Framework | Svelte 5 (runes) + Vite 6, TypeScript strict | Runes keep state explicit and testable |
| Routing | Hash routes, hand-rolled (about 60 lines), no router package | GitHub Pages has no rewrites, so `/carnet` would 404 on reload; hash routes survive reload and back |
| Storage | Dexie, kept, new database `catala-v2` | Start fresh; the old IndexedDB database is left untouched in the browser and never read |
| Tests | Vitest + `@testing-library/svelte` on jsdom; one Playwright smoke at 390 px | Component behaviour in jsdom; layout only a real browser can check |
| Lint, format, types | `eslint-plugin-svelte`, `prettier-plugin-svelte`, `svelte-check` added to `typecheck` | CI order unchanged: lint, typecheck, format, tests, then the invariant checks |
| Deploy | Existing `deploy.yml`; `base` stays `/francais-catalan/` | Unchanged |

### Routes

| Route | Screen | Phase 0 state |
| --- | --- | --- |
| `#/` | Home: input box, recent sentences, review entry | Input disabled, empty state |
| `#/phrase/:id` | Phrase screen | Not reachable yet |
| `#/notion/:id` | Notion sheet | Stub |
| `#/carnet` | Carnet | Stub |
| `#/reviser` | Review | Stub |
| `#/carte` | Map | Stub |

A stub is one French line, « Bientôt disponible. », so every tab is tappable from day one and nav tests cover all four.

### Bottom nav and settings

- Four tabs, as drawn on the canvas: Phrase, Carnet, Réviser, Carte. Phrase is Home.
- Active tab marked with `aria-current="page"`; each target at least 44 px; nav sits above the safe-area inset.
- Settings is a sheet opened from a gear in the Home header, not a fifth tab. It holds: API key (enter, replace, clear, reusing the existing `readApiKey`/`storeApiKey`/`clearApiKey`), export, import.
- Export writes one JSON file of the new database with a `schemaVersion`; import refuses a file with an unknown version. In phase 0 the database is empty, so this only proves the round trip.

### Stores designed for later sync

Every store created from phase 0 on follows one rule set, so sync can be added without a migration:

- Primary key is a UUID generated on the device, never an auto-increment.
- Every row carries `createdAt`, `updatedAt` (ms since epoch) and `deletedAt` (null, or a tombstone time; rows are never hard-deleted).
- Rows never hold the API key or anything derived from it.

## Phase 0: removed, archived, kept

The UI layer goes, the data layer and its invariants stay byte-identical, and `58ab33a` is tagged `v1-vanilla` before anything is deleted so the old app stays one checkout away.

**Removed** means deleted from `main` (still in git history and the tag). **Archived** means moved under `archive/`, excluded from build, lint and tests.

| Part | Path | Verdict | Note |
| --- | --- | --- | --- |
| Taxonomy fragments, generated taxonomy, schema | `data/*.fragment.json`, `src/taxonomy/` | Keep | Byte-identical; hooks still guard them |
| Contrast overrides, duplicate allowlist, sources | `data/contrast-overrides.json`, `data/duplicate-allowlist.json`, `data/sources.md` | Keep | Byte-identical |
| Evidence routing, FSRS, Elo | `src/srs/` | Keep | Unchanged; used from phase 1 (exposure) and phase 4 (review) |
| Invariant scripts | `gen-schema`, `validate-ids`, `check-glosses`, `check-duplicates` | Keep, change | `gen-schema` also emits the new phrase schema (phase 1) |
| Hooks | `scripts/hooks/`, `.claude/settings.json` | Keep | Taxonomy guard, read guard, stop-tests stay |
| Pronunciation | `src/audio/voice.ts`, `src/ui/speak.ts` | Keep, move | `speak.ts` becomes a Svelte component; voice logic untouched |
| Realised-form check | `src/text/realised.ts` | Keep | Reused by phase 1 validation |
| Golden set and eval | `test/fixtures/golden/`, `src/eval/golden.ts`, `scripts/eval.ts` | Archive old fixtures, rebuild | Old 10 fixtures fit the old schema; see Model eval |
| API client and prompt | `src/api/anthropic.ts`, `prompt.ts`, `validate.ts` | Change in phase 1 | Transport, key handling and caching kept; schema and prompt replaced |
| Old query log, review records, Dexie schema | `src/db/` | Remove | Start fresh; new stores in `src/db/` from phase 1 |
| Taxonomy review cards | `src/review/` | Keep, unused | Phase 4 decides; `weight.ts` loses its `ui/` import |
| Attempt comparison, signal pack | `src/text/attempt.ts`, `signal-pack.ts` | Keep, unused | Phase 4 review may reuse; `attempt.ts` loses its `ui/` import |
| Views | `src/ui/app.ts`, `query-view.ts`, `review-view.ts`, `data-view.ts`, `api-key.ts`, `app.css` | Remove | Replaced by Svelte components |
| Explorer | `src/ui/browse/` (8 files) | Remove | Content returns as the notion sheet (3) and map (5); heatmap logic rewritten for the map |
| UI copy | `src/i18n/fr.ts` | Rewrite | Keep `NNBSP` and `quote()`; drop strings for removed screens |
| Seeding agents and commands | `.claude/agents/` (4), `.claude/commands/seed-domain.md` | Archive | Seeding is done |
| Build guide, visual pass, structural map | `docs/01`, `docs/02`, `docs/03` | Archive | `docs/01` still not read |
| Status file | `TASKS.md` (1,875 lines) | Slim | New table, phases 0 to 6, one line each; old file archived whole |

### Tests

| Test file | Verdict |
| --- | --- |
| `interactive-views`, `taxonomy-browser`, `coverage-heatmap`, `speak-control` | Remove (UI gone); `speak-control` rewritten for the Svelte component |
| `persistence`, `review-loop`, `signals` | Remove with the old DB; phase 4 writes new ones |
| `golden-set` | Rewritten in phase 1 |
| `anthropic-client`, `smoke` | Kept until phase 1 replaces the schema, then rewritten |
| `build-taxonomy`, `closed-vocabulary`, `gen-schema`, `gloss-completeness`, `taxonomy-schema`, `evidence-routing`, `realised-forms`, `voice`, `browser-emits-no-evidence` | Keep unchanged |

### CLAUDE.md changes

- « Vanilla TS + Vite. No framework » becomes Svelte 5 + Vite.
- The model line changes only when phase 1's eval picks a model.
- The decomposition invariant is restated for chunks (see the schema section): chunk data stays language-invariant.
- References to `docs/01` and seeding phases move to the archive note. Hard invariants otherwise untouched.

## Phase 1: model response schema

The model returns the natural Catalan, the French it understood, and the Catalan cut into ordered chunks, each tagged with a closed role and zero or more taxonomy IDs; it returns no prose.

Dropping the French explanation (`answer`) is the main change. The outside review of generated replies found 13 false claims about French across six reviews, all in that field. The teaching text now comes from the taxonomy, which has been reviewed, so the model is asked only for things a test can check.

### Model output (`PHRASE_SCHEMA`)

```json
{
  "fr": "Hier, j’ai acheté le pain au marché.",
  "ca": "Ahir vaig comprar el pa al mercat.",
  "subject": { "person": "1sg", "expressed": false },
  "assumptions": [],
  "chunks": [
    { "text": "Ahir", "role": "time", "ids": [], "unlinked": "no_notion" },
    { "text": "vaig comprar", "role": "verb", "ids": ["VERB.ind.passat_perifrastic"], "lemma": "comprar" },
    { "text": "el pa", "role": "object_direct", "ids": ["ART.def.forma.paradigma"] },
    { "text": "al mercat", "role": "place", "ids": ["ART.contract.a_de"] }
  ]
}
```

| Field | Type | Rule |
| --- | --- | --- |
| `fr` | string | The input as understood, typos and accents fixed, meaning unchanged. The only French field |
| `ca` | string | One line, Central standard, what a speaker would say rather than a word-for-word rendering. Never empty, never French |
| `subject.person` | enum `1sg 2sg 3sg 1pl 2pl 3pl none` | Grammatical person of the main verb; `none` for impersonal sentences |
| `subject.expressed` | boolean | False when Catalan drops the pronoun; the screen then shows a dashed « (jo) » chunk |
| `assumptions` | array of enum | Choices French leaves open: `addressee_tu`, `addressee_formal`, `speaker_fem`, `subject_fem`, `plural_fem`. Empty when nothing was assumed |
| `chunks[].text` | string | Exact substring of `ca`, in order. Punctuation is not a chunk |
| `chunks[].role` | enum, closed | `subject verb object_direct object_indirect clitic negation time place manner quantity connector complement other`. French labels live in `fr.ts`, not in the schema |
| `chunks[].ids` | array of `ComponentId`, 0 to 3 | Generated enum from `taxonomy.json`, as today. Most specific leaf first |
| `chunks[].unlinked` | enum `no_notion` or `outside_taxonomy`, present only when `ids` is empty | `no_notion`: plain vocabulary, nothing to teach. `outside_taxonomy`: a real grammar point with no leaf, which feeds a taxonomy gap list |
| `chunks[].lemma` | string, optional | Base form of a verb, noun or adjective. Unused until phases 2 and 4; asked for now so cached sentences need no re-call later |

### Spans are computed, not generated

The app derives `start` and `end` for each chunk by finding `text` in `ca` in order, in UTF-16 offsets. Models are unreliable at counting characters; matching text is checkable. Anything in `ca` not covered by a chunk must be whitespace or punctuation, or the reply fails validation.

### Invariants carried over

- Chunk data stays language-invariant: Catalan text, enums and IDs only. `fr` is the single French field.
- IDs come only from the generated enum. `gen-schema` emits `PHRASE_SCHEMA` beside the existing schemas; `schema.ts` stays hand-edit-proof.
- A linked ID must be realised by its chunk (the padding rule from the current prompt). A short accurate list beats an approximate ID; `unlinked` is the honest answer.
- Structured outputs constrain the shape; Ajv validates it again, including string limits the decoder ignores.

## Phase 1: validation, storage, failure handling

Every reply is validated before it is stored or shown; one retry on a bad reply, then the Catalan is shown without anatomy rather than with a wrong one.

### Pipeline

1. **Normalise the input**: trim, collapse spaces, Unicode NFC, straight apostrophes to ’. The cache key is the lower-cased result.
2. **Cache lookup** in `phrases` by key, schema version and model. A hit opens the Phrase screen with no call.
3. **Call**: cached system prefix (instructions plus the vocabulary table, as today), the sentence as the only dynamic content, structured outputs, 20 s timeout.
4. **Validate**: Ajv against `PHRASE_SCHEMA`; derive spans; every chunk found in order; uncovered text is only whitespace or punctuation; `unlinked` present exactly when `ids` is empty; no `subject` chunk when `subject.expressed` is false.
5. **Retry once** if step 4 fails, as `callHaiku` does today. Not a loop.
6. **Second failure**: if `ca` is valid, store with `status: analysis_failed` and show the sentence without anatomy; otherwise show the error state.
7. **Record exposure**: one `lookup` event per linked ID, so exposure moves and mastery does not. `EVIDENCE_EFFECTS` is unchanged.

### Stores (new database `catala-v2`)

| Store | Row | Written in |
| --- | --- | --- |
| `phrases` | `id`, `input`, `inputKey`, `fr`, `ca`, `subject`, `assumptions`, `chunks` (with spans), `status`, `model`, `schemaVersion`, `promptHash`, `usage`, `latencyMs`, plus the sync fields | Phase 1 |
| `events` | `id`, `componentId`, `evidence`, `phraseId`, `at`, plus the sync fields | Phase 1 |
| `reports` | `id`, `phraseId`, `text` (learner's note), `at`, plus the sync fields | Phase 1 |

`saved` (the carnet flag) is not added in phase 1; phase 4 owns the carnet model. `promptHash` lets a prompt change invalidate cached rows without a migration.

### Failure states

Copy is French and follows the existing typography rules; wording is a first draft.

| Cause | Detected by | Shown |
| --- | --- | --- |
| No API key | Before the call | « Ajoutez votre clé API dans les réglages. » with a button to the settings sheet |
| Key rejected | HTTP 401 | « Clé API refusée. Vérifiez-la dans les réglages. » |
| Overloaded or rate-limited | HTTP 429, 529 | « Service saturé. Réessayez dans un instant. » + Réessayer |
| Offline or timeout | `navigator.onLine`, 20 s abort | « Pas de connexion. » + Réessayer; cached sentences still open |
| Refusal or cut off | `stop_reason` | « Cette phrase n’a pas pu être traduite. » |
| Anatomy failed twice | Validation | Catalan and French shown; anatomy replaced by « Analyse indisponible pour cette phrase. » + Réessayer |

Input is French only in phase 1. Catalan typed into the box is sent anyway; the model is told to treat it as a Catalan sentence to restate, so `ca` may then equal the input.

## Phase 1: Phrase screen and Home

The Phrase screen is the canvas mock-up from the top down to « Anatomie », with Variantes and « Ce qui a changé » left out; Home gets a working input and a recent list.

### Phrase screen, top to bottom

| Block | Phase 1 behaviour | Source |
| --- | --- | --- |
| Header | Back arrow to Home, title « Phrase » | Canvas |
| « Votre phrase » | The input exactly as typed | `phrases.input` |
| « En catalan » card | `ca` in Literata 26 px, `lang="ca"`; `fr` beneath | Model |
| Écouter | Existing speech code; hidden, not disabled, when the device has no Catalan voice | `src/audio/voice.ts` |
| Ajouter au carnet | Not shown until phase 4 | n/a |
| Assumptions line | One small line when `assumptions` is not empty, e.g. « On a supposé : tu, locutrice. » | Model enum, French text from `fr.ts` |
| « Anatomie » | Chunks in sentence order, wrapping; caption is the role plus the first leaf's Catalan example, e.g. « Verbe · vaig cantar » | Model + taxonomy |
| Signaler une erreur | Text link at the foot; opens a one-field sheet, stores a `reports` row | Learner |

An authored `short_fr` label on every leaf is planned as a later content task; it would replace the leaf example in captions.

### Chunks

- Colour by role, using the canvas palette: subject dashed grey, time blue, negation violet, clitic orange, verb green, object grey, place olive. Other roles neutral. The caption repeats the role in words, so colour is never the only signal.
- The implicit subject is added by the app from `subject.person` when `expressed` is false: dashed « (jo) » first, linked to `PRON.fort.subjecte`.
- A linked chunk is a button. Tap opens a bottom sheet with, per linked ID: the leaf's Catalan form, `glosses.fr`, the contrast badge (transfert, proche, faux ami, nouveau) and `contrast_fr.note`. All authored text, nothing generated. Phase 3 replaces this sheet with the full notion sheet.
- An unlinked chunk is plain text, not a button, with a dotted border; caption « hors notions » for `no_notion`, « pas encore décrit » for `outside_taxonomy`.
- Accessible name per chunk reads text, role and first notion, e.g. « vaig comprar, verbe, passé périphrastique ».
- No ring or « changed » state in phase 1; that arrives with variations.

### Home

- Label « Une phrase en français », textarea, button « Traduire en catalan ». Disabled when empty; 300-character limit, counter shown past 250.
- While waiting, the app navigates to the Phrase screen at once, shows the input and a placeholder card « Traduction… »; back cancels the request.
- « Récentes »: the five newest `phrases` rows, Catalan over French, tap to reopen from cache. Empty state: one line, « Vos phrases apparaîtront ici. »
- « Tout le carnet » and the review card stay hidden until phase 4.
- Gear icon top right opens the settings sheet.

## Phase 1: model eval

Three candidates run on a new golden set of 30 French sentences in two rounds; a native Catalan speaker judges each distinct rendering once, and the most accurate model clearing every floor wins. Quality decides, not cost. Sean sees the 30 sentences before any recording.

The current golden set cannot pick the model. Its 10 fixtures record the old reply shape, 6 of them are Catalan input, and 8 are marked « defective » yet still pass, because they test the gate rather than the Catalan. They move to `archive/`.

### Candidates and cost per sentence

Estimate per sentence: 18,300-token cached prefix (measured on today's prompt), about 40 input tokens and 400 output tokens. Warm means the prefix is in cache; cold means it is written first. Prices from the [Anthropic pricing page](https://platform.claude.com/docs/en/about-claude/pricing), USD, as of 21 Oct 2026.

| Model | API ID | Why test it | Warm, per sentence | Cold, per sentence |
| --- | --- | --- | --- | --- |
| Claude Haiku 5.5 | `claude-haiku-5-5` | Cheapest current model | $0.0004 | $0.0025 |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | Likely balance of quality and cost | $0.006 | $0.050 |
| Claude Opus 5.5 | `claude-opus-5-5` | Strongest model in scope | $0.012 | $0.100 |

Out of scope: Fable 5.1, on running cost. Haiku 4.5, today's model, is dropped to save review time: Haiku 5.5 supersedes it at a tenth of the price.

The default cache lives 5 minutes, and one learner typing a sentence now and then will often miss it. The eval reports warm and cold separately and tests the 1-hour cache option. Eval spend is not capped; the full run is expected to cost under $10.

Before scoring, each candidate must pass three checks or drop out: structured outputs accepted, a direct browser call accepted, and a cache read above zero on the second call.

### New golden set (`test/fixtures/golden-v2/`)

30 French sentences, each fixture holding the input, risk tags, a list of accepted Catalan renderings, IDs that must be linked (with the chunk they belong to), IDs that must not be linked (known padding traps), and expected assumptions where French is ambiguous.

| Risk area | Cases | Example input |
| --- | --- | --- |
| Past with « hier » vs « aujourd’hui » | 4 | « Hier, j’ai acheté le pain au marché. » |
| Weak pronouns (en, hi, combinations) | 4 | « Je n’en ai plus envie. » |
| Partitive and articles | 3 | « J’ai acheté du pain. » |
| Negation (ne… plus, ne… rien, ne… jamais) | 3 | « Je ne le fais plus. » |
| Obligation and tournures (falloir, devoir, venir de, être en train de) | 4 | « Il faut que je parte demain. » |
| ser / estar, haver / tenir | 3 | « La soupe est froide. » |
| Subjunctive and mood | 2 | « Je veux que tu viennes. » |
| Contractions, gender divergence, false friends | 3 | « La voiture de mon frère est plus rapide que la mienne. » |
| Ambiguous address or gender | 2 | « Vous êtes prêts ? » |
| Outside the taxonomy, idiom, typo in input | 2 | « J’ai la flemme d’y aller » |

The five French-input questions from the old set are reused as inputs. The approved list (21 Oct) is `docs/golden-set-v2.md`; its area counts supersede the table above. There are no pre-written references: the native speaker reviews model renderings, and their verdicts become each fixture's accepted list, so later runs match automatically.

### Running it

1. **Round 1**: all three models, one run each, 90 replies. Replies failing the hard checks (schema, spans, IDs) are scored out before any review.
2. **Review sheet 1**: renderings normalised (case, spacing, final punctuation) and deduplicated across models, grouped into one card per French sentence. Expected 40 to 60 distinct renderings on 30 cards. The speaker marks each « naturel », « correct mais peu naturel » or « faux », without seeing which model wrote it.
3. **Round 2**: the top two models from round 1 run twice more. Only renderings not already judged go to the speaker; expected under 15.
4. **Score**: `npm run eval` replays the recordings offline against the verdicts and writes the report.

`npm run eval:record -- --model <id> --runs <n>` is the only live, paid step and never runs in CI. Verdicts are written back to the fixtures in a separate, visible commit. No model acts as judge.

### Floors and selection

Counted over the finalists' 90 replies each (30 cases, 3 runs). « Correct mais peu naturel » counts as accepted for the floor and is reported separately as a tie-breaker.

| Measure | Floor |
| --- | --- |
| Valid schema and spans, after the one retry | 90 of 90 |
| Catalan accepted | at least 86 of 90 (95%), and no case « faux » in 2 of its 3 runs |
| Required IDs linked | at least 90% |
| Padded links (an ID its chunk does not realise) | at most 3% of all links |
| Latency, warm, 90th percentile | at most 8 s |

Selection: among finalists clearing every floor, the most « naturel » renderings win; cost breaks only an exact tie. If none clears, phase 1 stops and the floors go back to Sean rather than being lowered quietly. The report, `docs/model-eval.md`, records the table, the choice and the date, and CLAUDE.md's model line changes in the same commit.

## Acceptance criteria

Each phase closes only when every box below is ticked by a test, a script or a CI run, never by use; the closing commit updates `TASKS.md` in the same commit.

### Phase 0: Reset

- [ ] Tag `v1-vanilla` exists on `58ab33a`.
- [ ] CI green on `main`: lint, typecheck (with `svelte-check`), format, tests, `validate-ids`, `check-glosses`, `check-duplicates`.
- [ ] `git diff v1-vanilla -- data/ src/taxonomy/ src/srs/` is empty.
- [ ] No file under `src/` imports a removed module; `src/ui/` holds no `.ts` view files.
- [ ] Deployed site loads at `/francais-catalan/` with no console errors.
- [ ] Component tests: each of the four tabs routes to its screen; `aria-current` follows the route; reload on any hash route shows the same screen; browser back returns to the previous route.
- [ ] Settings sheet tests: key saved, replaced and cleared; export then import round-trips; an unknown `schemaVersion` is refused with a French message.
- [ ] Playwright smoke at 390 × 844: no horizontal scroll on any route; every nav target at least 44 × 44 px.
- [ ] The app never opens the old IndexedDB database.
- [ ] `TASKS.md` is the new short table; the old one, seeding agents and docs 01 to 03 are under `archive/`; CLAUDE.md updated as listed.

### Phase 1: Translate and take apart

Model

- [ ] All three candidates recorded, or dropped with the failed pre-check named.
- [ ] `docs/model-eval.md` shows every floor per model, warm and cold cost, latency, and the choice; CLAUDE.md model line matches.
- [ ] The chosen model's recordings pass `npm run eval` offline, and CI runs it.
- [ ] Second call in a recorded session shows cache read above zero.

Schema and pipeline

- [ ] `PHRASE_SCHEMA` is generated by `gen-schema`; the existing hand-edit test covers it.
- [ ] Unit tests, from recorded replies: spans derived correctly, including accents, `l·l` and apostrophes; a chunk missing from `ca` fails; uncovered words fail; uncovered punctuation passes; `unlinked` without empty `ids` fails.
- [ ] Retry happens exactly once; after two failures with a valid `ca`, the row is stored as `analysis_failed`.
- [ ] The same sentence typed twice, differing only in spacing, case or apostrophe, makes one API call.
- [ ] A successful translation writes one `lookup` event per linked ID and no FSRS state changes (existing evidence tests extended).
- [ ] Every store row carries a UUID and the three sync fields.

Screens

- [ ] Phrase screen test with a recorded reply: input, `ca` with `lang="ca"`, `fr`, chunks in sentence order with captions, implicit subject first.
- [ ] Tapping a linked chunk opens a sheet showing the taxonomy gloss, badge and contrast note for each ID; unlinked chunks are not focusable as buttons.
- [ ] Each failure state in the table renders its French message, from a stubbed response.
- [ ] Home: submit disabled when empty; recents show the five newest; tapping one reopens it with no call.
- [ ] UI copy test: guillemets and narrow no-break spaces in every new `fr.ts` string; no English in rendered screens.
- [ ] Playwright smoke at 390 px for Home and Phrase screen: no horizontal scroll, targets at least 44 px.

## Decision log

| # | Question | Decision |
| --- | --- | --- |
| Q1 | Playwright for one 390 px smoke test per phase | Yes |
| Q2 | Caption under each chunk | Role plus leaf example now; authored `short_fr` for all leaves later |
| Q3 | French input only; Catalan input restated | Yes |
| Q4 | `assumptions` field and its one-line display | Yes |
| Q5 | `lemma` asked for now | Yes |
| Q6 | `lookup` exposure recorded from phase 1 | Yes |
| Q7 | « Signaler une erreur » in phase 1, stored locally | Yes |
| Q8 | « Ajouter au carnet » hidden until phase 4 | Hide |
| Q9 | Native speaker's role | Reviews model output, volume cut by two rounds and deduplication |
| Q10 | Live, paid `eval:record`; scoring stays offline | Yes, never in CI |
| Q11 | Running cost | Fable out; quality decides among the rest |
