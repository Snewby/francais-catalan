import { fr } from './i18n/fr';

const mount = document.querySelector<HTMLDivElement>('#app');

if (mount) {
  const heading = document.createElement('h1');
  heading.textContent = fr.app.title;

  const tagline = document.createElement('p');
  tagline.textContent = fr.app.tagline;

  const status = document.createElement('p');
  status.textContent = fr.status.scaffold;

  mount.replaceChildren(heading, tagline, status);
}
