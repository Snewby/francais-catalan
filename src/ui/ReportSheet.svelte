<!--
  « Signaler une erreur »: what is wrong, as one of four tap choices, and a
  note, stored as a `reports` row beside the phrase with the variant on screen
  and a snapshot of what was shown, so it can be troubleshot later. Nothing is
  sent anywhere.
-->
<script lang="ts">
  import type Dexie from 'dexie';
  import { onMount } from 'svelte';
  import { fr } from '../i18n/fr';
  import { kindsFor, type ReportKind, type ReportSnapshot } from '../phrase/report';
  import { addReport } from '../phrase/store';

  interface Props {
    database: Dexie;
    phraseId: string;
    /** The variant on screen, or null for the original sentence. */
    variantId: string | null;
    snapshot: ReportSnapshot;
    onclose: () => void;
  }

  let { database, phraseId, variantId, snapshot, onclose }: Props = $props();

  let kind: ReportKind | null = $state(null);
  let note = $state('');
  let status = $state('');
  let first: HTMLInputElement | undefined = $state();

  const kinds = $derived(kindsFor(variantId !== null));
  const ready = $derived(kind !== null || note.trim() !== '');

  onMount(() => first?.focus());

  async function save(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!ready) return;
    await addReport(database, {
      phraseId,
      text: note.trim(),
      kind,
      variantId,
      snapshot,
    });
    kind = null;
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
    <fieldset class="ac-kinds">
      <legend>{fr.report.label}</legend>
      {#each kinds as option, index (option)}
        <label class="ac-kind">
          {#if index === 0}
            <input
              bind:this={first}
              type="radio"
              name="ac-report-kind"
              value={option}
              bind:group={kind}
            />
          {:else}
            <input
              type="radio"
              name="ac-report-kind"
              value={option}
              bind:group={kind}
            />
          {/if}
          <span>{fr.reportKinds[option]}</span>
        </label>
      {/each}
    </fieldset>
    <label for="ac-report-note">{fr.report.note}</label>
    <textarea id="ac-report-note" rows="3" bind:value={note}></textarea>
    <p class="ac-hint">{fr.report.hint}</p>
    <button type="submit" class="ac-button" disabled={!ready}>{fr.report.save}</button>
  </form>
  <p class="ac-hint" role="status">{status}</p>
</div>
