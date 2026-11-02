/**
 * A stand-in for the Anthropic API in the browser smokes, answering from the
 * recorded Opus 5.5 replies: a phrase call (two system blocks) with golden case
 * 1, a variant call (three) with the variant recording for its target, or
 * not_applicable where none was recorded. Nothing leaves the machine.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Page, Request } from '@playwright/test';

const FIXTURES = path.resolve(import.meta.dirname, '../test/fixtures');

function readJson<T>(relative: string): T {
  return JSON.parse(readFileSync(path.join(FIXTURES, relative), 'utf8')) as T;
}

interface RecordedCase {
  readonly n: number;
  readonly target?: string;
  readonly fetches: readonly { readonly body?: unknown }[];
}

const PHRASES = readJson<{ cases: RecordedCase[] }>(
  'golden-v2/recordings/claude-opus-5-5/run-1.json',
);
const VARIANTS = readJson<{ cases: RecordedCase[] }>(
  'variants-v1/recordings/claude-opus-5-5/run-1.json',
);

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
};

const NOT_APPLICABLE = {
  content: [{ type: 'text', text: '{"status":"not_applicable","reason":"other"}' }],
};

interface Target {
  readonly person: string | null;
  readonly tense: string | null;
  readonly tournure: string;
  readonly pronoun: boolean;
  readonly negation: boolean;
}

function keyOf(target: Target): string {
  return [
    target.person ?? '-',
    target.tense ?? '-',
    target.tournure,
    target.pronoun ? '1' : '0',
    target.negation ? '1' : '0',
  ].join('·');
}

export interface ApiCalls {
  readonly phrase: number;
  readonly variants: readonly string[];
}

/** Routes the API for golden case `n`, and counts what was asked. */
export async function routeApi(page: Page, n = 1): Promise<() => ApiCalls> {
  let phrase = 0;
  const variants: string[] = [];
  const answer = (request: Request): unknown => {
    const body = request.postDataJSON() as {
      system: unknown[];
      messages: { content: string }[];
    };
    if (body.system.length === 2) {
      phrase += 1;
      return PHRASES.cases.find((c) => c.n === n)?.fetches.at(-1)?.body;
    }
    const { target } = JSON.parse(body.messages[0]?.content ?? '{}') as {
      target: Target;
    };
    const key = keyOf(target);
    variants.push(key);
    return (
      VARIANTS.cases.find((c) => c.n === n && c.target === key)?.fetches[0]?.body ??
      NOT_APPLICABLE
    );
  };
  await page.route('https://api.anthropic.com/**', (route) =>
    route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers: CORS })
      : route.fulfill({
          status: 200,
          headers: { ...CORS, 'content-type': 'application/json' },
          body: JSON.stringify(answer(route.request())),
        }),
  );
  return () => ({ phrase, variants: [...variants] });
}
