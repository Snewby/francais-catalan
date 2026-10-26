# Catalan Language-Learning App: Structural Map and Build Plan

*Base language: French. Target language: Central (Barcelona) Catalan.*

## TL;DR
- A complete, codeable taxonomy of Central (Barcelona) Catalan is provided below as a hierarchical schema with stable component codes; it is granular enough that "me'n vaig" decomposes to VERB:anar + pronom feble EN + reflexive/pronominal marker + present/passat perifràstic, and it maps to the CPNL/CEFR ladder (Bàsic A2 to Superior C2).
- Build it as a static site on GitHub Pages using a bring-your-own-key client that calls Claude Haiku 4.5 directly from the browser with the `anthropic-dangerous-direct-browser-access: true` header, structured outputs (strict tool use) constrained to a controlled tag vocabulary, and prompt caching for the taxonomy; realistic cost is well under a couple of pounds a month for personal use.
- Persist the "language key" in IndexedDB (via Dexie) with JSON export to git for backup; track mastery per taxonomy component with FSRS-style scheduling plus a simple Elo/half-life signal, and visualise coverage as a heatmap over the taxonomy tree.
- **French as base language changes the structure almost not at all, but the pedagogy substantially.** Glosses become a keyed map, every leaf gains a `contrast_fr` transfer status, and the difficulty ordering shifts: clitics get much easier, the passat perifràstic becomes the worst false friend in the system, and `pas` becomes a high-interference near-miss.

## Key Findings

1. **The authoritative reference is the GIEC.** The *Gramàtica de la llengua catalana* (IEC, ratified 29 September 2016, published November 2016) is the official normative grammar, with a free consultation portal at giec.iec.cat and the *Gramàtica essencial* (GEIEC) at geiec.iec.cat. The GEIEC's own top-level structure (33 chapters, from "Les vocals i la síl·laba" to information structure) is the natural spine for the taxonomy.
2. **Pronoms febles are the hard core and are fully systematisable.** The GIEC (§13.4.2, §13.5.1) defines four written forms (reforçada, plena, reduïda, elidida), position rules (proclitic/enclitic), and a fixed combination order: reflexive / 2nd person / 1st person / CI / CD-or-attribute / adverbial (en, hi), with `es` always first and `hi` always last, and the apostrophe placed "tan a la dreta com sigui possible". This is a deterministic ruleset, ideal for a controlled tag vocabulary.
3. **French as metalanguage is a genuine advantage here.** French has a clitic system with `y` and `en` mapping near one-to-one onto Catalan `hi` and `en`, which is precisely the branch that defeats English speakers. French grammatical terminology also maps transparently onto Catalan (*pronoms faibles*, *passé périphrastique*, *gérondif*, *subjonctif*), where English has no native term for *pronom feble* at all.
4. **The CPNL/CEFR ladder gives the progression axis.** Nivell Inicial (A1), Bàsic 1/2/3 (to A2), Elemental 1/2/3 (to B1), Intermedi 1/2/3 (to B2), Suficiència 1/2/3 (to C1), Superior (C2). Parla.cat mirrors the four-level structure (bàsic, elemental, intermedi, suficiència), each in three courses. Tag every taxonomy node with the level at which it is introduced to reveal "unexplored" areas.
5. **Open datasets can seed most of the schema.** UD_Catalan-AnCora (POS, morphological features, dependency relations), Softcatalà `catalan-dict-tools` (dual LGPL v2.1 / GPL v2; generates ~10 million expanded forms including apostrophation and weak pronouns), Apertium `apertium-cat` (GPL; form to lemma+tag FST), spaCy `ca` and Stanza models (AnCora-trained), FreeLing (LGPL), and SUBTLEX-CAT (a 278.6-million-token subtitle frequency database) cover morphology, tagging and frequency.
6. **GitHub Pages cannot hide a secret**, so the realistic personal-use options are: (a) direct browser calls with the key in localStorage using Anthropic's CORS header; (b) a tiny serverless proxy; (c) fully local; (d) Claude Artifacts. For a single trusted user, (a) is the pragmatic choice, with (b) as the "do it properly" upgrade.
7. **Cost is negligible at personal volume.** Per Anthropic's official Claude Haiku page, Haiku 4.5 pricing "starts at $1 per million input tokens and $5 per million output tokens, with up to 90% cost savings with prompt caching" (cache reads $0.10/M, cache writes $1.25/M). French output runs roughly 10 to 15% longer than English, which is a rounding error at this volume.
8. **Pedagogy: apply FSRS to grammar components, not just words.** FSRS (open-spaced-repetition community; Anki default since v23.10, November 2023) achieves a mean log loss of 0.344 and beats SM-2 in 99.6% of collections on a benchmark of 500M+ Anki review logs, translating in simulation to "roughly 20 to 30 percent fewer reviews at the same retention level".

## Details

### PART 1 - STRUCTURAL MAP OF CENTRAL CATALAN (the "language key")

