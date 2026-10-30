/**
 * A fetch that never leaves the machine, shared by the phrase and variant
 * client tests.
 */
import { vi } from 'vitest';

/** One queued answer from the stub: a response, a thrown error, or no answer at all. */
export type Reply =
  | { readonly status: number; readonly body: unknown }
  | { readonly throws: Error }
  | 'hang';

export interface StubbedCall {
  readonly body: Record<string, unknown>;
  readonly headers: Record<string, string>;
}

/**
 * A fetch that never leaves the machine. Each queued reply is used once, so a
 * test that expects a retry has to say so by queueing two, and a third call
 * fails the test by running out.
 */
export function stubFetch(replies: readonly Reply[]): {
  fetchFn: typeof fetch;
  calls: StubbedCall[];
} {
  const calls: StubbedCall[] = [];
  const queue = [...replies];

  const fetchFn = vi.fn(async (_url: string, init: RequestInit) => {
    calls.push({
      body: JSON.parse(String(init.body)) as Record<string, unknown>,
      headers: init.headers as Record<string, string>,
    });
    const reply = queue.shift();
    if (reply === undefined) throw new Error('the stub ran out of replies');
    if (reply === 'hang') {
      return new Promise<never>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        });
      });
    }
    if ('throws' in reply) throw reply.throws;
    const text =
      typeof reply.body === 'string' ? reply.body : JSON.stringify(reply.body);
    return {
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      text: () => Promise.resolve(text),
    };
  });

  return { fetchFn: fetchFn as unknown as typeof fetch, calls };
}
