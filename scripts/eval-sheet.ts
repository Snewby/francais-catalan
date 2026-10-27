/**
 * The review sheet for the native speaker.
 *
 *   npm run eval:sheet -- --round <n>
 *
 * Replays every recording, adds each new valid rendering to its case with a
 * stable ID, and writes review/round-<n>.md plus review/verdicts-round-<n>.json
 * for Sean to fill in. Only renderings with no verdict go on the sheet.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { replayRecording, type ReplayedReply } from '../src/eval/golden';
import { buildSheet, registerRenderings, verdictTemplate } from '../src/eval/review';
import {
  REVIEW_DIR,
  argument,
  loadCases,
  loadRecordings,
  saveCases,
  writeJson,
} from './lib/golden-files';

const round = Number(argument('round'));
if (!Number.isInteger(round) || round < 1) {
  console.error('eval:sheet: --round must be a whole number of at least 1.');
  process.exit(1);
}

const before = loadCases();
const replies: ReplayedReply[] = [];
for (const recording of loadRecordings()) {
  replies.push(...(await replayRecording(recording, before)));
}
const cases = registerRenderings(before, replies);
await saveCases(cases);

mkdirSync(REVIEW_DIR, { recursive: true });
const sheet = path.join(REVIEW_DIR, `round-${String(round)}.md`);
const verdicts = path.join(REVIEW_DIR, `verdicts-round-${String(round)}.json`);
writeFileSync(sheet, `${buildSheet(cases, round)}\n`, 'utf8');
const template = verdictTemplate(cases);
await writeJson(verdicts, template);

console.log(
  `eval:sheet: ${String(Object.keys(template).length)} renderings to judge; ` +
    `wrote ${sheet} and ${verdicts}.`,
);
