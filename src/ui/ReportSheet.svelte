<!--
  « Signaler une erreur »: one field, stored as a `reports` row beside the
  phrase. Nothing is sent anywhere.
-->
<script lang="ts">
  import type Dexie from 'dexie';
  import { onMount } from 'svelte';
  import { fr } from '../i18n/fr';
  import { addReport } from '../phrase/store';

  interface Props {
    database: Dexie;
    phraseId: string;
    onclose: () => void;
  }

  let { database, phraseId, onclose }: Props = $props();

  let note = $state('');
  let status = $state('');
  let field: HTMLTextAreaElement | undefined = $state();

  onMount(() => field?.focus());

  async function save(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const text = note.trim();
    if (text === '') return;
    await addReport(database, phraseId, text);
    note = '';
    status = fr.report.saved;
  }
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === 'Escape') onclose();
  }}
/>

<div class="ac-sheet" role="dialog" aria-modal="true" aria-labelledby="ac-report">
  <header class="ac-header">
    <h2 id="ac-report" class="ac-title">{fr.report.heading}</h2>
    <button type="button" class="ac-button ac-button--quiet" onclick={onclose}
      >{fr.report.close}</button
    >
  </header>

  <form class="ac-input" onsubmit={save}>
    <label for="ac-report-note">{fr.report.label}</label>
    <textarea id="ac-report-note" rows="4" bind:this={field} bind:value={note}
    ></textarea>
    <p class="ac-hint">{fr.report.hint}</p>
    <button type="submit" class="ac-button" disabled={note.trim() === ''}
      >{fr.report.save}</button
    >
  </form>
  <p class="ac-hint" role="status">{status}</p>
</div>
