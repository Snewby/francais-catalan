/**
 * The spec's failure table as the screen words it, shared by the phrase call
 * (in place of the card) and the variant call (one line under the panel).
 */
import type { FailureKind } from '../api/anthropic';
import { fr } from '../i18n/fr';

export type ShownFailure = Exclude<FailureKind, 'cancelled'>;

export const FAILURE_TEXT: Readonly<Record<ShownFailure, string>> = {
  no_key: fr.failure.noKey,
  key_rejected: fr.failure.keyRejected,
  overloaded: fr.failure.overloaded,
  offline: fr.failure.offline,
  refused: fr.failure.refused,
};

/** Failures « Réessayer » can fix without the learner changing anything. */
export const RETRYABLE: ReadonlySet<FailureKind> = new Set(['overloaded', 'offline']);
