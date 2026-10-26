<script lang="ts">
  import { onMount } from 'svelte';
  import { fr } from '../i18n/fr';
  import { parseHash, tabFor } from '../nav/router';
  import BottomNav from './BottomNav.svelte';
  import SettingsSheet from './SettingsSheet.svelte';
  import Home from './screens/Home.svelte';
  import Stub from './screens/Stub.svelte';

  // Read at mount, so a reload on any hash route draws the same screen.
  let route = $state(parseHash(window.location.hash));
  // App-level rather than Home's, so a later screen (the phase 1 « no API key »
  // state) can open the same sheet.
  let settingsOpen = $state(false);

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
      <Home onopensettings={() => (settingsOpen = true)} />
    {:else}
      <Stub heading={fr.screens[route.name]} />
    {/if}
  </main>
  <BottomNav current={tabFor(route)} />
  {#if settingsOpen}
    <SettingsSheet onclose={() => (settingsOpen = false)} />
  {/if}
</div>
