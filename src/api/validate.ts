/**
 * Runtime validation against the generated schema.
 *
 * The schema is generated, so this module holds no enum, no field list and no
 * rating rule of its own. It compiles what gen-schema produced and reports.
 */
import AjvModule from 'ajv';
import type { ErrorObject } from 'ajv';
import { DECOMPOSITION_SCHEMA, QUERY_LOG_SCHEMA } from './schema';

// ajv v8 is CommonJS; the ESM default export is the module namespace under some
// bundler configurations and the class itself under others.
const Ajv =
  (AjvModule as unknown as { default?: typeof AjvModule }).default ?? AjvModule;

const ajv = new Ajv({ allErrors: true, strict: false });

const validate = ajv.compile(QUERY_LOG_SCHEMA);

/**
 * The model's reply, before it is a logged query.
 *
 * A second compile of the same generated schema, not a second copy of it: the
 * component enum and the field list still exist in exactly one place. This one
 * is what catches an out-of-vocabulary tag if constrained decoding is ever
 * bypassed, and it enforces the string constraints the decoder cannot.
 */
const validateDecompositionPayload = ajv.compile(DECOMPOSITION_SCHEMA);

export interface ValidationResult {
  readonly valid: boolean;
  /** Human-readable, one line per problem. Empty when valid. */
  readonly errors: readonly string[];
}

function describe(errors: ErrorObject[] | null | undefined): string[] {
  return (errors ?? []).map(
    (error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`,
  );
}

export function validateQueryLog(candidate: unknown): ValidationResult {
  const valid = validate(candidate);
  return { valid, errors: valid ? [] : describe(validate.errors) };
}

export function validateDecomposition(candidate: unknown): ValidationResult {
  const valid = validateDecompositionPayload(candidate);
  return {
    valid,
    errors: valid ? [] : describe(validateDecompositionPayload.errors),
  };
}
