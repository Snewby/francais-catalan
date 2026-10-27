/**
 * Prices for the eval report, in USD per million tokens.
 *
 * From the Anthropic pricing page as the spec cites it (21 Oct 2026), first
 * party, prompts under 100K tokens (the prefix is about 18,300). Cache writes
 * are not listed: they are a fixed multiple of the input price, 1.25 for the
 * five-minute cache and 2 for the hour, which is what lets the report price one
 * set of recorded tokens under both.
 */
export interface Price {
  readonly input: number;
  readonly output: number;
  readonly cacheRead: number;
}

export const PRICES: Readonly<Record<string, Price>> = {
  'claude-haiku-4-5': { input: 1, output: 5, cacheRead: 0.1 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2 },
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2 },
};

/** The three models the phase 1 eval compares. */
export const CANDIDATES: readonly string[] = [
  'claude-haiku-5-5',
  'claude-sonnet-5-5',
  'claude-opus-5-5',
];

export const CACHE_WRITE_MULTIPLIER = { '5m': 1.25, '1h': 2 } as const;

export interface TokenCounts {
  readonly input: number;
  readonly output: number;
  readonly cacheWrite: number;
  readonly cacheRead: number;
}

/** What one reply's tokens cost, with any cache writes priced at `ttl`. */
export function costOf(model: string, tokens: TokenCounts, ttl: '5m' | '1h'): number {
  const price = PRICES[model];
  if (price === undefined) throw new Error(`No price for ${model}.`);
  const perToken = (perMillion: number): number => perMillion / 1_000_000;
  return (
    tokens.input * perToken(price.input) +
    tokens.output * perToken(price.output) +
    tokens.cacheRead * perToken(price.cacheRead) +
    tokens.cacheWrite * perToken(price.input * CACHE_WRITE_MULTIPLIER[ttl])
  );
}

/**
 * The same reply as if the prefix had not been cached yet: everything read
 * from the cache is written to it instead. Every recorded sentence after the
 * pre-checks is warm, so this is how the report gets a cold figure from real
 * token counts rather than from an estimate.
 */
export function asCold(tokens: TokenCounts): TokenCounts {
  return { ...tokens, cacheWrite: tokens.cacheWrite + tokens.cacheRead, cacheRead: 0 };
}
