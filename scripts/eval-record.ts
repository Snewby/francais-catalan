/**
 * The one live, paid step. Sean runs it; Claude Code never does, and CI never
 * does (decided 26 Oct, phase 1 question A, and spec Q10).
 *
 *   npm run eval:record -- --model <id> --runs <n>
 *
 * with the key in ANTHROPIC_API_KEY for that one command. The key is read from
 * the environment and passed to the recorder only. It is never printed, never
 * written to a file, and never part of a recording.
 */
import { promptHash } from '../src/api/prompt';
import { PRICES } from '../src/eval/pricing';
import { recordRun } from '../src/eval/record';
import {
  argument,
  loadCases,
  nextRun,
  recordingPath,
  writeJson,
} from './lib/golden-files';

const model = argument('model');
const runs = Number(argument('runs') ?? '1');
const apiKey = process.env['ANTHROPIC_API_KEY'];

if (model === undefined || PRICES[model] === undefined) {
  console.error(
    `eval:record: --model must be one of ${Object.keys(PRICES).join(', ')}.`,
  );
  process.exit(1);
}
if (!Number.isInteger(runs) || runs < 1) {
  console.error('eval:record: --runs must be a whole number of at least 1.');
  process.exit(1);
}
if (apiKey === undefined || apiKey.trim() === '') {
  console.error(
    'eval:record: set ANTHROPIC_API_KEY in the environment for this command.',
  );
  process.exit(1);
}

const cases = loadCases();
const hash = await promptHash();

for (let count = 0; count < runs; count += 1) {
  const run = nextRun(model);
  console.log(`${model}, run ${String(run)}`);
  const recording = await recordRun(cases, {
    model,
    apiKey,
    run,
    promptHash: hash,
    log: (line) => {
      console.log(`  ${line}`);
    },
  });
  const file = recordingPath(model, run);
  await writeJson(file, recording);
  console.log(
    recording.dropped
      ? `  dropped on ${recording.dropped}; written to ${file}`
      : `  written to ${file}`,
  );
  if (recording.dropped) break;
}
