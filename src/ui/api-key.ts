/**
 * API key entry.
 *
 * The key is entered at runtime and kept in localStorage, because the call is
 * made straight from the browser and there is no server to hide it behind. It
 * is NEVER hardcoded, committed, written to a file or logged: nothing in this
 * module prints it, and the field is a password field so it is not shoulder
 * readable or captured in a screenshot of the settings pane.
 *
 * The stored key is reported as present or absent and never echoed back into
 * the field, so a screenshot of this pane shows whether a key exists and not
 * what it is.
 */
import { fr } from '../i18n/fr';
import { clearApiKey, readApiKey, storeApiKey } from '../api/anthropic';

export interface ApiKeyOptions {
  readonly storage?: Storage;
  /** Called after the stored key changes, so a view can re-enable itself. */
  readonly onChange?: (present: boolean) => void;
}

export function renderApiKeyPanel(options: ApiKeyOptions = {}): HTMLElement {
  const storage = options.storage ?? localStorage;

  const panel = document.createElement('section');
  panel.className = 'ac-panel ac-api-key';

  const heading = document.createElement('h3');
  heading.className = 'ac-subheading';
  heading.textContent = fr.apiKey.label;

  const prompt = document.createElement('p');
  prompt.className = 'ac-hint';
  prompt.textContent = fr.apiKey.prompt;

  const hint = document.createElement('p');
  hint.className = 'ac-hint';
  hint.textContent = fr.apiKey.hint;

  const status = document.createElement('p');
  status.className = 'ac-status';

  const field = document.createElement('input');
  // A password field, so the key is not readable over a shoulder and does not
  // survive into a screenshot of this pane.
  field.type = 'password';
  field.className = 'ac-input';
  field.autocomplete = 'off';
  field.placeholder = fr.apiKey.placeholder;

  const label = document.createElement('label');
  label.className = 'ac-control';
  const caption = document.createElement('span');
  caption.className = 'ac-control-label';
  caption.textContent = fr.apiKey.label;
  label.append(caption, field);

  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'ac-button ac-button--primary';
  save.textContent = fr.apiKey.save;

  const forget = document.createElement('button');
  forget.type = 'button';
  forget.className = 'ac-button';
  forget.textContent = fr.apiKey.forget;

  function refresh(message?: string): void {
    const present = readApiKey(storage) !== null;
    status.textContent = message ?? (present ? fr.apiKey.stored : fr.apiKey.missing);
    forget.disabled = !present;
    options.onChange?.(present);
  }

  save.addEventListener('click', () => {
    const value = field.value.trim();
    if (value === '') return;
    storeApiKey(value, storage);
    // Cleared rather than left in place: the stored key is never echoed back.
    field.value = '';
    refresh(fr.apiKey.saved);
  });

  forget.addEventListener('click', () => {
    clearApiKey(storage);
    field.value = '';
    refresh(fr.apiKey.forgotten);
  });

  const actions = document.createElement('div');
  actions.className = 'ac-actions';
  actions.append(save, forget);

  panel.append(heading, prompt, label, actions, status, hint);
  refresh();
  return panel;
}

export function hasApiKey(storage: Storage = localStorage): boolean {
  return readApiKey(storage) !== null;
}
