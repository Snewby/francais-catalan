<script lang="ts">
  import { fr } from '../../i18n/fr';

  interface Props {
    heading: string;
  }

  let { heading }: Props = $props();
</script>

<section class="ac-screen">
  <h1 class="ac-title">{heading}</h1>
  <p class="ac-hint">{fr.stub.soon}</p>
</section>
