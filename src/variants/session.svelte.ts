/**
 * One phrase's variation panel (phase 2 spec, « Pipeline » and « Phrase screen
 * changes »): where the sentence sits on the axes, what each button does, the
 * call behind a tap, and what the screen draws from it. Reactive state, so the
 * Phrase screen redraws as a tap resolves; no component logic lives here.
 *
 * Two comparisons, on purpose (D0): rings, the change line and the notes
 * compare with the state just before the last tap, while every request and
 * its validation start from the original sentence.
 */
import type Dexie from 'dexie';
import type { NotApplicableReason } from '../api/phrase';
import type { SpannedChunk } from '../api/phrase-check';
import type { ComponentId } from '../api/schema';
import type { PhraseRow, VariantRow } from '../db/rows';
import { fr } from '../i18n/fr';
import { anatomyOf, type AnatomyChunk } from '../phrase/anatomy';
import { FAILURE_TEXT, RETRYABLE } from '../phrase/failure';
import { leafById } from '../taxonomy/index';
import {
  applyTap,
  buttonState,
  comboKey,
  parseComboKey,
  sameCombination,
  startingState,
  type Axis,
  type ButtonState,
  type Combination,
  type GreyCause,
  type StartingState,
} from './combination';
import { NO_RINGS, changeCards, changeLine, changedKeys, frenchProse } from './display';
import { switchNoteFr } from './notes';
import {
  fetchAndStoreVariant,
  findVariant,
  recordFirstSight,
  variantsOfPhrase,
  type VariantOutcome,
} from './store';

/** What the « En catalan » card and « Anatomie » draw: the original or a variant. */
export interface Shown {
  readonly ca: string;
  readonly fr: string;
  readonly chunks: readonly SpannedChunk[];
  readonly subject: PhraseRow['subject'];
  readonly assumptions: PhraseRow['assumptions'];
  /** Null for the original sentence. */
  readonly variantId: string | null;
}

/** The four groups of the panel; the reason line sits under the one tapped. */
export type Group = 'who' | 'when' | 'tournure' | 'transform';

export const GROUP_OF: Readonly<Record<Axis, Group>> = {
  person: 'who',
  tense: 'when',
  tournure: 'tournure',
  pronoun: 'transform',
  negation: 'transform',
};

export type PanelButton =
  | ButtonState
  | { readonly kind: 'waiting' }
  | { readonly kind: 'not_applicable'; readonly reason: NotApplicableReason };

export interface ReasonLine {
  readonly group: Group;
  readonly text: string;
  /** Set when « Réessayer » should repeat the tap. */
  readonly retry?: { readonly axis: Axis; readonly value: Combination[Axis] };
  /** Set for the no-key failure, which the settings sheet fixes. */
  readonly settings?: boolean;
}

/** One « Ce qui a changé » card. */
export interface ChangeCard {
  readonly id: ComponentId;
  readonly title: string;
  readonly status: 'transfer' | 'near-miss' | 'false-friend' | 'novel';
  readonly note: string;
}

export interface SessionDeps {
  readonly apiKey: () => string | null;
  readonly fetchFn?: typeof fetch;
  readonly isOnline?: () => boolean;
  readonly now?: () => number;
}

function shownOf(row: VariantRow): Shown {
  return {
    ca: row.ca ?? '',
    fr: frenchProse(row.fr ?? ''),
    chunks: row.chunks,
    subject: row.subject,
    assumptions: row.assumptions,
    variantId: row.id,
  };
}

export class VariantSession {
  readonly start: StartingState;
  readonly original: Shown;

  combination: Combination = $state() as Combination;
  shown: Shown = $state() as Shown;
  /** The state before the last tap; null at the start and after « Revenir ». */
  previous: Shown | null = $state(null);
  waiting: { readonly axis: Axis; readonly value: Combination[Axis] } | null =
    $state(null);
  line: ReasonLine | null = $state(null);
  notApplicable: Record<string, NotApplicableReason> = $state({});
  cards: readonly ComponentId[] = $state([]);

  #controller: AbortController | null = null;
  // Calls in flight by combination, so a tap on a combination already being
  // fetched waits for that call instead of making a second one.
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  readonly #inFlight = new Map<string, Promise<VariantOutcome>>();

  constructor(
    private readonly database: Dexie,
    private readonly phrase: PhraseRow,
    private readonly deps: SessionDeps,
  ) {
    // A phrase whose anatomy failed has no subject to read; it offers no axis.
    this.start = startingState({
      ...phrase,
      subject: phrase.subject ?? { person: 'none', expressed: false },
    });
    this.original = {
      ca: phrase.ca,
      fr: phrase.fr,
      chunks: phrase.chunks,
      subject: phrase.subject,
      assumptions: phrase.assumptions,
      variantId: null,
    };
    this.combination = this.start.combination;
    this.shown = this.original;
  }

  /** Reads the stored replies, so a not_applicable button is greyed on reopen with no call. */
  async load(): Promise<void> {
    for (const row of await variantsOfPhrase(this.database, this.phrase.id)) {
      if (row.status === 'not_applicable' && row.reason !== null) {
        this.notApplicable[row.comboKey] = row.reason;
      }
    }
  }

  get isOriginal(): boolean {
    return this.shown.variantId === null;
  }

  get anatomy(): AnatomyChunk[] {
    return anatomyOf(this.shown);
  }

  /** Keys of the drawn chunks to ring; none before the first tap. */
  get rings(): ReadonlySet<string> {
    if (this.previous === null) return NO_RINGS;
    return changedKeys(anatomyOf(this.previous), this.anatomy);
  }

