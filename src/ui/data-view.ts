/**
 * Export, import, and the API key.
 *
 * `exportSnapshot` and `importSnapshot` already do the work, including the
 * validation: the import checks the format version and every component ID
 * before it writes anything, and replaces rather than merges. Nothing here
 * second-guesses that, and nothing here writes to the store directly.
 *
 * The import replaces everything, which the copy states before the file picker
 * rather than after it. A learner who reads that sentence afterwards has
 * already lost the data it was warning about.
 */
import { fr } from '../i18n/fr';
import { exportSnapshot, type Snapshot } from '../db/read';
import { importSnapshot } from '../db/persist';
import { renderApiKeyPanel } from './api-key';

export interface DataViewOptions {
  /** Called after a successful import, so every view can be rebuilt. */
  readonly onImported?: () => void;
  readonly storage?: Storage;
}

function download(snapshot: Snapshot): void {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `francais-catalan-${String(snapshot.exportedAt)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function mountDataView(host: HTMLElement, options: DataViewOptions = {}): void {
  const root = document.createElement('section');
  root.className = 'ac-view ac-data';

  const heading = document.createElement('h2');
  heading.className = 'ac-heading';
  heading.textContent = fr.data.heading;

  const panel = document.createElement('section');
  panel.className = 'ac-panel';

  const exportHint = document.createElement('p');
  exportHint.className = 'ac-hint';
  exportHint.textContent = fr.data.exportHint;

  const exportButton = document.createElement('button');
  exportButton.type = 'button';
  exportButton.className = 'ac-button ac-button--primary';
  exportButton.textContent = fr.data.exportButton;

  const importHint = document.createElement('p');
  importHint.className = 'ac-hint';
  importHint.textContent = fr.data.importHint;

  const file = document.createElement('input');
  file.type = 'file';
  file.accept = 'application/json,.json';
  file.className = 'ac-input ac-file';

  const importLabel = document.createElement('label');
  importLabel.className = 'ac-control';
  const importCaption = document.createElement('span');
  importCaption.className = 'ac-control-label';
  importCaption.textContent = fr.data.importButton;
  importLabel.append(importCaption, file);

  const status = document.createElement('p');
  status.className = 'ac-status';

  exportButton.addEventListener('click', () => {
    void (async () => {
      download(await exportSnapshot());
    })();
  });

  file.addEventListener('change', () => {
    const chosen = file.files?.[0];
    if (chosen === undefined) return;
    void (async () => {
      try {
        await importSnapshot(JSON.parse(await chosen.text()) as Snapshot);
        status.textContent = fr.data.imported;
        options.onImported?.();
      } catch {
        // importSnapshot validates before it writes, so a refusal has changed
        // nothing. That is what the message is allowed to claim.
        status.textContent = fr.data.importFailed;
      } finally {
        file.value = '';
      }
    })();
  });

  panel.append(exportHint, exportButton, importHint, importLabel, status);
  root.append(
    heading,
    panel,
    renderApiKeyPanel(
      options.storage === undefined ? {} : { storage: options.storage },
    ),
  );
  host.replaceChildren(root);
}