**Schema conventions.** Each component has a stable code `DOMAIN.subdomain.item`. Suggested top-level domains: `PHON` (phonology/orthography), `NOM` (noun/adjective morphology), `ART` (articles), `VERB`, `PRON` (pronouns), `DET` (determiners), `PREP`, `ADV`, `CONJ`, `NEG`, `SYN` (syntax), `LEX` (lexis/register).

Every leaf carries:

| Field | Purpose |
|---|---|
| `id` | Stable code, language-invariant, the closed-vocabulary key |
| `ca` | Catalan term (e.g. "pronom feble") |
| `glosses` | Keyed map, e.g. `{"fr": "pronom faible 'en'"}`. **Not a flat `en` field.** Adding a second UI language later is then free; retrofitting a map across hundreds of nodes is not |
| `cefr` | Introduction level |
| `parent` | Tree link |
| `examples[]` | Catalan examples |
| `notes` | Pedagogical note, written in the base language |
| `dialect_note` | Valencian/Balearic deltas |
| `contrast_fr` | `{status, note}` where status is `transfer` \| `near-miss` \| `false-friend` \| `novel` |

`contrast_fr` is the single most valuable addition French brings. It lets the coverage heatmap pre-weight difficulty before any review data exists, which directly serves the "find my weak points" goal: a `novel` or `false-friend` node with zero encounters is a much louder gap than a `transfer` node with zero encounters.

Codes are deliberately aligned to UD feature names (Gender, Number, Mood, Tense, Person, PronType, Polarity) so AnCora/spaCy tags map directly.

#### French as base language: the contrastive layer

Assign every leaf a `contrast_fr.status`. Indicative assignments:

| Status | Meaning | Examples |
|---|---|---|
| `transfer` | French structure carries over almost intact | `PRON.feble.en` / `PRON.feble.hi` (French `en` / `y`), `VERB.perf.*` (passé composé), `NOM.gender` (French has gender), `VERB.subj.*` (French has subjunctive), `PHON.accent.agut` / `PHON.accent.greu` |
| `near-miss` | Superficially the same, differs in detail; highest silent-error risk | `PRON.feble.combo` (both languages have clitic clusters but the ordering rules differ), `NEG.pas`, `PREP.a_en`, `NOM.gender` assignments that diverge (la mer / el mar) |
| `false-friend` | Looks like a French structure, means something else | `VERB.ind.passat_perifrastic` (see below) |
| `novel` | No French anchor at all | `PHON.gem` (l·l), `PHON.vowel.reduce` (schwa reduction), `VERB.ser_estar`, `ART.personal` (en/na), `PHON.apostrof` (Catalan apostrophation is far more extensive than French elision) |

**The two traps that need first-class nodes:**

1. **`VERB.ind.passat_perifrastic`** is the highest-value false friend in the entire system. *Vaig cantar* means "I sang", not "I am going to sing". French *je vais chanter* is future; the Catalan periphrasis with the same auxiliary shape is past. Left unflagged this causes silent misreading for months. Flag it, and pair it explicitly with `VERB.periphrasis` "anar a + inf" which *is* the imminent future, so the learner sees both members of the contrast together.
2. **`NEG.pas`** is a high-interference near-miss. French *ne...pas* is obligatory; Catalan `pas` is optional reinforcement, chiefly Principat, absent from Valencian and Balearic. French speakers systematically overproduce it.

**What gets easier.** The `PRON.feble` branch, flagged elsewhere in this document as the hardest part of Catalan, drops sharply in difficulty. *Je m'en vais* and *me'n vaig* are near-cognate in structure. Individual clitics are `transfer`; only their combination ordering is `near-miss`. This justifies **promoting clitics earlier in the CEFR progression** than a standard English-speaker syllabus would.

**What does not get easier.** `VERB.ser_estar` stays `novel`: French has only *être*, so a French speaker is no better placed than an English speaker. Central Catalan vowel reduction is also `novel`.

**Terminology.** Write `glosses.fr` and `notes` using French grammatical terms, which map cleanly: *pronoms faibles* / *pronoms clitiques*, *passé périphrastique*, *passé composé*, *imparfait*, *subjonctif*, *gérondif*, *participe passé*, *conditionnel*, *élision*, *apostrophe*, *article défini/indéfini*.

#### PHON - Phonology and orthography
| Code | ca | Detail | contrast_fr |
|---|---|---|---|
| PHON.alph | alfabet | 26 letters; k, w only in loanwords | transfer |
| PHON.digraph | dígrafs | ny, ll, l·l, rr, ss, qu, gu, ig, tx, tj/tg | near-miss |
| PHON.gem | ela geminada (l·l) | Written with the punt volat; e.g. "col·legi", "il·lusió" | novel |
| PHON.accent.agut | accent agut | é, í, ó, ú (closed vowels) | transfer |
| PHON.accent.greu | accent greu | à, è, ò (open vowels) | transfer |
| PHON.accent.rules | regles d'accentuació | Agudes accented on final -a/e/i/o/u, as, es, is, os, us, en, in; planes accented otherwise; all esdrúixoles accented | novel |
| PHON.diaeresi | dièresi | ï, ü to break diphthong or mark pronounced u in güe/güi/qüe/qüi | near-miss (French tréma is narrower) |
| PHON.apostrof | apostrofació | el/la to l' before vowel/h; de to d'; weak-pronoun apostrophation | near-miss (French elision is far more limited) |
| PHON.vowel.reduce | reducció vocàlica | Central Catalan: unstressed /a,e,ɛ/ to [ə]; unstressed /o,ɔ/ to [u] | novel |
| PHON.devoice | ensordiment final | Final obstruents devoice (e.g. "fred") | novel |
| PHON.stress | accent (tònic) | Stress placement and when a written accent is required | novel (French has no lexical stress) |
| PHON.accent.diacritic | accent diacrític | Distinguishes homographs (post-2017 reduced list: sòl/sol, són/son) | near-miss |

