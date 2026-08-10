/**
 * The application shell.
 *
 * Four views behind a tab bar, because the phone is the primary surface and
 * four things stacked on one page is a scroll nobody finishes. The tab bar is
 * a row of ordinary buttons at a thumb's width, not a hover menu.
 *
 * This module is the seam between the store and the browse view. It reads the
 * coverage through src/db/read.ts, which reads and never writes, and hands the
 * browse view plain data. That is what lets the no-evidence ban stay in force
 * over src/ui/browse/ instead of being widened until it means nothing: the
 * browsing half of the interface cannot reach the database in either direction,
 * and this half can, because asking a question and grading a review are exactly
 * the encounters that are supposed to count.
 */
import { fr } from '../i18n/fr';
import { readAllComponentStates } from '../db/read';
import type { ComponentState } from '../srs/apply';
import { mountTaxonomyBrowser } from './browse/taxonomy-browser';
import type { Coverage, CoverageMap } from './browse/coverage';
import { mountQueryView } from './query-view';
import { mountReviewView } from './review-view';
import { mountDataView } from './data-view';
import { startVoiceWatch } from './speak';
import './app.css';

type ViewName = 'query' | 'review' | 'browse' | 'data';

const TAB_LABEL: Record<ViewName, string> = {
  query: fr.nav.query,
  review: fr.nav.review,
  browse: fr.nav.browse,
  data: fr.nav.data,
};

const TABS: readonly ViewName[] = ['query', 'review', 'browse', 'data'];

/**
 * The runtime state, reduced to what a colour is computed from.
 *
 * The projection happens here rather than in src/ui/browse/, because the source
 * type lives in src/srs/apply.ts and the browse view may not import it.
 */
export function toCoverage(states: ReadonlyMap<string, ComponentState>): CoverageMap {
  const map = new Map<string, Coverage>();
  for (const [componentId, state] of states) {
    map.set(componentId, {
      exposureCount: state.exposure.exposure_count,
      gradedReviewCount: state.mastery.graded_review_count,
      stability: state.mastery.stability,
    });
  }
  return map;
}

export async function mountApp(host: HTMLElement): Promise<void> {
  // Started once for the application. Chrome answers `getVoices` with an empty
  // list on the first call and fills it in asynchronously, so every audio
  // control would otherwise be permanently absent on the platform most likely
  // to have the Catalan voice.
  startVoiceWatch();

  let current: ViewName = 'query';
  let coverage: CoverageMap = toCoverage(await readAllComponentStates());

  const root = document.createElement('div');
  root.className = 'ac';

  const heading = document.createElement('h1');
  heading.className = 'ac-title';
  heading.textContent = fr.app.title;

  const tagline = document.createElement('p');
  tagline.className = 'ac-tagline';
  tagline.textContent = fr.app.tagline;

  const nav = document.createElement('nav');
  nav.className = 'ac-tabs';

  const panel = document.createElement('div');
  panel.className = 'ac-panel-host';

  /**
   * The coverage is re-read after anything that could have moved it, rather
   * than patched in place. A patched copy and the store disagreeing is how a
   * heatmap starts showing a plausible map of something that never happened.
   */
  async function refresh(): Promise<void> {
    coverage = toCoverage(await readAllComponentStates());
    if (current === 'browse') show('browse');
  }

  function show(view: ViewName): void {
    current = view;
    for (const button of nav.querySelectorAll<HTMLButtonElement>('.ac-tab')) {
      const selected = button.dataset['view'] === view;
      button.classList.toggle('ac-tab--current', selected);
      button.setAttribute('aria-current', selected ? 'page' : 'false');
    }

    switch (view) {
      case 'query':
        mountQueryView(panel, {
          onRecorded: () => {
            void refresh();
          },
        });
        return;
      case 'review':
        mountReviewView(panel, {
          onGraded: () => {
            void refresh();
          },
        });
        return;
      case 'browse':
        mountTaxonomyBrowser(panel, { coverage });
        return;
      case 'data':
        mountDataView(panel, {
          onImported: () => {
            void refresh();
          },
        });
        return;
    }
  }

  for (const view of TABS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ac-tab';
    button.dataset['view'] = view;
    button.textContent = TAB_LABEL[view];
    button.addEventListener('click', () => {
      show(view);
    });
    nav.append(button);
  }

  root.append(heading, tagline, nav, panel);
  host.replaceChildren(root);
  show(current);
}
