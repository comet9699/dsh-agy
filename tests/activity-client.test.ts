import { it, expect, vi, afterEach } from 'vitest';
// @ts-expect-error Private browser module.
import { createActivityClient } from '../src/activity-client.mjs';
afterEach(() => vi.useRealTimers());
function fixture(fetcher: any) {
  let changed = () => {}; const rows: Record<string, { running: boolean }> = { one: { running: true }, two: { running: false } };
  const doc = { baseURI: 'http://localhost:123/', visibilityState: 'visible', addEventListener: vi.fn(), removeEventListener: vi.fn() };
  const ctx = { sessions: { list: { getSnapshot: () => ({ byId: rows }), subscribe: (fn: () => void) => { changed = fn; return vi.fn(); } } } };
  const client = createActivityClient(ctx, vi.fn(), { fetcher, doc, interval: 100 });
  return { client, rows, doc, changed: () => changed() };
}
it('ignores a stale session response and stops polling an idle session', async () => {
  vi.useFakeTimers(); let release: any;
  const fetcher = vi.fn().mockImplementationOnce(() => new Promise(resolve => release = resolve)).mockResolvedValue({ ok: true, json: async () => ({ activity: { sessionId: 'two', turn: 2, stage: 'complete' } }) });
  const { client } = fixture(fetcher);
  client.select('one'); client.select('two'); await client.refresh();
  release({ ok: true, json: async () => ({ activity: { sessionId: 'one', stage: 'waiting-model' } }) });
  await vi.advanceTimersByTimeAsync(1000);
  expect(client.getSnapshot()?.sessionId).toBe('two'); expect(fetcher).toHaveBeenCalledTimes(2); client.dispose();
});
it('polls only a visible selected running session and disposes without more requests', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ activity: { sessionId: 'one', stage: 'waiting-model' } }) }));
  const { client, doc, rows, changed } = fixture(fetcher);
  client.select(null); await vi.advanceTimersByTimeAsync(500); expect(fetcher).not.toHaveBeenCalled();
  client.select('one'); await client.refresh(); await vi.advanceTimersByTimeAsync(210); expect(fetcher.mock.calls.length).toBe(3);
  doc.visibilityState = 'hidden'; await vi.advanceTimersByTimeAsync(500); expect(fetcher.mock.calls.length).toBe(3);
  doc.visibilityState = 'visible'; rows.one = { running: false }; changed(); await client.refresh();
  const count = fetcher.mock.calls.length; await vi.advanceTimersByTimeAsync(500); expect(fetcher.mock.calls.length).toBe(count);
  client.dispose(); await vi.advanceTimersByTimeAsync(1000); expect(fetcher.mock.calls.length).toBe(count);
});
