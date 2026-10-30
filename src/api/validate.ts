/**
 * Runtime validation against the generated schema.
 *
 * The schema is generated, so this module holds no enum, no field list and no
 * rating rule of its own. It compiles what gen-schema produced and reports.
 */
import AjvModule from 'ajv';
import type { ErrorObject } from 'ajv';
import { PHRASE_SCHEMA, QUERY_LOG_SCHEMA, VARIANT_SCHEMA } from './schema';

// ajv v8 is CommonJS; the ESM default export is the module namespace under some
// bundler configurations and the class itself under others.
const Ajv =
  (AjvModule as unknown as { default?: typeof AjvModule }).default ?? AjvModule;

const ajv = new Ajv({ allErrors: true, strict: false });

const validate = ajv.compile(QUERY_LOG_SCHEMA);

/**
 * The phase 1 reply's shape. Only the shape: the rules the schema cannot say,
 * spans among them, are in phrase-check.ts, which calls this first.
 */
const validatePhrasePayload = ajv.compile(PHRASE_SCHEMA);

/** The phase 2 variant reply's shape; the rest is in src/variants/check.ts. */
const validateVariantPayload = ajv.compile(VARIANT_SCHEMA);

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

export function validatePhraseShape(candidate: unknown): ValidationResult {
  const valid = validatePhrasePayload(candidate);
  return { valid, errors: valid ? [] : describe(validatePhrasePayload.errors) };
}

export function validateVariantShape(candidate: unknown): ValidationResult {
  const valid = validateVariantPayload(candidate);
  return { valid, errors: valid ? [] : describe(validateVariantPayload.errors) };
}
