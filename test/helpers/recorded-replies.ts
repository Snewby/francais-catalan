/**
 * The phase 1 replies as the app's model recorded them, by golden-v2 case
 * number. Read from the committed Opus recordings, so a test of phase 2 logic
 * runs on what the model really returned rather than on a hand-written reply.
 */
import type { PhraseReply } from '../../src/api/phrase-check';
import type { Recording } from '../../src/eval/golden';
import { readRepoFile } from './taxonomy';

export function recordedReplies(run = 1): ReadonlyMap<number, PhraseReply> {
  const recording = JSON.parse(
    readRepoFile(`test/fixtures/golden-v2/recordings/claude-opus-5-5/run-${run}.json`),
  ) as Recording;
  const replies = new Map<number, PhraseReply>();
  for (const recorded of recording.cases) {
    const last = recorded.fetches.at(-1);
    if (last === undefined || !('body' in last)) continue;
    const body = last.body as { content?: { type: string; text?: string }[] };
    const text = body.content?.find((block) => block.type === 'text')?.text;
    if (text !== undefined) replies.set(recorded.n, JSON.parse(text) as PhraseReply);
  }
  return replies;
}

export function recordedReply(n: number, run = 1): PhraseReply {
  const reply = recordedReplies(run).get(n);
  if (reply === undefined) throw new Error(`No recorded reply for case ${n}`);
  return reply;
}
