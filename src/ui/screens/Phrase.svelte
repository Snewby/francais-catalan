<!--
  The Phrase screen: the sentence as typed, the Catalan and the French it was
  understood as, and « Anatomie », the Catalan taken apart into chunks linked
  to the taxonomy. Every word of teaching on it is authored (fr.ts and the
  taxonomy); the model supplies only Catalan, `fr`, enums and IDs.
-->
<script lang="ts">
  import type Dexie from 'dexie';
  import { onDestroy, onMount } from 'svelte';
  import type { FailureKind } from '../../api/anthropic';
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
  import { getPhrase } from '../../phrase/store';
  import ChunkSheet from '../ChunkSheet.svelte';
  import ReportSheet from '../ReportSheet.svelte';
  import Speak from '../Speak.svelte';

  interface Props {
    id: string;
    database: Dexie;
    onopensettings: () => void;
  }

  let { id, database, onopensettings }: Props = $props();

  /** Undefined while the database is read, null when it holds no such phrase. */
  let saved: PhraseRow | null | undefined = $state(undefined);
  let open: AnatomyChunk | null = $state(null);
  let reporting = $state(false);

  const live = $derived(translationFor(id));
  const row = $derived(live?.status === 'stored' ? live.row : (saved ?? undefined));
  const chunks = $derived(row === undefined ? [] : anatomyOf(row));
  const assumed = $derived(row === undefined ? null : assumptionsLine(row.assumptions));

  const FAILURES: Record<Exclude<FailureKind, 'cancelled'>, string> = {
    no_key: fr.failure.noKey,
    key_rejected: fr.failure.keyRejected,
    overloaded: fr.failure.overloaded,
    offline: fr.failure.offline,
    refused: fr.failure.refused,
  };
  const RETRYABLE: ReadonlySet<FailureKind> = new Set(['overloaded', 'offline']);

  onMount(() => {
    void getPhrase(database, id).then((found) => {
      saved = found ?? null;
    });
  });

  // Leaving the screen, by the arrow or the browser's back, cancels a request
  // still running. A finished one has nothing left to cancel.
  onDestroy(() => cancelTranslation(id));

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
      <p>{FAILURES[live.kind]}</p>
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

    <section class="ac-card" aria-labelledby="ac-in-catalan">
      <h2 id="ac-in-catalan">{fr.phrase.inCatalan}</h2>
      <p class="ac-ca" lang="ca">{row.ca}</p>
      <p class="ac-hint" lang="fr">{row.fr}</p>
      <Speak text={row.ca} />
    </section>

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
        <ul class="ac-chunks">
          {#each chunks as chunk (chunk.key)}
            <li>
              {#if chunk.ids.length > 0}
                <button
                  type="button"
                  class="ac-chunk ac-chunk--{toneOf(chunk.role)}"
                  class:ac-chunk--implicit={chunk.implicit}
                  aria-label={accessibleNameOf(chunk)}
                  onclick={() => (open = chunk)}
                >
                  <span class="ac-chunk__text" lang="ca">{chunk.text}</span>
                  <span class="ac-chunk__caption">{captionOf(chunk)}</span>
                </button>
              {:else}
                <span class="ac-chunk ac-chunk--unlinked">
                  <span class="ac-chunk__text" lang="ca">{chunk.text}</span>
                  <span class="ac-chunk__caption">{captionOf(chunk)}</span>
                </span>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </section>

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
