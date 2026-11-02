<!--
  The Phrase screen: the sentence as typed, the Catalan and the French it was
  understood as, and « Anatomie », the Catalan taken apart into chunks linked
  to the taxonomy. Every word of teaching on it is authored (fr.ts and the
  taxonomy); the model supplies only Catalan, `fr`, enums and IDs.
-->
<script lang="ts">
  import type Dexie from 'dexie';
  import { onDestroy, onMount } from 'svelte';
  import { readApiKey } from '../../api/anthropic';
  import type { ComponentId } from '../../api/schema';
  import type { PhraseRow } from '../../db/rows';
  import { fr } from '../../i18n/fr';
  import { hrefFor } from '../../nav/router';
  import {
    accessibleNameOf,
    anatomyOf,
    assumptionsLine,
    captionOf,
    toneOf,
    type AnatomyChunk,
  } from '../../phrase/anatomy';
  import {
    cancelTranslation,
    startTranslation,
    translationFor,
  } from '../../phrase/session.svelte';
  import { FAILURE_TEXT, RETRYABLE } from '../../phrase/failure';
  import { getPhrase } from '../../phrase/store';
  import { leafById } from '../../taxonomy/index';
  import { VariantSession } from '../../variants/session.svelte';
  import ChangeNotes from '../ChangeNotes.svelte';
  import ChunkSheet from '../ChunkSheet.svelte';
  import ReportSheet from '../ReportSheet.svelte';
  import Speak from '../Speak.svelte';
  import VariantPanel from '../VariantPanel.svelte';

  interface Props {
    id: string;
    database: Dexie;
    onopensettings: () => void;
    /** Fetch the original's neighbours ahead (F1). Off only in tests that count calls. */
    prefetch?: boolean;
  }

  let { id, database, onopensettings, prefetch = true }: Props = $props();

  /** Undefined while the database is read, null when it holds no such phrase. */
  let saved: PhraseRow | null | undefined = $state(undefined);
  let open: AnatomyChunk | null = $state(null);
  let reporting = $state(false);

  const live = $derived(translationFor(id));
  const row = $derived(live?.status === 'stored' ? live.row : (saved ?? undefined));
  /** The variation panel, once there is a phrase with an anatomy to vary. */
  let session = $state<VariantSession | null>(null);
  let sessionOf = '';

  $effect(() => {
    if (row === undefined || row.status !== 'ok') return;
    // A « Réessayer » that rebuilt the anatomy rewrote the row: start again.
    const version = `${row.id}:${String(row.updatedAt)}`;
    if (version === sessionOf) return;
    session?.dispose();
    sessionOf = version;
    const next = new VariantSession(database, row, { apiKey: readApiKey });
    session = next;
    void next.load().then(() => (prefetch ? next.prefetch() : undefined));
  });

  const shown = $derived(session?.shown ?? row);
  const chunks = $derived(
    session !== null ? session.anatomy : row === undefined ? [] : anatomyOf(row),
  );
  const rings = $derived(session?.rings ?? new Set<string>());
  const assumed = $derived(row === undefined ? null : assumptionsLine(row.assumptions));

  onMount(() => {
    void getPhrase(database, id).then((found) => {
      saved = found ?? null;
    });
  });

  // Leaving the screen, by the arrow or the browser's back, cancels a request
  // still running. A finished one has nothing left to cancel.
  onDestroy(() => {
    cancelTranslation(id);
    session?.dispose();
  });

  /** « Voir la notion » on a card opens the phase 1 sheet for that notion. */
  function openNotion(notion: ComponentId): void {
    open = {
      key: notion,
      text: leafById(notion)?.ca ?? notion,
      role: 'other',
      ids: [notion],
      implicit: false,
    };
  }

  function retry(input: string, force = false): void {
    void startTranslation(database, id, input, { force });
  }
</script>

