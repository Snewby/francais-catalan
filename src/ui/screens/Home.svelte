<!--
  Home, the Phrase tab: a French sentence in, and the five newest phrases to
  reopen from the cache. Submitting routes to the Phrase screen at once; the
  reply arrives there.
-->
<script lang="ts">
  import type Dexie from 'dexie';
  import { onMount } from 'svelte';
  import type { PhraseRow } from '../../db/rows';
  import { fr, labelled } from '../../i18n/fr';
  import { hrefFor } from '../../nav/router';
  import { startTranslation } from '../../phrase/session.svelte';
  import { findCached, recentPhrases } from '../../phrase/store';

  interface Props {
    database: Dexie;
    onopensettings: () => void;
  }

  let { database, onopensettings }: Props = $props();

  const MAX_LENGTH = 300;
  const COUNTER_FROM = 250;

  let draft = $state('');
  let recents: PhraseRow[] = $state([]);
  const empty = $derived(draft.trim() === '');

  onMount(() => {
    void recentPhrases(database).then((rows) => {
      recents = rows;
    });
  });

  async function submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (empty) return;
    const input = draft;
    // A sentence already stored opens with no call and no waiting screen.
    const cached = await findCached(database, input);
    if (cached !== undefined) {
      window.location.hash = hrefFor({ name: 'phrase', id: cached.id });
      return;
    }
    const id = crypto.randomUUID();
    void startTranslation(database, id, input);
    window.location.hash = hrefFor({ name: 'phrase', id });
  }
</script>

<section class="ac-screen">
  <header class="ac-header">
    <div>
      <h1 class="ac-title">{fr.app.title}</h1>
      <p class="ac-tagline">{fr.app.tagline}</p>
    </div>
    <button
      type="button"
      class="ac-button ac-button--quiet ac-gear"
      aria-label={fr.settings.open}
      title={fr.settings.open}
      onclick={onopensettings}><span aria-hidden="true">⚙</span></button
    >
  </header>

  <form class="ac-input" onsubmit={submit}>
    <label for="ac-phrase">{fr.home.inputLabel}</label>
    <textarea
      id="ac-phrase"
      rows="3"
      lang="fr"
      maxlength={MAX_LENGTH}
      placeholder={fr.home.inputPlaceholder}
      bind:value={draft}
    ></textarea>
    {#if draft.length > COUNTER_FROM}
      <p class="ac-hint" aria-live="polite">
        {labelled(
          fr.home.counterLabel,
          `${String(draft.length)} / ${String(MAX_LENGTH)}`,
        )}
      </p>
    {/if}
    <button type="submit" class="ac-button" disabled={empty}>{fr.home.submit}</button>
  </form>

  <section aria-labelledby="ac-recents">
    <h2 id="ac-recents">{fr.home.recentsHeading}</h2>
    {#if recents.length === 0}
      <p class="ac-hint">{fr.home.recentsEmpty}</p>
    {:else}
      <ul class="ac-recents">
        {#each recents as row (row.id)}
          <li>
            <a class="ac-recent" href={hrefFor({ name: 'phrase', id: row.id })}>
              <span class="ac-recent__ca" lang="ca">{row.ca}</span>
              <span class="ac-recent__fr" lang="fr">{row.fr}</span>
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</section>
