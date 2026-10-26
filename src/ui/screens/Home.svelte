<!--
  Home, the Phrase tab. Phase 0 draws the final layout with the input disabled
  and every list empty; phase 1 wires the translation.
-->
<script lang="ts">
  import { fr } from '../../i18n/fr';
</script>

<section class="ac-screen">
  <header class="ac-header">
    <div>
      <h1 class="ac-title">{fr.app.title}</h1>
      <p class="ac-tagline">{fr.app.tagline}</p>
    </div>
  </header>

  <form class="ac-input" onsubmit={(event) => event.preventDefault()}>
    <label for="ac-phrase">{fr.home.inputLabel}</label>
    <textarea id="ac-phrase" rows="3" placeholder={fr.home.inputPlaceholder} disabled
    ></textarea>
    <button type="submit" class="ac-button" disabled>{fr.home.submit}</button>
    <p class="ac-hint">{fr.stub.soon}</p>
  </form>

  <section aria-labelledby="ac-recents">
    <h2 id="ac-recents">{fr.home.recentsHeading}</h2>
    <p class="ac-hint">{fr.home.recentsEmpty}</p>
  </section>

  <section aria-labelledby="ac-review">
    <h2 id="ac-review">{fr.home.reviewHeading}</h2>
    <p class="ac-hint">{fr.home.reviewEmpty}</p>
  </section>
</section>