In Central Catalan the stressed seven-vowel system /i, e, ɛ, a, ɔ, o, u/ reduces to just [i, ə, u] unstressed. Keep Central as reference; store dialect deltas in `dialect_note`.

#### NOM - Noun and adjective morphology
- `NOM.gender` (gènere): masculine/feminine. `transfer` as a concept, `near-miss` in assignment, since Catalan and French diverge on plenty of nouns.
- `NOM.number` (nombre): plural `-s`; `-os`/`-sos` after sibilants (gos to gossos, feliç to feliços); `-ns` in nouns hiding an n (home to homes, mà to mans, but "pa" to "pans"); invariable plurals. `near-miss`.
- `NOM.adj.agree` (concordança): agreement in gender and number; invariable adjectives; position. `transfer`.
- `NOM.deriv` and `NOM.comp` for word formation.

#### ART - Articles
| Code | Forms | contrast_fr |
|---|---|---|
| ART.def | el, la, l', els, les | transfer |
| ART.indef | un, una, uns, unes | near-miss (French has no indefinite plural uns/unes in this sense) |
| ART.personal | en/na, n' ("en Joan", "la Maria") | novel |
| ART.contract | al, del, pel; als, dels, pels | transfer (cf. au, du, aux, des) |
| ART.salat | es, sa (Balearic; note only) | novel |

`ART.contract` is a strong `transfer`: French *à + le = au*, *de + les = des* is the same mechanism.

