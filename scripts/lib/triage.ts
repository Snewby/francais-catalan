/**
 * The reports triage sheet: every open « Signaler une erreur » report in an
 * exported backup, newest first, beside exactly what was on screen and what
 * produced it, so a fault met in use can be reproduced and turned into an
 * eval case (decided 2 Nov: build on, troubleshoot from reports).
 *
 * Repo documentation, so English; the learner's text, the Catalan and the
 * French are quoted as they were.
 */
import type { Backup } from '../../src/db/backup';
import type { PhraseRow, ReportRow, VariantRow } from '../../src/db/rows';
import { REPORT_KINDS, type ReportKind } from '../../src/phrase/report';

const KIND_LABEL: Readonly<Record<ReportKind, string>> = {
  catalan_wrong: 'Catalan wrong',
  french_wrong: 'French wrong',
  wrong_change: 'Not the change asked for',
  notion_wrong: 'Notion linked wrong',
};

export interface CurrentHashes {
  readonly phrase: string;
  readonly variant: string;
}

function rows<T>(backup: Backup, table: string): T[] {
  return (backup.tables[table] ?? []) as T[];
}

function quoted(text: string): string {
  return `« ${text} »`;
}

function chunkLines(row: PhraseRow | VariantRow | undefined): string[] {
  if (row === undefined || row.chunks.length === 0) return ['  - (no chunks stored)'];
  return row.chunks.map(
    (chunk) =>
      `  - ${quoted(chunk.text)} ${chunk.role}: ${chunk.ids.join(', ') || `unlinked (${chunk.unlinked ?? '?'})`}`,
  );
}

export function renderTriage(backup: Backup, current: CurrentHashes): string {
  const phrases = new Map(
    rows<PhraseRow>(backup, 'phrases').map((row) => [row.id, row]),
  );
  const variants = new Map(
    rows<VariantRow>(backup, 'variants').map((row) => [row.id, row]),
  );
  const reports = rows<ReportRow>(backup, 'reports')
    .filter((report) => report.deletedAt === null)
    .sort((a, b) => b.at - a.at);

  const count = (kind: ReportKind | null) =>
    reports.filter((report) => (report.kind ?? null) === kind).length;
  const summary = [
    '| Kind | Reports |',
    '| --- | --- |',
    ...REPORT_KINDS.map((kind) => `| ${KIND_LABEL[kind]} | ${String(count(kind))} |`),
    `| No kind given | ${String(count(null))} |`,
  ];

  const cards = reports.flatMap((report, index) => {
    const phrase = phrases.get(report.phraseId);
    const variant =
      report.variantId === undefined || report.variantId === null
        ? undefined
        : variants.get(report.variantId);
    const source = variant ?? phrase;
    const hash = variant !== undefined ? current.variant : current.phrase;
    const snapshot = report.snapshot;
    const ca = snapshot?.ca ?? variant?.ca ?? phrase?.ca ?? '?';
    const fr = snapshot?.fr ?? variant?.fr ?? phrase?.fr ?? '?';
    const kind = report.kind ?? null;
    return [
      `## ${String(index + 1)}. ${kind === null ? 'No kind given' : KIND_LABEL[kind]}`,
      '',
      `- Reported: ${new Date(report.at).toISOString()}`,
      `- Note: ${report.text === '' ? '(none)' : quoted(report.text)}`,
      `- Sentence typed: ${quoted(snapshot?.input ?? phrase?.input ?? '?')}`,
      `- Catalan shown: ${quoted(ca)}`,
      `- French shown: ${quoted(fr)}`,
      `- Combination: ${snapshot?.comboKey ?? variant?.comboKey ?? 'the original sentence'}`,
      `- Made by: ${source?.model ?? '?'}, prompt ${source?.promptHash.slice(0, 12) ?? '?'} ` +
        `(${source === undefined ? 'row not in the backup' : source.promptHash === hash ? 'current' : 'stale: the prompt has changed since'})`,
      `- Phrase ${report.phraseId}${variant === undefined ? '' : `, variant ${variant.id}`}`,
      `- Chunks as stored:`,
      ...chunkLines(source),
      `- Becomes: ${variant === undefined ? 'a golden-set case for the phrase prompt' : 'a variant-eval combination for this row'}`,
      '',
    ];
  });

  return [
    '# Reports triage',
    '',
    `From a backup exported ${new Date(backup.exportedAt).toISOString()}: ` +
      `${String(reports.length)} open report${reports.length === 1 ? '' : 's'}, newest first.`,
    '',
    ...summary,
    '',
    ...cards,
  ].join('\n');
}
