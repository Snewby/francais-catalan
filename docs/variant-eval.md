# Phase 2 variant eval

**Provisional choice: Claude Opus 5.5 (`claude-opus-5-5`), 2 Nov 2026. No model clears every floor**, so under `docs/spec-phase-2.md` (« Floors ») phase 2 would stop and the floors go back to Sean. Sean decided instead to keep building on Opus 5.5 provisionally and to settle the two open failures below later, raising faults he meets in use through « Signaler une erreur ». Phase 2 cannot close until they are settled.

## Result

Replayed offline by `npm run eval:variants` from `test/fixtures/variants-v1/recordings/`. Haiku 5.5 ran round 1 only: round 2 is Opus only (decided 2 Nov), because Haiku could no longer clear validity or latency whatever runs 2 and 3 did. The Catalan and French verdicts are not in yet, so those floors read « pending ».

| Measure | Floor | `claude-haiku-5-5` | `claude-opus-5-5` |
| --- | --- | --- | --- |
| Runs |  | 1 | 1, 2, 3 |
| Pre-checks | all three | pass | pass |
| Valid after the one retry | every reply | 32/60 **fail** | 179/180 **fail** |
| Catalan accepted | 95%, no combination faux in 2 runs | pending | pending |
| French line « fidèle » | 95% | pending | pending |
| not_applicable on every trap | 2 of 3 runs each | 19b 1/1, 22a 0/1, 28d 0/1 | 19b 3/3, 22a 3/3, 28d 0/3 **fail** |
| not_applicable where not expected | at most 3% | 5/57 (8.8%) **fail** | 2/171 (1.2%) pass |
| Padded links (lower bound) | at most 3% | 0/125 pass | 0/881 pass |
| Latency, warm, median |  | 9.0 s | 4.2 s |
| Latency, warm, 90th percentile | at most 8 s | 13.6 s **fail** | 6.3 s pass |
| 2 s target (a miss adds prefetch) | target | missed | missed |
| Cost per tap, warm (measured) |  | $0.0014 | $0.0131 |
| Cost per tap, cold, 5-minute cache |  | $0.0058 | $0.1301 |
| Cost per tap, cold, 1-hour cache |  | $0.0087 | $0.2032 |

Haiku's 28 unavailable replies nearly all left out `subject` or `assumptions` twice; its first calls alone have a warm p90 of 8.6 s.

## Open failures (Opus 5.5)

1. **Trap 28d.** « Estic contenta de veure't » with tu was answered « Estàs contenta de veure'm » (« Tu es contente de me voir ») in all three runs, where D5 expects `subordinate_affected`. The model changes who is seen to avoid « te veure't », so the variant means something else.
2. **12a, run 2.** « Ja no ho faig » with negation off was answered « Ja ho faig » and then « Encara ho faig », with « Encara » as a `time` chunk, which the negation axis does not allow. Runs 1 and 3 answered « Ho faig ».

The options put to Sean on 2 Nov: a prompt line for 28d and a wider negation axis for « ja no », then re-recording Opus's three runs (about $3); waiting for the speaker's verdict on 28d; or relaxing a floor.

## Latency and prefetch

Opus misses the 2 s target (median 4.2 s, fastest first call 2.1 s), so prefetch is added as decided on 29 Oct (F1): the two neighbouring tenses and persons of the original sentence, about $0.05 a sentence warm.

## Keeping it true

CI runs `npm run eval:variants` without its gate, so a client that no longer replays the recordings fails CI. Once the floors are settled, CI runs it with `--gate claude-opus-5-5` (or the chosen model), which fails when that model stops clearing them. `npm run eval:variants:record` is the only paid step.
