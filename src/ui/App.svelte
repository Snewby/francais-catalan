<script lang="ts">
  import { onMount } from 'svelte';
  import { fr } from '../i18n/fr';
  import { parseHash, tabFor } from '../nav/router';
  import BottomNav from './BottomNav.svelte';
  import Home from './screens/Home.svelte';
  import Stub from './screens/Stub.svelte';

  // Read at mount, so a reload on any hash route draws the same screen.
  let route = $state(parseHash(window.location.hash));

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
      <Home />
    {:else}
      <Stub heading={fr.screens[route.name]} />
    {/if}
  </main>
  <BottomNav current={tabFor(route)} />
</div>
