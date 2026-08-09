import { fr } from './i18n/fr';
import { mountTaxonomyBrowser } from './ui/taxonomy-browser';

const mount = document.querySelector<HTMLDivElement>('#app');

if (mount) {
  const heading = document.createElement('h1');
  heading.textContent = fr.app.title;

  const tagline = document.createElement('p');
  tagline.textContent = fr.app.tagline;

  const browser = document.createElement('div');

  mount.replaceChildren(heading, tagline, browser);
  mountTaxonomyBrowser(browser);
}
