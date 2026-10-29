<script lang="ts">
  import type Dexie from 'dexie';
  import { onMount } from 'svelte';
  import { db } from '../db/catala-v2';
  import { fr } from '../i18n/fr';
  import { parseHash, tabFor } from '../nav/router';
  import BottomNav from './BottomNav.svelte';
  import SettingsSheet from './SettingsSheet.svelte';
  import Home from './screens/Home.svelte';
  import Phrase from './screens/Phrase.svelte';
  import Stub from './screens/Stub.svelte';

  interface Props {
    /** Injectable so a test can run the screens against a throwaway database. */
    database?: Dexie;
  }

  let { database = db }: Props = $props();

  // Read at mount, so a reload on any hash route draws the same screen.
  let route = $state(parseHash(window.location.hash));
  // App-level rather than Home's, so the Phrase screen's « no API key » state
  // opens the same sheet.
  let settingsOpen = $state(false);
  const openSettings = (): void => {
    settingsOpen = true;
  };

  onMount(() => {
    const sync = () => {
      route = parseHash(window.location.hash);
    };
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  });
</script>

<div class="ac">
  <main class="ac-main">
    {#if route.name === 'home'}
      <Home {database} onopensettings={openSettings} />
    {:else if route.name === 'phrase'}
      <!-- Keyed, so moving between two phrases tears the first screen down
           and cancels its request rather than reusing it. -->
      {#key route.id}
        <Phrase id={route.id} {database} onopensettings={openSettings} />
      {/key}
    {:else}
      <Stub heading={fr.screens[route.name]} />
    {/if}
  </main>
  <BottomNav current={tabFor(route)} />
  {#if settingsOpen}
    <SettingsSheet onclose={() => (settingsOpen = false)} />
  {/if}
</div>
