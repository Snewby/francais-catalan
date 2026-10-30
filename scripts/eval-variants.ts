/**
 * The variant eval report, offline always.
 *
 *   npm run eval:variants                 print the report
 *   npm run eval:variants -- --out FILE   also write it to FILE
 *   npm run eval:variants -- --gate <id>  exit non-zero unless <id> clears every floor
 *
 * Replays every recording through the app's own variant client with a stub
 * fetch and scores it against the verdicts in the fixtures. There is no live
 * path here: `npm run eval:variants:record` is the only paid step. The gate
 * flag is what CI will run once the variant model is chosen.
 */
import { writeFileSync } from 'node:fs';
import type { ComponentId } from '../src/api/schema';
import {
  renderVariantReport,
  scoreVariantModel,
  variantGateFailures,
  type VariantScore,
} from '../src/eval/variant-score';
import { replayVariantRecording, type ReplayedVariant } from '../src/eval/variants';
import { variantPromptHash } from '../src/variants/prompt';
import { argument, loadCases } from './lib/golden-files';
import { loadVariantFixtures, loadVariantRecordings } from './lib/variant-files';

const fixtures = loadVariantFixtures();
const recordings = loadVariantRecordings();
const hash = await variantPromptHash();
const mustNotLink = new Map<number, readonly ComponentId[]>(
  loadCases().map((golden) => [golden.n, golden.mustNotLink]),
);

const scores: VariantScore[] = [];
for (const model of [...new Set(recordings.map((recording) => recording.model))]) {
  const runs = recordings.filter((recording) => recording.model === model);
  const replies: ReplayedVariant[] = [];
  for (const recording of runs) {
    replies.push(...(await replayVariantRecording(recording, fixtures)));
  }
  scores.push(scoreVariantModel(model, runs, replies, hash, mustNotLink));
}

const report = renderVariantReport(scores);
console.log(report);
const out = argument('out');
if (out !== undefined) writeFileSync(out, `${report}\n`, 'utf8');

const gate = argument('gate');
if (gate !== undefined) {
  const failures = variantGateFailures(
    scores.find((score) => score.model === gate),
    fixtures,
  );
  if (failures.length > 0) {
    console.error(`\n${gate} does not clear the variant eval:`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  }
}
