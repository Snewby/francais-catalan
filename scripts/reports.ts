/**
 * The reports triage sheet, from a backup exported in the settings sheet.
 *
 *   npm run reports -- <backup.json>              print the sheet
 *   npm run reports -- <backup.json> --out FILE   also write it to FILE
 *
 * Offline and free. The backup holds no API key (src/db/sync.ts), and the
 * sheet holds only what the backup does.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { promptHash } from '../src/api/prompt';
import { parseBackup } from '../src/db/backup';
import { variantPromptHash } from '../src/variants/prompt';
import { argument } from './lib/golden-files';
import { renderTriage } from './lib/triage';

const file = process.argv[2];
if (file === undefined || file.startsWith('--')) {
  console.error('reports: name the exported backup file to read.');
  process.exit(1);
}

const sheet = renderTriage(parseBackup(readFileSync(file, 'utf8')), {
  phrase: await promptHash(),
  variant: await variantPromptHash(),
});
console.log(sheet);
const out = argument('out');
if (out !== undefined) writeFileSync(out, `${sheet}\n`, 'utf8');
