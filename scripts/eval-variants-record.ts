/**
 * The variant eval's one live, paid step. Sean runs it; Claude Code never
 * does, and CI never does (phase 2 spec, « Running it »).
 *
 *   npm run eval:variants:record -- --model <id> --runs <n>
 *
 * with the key in ANTHROPIC_API_KEY for that one command. The key is read from
 * the environment and passed to the recorder only. It is never printed, never
 * written to a file, and never part of a recording.
 */
import { VARIANT_CANDIDATES, recordVariantRun } from '../src/eval/variants';
import { variantPromptHash } from '../src/variants/prompt';
import { argument, writeJson } from './lib/golden-files';
import {
  loadVariantFixtures,
  nextVariantRun,
  variantRecordingPath,
} from './lib/variant-files';

const model = argument('model');
const runs = Number(argument('runs') ?? '1');
const apiKey = process.env['ANTHROPIC_API_KEY'];

if (model === undefined || !VARIANT_CANDIDATES.includes(model)) {
  console.error(
    `eval:variants:record: --model must be one of ${VARIANT_CANDIDATES.join(', ')}.`,
  );
  process.exit(1);
}
if (!Number.isInteger(runs) || runs < 1) {
  console.error('eval:variants:record: --runs must be a whole number of at least 1.');
  process.exit(1);
}
if (apiKey === undefined || apiKey.trim() === '') {
  console.error(
    'eval:variants:record: set ANTHROPIC_API_KEY in the environment for this command.',
  );
  process.exit(1);
}

const fixtures = loadVariantFixtures();
const hash = await variantPromptHash();

for (let count = 0; count < runs; count += 1) {
  const run = nextVariantRun(model);
  console.log(`${model}, run ${String(run)}`);
  const recording = await recordVariantRun(fixtures, {
    model,
    apiKey,
    run,
    promptHash: hash,
    log: (line) => {
      console.log(`  ${line}`);
    },
  });
  const file = variantRecordingPath(model, run);
  await writeJson(file, recording);
  console.log(
    recording.dropped
      ? `  dropped on ${recording.dropped}; written to ${file}`
      : `  written to ${file}`,
  );
  if (recording.dropped) break;
}
