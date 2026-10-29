# Golden set v2: approved sentences

Approved by Sean on 21 Oct 2026. These are the 30 inputs for the phase 1 model eval (`docs/spec-phases-0-1.md`, « Phase 1: model eval »). Source of record: the Claude Doc « Golden set v2: draft sentences » in the Project « Català rebuild ».

Every ID below exists in the taxonomy at `41db6b4`. The chunk hints are the drafter's guess at the natural Catalan, for orientation only: they are never scored, and the native speaker's verdicts override them.

## Sentences

| # | French input | Risk area | Must link (ID · chunk hint) | Must not link | Assumptions |
| --- | --- | --- | --- | --- | --- |
| 1 | Hier, j’ai acheté le pain au marché. | Past, hier | `VERB.ind.passat_perifrastic` · vaig comprar; `ART.contract.a_de` · al mercat | `VERB.perf.present` | none |
| 2 | Ce matin, j’ai vu ta sœur. | Past, today | `VERB.perf.present` · he vist; `DET.poss.article_obligatori` · la teva germana | `VERB.ind.passat_perifrastic` | none |
| 3 | L’année dernière, nous sommes allés à Gérone. | Past, hier | `VERB.ind.passat_perifrastic` · vam anar; `PREP.a_en.lloc.a_lloc` · a Girona | `VERB.perf.present` | none |
| 4 | Je n’ai jamais mangé de calçots. | Past, experience | `VERB.perf.present` · he menjat; any of `NEG.concordanca.postverbal` or `NEG.concordanca.preverbal` · no … mai | `NEG.simple.pas` | none |
| 5 | Je n’en ai plus envie. | Weak pronouns | `PRON.feble.en` · en; any of `NEG.aspecte.ja_no` or `NEG.aspecte.no_mes` · ja no | `NEG.simple.pas` | none |
| 6 | Tu y vas demain ? | Weak pronouns | `PRON.feble.hi` · hi; `SYN.interrogativa.total` | none | none |
| 7 | Je le lui ai donné hier. | Weak pronouns | `PRON.feble.combinacio.ci_cd` · l'hi; `VERB.ind.passat_perifrastic` · vaig donar | `VERB.perf.present` | none |
| 8 | Donne-le-moi, s’il te plaît. | Weak pronouns | `VERB.imperatiu.positiu` · dona; `SYN.clitics.proclisi_enclisi` · dona-me'l; `LEX.locucions.cortesia` · si us plau | none | none |
| 9 | J’ai acheté du pain. | Partitive | `ART.indef.sense_partitiu` · pa | `NOM.number.a_es` (old padding trap) | none |
| 10 | Il n’y a plus de lait. | Partitive | `NEG.aspecte.ja_no` · ja no; `VERB.haver_tenir` · hi ha | none | none |
| 11 | Je n’ai pas de voiture. | Partitive | `ART.indef.omissio_negacio` · cotxe; `NEG.simple.no` · no | `NEG.simple.pas` | none |
| 12 | Je ne le fais plus. | Negation | `NEG.aspecte.ja_no` · ja no; `PRON.feble.ho` · ho | `PRON.feble.cd_3a` | none |
| 13 | Personne n’est venu. | Negation | Any of `NEG.concordanca.preverbal` or `NEG.concordanca.postverbal` · ningú | none | none |
| 14 | Je n’ai rien dit à personne. | Negation | `NEG.concordanca.postverbal` · no … res … ningú; `PRON.indefinit.res` · res | none | none |
| 15 | Il faut que je parte demain. | Tournures | Any of: `VERB.mod.obligacio` · he de marxar, or `VERB.subj.present` · cal que marxi | none | none |
| 16 | Je viens d’arriver. | Tournures | `VERB.perifrasi.acabar_de` · acabo d'arribar | `PREP.atones.de_origen` | none |
| 17 | Elle est en train de préparer le dîner. | Tournures | `VERB.perifrasi.progressiva` · està preparant | none | none |
| 18 | Tu dois venir avec nous. | Tournures | `VERB.mod.obligacio` · has de venir | `VERB.mod.deure` | none |
| 19 | La soupe est froide. | ser / estar | `VERB.ser_estar` · està; `NOM.adj.four_form` · freda | none | none |
| 20 | Nous sommes à la maison. | ser / estar | `VERB.ser_estar` · som or estem | none | none |
| 21 | Il parle très lentement. | Control (transfer) | Any of `ADV.manera.ment` or `ADV.manera.locucions` · lentament; `ADV.grau.molt` · molt | none | none |
| 22 | Je veux que tu viennes. | Subjunctive | `VERB.subj.present` · vinguis; `CONJ.completiva.que` · que | none | none |
| 23 | Bien qu’il pleuve, on va sortir. | Subjunctive | Any of `CONJ.concessiva.encara_que` or `CONJ.concessiva.tot_i_que` · encara que; any of `VERB.subj.present` or `VERB.ind.present` · plogui | none | none |
| 24 | La voiture de mon frère est plus rapide que la mienne. | Gender, comparison | `NOM.gender.diverge_fr` · el cotxe; `ART.contract.a_de` · del; `CONJ.comparativa.igualtat_desigualtat` · més … que | none | none |
| 25 | J’ai demandé l’heure à un passant. | False friend | `LEX.fals_amic.abast` · he preguntat | none | none |
| 26 | J’ai une collection de timbres. | Spelling, l·l | `PHON.grafia.ela_geminada` · col·lecció | none | none |
| 27 | Vous êtes prêts ? | Ambiguous address | `VERB.ser_estar` · esteu | none | Plural « vous », not formal: no `addressee_formal` |
| 28 | Je suis contente de te voir. | Speaker gender | `VERB.ser_estar` · estic; `SYN.clitics.proclisi_enclisi` · veure't | none | « contente » states it, so not an assumption: no `speaker_fem` |
| 29 | J’ai la flemme d’y aller. | Idiom, outside taxonomy | No fixed ID; at least one chunk unlinked rather than forced | none | none |
| 30 | Je me suis tromper de chemin hier soir. | Typo in input | `VERB.ind.passat_perifrastic` · em vaig equivocar; `SYN.pronominals.inherents` · equivocar-se | `VERB.perf.present` | none; `fr` must correct « tromper » to « trompé » |

## Rules for scoring

- **Must link** fails a reply only when the speaker has accepted its Catalan. If an accepted rendering uses another structure (rows 4, 5, 13, 15, 20, 21, 23), the requirement is « any of », as written.
- **Must not link** lists known padding traps, including the one the outside review caught in the old set (row 9).
- Row 29 tests honesty, not coverage: a forced ID on an idiom counts as padding.
- Row 30 keeps its typo on purpose. Do not correct the input in the fixture.

## Departures from the spec, accepted 21 Oct

1. Five old French inputs are reused (rows 12, 15, 21, 24, 26), not four.
2. ser / estar has 2 cases, not 3; row 21 is an easy transfer case that checks a model does not over-analyse.
3. haver / tenir has no row of its own; rows 5 and 10 cover it.

## Corrections after review

Decided by Sean in the Project « Català rebuild ». Fixture corrections, not lower floors: no re-recording.

1. 27 Oct, row 28: « contente » states the speaker is a woman, so `speaker_fem` is not an assumption. It moves from required to forbidden.
2. 29 Oct, rows 4, 5, 13, 21 and 23: the speaker accepted renderings built on another construction, so each such requirement becomes « any of », as the rules above already allow.
