<!--
  Settings, a sheet over Home rather than a fifth tab: the API key, export and
  import. The key is never shown back, only whether one is stored.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { clearApiKey, readApiKey, storeApiKey } from '../api/anthropic';
  import { BackupRejected, type BackupPort, type BackupRejection } from '../db/backup';
  import { backup as catalaBackup } from '../db/catala-v2';
  import { fr } from '../i18n/fr';
  import { downloadText } from '../platform/download';
  import { readText } from '../platform/read-file';

  interface Props {
    onclose: () => void;
    /** Injectable so tests can run against a database with tables in it. */
    backup?: BackupPort;
    save?: (name: string, text: string) => void;
  }

  let { onclose, backup = catalaBackup, save = downloadText }: Props = $props();

  let hasKey = $state(readApiKey() !== null);
  let draft = $state('');
  let keyStatus = $state('');
  let dataStatus = $state('');
  let closeButton: HTMLButtonElement | undefined = $state();

  const REJECTION: Record<BackupRejection, string> = {
    unreadable: fr.data.importUnreadable,
    'unknown-version': fr.data.importUnknownVersion,
    'wrong-shape': fr.data.importWrongShape,
  };

  onMount(() => closeButton?.focus());

  function saveKey(event: SubmitEvent): void {
    event.preventDefault();
    const key = draft.trim();
    if (key === '') return;
    const replacing = hasKey;
    storeApiKey(key);
    hasKey = true;
    draft = '';
    keyStatus = replacing ? fr.apiKey.replaced : fr.apiKey.saved;
  }

  function forgetKey(): void {
    clearApiKey();
    hasKey = false;
    keyStatus = fr.apiKey.forgotten;
  }

  async function exportData(): Promise<void> {
    const file = await backup.exportFile();
    save(file.name, file.text);
    dataStatus = fr.data.exported;
  }

  async function importData(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      await backup.importFile(await readText(file));
      dataStatus = fr.data.imported;
    } catch (error) {
      dataStatus =
        error instanceof BackupRejected
          ? REJECTION[error.reason]
          : fr.data.importUnreadable;
    } finally {
      input.value = '';
    }
  }
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === 'Escape') onclose();
  }}
/>

<div class="ac-sheet" role="dialog" aria-modal="true" aria-labelledby="ac-settings">
  <header class="ac-header">
    <h2 id="ac-settings" class="ac-title">{fr.settings.heading}</h2>
    <button
      bind:this={closeButton}
      type="button"
      class="ac-button ac-button--quiet"
      onclick={onclose}>{fr.settings.close}</button
    >
  </header>

  <section aria-labelledby="ac-key">
    <h3 id="ac-key">{fr.apiKey.label}</h3>
    <p class="ac-hint">{hasKey ? fr.apiKey.stored : fr.apiKey.missing}</p>
    <form class="ac-input" onsubmit={saveKey}>
      <label for="ac-key-input">{fr.apiKey.prompt}</label>
      <input
        id="ac-key-input"
        type="password"
        autocomplete="off"
        spellcheck="false"
        placeholder={fr.apiKey.placeholder}
        bind:value={draft}
      />
      <button type="submit" class="ac-button"
        >{hasKey ? fr.apiKey.replace : fr.apiKey.save}</button
      >
      {#if hasKey}
        <button type="button" class="ac-button ac-button--quiet" onclick={forgetKey}
          >{fr.apiKey.forget}</button
        >
      {/if}
    </form>
    <p class="ac-hint">{fr.apiKey.hint}</p>
    <p class="ac-hint" role="status">{keyStatus}</p>
  </section>

  <section aria-labelledby="ac-data">
    <h3 id="ac-data">{fr.data.heading}</h3>
    <div class="ac-input">
      <button type="button" class="ac-button" onclick={exportData}
        >{fr.data.exportButton}</button
      >
      <p class="ac-hint">{fr.data.exportHint}</p>
      <!-- The native file control's text comes from the browser's locale, often
           English, so it is hidden and its French label is the button. -->
      <input
        id="ac-import"
        class="ac-visually-hidden"
        type="file"
        accept="application/json,.json"
        onchange={importData}
      />
      <label for="ac-import" class="ac-button ac-button--quiet"
        >{fr.data.importLabel}</label
      >
      <p class="ac-hint">{fr.data.importHint}</p>
    </div>
    <p class="ac-hint" role="status">{dataStatus}</p>
  </section>
</div>
