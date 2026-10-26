<!--
  Shown when no Catalan voice is installed. It says what to install and that
  nothing else will be used, because silence otherwise reads as a missing
  feature rather than as a refusal: a Spanish voice reading Catalan is
  confidently wrong and the learner could not tell.
-->
<script lang="ts">
  import { catalanVoice } from '../audio/catalan-voice.svelte';
  import { fr } from '../i18n/fr';
</script>

<p class="ac-hint" hidden={catalanVoice() !== null}>{fr.audio.unavailable}</p>
