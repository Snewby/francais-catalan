<!--
  The notions behind one chunk: for each linked ID, the leaf's Catalan form,
  its French gloss, how it compares with French, and the contrast note. All
  authored text from the taxonomy, nothing generated. Phase 3 replaces this
  with the full notion sheet.

  READS ONLY. Opening this sheet is curiosity, not evidence, so it writes no
  event: test/chunk-sheet.test.ts keeps every evidence writer out of its
  imports.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { fr } from '../i18n/fr';
  import type { AnatomyChunk } from '../phrase/anatomy';
  import { leafById } from '../taxonomy/index';

  interface Props {
    chunk: AnatomyChunk;
    onclose: () => void;
  }

  let { chunk, onclose }: Props = $props();

  let closeButton: HTMLButtonElement | undefined = $state();
  const leaves = $derived(
    chunk.ids.map((id) => leafById(id)).filter((leaf) => leaf !== undefined),
  );

  onMount(() => closeButton?.focus());
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === 'Escape') onclose();
  }}
/>

<div class="ac-sheet" role="dialog" aria-modal="true" aria-labelledby="ac-chunk-sheet">
  <header class="ac-header">
    <h2 id="ac-chunk-sheet" class="ac-title" lang="ca">{chunk.text}</h2>
    <button
      bind:this={closeButton}
      type="button"
      class="ac-button ac-button--quiet"
      onclick={onclose}>{fr.chunkSheet.close}</button
    >
  </header>

  {#each leaves as leaf (leaf.id)}
    <section class="ac-notion">
      <h3 lang="ca">{leaf.ca}</h3>
      <p>{leaf.glosses.fr}</p>
      <p>
        <span class="ac-visually-hidden">{fr.chunkSheet.badgeLabel}</span>
        <span class="ac-badge ac-badge--{leaf.contrast_fr.status}"
          >{fr.badge[leaf.contrast_fr.status]}</span
        >
      </p>
      <p class="ac-hint">{leaf.contrast_fr.note}</p>
    </section>
  {/each}
</div>
