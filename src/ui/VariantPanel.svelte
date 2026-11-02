<!--
  « Variantes »: four groups of buttons that vary the sentence one tap at a
  time (phase 2 spec, « Phrase screen changes »). Everything it draws comes
  from the session; this component holds no rule of its own.

  A greyed button stays focusable and tappable, with aria-disabled, so a tap
  can say why it does nothing. The reason sits under the group that was
  tapped and is announced through the one polite live region below.
-->
<script lang="ts">
  import { fr, quote } from '../i18n/fr';
  import { TENSES, TOURNURES, VARIANT_PERSONS } from '../variants/axes';
  import type { Axis, Combination } from '../variants/combination';
  import type { Group, PanelButton, VariantSession } from '../variants/session.svelte';

  interface Props {
    session: VariantSession;
    onopensettings: () => void;
  }

  let { session, onopensettings }: Props = $props();

  const object = $derived(
    session.original.chunks.find((chunk) => chunk.role === 'object_direct')?.text,
  );

  function tap<A extends Axis>(axis: A, value: NonNullable<Combination[A]>): void {
    void session.tap(axis, value);
  }

  function retry(): void {
    const again = session.line?.retry;
    if (again === undefined) return;
    void session.tap(again.axis, again.value as never);
  }

  const greyed = (state: PanelButton): boolean =>
    state.kind === 'greyed' || state.kind === 'not_applicable';
</script>

{#snippet reason(group: Group)}
  {#if session.line?.group === group}
    <p class="ac-reason" aria-hidden="true">{session.line.text}</p>
    {#if session.line.retry}
      <button type="button" class="ac-button ac-button--quiet" onclick={retry}
        >{fr.failure.retry}</button
      >
    {/if}
    {#if session.line.settings}
      <button type="button" class="ac-button ac-button--quiet" onclick={onopensettings}
        >{fr.failure.openSettings}</button
      >
    {/if}
  {/if}
{/snippet}

{#snippet spinner()}
  <span class="ac-spinner" aria-hidden="true"></span>
{/snippet}

{#snippet choice(
  axis: 'person' | 'tense' | 'tournure',
  value: string,
  label: string,
  lang: string,
)}
  {@const state = session.button(axis, value as never)}
  <button
    type="button"
    class="ac-choice"
    class:ac-choice--round={axis === 'person'}
    class:ac-choice--greyed={greyed(state)}
    aria-pressed={state.kind === 'selected'}
    aria-disabled={greyed(state) ? 'true' : undefined}
    onclick={() => tap(axis, value as never)}
  >
    {#if state.kind === 'waiting'}{@render spinner()}{/if}
    {#if lang === 'ca' && label.includes(' + ')}
      <!-- « estar + gérondif »: only the Catalan word is Catalan. -->
      <span
        ><span lang="ca">{label.split(' + ')[0]}</span> + {label.split(' + ')[1]}</span
      >
    {:else}
      <span {lang}>{label}</span>
    {/if}
  </button>
{/snippet}

{#snippet toggle(axis: 'pronoun' | 'negation')}
  {@const on = session.combination[axis]}
  {@const state = session.button(axis, !on)}
  <button
    type="button"
    class="ac-toggle"
    class:ac-choice--greyed={greyed(state)}
    aria-pressed={on}
    aria-disabled={greyed(state) ? 'true' : undefined}
    onclick={() => tap(axis, !on)}
  >
    <span>
      {#if axis === 'pronoun'}
        {fr.variants.pronounBefore}
        {#if object !== undefined}<span lang="ca">{quote(object)}</span>{/if}
        {fr.variants.pronounAfter}
      {:else}
        {fr.variants.negation}
      {/if}
    </span>
    <span class="ac-toggle__state">
      {#if state.kind === 'waiting'}{@render spinner()}{/if}
      {on ? fr.variants.on : fr.variants.off}
    </span>
  </button>
{/snippet}

<section class="ac-panel" aria-labelledby="ac-variants">
  <h2 id="ac-variants">{fr.variants.heading}</h2>

  <div class="ac-group" role="group" aria-labelledby="ac-who">
    <h3 id="ac-who" class="ac-group__label">{fr.variants.who}</h3>
    <div class="ac-choices ac-choices--wrap">
      {#each VARIANT_PERSONS as person (person)}
        {@render choice('person', person, person, 'ca')}
      {/each}
    </div>
    {@render reason('who')}
  </div>

  <div class="ac-group" role="group" aria-labelledby="ac-when">
    <h3 id="ac-when" class="ac-group__label">{fr.variants.when}</h3>
    <div class="ac-choices ac-choices--grid">
      {#each TENSES as tense (tense)}
        {@render choice('tense', tense, fr.tenses[tense], 'fr')}
      {/each}
    </div>
    {@render reason('when')}
  </div>

  <div class="ac-group" role="group" aria-labelledby="ac-tournure">
    <h3 id="ac-tournure" class="ac-group__label">{fr.variants.tournure}</h3>
    <div class="ac-choices ac-choices--grid">
      {#each TOURNURES as tournure (tournure)}
        {@render choice(
          'tournure',
          tournure,
          fr.tournures[tournure],
          tournure === 'none' ? 'fr' : 'ca',
        )}
      {/each}
    </div>
    {@render reason('tournure')}
  </div>

  <div class="ac-group" role="group" aria-labelledby="ac-transform">
    <h3 id="ac-transform" class="ac-group__label">{fr.variants.transform}</h3>
    {@render toggle('pronoun')}
    {@render toggle('negation')}
    {@render reason('transform')}
  </div>

  <p class="ac-visually-hidden" aria-live="polite">{session.line?.text ?? ''}</p>
</section>