#### VERB - Verbs
- `VERB.conj.1` (-ar), `VERB.conj.2` (-er/-re), `VERB.conj.3` (-ir), with `VERB.conj.3.incoatiu` (-eix-, servir to serveixo) vs `VERB.conj.3.pur` (dormir). The inchoative infix is `near-miss`: French has -iss- in *finir/finissons*, a real anchor.
- Non-finite: `VERB.inf`, `VERB.ger` (gerundi -ant/-ent/-int), `VERB.part` (-at/-ut/-it + irregulars). Gerundi is `near-miss`: French *gérondif* requires *en*, Catalan does not.
- Indicative: `VERB.ind.pres`, `VERB.ind.imperf` (-ava/-ia), `VERB.ind.passat_simple` (mainly literary, cf. *passé simple*, `transfer`), `VERB.ind.passat_perifrastic` (vaig/vas/va/vam/vau/van + infinitiu, the ordinary spoken past, **`false-friend`**), `VERB.ind.futur`, `VERB.ind.cond`.
- Subjunctive: `VERB.subj.pres`, `VERB.subj.imperf` (-és/-ís). `transfer`.
- `VERB.imperatiu`.
- Compound tenses: `VERB.perf.*` = haver + participi (he parlat, havia parlat, hauré parlat, hagi parlat, hagués parlat). `transfer`, with one delta: Catalan uses *haver* throughout, French splits *avoir*/*être*, so Catalan is actually simpler here.
- `VERB.irregular.*`: ser/ésser, estar, haver, anar, fer, poder, voler, saber, veure, dir, venir, tenir, dur, prendre, beure, néixer, viure, escriure, treure, conèixer.
- `VERB.ser_estar`: `novel`. French has only *être*. Identity/definition vs state/location/result; GIEC notes aspectual adverbs (encara, ja) and result readings favour estar.
- `VERB.periphrasis`: anar a + inf (imminence), haver de / caldre (obligation), poder, estar + gerundi, acabar de + inf, tornar a + inf. Note *acabar de* is a clean `transfer` from *venir de*.
- `VERB.pronominal`: reflexive/pronominal verbs (rentar-se, anar-se'n). `transfer`; French *s'en aller* is the direct analogue of *anar-se'n*.

#### PRON - Pronouns (deep branch: pronoms febles)
`PRON.strong` (forts/tònics): jo, mi, tu, ell/ella, nosaltres, vosaltres, vós, vostè(s), ells/elles, si.

`PRON.feble` (febles/clítics), each clitic modelled with its four forms and function:

| Code | Function (ca) | reforçada | plena | reduïda | elidida | contrast_fr |
|---|---|---|---|---|---|---|
| PRON.feble.em | CD/CI 1sg | em | me | 'm | m' | transfer (me) |
| PRON.feble.et | CD/CI 2sg | et | te | 't | t' | transfer (te) |
| PRON.feble.es | reflexiu 3 | es | se | 's | s' | transfer (se) |
| PRON.feble.ens | CD/CI 1pl | ens | nos | - | - | transfer (nous) |
| PRON.feble.us | CD/CI 2pl | us | vos | - | - | transfer (vous) |
| PRON.feble.el | CD masc | el | lo | 'l | l' | transfer (le) |
| PRON.feble.la | CD fem | la | la | - | l' | transfer (la) |
| PRON.feble.els | CD masc pl / CI pl | els | los | 'ls | - | near-miss (les vs leur syncretism) |
| PRON.feble.les | CD fem pl | les | les | - | - | transfer (les) |
| PRON.feble.li | CI sg | li | li | - | - | transfer (lui) |
| PRON.feble.en | partitiu / de-complement | en | ne | 'n | n' | **transfer (en)** |
| PRON.feble.hi | locatiu / a-complement | hi | hi | - | - | **transfer (y)** |
| PRON.feble.ho | CD neutre | ho | ho | - | - | near-miss (French uses le) |

Form-selection rules (GIEC §13.4.2): reforçada before a consonant-initial verb (em veu); elidida before a vowel/h-initial verb (m'agrada); plena after a verb ending in consonant or diphthong (renta-me, escriu-me); reduïda after a verb ending in a vowel (renta'm). `li`, `us`, `les`, `ho`, `hi` never apostrophise. The four-form alternation itself is `novel`: French clitics do not vary this way.

`PRON.feble.position`: proclitic before a finite verb, enclitic after infinitive, gerund and imperative, joined by hyphen or apostrophe. With periphrastics either position is allowed with no meaning change (Ho va dir = Va dir-ho; Me'n vaig anar = Vaig anar-me'n). `transfer`: French does the same with *je veux le faire* / *fais-le*.

`PRON.feble.combo`: **`near-miss`, and this is where French speakers will actually make errors.** Catalan order is reflexive / 2nd / 1st / CI / CD-or-attribute / adverbial (en, hi); `es` always first, `hi` always last; only one elision per combination; apostrophe as far right as possible (Me'l dona; Se'n va; Porta-l'hi). French order is me/te/se/nous/vous, then le/la/les, then lui/leur, then y, then en. The two systems agree on reflexive-first and en/y-last but **disagree on the relative position of direct and indirect object**, so a French speaker's instinct produces the wrong Catalan order in exactly the CI+CD case. Flag this explicitly.

Central Catalan "datiu li + CD el/la/els/les" surfaces as `l'hi` / `els hi` colloquially, diverging from Valencian which keeps *li la*. Store under `dialect_note`.

**Worked decomposition of "me'n vaig"** (from the pronominal verb *anar-se'n*, French *s'en aller*):
- `VERB:anar`, here the lexical verb of *anar-se'n* ("I'm leaving / going away"), `VERB.ind.pres`, 1sg. (If the input were "me'n vaig anar", then vaig + infinitive is passat perifràstic and it means "I left".)
- `PRON.feble.es`, reflexive marker of the pronominal verb; 1sg surfaces as `em`, then plena `me` before the following clitic.
- `PRON.feble.en`, the adverbial/partitive clitic lexicalised in *anar-se'n*.
- Apostrophation: me + en gives `me'n` (apostrophe as far right as possible).
- Tags emitted: `{lemma: "anar", pron_verb: "anar-se'n", clitics: ["es to me", "en"], tense: "present", person: "1sg", features: [PRON.feble.combo, PRON.feble.en, PHON.apostrof]}`.

For a French base language the gloss writes itself: *"je m'en vais"*. Six taxonomy nodes exercised in one phrase, five of them `transfer`.

#### DET - Determiners
- `DET.dem`: aquest/aquesta/aquests/aquestes (proximal), aquell/aquella (distal); neuters això, allò, açò. `near-miss`: French collapsed its two-way deixis into *ce*.
- `DET.poss`: el meu/la meva; unstressed mon/ton/son (restricted). `near-miss`: Catalan normally takes the article, French does not (*mon livre* vs *el meu llibre*).
- `DET.quant`: molt, poc, bastant, gaire, prou, massa, tot, cada, algun, cap, gens. `gaire` and `prou` are `novel`.
- `DET.num`: cardinals, ordinals.

#### PRON (rel/int) - Relatives and interrogatives
- `PRON.rel`: que, qui, què, el qual/la qual, on, el que. Largely `transfer` (que/qui/dont/où maps well, though Catalan has no single *dont*).
- `PRON.int`: qui, què, quin, quant, com, on, quan, per què.

#### PREP - Prepositions
- `PREP.atones`: a, de, en, amb, per, per a.
- `PREP.a_en`: `near-miss`. Location vs motion; time expressions per GIEC quadre 31.1.
- `PREP.per_pera`: GIEC sanctions three coexisting systems; Central/Eastern spontaneous speech uses only *per*; formal registers distinguish. Record all three as variants, defaulting to the traditional Fabra distinction for teaching. `near-miss` (French *par* / *pour*).
- `PREP.toniques` / `PREP.loc`: cap a, fins a, sobre, sota, entre, contra, malgrat.

#### ADV / CONJ / NEG
- `ADV.*`: manner (-ment, `transfer`), place, time, quantity, affirmation/doubt.
- `CONJ.coord` (i, o, però, sinó, ni) and `CONJ.subord` (que, perquè, si, quan, encara que, malgrat que). Mostly `transfer`.
- `NEG.no` (`near-miss`: Catalan negates with a single preverbal *no*, French needs the *ne...pas* frame), `NEG.pas` (**`near-miss`, high interference**, see the contrastive section), `NEG.cap`, `NEG.gens`, `NEG.mai`, `NEG.res`, `NEG.ningú`, `NEG.enlloc`, `NEG.tampoc`.

GIEC advises keeping *no* when these precede the verb (No ho faria mai). *pas* only reinforces a simple *no*, not an already-double negation; per GIEC §35.4.2.2 it is very common in the Principat but absent from Valencian and Balearic. French speakers will reach for it far too often; the app should flag overuse, not just non-use.

#### SYN - Syntax
`SYN.word_order` (SVO default, dislocations), `SYN.questions` (intonation, fronting; `near-miss`, since Catalan has no *est-ce que* and no subject-verb inversion in the French sense), `SYN.subordination`, `SYN.conditional` (si + present / imperfet subjuntiu), `SYN.passive` (ser + participi; passiva pronominal amb es), `SYN.pronominal_constr`, `SYN.info_structure` (GEIEC ch. 33).

#### LEX - Lexis and register
- `LEX.false_friends` **(Fr to Ca, re-seeded for the French base language)**. This branch must be built from scratch against French, not Spanish. Examples to seed: *tastar* (to taste) vs Fr *tâter*; *entendre* (Ca: to understand) vs Fr *entendre* (to hear); *sortir* (Ca: to go out, but also to come out) vs Fr *sortir*; *demanar* (to ask for) vs Fr *demander*; *acostar* (to bring near) vs Fr *accoster*; *estranger*/*estrany*. Keep a separate optional `LEX.false_friends.es` branch if Spanish is also in play, since Spanish interference on Catalan is strong and independent of the base language.
- `LEX.cognates_fr`: **new branch worth adding.** Catalan shares Gallo-Romance features with Occitan and French that Spanish lacks. Positive-transfer vocabulary is a cheap early win and belongs in the taxonomy so the coverage map can credit it.
- `LEX.castellanismes`: forms to avoid ("tenir que" to "haver de"/"caldre"; "donar-se compte" to "adonar-se"; "vacacions" to "vacances").
- `LEX.freq`: frequency-ranked core vocabulary, seeded from SUBTLEX-CAT / Leipzig / wordfreq. Language-side only, so unaffected by the base-language choice.
- `LEX.idioms`: fixed expressions and locutions.

