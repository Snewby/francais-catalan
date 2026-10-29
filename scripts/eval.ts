/**
 * The golden set v2 report, offline always.
 *
 *   npm run eval                 print the report
 *   npm run eval -- --out FILE   also write it to FILE
 *
 * Replays every recording through the app's own client with a stub fetch and
 * scores it against the speaker's verdicts. There is no live path here and no
 * flag that adds one: `npm run eval:record` is the only paid step.
 *
 * Exits non-zero when the app's model no longer clears every floor over three
 * current runs, which is what CI checks (spec, phase 1 « Model »).
 */
import { writeFileSync } from 'node:fs';
import { MODEL } from '../src/api/anthropic';
import { promptHash } from '../src/api/prompt';
import { replayRecording, type ReplayedReply } from '../src/eval/golden';
import {
  gateFailures,
  renderReport,
  scoreModel,
  type ModelScore,
} from '../src/eval/score';
import { argument, loadCases, loadRecordings } from './lib/golden-files';

const cases = loadCases();
const recordings = loadRecordings();
const hash = await promptHash();

const scores: ModelScore[] = [];
for (const model of [...new Set(recordings.map((recording) => recording.model))]) {
  const runs = recordings.filter((recording) => recording.model === model);
  const replies: ReplayedReply[] = [];
  for (const recording of runs)
    replies.push(...(await replayRecording(recording, cases)));
  scores.push(scoreModel(model, runs, replies, hash));
}

const report = renderReport(scores);
console.log(report);
const out = argument('out');
if (out !== undefined) writeFileSync(out, `${report}\n`, 'utf8');

const failures = gateFailures(
  scores.find((score) => score.model === MODEL),
  cases.length,
);
if (failures.length > 0) {
  console.error(`\n${MODEL} is no longer the eval's choice:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
}
