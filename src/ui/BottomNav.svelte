<script lang="ts">
  import { fr } from '../i18n/fr';
  import { TABS, tabHref, type Tab } from '../nav/router';

  interface Props {
    /** The active tab, or null on a sheet that belongs to none. */
    current: Tab | null;
  }

  let { current }: Props = $props();
</script>

<nav class="ac-nav" aria-label={fr.nav.label}>
  {#each TABS as tab (tab)}
    <a
      class="ac-nav__tab"
      href={tabHref(tab)}
      aria-current={tab === current ? 'page' : undefined}>{fr.nav[tab]}</a
    >
  {/each}
</nav>
