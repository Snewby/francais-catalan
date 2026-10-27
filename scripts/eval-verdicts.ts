/**
 * Writes the speaker's verdicts into the fixtures.
 *
 *   npm run eval:verdicts -- test/fixtures/golden-v2/review/verdicts-round-1.json
 *
 * Commit the result on its own, so the change of expected results is visible
 * (spec, « Running it »). An unknown reference, an unknown verdict or a change
 * to an existing verdict refuses the whole file.
 */
import { readFileSync } from 'node:fs';
import { applyVerdicts } from '../src/eval/review';
import { loadCases, saveCases } from './lib/golden-files';

const file = process.argv[2];
if (file === undefined) {
  console.error('eval:verdicts: name the verdict file to apply.');
  process.exit(1);
}

const verdicts = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
const { cases, applied } = applyVerdicts(loadCases(), verdicts);
await saveCases(cases);
console.log(`eval:verdicts: ${String(applied)} verdicts written into the fixtures.`);