**CEFR/CPNL mapping, adjusted for a French base.** Tag nodes with introduction level, then apply the contrastive re-ordering:
- Bàsic (A2): present tense, definite articles, gender/number, basic clitics. **Promote `PRON.feble.em/et/es/en/hi` here** rather than B1, since they are `transfer`.
- Elemental (B1): passat perifràstic (**with its false-friend warning front-loaded, not deferred**), imperfet, clitic combinations (the `near-miss` ordering), per/per a.
- Intermedi (B2): subjunctive (easy, `transfer`, could move earlier), conditional, `pas` usage and overuse correction.
- Suficiència (C1): passat simple, register, fine ser/estar.

"Unexplored" = nodes at or below target CEFR level with zero EXPOSURE, that is, never encountered in any way. Distinct from "unpractised" = exposure above zero but zero graded reviews, which is a node you have met without ever being tested on. Both lists are weighted by `contrast_fr.status` so `novel` and `false-friend` gaps surface above `transfer` gaps. The second category only exists because exposure and mastery are tracked separately; it is usually the more actionable of the two.

**Open resources to seed the key (with licences):**
| Resource | What it gives | Licence | Usability |
|---|---|---|---|
| UD_Catalan-AnCora | POS, morph features (UD), dependencies | CC BY 4.0 per UD distribution; README references inherited GNU licence | High; feature names align to schema |
| Softcatalà catalan-dict-tools | form to lemma+tag; ~10M expanded forms incl. clitics/apostrophation | dual LGPL v2.1 / GPL v2 | High for seeding forms; copyleft |
| Apertium apertium-cat | FST form to lemma+morph tags | GPL-2+ | High |
| Apertium French-Catalan pair | direct Fr-Ca lexical correspondences | GPL | **Newly relevant.** Verify the exact package name before relying on it |
| spaCy `ca` / Stanza | runtime POS/morph/dependency tagging | MIT / Apache | High if you add a Python step |
| FreeLing | morphological analysis, clitic affix rules | LGPL | Medium |
| verbs.cat | 2,000+ conjugation tables + category tags | no visible licence | Reference only |
| verbecc / verbecc-svc | conjugation library + REST microservice | dual LGPL-3.0 / GPL-3.0 | High for local conjugation |
| SUBTLEX-CAT | 278.6M tokens, 751,078 word types; frequency + contextual diversity | academic, no explicit reuse grant | High for frequency ranking |
| Termcat | Catalan terminology, with French equivalents in many records | check per-resource terms | **Newly relevant** for French glosses |
| Leipzig Corpora / wordfreq | frequency lists | CC BY / CC BY-SA / MIT | High |

