import { mount } from 'svelte';
import { startVoiceWatch } from './audio/catalan-voice.svelte';
import { registerShell } from './pwa/register';
import App from './ui/App.svelte';
// Self-hosted, Latin subset only (it covers à, ç and l·l), so the Catalan
// card renders the same offline (decided 29 Oct).
import '@fontsource/literata/latin-400.css';
import './ui/app.css';

const target = document.querySelector<HTMLDivElement>('#app');

if (target) {
  startVoiceWatch();
  mount(App, { target });
  registerShell();
}
