import { mount } from 'svelte';
import { startVoiceWatch } from './audio/catalan-voice.svelte';
import App from './ui/App.svelte';
import './ui/app.css';

const target = document.querySelector<HTMLDivElement>('#app');

if (target) {
  startVoiceWatch();
  mount(App, { target });
}
