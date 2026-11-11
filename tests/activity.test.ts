import { Context } from '@deepseek-ai/cordis';
import { it, expect } from 'vitest';
import { AgyActivity } from '../src/activity.js';
it('separates sessions, resets at a new turn and retains only safe stage fields', async () => {
  const ctx = new Context(); const tracker = new AgyActivity(ctx);
  try {
    tracker.startTurn('one', 1); tracker.progress('one', 'waiting-model'); tracker.startTurn('two', 2); tracker.progress('two', 'waiting-tool');
    expect(tracker.get('one')?.stage).toBe('waiting-model'); expect(tracker.get('two')?.stage).toBe('waiting-tool');
    tracker.progress('one', 'failed', 'ACP_TIMEOUT'); expect(tracker.get('one')?.failureCode).toBe('ACP_TIMEOUT');
    tracker.startTurn('one', 3); expect(tracker.get('one')).toBeNull();
    tracker.progress('one', 'failed', 'secret token must never appear'); expect(tracker.get('one')?.failureCode).toBeUndefined();
    for (let i = 0; i < 300; i++) tracker.progress('s' + i, 'complete'); expect(tracker.get('one')).toBeNull();
  } finally { await ctx.fiber.dispose(); }
});
