/**
 * GENERATED FILE. DO NOT EDIT BY HAND.
 *
 * Produced by `npm run gen-schema` from src/taxonomy/taxonomy.json. Every
 * component-ID enum is drawn from the flattened taxonomy leaf IDs, which is
 * what makes an out-of-vocabulary tag impossible at decode time.
 *
 * Hand-edits are destroyed on the next generation and, worse, temporarily hide
 * the drift that the schema-generation test exists to catch.
 *
 * Phase 0 placeholder: the real generation lands in phase 3.
 */

export const DECOMPOSITION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['components', 'answer', 'answer_lang'],
  properties: {
    components: {
      type: 'array',
      items: { type: 'string', enum: [] as string[] },
    },
    answer: { type: 'string' },
    answer_lang: { type: 'string', enum: ['fr'] },
  },
} as const;
