/**
 * The variant review sheets.
 *
 *   npm run eval:variants:sheet -- --round <n>
 *
 * Replays every recording, adds each new valid Catalan rendering and French
 * line to its combination with a stable ID, and writes two sheets under
 * review/: round-<n>-catalan.md for the speaker and round-<n>-francais.md for
 * Sean, each with its verdict file to fill in. Only unjudged lines appear.
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import {
  buildCatalanSheet,
  buildFrenchSheet,
  registerVariantLines,
  variantVerdictTemplates,
} from '../src/eval/variant-review';
import { replayVariantRecording, type ReplayedVariant } from '../src/eval/variants';
import { argument, writeFormatted, writeJson } from './lib/golden-files';
import {
  VARIANT_REVIEW_DIR,
  loadVariantFixtures,
  loadVariantRecordings,
  saveVariantFixtures,
} from './lib/variant-files';

const round = Number(argument('round'));
if (!Number.isInteger(round) || round < 1) {
  console.error('eval:variants:sheet: --round must be a whole number of at least 1.');
  process.exit(1);
}

const before = loadVariantFixtures();
const replies: ReplayedVariant[] = [];
for (const recording of loadVariantRecordings()) {
  replies.push(...(await replayVariantRecording(recording, before)));
}
const fixtures = registerVariantLines(before, replies);
await saveVariantFixtures(fixtures);

mkdirSync(VARIANT_REVIEW_DIR, { recursive: true });
const file = (suffix: string): string =>
  path.join(VARIANT_REVIEW_DIR, `round-${String(round)}-${suffix}`);
await writeFormatted(
  file('catalan.md'),
  buildCatalanSheet(fixtures, round),
  'markdown',
);
await writeFormatted(
  file('francais.md'),
  buildFrenchSheet(fixtures, replies, round),
  'markdown',
);
const templates = variantVerdictTemplates(fixtures);
await writeJson(file('catalan-verdicts.json'), templates.catalan);
await writeJson(file('francais-verdicts.json'), templates.french);

console.log(
  `eval:variants:sheet: ${String(Object.keys(templates.catalan).length)} Catalan ` +
    `renderings and ${String(Object.keys(templates.french).length)} French lines to ` +
    `judge; wrote the sheets and verdict files to ${VARIANT_REVIEW_DIR}.`,
);
