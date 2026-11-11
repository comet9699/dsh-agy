import { it, expect, vi } from 'vitest';
// @ts-expect-error Browser helper uses the host's public session interfaces.
import { createRecoveryAction, CONTINUE_MESSAGE, flashSelection } from '../src/recovery-core.mjs';
function setup() {
  const status = { sessionId: 'one', turn: 7, stage: 'failed', failureCode: 'ACP_TIMEOUT' };
  const session = { getSnapshot: () => ({ running: false, removed: false, pendingSubmissions: [], awaitingFirstTurn: false }), beginSubmission: vi.fn(() => ({ requestId: 'request-one', abandon: vi.fn() })), prompt: vi.fn(async () => ({ ok: true })) };
  const state = { current: { provider: 'agy-local-acp', model: 'gemini-4-argon', reasoningEffort: 'medium' }, groups: [{ id: 'agy-local-acp', models: [{ id: 'gemini-3.8-flash', name: 'Gemini Flash', reasoning: { efforts: [{ id: 'low' }] } }] }] };
  const directory = { store: { getSnapshot: () => state }, load: vi.fn(async () => state), select: vi.fn(async (selection) => { state.current = selection; return { ok: true }; }) };
  const activity = { getSelectedId: () => 'one', refresh: vi.fn(async () => status) };
  const ctx = { sessions: { using: vi.fn(async (_id, _options, fn) => fn({ binding: { session } })) }, modelDirectories: { directoryFor: () => directory } };
  return { run: createRecoveryAction(ctx, activity), session, state, directory, status, activity };
}
it('continues with one official user prompt, without replaying commands or clearing a draft', async () => {
  const t = setup(); await t.run('one', 7);
  expect(t.session.prompt).toHaveBeenCalledTimes(1);
  expect(t.session.prompt).toHaveBeenCalledWith([{ type: 'text', text: CONTINUE_MESSAGE }], 'queue', undefined, 'request-one');
  await expect(t.run('one', 7)).rejects.toThrow(); expect(t.session.prompt).toHaveBeenCalledTimes(1);
});
it('uses the announced Flash effort before continuing', async () => {
  const t = setup(); await t.run('one', 7, true);
  expect(t.directory.select).toHaveBeenCalledWith({ provider: 'agy-local-acp', model: 'gemini-3.8-flash', reasoningEffort: 'low' });
  expect(t.session.prompt).toHaveBeenCalledTimes(1);
});
it('does not submit after a failed model switch', async () => {
  const t = setup(); t.directory.select.mockResolvedValue({ ok: false, error: { message: 'switch refused' } } as never);
  await expect(t.run('one', 7, true)).rejects.toThrow('switch refused'); expect(t.session.prompt).not.toHaveBeenCalled();
});
it('rejects stale turns, busy sessions and a changed provider', async () => {
  const a = setup(); await expect(a.run('one', 6)).rejects.toThrow(); expect(a.session.prompt).not.toHaveBeenCalled();
  const b = setup(); b.session.getSnapshot = () => ({ running: true, removed: false, pendingSubmissions: [], awaitingFirstTurn: false }); await expect(b.run('one', 7)).rejects.toThrow(); expect(b.session.prompt).not.toHaveBeenCalled();
  const c = setup(); c.state.current.provider = 'deepseek-official'; await expect(c.run('one', 7)).rejects.toThrow(); expect(c.session.prompt).not.toHaveBeenCalled();
});
it('does not double-submit when transport fails after sending', async () => {
  const t = setup(); t.session.prompt.mockRejectedValue(Error('transport lost'));
  await expect(t.run('one', 7)).rejects.toThrow('尚未确认'); await expect(t.run('one', 7)).rejects.toThrow(); expect(t.session.prompt).toHaveBeenCalledTimes(1);
});
it('does not invent a Flash model if none is announced', () => { expect(() => flashSelection({ current: { provider: 'agy-local-acp' }, groups: [] })).toThrow(); });