The two most convenient morphological lexicons (Softcatalà, Apertium) are copyleft. A personal, non-redistributed app is unaffected, but publishing a derived dataset inherits GPL/LGPL obligations.

**One note on French glosses:** most Catalan learning material is written for Spanish or English speakers. French-Catalan bilingual resources are thinner. Expect to author more `glosses.fr` by hand than you would for English, and expect the model to be the main source rather than a lookup table. This is fine, since both Catalan and French are high-resource for Claude, but it does mean the golden-set eval matters more.

### PART 2 - FEASIBILITY AND ARCHITECTURE

#### Hosting and the API-key constraint
GitHub Pages serves only static files: no server-side code, no way to hide a secret. Options for a single-user app:

| Option | How | Security | Effort | Verdict |
|---|---|---|---|---|
| (a) Direct browser call, key in localStorage | fetch to api.anthropic.com with `anthropic-dangerous-direct-browser-access: true` | Key lives in your browser only; fine for a single trusted user | Lowest | **Recommended start.** Anthropic added CORS support in August 2024; without the header the request is rejected |
| (b) Tiny serverless proxy | Cloudflare Worker / Vercel / Netlify / Deno holds the key as an env secret | Key never in client; can rate-limit | Low to medium | Best "proper" upgrade |
| (c) Fully local | localhost dev server, or Tauri/Electron | Key stays on device | Medium | Good if you dislike keys in a browser tab |
| (d) Claude Artifacts | Build the UI as an Artifact; no key needed | No key at all, but sandboxed | Lowest to try | Good for prototyping the prompt, weak for persistent storage |

The header name is Anthropic's own warning: embedding a key in shipped client code lets anyone with access to the site steal it. In a BYOK app where you paste your own key at runtime into localStorage, the practical risk is contained. Do not commit the key and do not publish the page with a key baked in.

**Serverless free tiers (for option b):**
| Platform | Free limit | Note |
|---|---|---|
| Cloudflare Workers | 100,000 requests/day | Simplest proxy; 10 ms CPU per invocation |
| Vercel Hobby | 1,000,000 function invocations/month | Hobby is non-commercial |
| Netlify Functions | 125,000 invocations/month (2025-26 sources also report a credit model) | verify live |
| Deno Deploy | 1,000,000 requests/month | consistent across sources |

#### Data persistence for the language key
| Store | Fit | Notes |
|---|---|---|
| localStorage | Too small/synchronous | OK only for the API key and settings |
| IndexedDB + Dexie | **Recommended** | Async, indexed, ample; easy JSON export |
| SQLite in browser (wa-sqlite/sql.js + OPFS) | Powerful if you want SQL coverage queries | Heavier; adopt only if needed |
| Supabase / Turso / Firebase | Only if multi-device sync needed | Adds accounts and secrets |

Use IndexedDB via Dexie, with one-click **export/import to JSON** so the whole rolodex is a file you commit to a private git repo.

#### Prompt engineering for reliable structured tagging
- **Use strict tool use / structured outputs.** Define one tool, e.g. `record_decomposition`, whose JSON schema enumerates the controlled vocabulary (component codes as enums) so the model cannot invent labels.
- **Separate the language-variant from the language-invariant.** The `decomposition` array contains only component IDs and Catalan surface forms, both language-invariant. Only the free-text `answer` and any generated `explanation` come back in French. This is the whole payoff of the tool-use design: switching base language, or adding a second one later, never touches the data that drives mastery tracking. Add an `answer_lang` field to the schema so the contract is explicit.
- **Instruct the metalanguage in the system prompt, not per query.** "Explique en français, en utilisant la terminologie grammaticale française. Les exemples et les formes catalanes restent en catalan." Keeping this in the cached prefix costs nothing per call.
- **Controlled vocabulary enforcement.** Put the full list of valid `id` codes in the tool schema as enums. Reject any output that fails schema validation and retry.
- **Prefill the assistant turn** with the opening `{` or tool_use scaffold to force immediate structured output.
- **Prompt caching for the taxonomy.** Place the taxonomy as a cached block (`cache_control`). First call writes cache at $1.25/M input; subsequent reads cost $0.10/M. Order is tools, then system, then messages; keep the cached prefix byte-identical or the cache invalidates. If you send `glosses.fr` in the cached block, send only the active language's glosses, not the whole map, to keep the prefix small.
- **Model tier.** Haiku 4.5 for cheap frequent tagging; escalate to Sonnet for a hard query on demand.
- **Cost estimate.** With a ~8k-token cached taxonomy, ~300 fresh input tokens and ~450 French output tokens: cache read ~$0.0008, fresh input ~$0.0003, output ~$0.00225. Roughly **$0.0035 per query**, so 500 queries/month is under **$2**.

