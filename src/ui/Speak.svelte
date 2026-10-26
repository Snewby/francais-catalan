<!--
  A button that says the Catalan aloud, absent while no Catalan voice exists.

  PROGRESSIVE ENHANCEMENT, not a feature with a disabled state. No platform
  ships a Catalan voice by default, so on most devices this renders nothing and
  the screen has to read correctly without it. Hidden rather than disabled: a
  disabled control invites the learner to look for what would enable it, and
  the answer is an OS setting this page cannot reach. The explanation belongs
  once per screen, in VoiceNotice, never once per button.
-->
<script lang="ts">
  import { catalanVoice } from '../audio/catalan-voice.svelte';
  import { speakCatalan } from '../audio/voice';
  import { fr, labelled } from '../i18n/fr';

  interface Props {
    text: string;
    /** Names what is being read, for a screen reader and for the title. */
    label?: string;
    /** Injectable so a test can assert what was spoken without a speech engine. */
    speak?: typeof speakCatalan;
  }

  let { text, label, speak = speakCatalan }: Props = $props();
  const named = $derived(label ?? text);
</script>

<!-- The voice is read at press time rather than captured, so a control drawn
     before voiceschanged still speaks once the voice arrives. -->
<button
  type="button"
  class="ac-button ac-button--quiet"
  hidden={catalanVoice() === null}
  title={named}
  aria-label={labelled(fr.audio.speak, named)}
  onclick={() => speak(text, catalanVoice())}>{fr.audio.speak}</button
>
