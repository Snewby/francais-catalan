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
import { exportSnapshot, readSignalledReplies, type Snapshot } from '../db/read';
import { renderSignalPack } from '../text/signal-pack';
import { importSnapshot } from '../db/persist';
import { renderApiKeyPanel } from './api-key';

export interface DataViewOptions {
  /** Called after a successful import, so every view can be rebuilt. */
  readonly onImported?: () => void;
  readonly storage?: Storage;
}

function saveFile(name: string, type: string, contents: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function download(snapshot: Snapshot): void {
  saveFile(
    `francais-catalan-${String(snapshot.exportedAt)}.json`,
    'application/json',
    JSON.stringify(snapshot, null, 2),
  );
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

  const signalsHint = document.createElement('p');
  signalsHint.className = 'ac-hint';
  signalsHint.textContent = fr.data.signalsHint;

  const signalsButton = document.createElement('button');
  signalsButton.type = 'button';
  signalsButton.className = 'ac-button';
  signalsButton.textContent = fr.data.signalsButton;

  exportButton.addEventListener('click', () => {
    void (async () => {
      download(await exportSnapshot());
    })();
  });

  // Markdown rather than JSON, because its destination is a chat with a reader
  // rather than another copy of this application. The JSON export carries the
  // same replies for the round trip.
  signalsButton.addEventListener('click', () => {
    void (async () => {
      const replies = await readSignalledReplies();
      if (replies.length === 0) {
        status.textContent = fr.data.signalsEmpty;
        return;
      }
      saveFile(
        `reponses-signalees-${String(replies.length)}.md`,
        'text/markdown',
        renderSignalPack(replies),
      );
      status.textContent = '';
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

  panel.append(
    exportHint,
    exportButton,
    signalsHint,
    signalsButton,
    importHint,
    importLabel,
    status,
  );
  root.append(
    heading,
    panel,
    renderApiKeyPanel(
      options.storage === undefined ? {} : { storage: options.storage },
    ),
  );
  host.replaceChildren(root);
}