#### Pedagogical design
- **Spaced repetition over grammar components, driven only by graded evidence.** Treat each taxonomy leaf as a reviewable knowledge component. FSRS advances ONLY on a graded review; looking something up tells you the user was curious, not that they know it. The routing from evidence type to signal is defined in `src/srs/evidence.ts` (`EVIDENCE_EFFECTS`), which is authoritative. Use **FSRS** (Anki default since v23.10; roughly 20 to 30% fewer reviews than SM-2 at equal retention on a 500M+ review benchmark). Optimise parameters only after ~1,000 reviews; before that the default population parameters are fine for one learner.
- **Seed initial difficulty from `contrast_fr`.** FSRS lets you set initial difficulty per item. Map `transfer` to low initial difficulty, `near-miss` and `false-friend` to high. This is a small change that makes the first few weeks of scheduling much better than a cold start.
- **Lightweight knowledge tracing, on a wider evidence base than FSRS.** Elo moves on both ungraded recall attempts and graded reviews, so the ranking signal keeps updating during review sessions rather than freezing. Either Duolingo's half-life regression (Settles & Meeder, ACL 2016; MIT-licensed reference implementation) or a simple Elo rating per component. Bayesian Knowledge Tracing (as in OATutor) is a third option if you want an explicit mastery probability.
- **Coverage visualisation: two dimensions, never one colour.** Render the taxonomy as a tree. HUE carries mastery (grey = never seen, red = weak, green = mastered); OPACITY carries exposure. A node known well but rarely met reads as pale green, one met often but still weak as solid red. Collapsing the two into a single colour is what turns a coverage map into a log of your interests wearing the costume of a skill map. A second view lists gaps, sorted by `contrast_fr.status` so `novel` and `false-friend` gaps rank above `transfer` gaps. A frequency-weighted "what to learn next" queue ranks unseen high-value nodes.

#### Reference projects worth studying
- **vertesia/large-language-tutor**: LLM tutor with message deconstruction, live checking, live dictionary. Closest to your idea.
- **ArtCC/freelingo**: self-hosted AI language tutor, CEFR-aligned A1-C2, SM-2 flashcards.
- **CAHLR/OATutor**: open intelligent tutoring system with Bayesian Knowledge Tracing, React, deployable to GitHub Pages with no backend.
- **duolingo/halflife-regression**: reference implementation plus dataset.
- **verbecc / verbecc-svc**: conjugation library and Dockerised REST API supporting Catalan.
- **bpeel/catverbs**, **verbs.cat**: Catalan conjugation references.

### Minimum viable build

**Stack:** vanilla TypeScript + Vite; Dexie for IndexedDB; hand-rolled SVG for the heatmap; hosted on GitHub Pages. No framework required.

**File structure:**
```
/index.html
/src/main.ts          # UI + query flow
/src/anthropic.ts     # API call (BYO key from localStorage)
/src/i18n.ts          # UI string table, fr
/src/taxonomy.json    # the language key (generated artefact)
/src/schema.ts        # generated tool schema, enums from taxonomy
/src/db.ts            # Dexie: queries, logs, mastery
/src/srs.ts           # FSRS/Elo scheduling
/src/coverage.ts      # gap analysis + heatmap
/data/export.json     # committed backup of the rolodex
```

**Example JSON, a taxonomy component (the "key"):**
```json
{
  "id": "PRON.feble.en",
  "ca": "pronom feble 'en'",
  "glosses": {
    "fr": "pronom faible « en » (partitif / complément en de)"
  },
  "domain": "PRON",
  "parent": "PRON.feble",
  "cefr": "A2",
  "forms": {"reforcada": "en", "plena": "ne", "reduida": "'n", "elidida": "n'"},
  "rules": [
    "remplace un COD partitif et les compléments introduits par de",
    "toujours en fin de groupe clitique, sauf devant hi"
  ],
  "examples": ["En vull dos", "Me'n vaig", "No en tinc"],
  "contrast_fr": {
    "status": "transfer",
    "note": "Correspond directement au « en » français. « Me'n vaig » = « je m'en vais »."
  },
  "dialect_note": "",
  "mastery": {
    "stability": 4.2, "difficulty": 4.0,
    "last_review": "2026-08-01", "due": "2026-08-09",
    "reps": 5, "lapses": 1, "elo": 1180
  }
}
```

