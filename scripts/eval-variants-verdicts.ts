/**
 * Writes verdicts into the variant fixtures, Catalan or French.
 *
 *   npm run eval:variants:verdicts -- test/fixtures/variants-v1/review/round-1-catalan-verdicts.json
 *
 * Commit the result on its own, so the change of expected results is visible.
 * An unknown reference, an unknown verdict or a change to an existing verdict
 * refuses the whole file.
 */
import { readFileSync } from 'node:fs';
import { applyVariantVerdicts } from '../src/eval/variant-review';
import { loadVariantFixtures, saveVariantFixtures } from './lib/variant-files';

const file = process.argv[2];
if (file === undefined) {
  console.error('eval:variants:verdicts: name the verdict file to apply.');
  process.exit(1);
}

const verdicts = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
const { fixtures, applied } = applyVariantVerdicts(loadVariantFixtures(), verdicts);
await saveVariantFixtures(fixtures);
console.log(
  `eval:variants:verdicts: ${String(applied)} verdicts written into the fixtures.`,
);