<section class="ac-screen">
  <header class="ac-header ac-header--back">
    <a class="ac-button ac-button--quiet ac-back" href={hrefFor({ name: 'home' })}
      ><span aria-hidden="true">←</span><span class="ac-visually-hidden"
        >{fr.phrase.back}</span
      ></a
    >
    <h1 class="ac-title">{fr.screens.phrase}</h1>
  </header>

  {#if live?.status === 'pending'}
    <section aria-labelledby="ac-your-phrase">
      <h2 id="ac-your-phrase">{fr.phrase.yourPhrase}</h2>
      <p lang="fr">{live.input}</p>
    </section>
    <section class="ac-card" aria-labelledby="ac-in-catalan">
      <h2 id="ac-in-catalan">{fr.phrase.inCatalan}</h2>
      <p class="ac-hint" role="status">{fr.phrase.translating}</p>
    </section>
  {:else if live?.status === 'error'}
    <section aria-labelledby="ac-your-phrase">
      <h2 id="ac-your-phrase">{fr.phrase.yourPhrase}</h2>
      <p lang="fr">{live.input}</p>
    </section>
    <section class="ac-card" role="alert">
      <p>{FAILURE_TEXT[live.kind]}</p>
      {#if live.kind === 'no_key'}
        <button type="button" class="ac-button" onclick={onopensettings}
          >{fr.failure.openSettings}</button
        >
      {:else if RETRYABLE.has(live.kind)}
        <button type="button" class="ac-button" onclick={() => retry(live.input)}
          >{fr.failure.retry}</button
        >
      {/if}
    </section>
  {:else if row !== undefined}
    <section aria-labelledby="ac-your-phrase">
      <h2 id="ac-your-phrase">{fr.phrase.yourPhrase}</h2>
      <p lang="fr">{row.input}</p>
    </section>

    <!-- Pinned while the panel scrolls under it, so a tap and its effect
         are on screen together (D8). -->
    <div class="ac-pinned">
      <section
        class="ac-card"
        aria-labelledby="ac-in-catalan"
        aria-busy={session !== null && session.waiting !== null}
      >
        <h2 id="ac-in-catalan">{fr.phrase.inCatalan}</h2>
        <p class="ac-ca" lang="ca">{shown?.ca}</p>
        <p class="ac-hint" lang="fr">{shown?.fr}</p>
        {#if session !== null && session.changeLine !== null}
          <p class="ac-change-line" lang="ca">{session.changeLine}</p>
        {/if}
        {#if session !== null && !session.isOriginal}
          <button
            type="button"
            class="ac-button ac-button--quiet ac-link"
            onclick={() => session?.revert()}>{fr.variants.revert}</button
          >
        {/if}
        <Speak text={shown?.ca ?? row.ca} />
      </section>
    </div>

    {#if assumed !== null}
      <p class="ac-hint">{assumed}</p>
    {/if}

    <section aria-labelledby="ac-anatomy">
      <h2 id="ac-anatomy">{fr.phrase.anatomy}</h2>
      {#if row.status === 'analysis_failed'}
        <p class="ac-hint">{fr.failure.analysisFailed}</p>
        <button type="button" class="ac-button" onclick={() => retry(row.input, true)}
          >{fr.failure.retry}</button
        >
      {:else}
        {#if session !== null}
          <p class="ac-hint">{fr.variants.anatomyHint}</p>
        {/if}
        <ul class="ac-chunks">
          {#each chunks as chunk (chunk.key)}
            <li>
              {#if chunk.ids.length > 0}
                <button
                  type="button"
                  class="ac-chunk ac-chunk--{toneOf(chunk.role)}"
                  class:ac-chunk--implicit={chunk.implicit}
                  class:ac-chunk--ringed={rings.has(chunk.key)}
                  aria-label={accessibleNameOf(chunk)}
                  onclick={() => (open = chunk)}
                >
                  <span class="ac-chunk__text" lang="ca">{chunk.text}</span>
                  <span class="ac-chunk__caption">{captionOf(chunk)}</span>
                </button>
              {:else}
                <span
                  class="ac-chunk ac-chunk--unlinked"
                  class:ac-chunk--ringed={rings.has(chunk.key)}
                >
                  <span class="ac-chunk__text" lang="ca">{chunk.text}</span>
                  <span class="ac-chunk__caption">{captionOf(chunk)}</span>
                </span>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    {#if session !== null}
      <VariantPanel {session} {onopensettings} />
      {#if session.changeLine !== null && session.changeCards.length > 0}
        <ChangeNotes
          cards={session.changeCards}
          line={session.changeLine}
          onopen={openNotion}
        />
      {/if}
    {/if}

    <footer>
      <button
        type="button"
        class="ac-button ac-button--quiet ac-link"
        onclick={() => (reporting = true)}>{fr.phrase.report}</button
      >
    </footer>
  {:else if saved === null}
    <p class="ac-hint">{fr.phrase.notFound}</p>
  {/if}
</section>

{#if open !== null}
  <ChunkSheet chunk={open} onclose={() => (open = null)} />
{/if}
{#if reporting && row !== undefined}
  <ReportSheet {database} phraseId={row.id} onclose={() => (reporting = false)} />
{/if}