**Example JSON, a logged query:**
```json
{
  "query_id": "q_20260807_001",
  "timestamp": "2026-08-07T10:15:00Z",
  "input": "que veut dire me'n vaig ?",
  "model": "claude-haiku-4-5",
  "intent": "comprehend",
  "direction": "ca_to_fr",
  "evidence": "lookup",
  "answer_lang": "fr",
  "answer": "C'est la 1re personne du singulier du présent du verbe pronominal « anar-se'n » : « je m'en vais ». Structure quasi identique au français.",
  "decomposition": [
    {"component": "VERB.irregular", "lemma": "anar", "detail": "pronominal anar-se'n"},
    {"component": "VERB.ind.pres", "detail": "présent, 1sg 'vaig'"},
    {"component": "PRON.feble.es", "detail": "marque réfléchie, réalisée 'me'"},
    {"component": "PRON.feble.en", "detail": "clitique adverbial lexicalisé"},
    {"component": "PRON.feble.combo", "detail": "ordre es+en, apostrophe à droite : me'n"},
    {"component": "PHON.apostrof", "detail": "me + en donne me'n"}
  ],
  "components_touched": [
    "VERB.irregular","VERB.ind.pres","PRON.feble.es",
    "PRON.feble.en","PRON.feble.combo","PHON.apostrof"
  ]
}
```

`intent` is one of `comprehend | produce | teach | assess | pronounce`, `direction` one of `ca_to_fr | fr_to_ca`, `evidence` one of `lookup | recall | graded`. All five intents emit the same `decomposition` payload; only the prompt and the surrounding fields differ. A `rating` field (`again | hard | good | easy`) is present if and only if `evidence` is `graded`, and a graded event is the only thing that advances FSRS. The example above is a lookup, so it carries no rating and moves no mastery: it increments exposure and nothing else.

Component entries may also carry an optional `ipa`, populated for the `pronounce` intent. It sits inside the decomposition because IPA is language-invariant, like the component IDs and Catalan forms around it. The French-oriented respelling that accompanies it does NOT go here, because it is French; it belongs in a sibling block alongside the decomposition.

**Phased roadmap:**
1. **Weekend prototype:** static page; paste key into localStorage; one Haiku call returning JSON with a French `answer`; render answer plus tag list; store logs in IndexedDB. Partial hand-authored `taxonomy.json`.
2. **Week 2:** strict tool use with enum-constrained schema; prompt caching; JSON export/import to git.
3. **Week 3-4:** seed the full taxonomy; author `glosses.fr` and `contrast_fr` per node; build the coverage heatmap with contrast-weighted gap ranking.
4. **Month 2:** FSRS scheduling with `contrast_fr`-seeded initial difficulty; Elo signal; optionally move the key behind a Cloudflare Worker.
5. **Later:** Stanza/spaCy micro-service for automatic pre-tagging; Valencian/Balearic dialect toggles; a second `glosses` key if you ever want an English mode.

## Recommendations
1. **Build the invariant machinery first**, not the UI: closed-vocabulary test, schema snapshot, gen-schema pipeline.
2. **Make `glosses` a keyed map from day one, and add `contrast_fr` to the leaf schema in Phase 1.** These are the only two changes the French base language forces, and both are cheap now and expensive later.
3. **Enforce the vocabulary at three layers**: constrained decoding at runtime, a closed-vocabulary test in CI, and an edit-time hook. Do not rely on prompt instructions.
4. **Assert on codes, never on French prose.** Golden-set tests check the `decomposition` array and that `answer_lang` is `fr`; the French explanation itself is spot-checked by you, not asserted.
5. **Seed one domain at a time, fact-level only.** Bake the licence table into `data/sources.md`. Extract facts and re-express; do not copy GPL/LGPL data files.
6. **Front-load the two French traps.** `VERB.ind.passat_perifrastic` and `NEG.pas` should be introduced with their contrast note attached, not discovered later as corrections.
7. **Verify all Anthropic specifics against current documentation** before hard-coding model IDs, prices, caching multipliers or the browser-access header.

## Caveats
- **Check the premise.** Routing grammatical explanation through French only helps if French is comfortable for you. If it is a second non-native language, you are adding load rather than removing it, and English glosses would be the better default with `contrast_fr` kept as a separate advisory layer.
- **French-Catalan pedagogical material is thinner** than Spanish-Catalan or English-Catalan. Expect to author more glosses by hand and to lean on the model more, which raises the value of the golden-set eval.
- **The `contrast_fr` assignments in this document are my analysis, not sourced from a published contrastive grammar.** They are a good starting hypothesis and should be revised as your own error data accumulates. That is, in fact, exactly what the mastery tracking is for.
- **Anthropic product details drift.** Model names, prices, caching multipliers and the CORS header are 2024-2026 snapshots and must be reconfirmed.
- **per/per a and a/en are genuinely unsettled.** GIEC sanctions three coexisting systems for per/per a; Central/Eastern speech uses only *per*. Treat as a variant node, not right/wrong.
- **Central vs other dialects.** Salat article, Balearic stressed schwa, Valencian clitic combinations, and `pas` distribution are dialect deltas in `dialect_note`, not core.
- **Copyleft on seed data.** Softcatalà and Apertium lexicons are GPL/LGPL; fine for a private app, but redistribution of a derived dataset inherits those obligations.
- **The "me'n vaig" reading is context-dependent:** present of *anar-se'n* ("je m'en vais") vs *me'n vaig anar* as passat perifràstic ("je m'en suis allé"). Let the model disambiguate and tag accordingly.
- **Knowledge-tracing evidence is from large populations.** With a single user the models mostly run on default parameters, which is acceptable but will not fit your personal forgetting curve for a long time.