  get changeLine(): string | null {
    if (this.previous === null) return null;
    return changeLine(
      { ...this.previous, anatomy: anatomyOf(this.previous) },
      { ...this.shown, anatomy: this.anatomy },
    );
  }

  /** The cards with their authored text, or the leaf's contrast note where none is authored. */
  get changeCards(): ChangeCard[] {
    return this.cards.flatMap((id) => {
      const leaf = leafById(id);
      if (leaf === undefined) return [];
      return [
        {
          id,
          title: leaf.glosses.fr,
          status: leaf.contrast_fr.status,
          note: switchNoteFr(id) ?? leaf.contrast_fr.note,
        },
      ];
    });
  }

  button<A extends Axis>(axis: A, value: NonNullable<Combination[A]>): PanelButton {
    if (this.waiting?.axis === axis && this.waiting.value === value)
      return { kind: 'waiting' };
    const state = buttonState(this.start, this.combination, axis, value);
    if (state.kind !== 'available') return state;
    const reason =
      this.notApplicable[comboKey(applyTap(this.combination, axis, value))];
    return reason === undefined ? state : { kind: 'not_applicable', reason };
  }

  async tap<A extends Axis>(
    axis: A,
    value: NonNullable<Combination[A]>,
  ): Promise<void> {
    const group = GROUP_OF[axis];
    const state = this.button(axis, value);
    if (state.kind === 'greyed') {
      this.line = { group, text: fr.variantReasons[state.cause satisfies GreyCause] };
      return;
    }
    if (state.kind === 'not_applicable') {
      this.line = { group, text: fr.variantReasons[state.reason] };
      return;
    }
    if (state.kind === 'selected' || state.kind === 'waiting') return;

    // The latest tap wins: whatever the last one was waiting for is dropped.
    this.#controller?.abort();
    this.#controller = null;
    this.waiting = null;
    this.line = null;

    const target = applyTap(this.combination, axis, value);
    if (sameCombination(target, this.start.combination)) {
      this.#show(axis, value, this.original, target);
      return;
    }

    const key = comboKey(target);
    const cached = await findVariant(this.database, this.phrase.id, key);
    if (cached !== undefined) {
      await this.#settle(axis, value, { status: 'stored', row: cached });
      return;
    }

    const controller = new AbortController();
    this.#controller = controller;
    this.waiting = { axis, value };
    const outcome = await this.fetch(target, controller.signal);
    if (this.#controller !== controller) return;
    this.#controller = null;
    this.waiting = null;
    await this.#settle(axis, value, outcome);
  }

  /**
   * One call for `target`, shared with any other caller already fetching it.
   * Public so prefetch can warm the cache through the same path.
   */
  fetch(target: Combination, signal?: AbortSignal): Promise<VariantOutcome> {
    const key = comboKey(target);
    const running = this.#inFlight.get(key);
    if (running !== undefined) return running;
    const call = fetchAndStoreVariant(this.database, {
      phraseId: this.phrase.id,
      original: {
        ca: this.phrase.ca,
        chunks: this.phrase.chunks,
        combination: this.start.combination,
      },
      target,
      apiKey: this.deps.apiKey(),
      ...(signal && { signal }),
      ...(this.deps.fetchFn && { fetchFn: this.deps.fetchFn }),
      ...(this.deps.isOnline && { isOnline: this.deps.isOnline }),
      ...(this.deps.now && { now: this.deps.now() }),
    }).finally(() => this.#inFlight.delete(key));
    this.#inFlight.set(key, call);
    return call;
  }

  async #settle<A extends Axis>(
    axis: A,
    value: Combination[A],
    outcome: VariantOutcome,
  ): Promise<void> {
    const group = GROUP_OF[axis];
    if (outcome.status === 'unavailable') {
      this.line = { group, text: fr.variants.unavailable, retry: { axis, value } };
      return;
    }
    if (outcome.status === 'error') {
      if (outcome.kind === 'cancelled') return;
      this.line = {
        group,
        text: FAILURE_TEXT[outcome.kind],
        ...(RETRYABLE.has(outcome.kind) && { retry: { axis, value } }),
        ...(outcome.kind === 'no_key' && { settings: true }),
      };
      return;
    }
    const { row } = outcome;
    if (row.status === 'not_applicable' && row.reason !== null) {
      this.notApplicable[row.comboKey] = row.reason;
      this.line = { group, text: fr.variantReasons[row.reason] };
      return;
    }
    const seen = await recordFirstSight(
      this.database,
      row,
      this.shown.chunks,
      this.deps.now?.() ?? Date.now(),
    );
    this.#show(axis, value, shownOf(seen), parseComboKey(seen.comboKey));
  }

  #show<A extends Axis>(
    axis: A,
    value: Combination[A],
    next: Shown,
    target: Combination,
  ): void {
    this.cards = changeCards(axis, value, this.shown.chunks, next.chunks);
    this.previous = this.shown;
    this.shown = next;
    this.combination = target;
  }

  /** « Revenir à ma phrase »: the original, with no call, rings and notes cleared. */
  revert(): void {
    this.#controller?.abort();
    this.#controller = null;
    this.waiting = null;
    this.line = null;
    this.previous = null;
    this.cards = [];
    this.shown = this.original;
    this.combination = this.start.combination;
  }

  /** Leaving the screen: drops the tap in flight. A prefetch carries on and is cached. */
  dispose(): void {
    this.#controller?.abort();
    this.#controller = null;
  }
}
