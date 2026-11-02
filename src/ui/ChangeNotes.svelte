<!--
  « Ce qui a changé, et pourquoi »: one card per notion the last tap
  introduced, with its contrast badge, the change in Catalan and the authored
  switch note. Hidden before the first tap and after « Revenir à ma phrase ».
-->
<script lang="ts">
  import type { ComponentId } from '../api/schema';
  import { fr } from '../i18n/fr';
  import type { ChangeCard } from '../variants/session.svelte';

  interface Props {
    cards: readonly ChangeCard[];
    line: string;
    onopen: (id: ComponentId) => void;
  }

  let { cards, line, onopen }: Props = $props();
</script>

<section class="ac-changes" aria-labelledby="ac-changes">
  <h2 id="ac-changes">{fr.variants.changedHeading}</h2>
  {#each cards as card (card.id)}
    <article class="ac-change">
      <h3 class="ac-change__title">
        {card.title}
        <span class="ac-visually-hidden">{fr.chunkSheet.badgeLabel}</span>
        <span class="ac-badge ac-badge--{card.status}">{fr.badge[card.status]}</span>
      </h3>
      <p class="ac-change__line" lang="ca">{line}</p>
      <p>{card.note}</p>
      <button
        type="button"
        class="ac-button ac-button--quiet ac-link"
        onclick={() => onopen(card.id)}>{fr.variants.seeNotion}</button
      >
    </article>
  {/each}
</section>
