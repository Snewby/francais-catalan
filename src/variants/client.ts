/**
 * One variant call (phase 2 spec, « Pipeline », steps 4 to 7): the shared
 * cached prefix, the request as the only dynamic content, structured outputs,
 * the 20 s timeout and the caller's cancel, one retry on a failed check.
 *
 * The round trip is phase 1's own `send`, so the failure table maps the same
 * way. What differs is the end: two failed checks store nothing and leave the
 * previous state on screen with « Variante indisponible », rather than showing
 * a half-checked reply.
 */
import {
  MAX_TOKENS,
  defaultIsOnline,
  effortFor,
  send,
  toStructuredOutputSchema,
  type Attempt,
  type CallOptions,
  type FailureKind,
} from '../api/anthropic';
import type { CacheTtl } from '../api/prompt';
import { VARIANT_SCHEMA } from '../api/schema';
import { checkVariantReply, type CheckedVariant, type VariantContext } from './check';
import {
  buildVariantSystemBlocks,
  buildVariantUserContent,
  type VariantRequest,
} from './prompt';

export interface VariantBodyOptions {
  /** No default: the variant model is whichever the variant eval picks. */
  readonly model: string;
  readonly cacheTtl?: CacheTtl;
  readonly legacyOutputFormat?: boolean;
}

export function buildVariantRequestBody(
  request: VariantRequest,
  options: VariantBodyOptions,
): Record<string, unknown> {
  const format = {
    type: 'json_schema',
    schema: toStructuredOutputSchema(VARIANT_SCHEMA),
  };
  const effort = effortFor(options.model);
  return {
    model: options.model,
    max_tokens: MAX_TOKENS,
    system: buildVariantSystemBlocks(options.cacheTtl),
    messages: [{ role: 'user', content: buildVariantUserContent(request) }],
    ...(options.legacyOutputFormat
      ? { output_format: format }
      : { output_config: { format, ...(effort !== null && { effort }) } }),
  };
}

interface ResultBase {
  readonly model: string;
  /** At most two: the call and the one retry. */
  readonly attempts: readonly Attempt[];
}

export type VariantResult =
  | (ResultBase & { readonly status: 'ok'; readonly variant: CheckedVariant })
  | (ResultBase & {
      /** Two replies failed the check: nothing is stored, the button stays live. */
      readonly status: 'unavailable';
      readonly errors: readonly string[];
    })
  | (ResultBase & {
      readonly status: 'error';
      readonly kind: FailureKind;
      readonly detail: string;
      readonly httpStatus?: number;
    });

export interface VariantOptions extends CallOptions {
  readonly model: string;
  readonly request: VariantRequest;
  readonly context: VariantContext;
}

export async function requestVariant(options: VariantOptions): Promise<VariantResult> {
  const { model } = options;
  const attempts: Attempt[] = [];
  const fail = (
    kind: FailureKind,
    detail: string,
    httpStatus?: number,
  ): VariantResult => ({
    status: 'error',
    kind,
    detail,
    ...(httpStatus !== undefined && { httpStatus }),
    model,
    attempts,
  });

  if (options.apiKey === null || options.apiKey.trim() === '') {
    return fail('no_key', 'No API key is stored.');
  }
  if (!(options.isOnline ?? defaultIsOnline)()) {
    return fail('offline', 'The device reports no connection.');
  }

  let lastErrors: readonly string[] = [];
  // ONE retry, not a loop, for the same reason as the phrase call.
  for (let call = 0; call < 2; call += 1) {
    const { outcome, attempt } = await send(
      options,
      (legacyOutputFormat) =>
        buildVariantRequestBody(options.request, {
          model,
          ...(options.cacheTtl && { cacheTtl: options.cacheTtl }),
          legacyOutputFormat,
        }),
      (candidate) => checkVariantReply(candidate, options.context),
    );
    attempts.push(attempt);

    if (outcome.type === 'error') {
      return fail(outcome.kind, outcome.detail, outcome.httpStatus);
    }
    if (outcome.check.valid && 'variant' in outcome.check) {
      return { status: 'ok', variant: outcome.check.variant, model, attempts };
    }
    if (!outcome.check.valid) lastErrors = outcome.check.errors;
  }
  return { status: 'unavailable', errors: lastErrors, model, attempts };
}
