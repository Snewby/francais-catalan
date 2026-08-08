/**
 * Runtime validation of a logged query against the generated schema.
 *
 * The schema is generated, so this module holds no enum, no field list and no
 * rating rule of its own. It compiles what gen-schema produced and reports.
 */
import AjvModule from 'ajv';
import type { ErrorObject } from 'ajv';
import { QUERY_LOG_SCHEMA } from './schema';

// ajv v8 is CommonJS; the ESM default export is the module namespace under some
// bundler configurations and the class itself under others.
const Ajv =
  (AjvModule as unknown as { default?: typeof AjvModule }).default ?? AjvModule;

const validate = new Ajv({ allErrors: true, strict: false }).compile(QUERY_LOG_SCHEMA);

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
