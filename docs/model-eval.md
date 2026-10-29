# Phase 1 model eval

**Choice: Claude Opus 5.5 (`claude-opus-5-5`), 29 Oct 2026.** It is the only finalist that clears every floor in `docs/spec-phases-0-1.md` (« Floors and selection »), so the tie-breaker never came into play. Decided by Sean in the Project « Català rebuild ».

## Result

Replayed offline by `npm run eval` from the recordings in `test/fixtures/golden-v2/recordings/`, scored against the verdicts in the golden-v2 fixtures as they stand at the commit that adds this file. Haiku 5.5 ran in round 1 only; Opus 5.5 and Sonnet 5.5 were the finalists and ran three times each.

| Measure | Floor | `claude-haiku-5-5` | `claude-opus-5-5` | `claude-sonnet-5-5` |
| --- | --- | --- | --- | --- |
| Runs |  | 1 | 1, 2, 3 | 1, 2, 3 |
| Pre-checks | all three | pass | pass | pass |
| One-hour cache accepted | reported | yes | yes | yes |
| Valid schema and spans, after the retry | every reply | 30/30 pass | 90/90 pass | 90/90 pass |
| Catalan accepted | 95%, no case faux in 2 runs | 29/30 pass | 90/90 pass | 86/90 **fail** (case 29) |
| « naturel » | tie-breaker | 21 | 85 | 72 |
| « correct mais peu naturel » | reported | 8 | 5 | 14 |
| « faux » | reported | 1 | 0 | 4 |
| Required IDs linked (accepted replies) | 90% | 84.0% **fail** | 98.0% pass | 92.6% pass |
| Padded links (lower bound) | at most 3% | 0/103 (0.0%) pass | 5/482 (1.0%) pass | 0/446 (0.0%) pass |
| Latency, warm, 90th percentile | at most 8 s | 7.6 s pass | 7.1 s pass | 3.1 s pass |
| Cost per sentence, warm (measured) |  | $0.0008 | $0.0125 | $0.0071 |
| Cost per sentence, cold, 5-minute cache |  | $0.0034 | $0.1227 | $0.0605 |
| Cost per sentence, cold, 1-hour cache |  | $0.0051 | $0.1916 | $0.0953 |

Every run passed the three pre-checks, including a cache read above zero on the second call of the session. Opus's required links are 147 of 150: the 29 Oct decision row computed 141 of 144 before case 7 was overruled, and case 7's six requirements count once its replies are accepted. Its five padded links are `VERB.mod.deure` on « Has de venir » (case 18, all three runs) and no chunk left unlinked on case 29 (runs 1 and 3).

## What changed after the speaker's review

All three were decided by Sean, written into the fixtures in their own commit, and need no re-recording.

1. **Row 28 (27 Oct).** « contente » states the speaker is a woman, so `speaker_fem` moved from a required to a forbidden assumption. Assumptions affect no floor.
2. **Any-of on rows 4, 5, 13, 21 and 23 (29 Oct).** The speaker accepted renderings built on another construction, so each such requirement also accepts the matching ID. A fixture correction, not a lower floor: Opus went from 129 of 144 to 141 of 144, Sonnet from 128 of 144 to 133 of 144.
3. **Case 7 overruled (29 Oct).** On the IEC grammar (2016), which accepts both forms in every register, Sean overruled three of the speaker's verdicts: 7-d « L'hi vaig donar ahir » from faux to naturel (the Central standard, the form the taxonomy teaches), and 7-b and 7-c « li'l » from faux to peu naturel (correct, but Valencian rather than Central). This is Sean's decision on sources, not the speaker's verdict, which stays as given in `test/fixtures/golden-v2/review/`. Before it, both finalists failed « Catalan accepted » on case 7.

## Caveat: « li'l »

Opus wrote « Li'l vaig donar ahir » in two of its three runs, so learners may see the Valencian combination where the taxonomy teaches the Central « l'hi ». That cost is accepted. A prompt line asking for Central forms waits until the prompt next changes for another reason, because any prompt change makes every recording stale and forces a re-record.

## Keeping it true

CI runs `npm run eval`, which fails when the app's model (`MODEL` in `src/api/anthropic.ts`) has fewer than three current runs, a failed pre-check, a recording made under another prompt, or any floor not passed. Changing the prompt or a verdict therefore means re-recording with `npm run eval:record` (the only paid step, never run in CI) or revisiting this choice.
