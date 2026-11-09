import { describe, expect, it, vi } from 'vitest';
import { BasicCompactionEngine } from '@deepseek-ai/dsh-compaction-basic';
import { EventMapper } from '../src/acp/events.js';
import type { FinishReason, StreamChunk } from '@deepseek-ai/dsh-llm';
import AgyCompactionEngine, { collectSummary, waitForIdleOrAbort } from '../src/compaction.js';
async function* chunks(text: string, reason?: FinishReason): AsyncIterable<StreamChunk> {
  yield { type: 'block-start', index: 0, blockType: 'text' };
  yield { type: 'text-delta', index: 0, text };
  yield { type: 'block-end', index: 0, block: { type: 'text', text } };
  if (reason) yield { type: 'finish', reason };
}
const route = { provider: 'agy-local-acp', model: 'test' };
describe('ACP compaction result admission', () => {
  it('allows disabling the local budget without declaring a model capacity', () => {
    expect(AgyCompactionEngine.Config({ idleCompactionTokens: 0 }).idleCompactionTokens).toBe(0);
    expect(() => AgyCompactionEngine.Config({ idleCompactionTokens: -1 })).toThrow();
  });
  it('releases an idle wait on disposal even when the Agent never becomes idle', async () => {
    const controller = new AbortController();
    const pending = waitForIdleOrAbort(() => new Promise<void>(() => {}), controller.signal);
    controller.abort(); await pending;
  });
  it('propagates a failed Agent idle wait', async () => {
    await expect(waitForIdleOrAbort(async () => { throw new Error('Agent disposed'); }, new AbortController().signal)).rejects.toThrow('Agent disposed');
  });
  it('keeps host policy settings while allowing an explicit ACP provider scope', () => {
    const config = AgyCompactionEngine.Config({ auto: false, acpProviders: ['custom-agy'] });
    expect(config.auto).toBe(false);
    expect(config.acpProviders).toEqual(['custom-agy']);
  });
  it('keeps the exact raw model output and does not invent a generation cap', async () => {
    const summary = await collectSummary(chunks('Keep project code LIME-42.', { kind: 'stop' }), route);
    expect(summary.summary).toEqual([{ type: 'text', text: 'Keep project code LIME-42.' }]);
    expect(summary.rawOutput).toEqual(summary.summary);
    expect(summary).not.toHaveProperty('maxTokens');
    expect(summary).toMatchObject({ ...route, llmStreamCall: true });
  });
  it('refuses an incomplete summary', async () => {
    await expect(collectSummary(chunks('partial'), route)).rejects.toMatchObject({ code: 'ACP_COMPACTION_FAILED' });
  });
  it('refuses an empty summary', async () => {
    await expect(collectSummary(chunks('  ', { kind: 'stop' }), route)).rejects.toMatchObject({ code: 'ACP_COMPACTION_EMPTY' });
  });
  it('rejects quota notices instead of replacing history with an error', async () => {
    await expect(collectSummary(chunks('⚠ Individual quota reached. Please upgrade your subscription to increase your limits.\nResets in 3h29m56s.', { kind: 'stop' }), route)).rejects.toMatchObject({ code: 'ACP_QUOTA_EXHAUSTED' });
  });
  it('recognizes a native quota response split across stream chunks', () => {
    const mapper = new EventMapper();
    for (const text of ['⚠ Individual quota reached. ', 'Please upgrade your subscription to increase your limits.', '\nResets in 3h29m56s.']) mapper.update({ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text } });
    expect(() => mapper.end()).toThrow(expect.objectContaining({ code: 'ACP_QUOTA_EXHAUSTED' }));
    const normal = new EventMapper();
    normal.update({ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'The log contained: Individual quota reached. Check the selected model.' } });
    expect(normal.end()).toHaveLength(1);
  });
  it('preserves cancellation instead of accepting the partial output', async () => {
    await expect(collectSummary(chunks('partial', { kind: 'aborted', failure: { code: 'ABORTED', message: 'cancelled' } }), route)).rejects.toMatchObject({ code: 'ABORTED' });
  });
});

describe('model switch admission with unknown ACP capacity', () => {
  function fixture(tokens = 100, context?: { contextWindow: number }) {
    const hooks = new Map<string, Function>();
    const engine = Object.create(AgyCompactionEngine.prototype) as any;
    Object.defineProperty(engine, 'ctx', { value: {
      on: (name: string, fn: Function) => hooks.set(name, fn), logger: { warn: vi.fn() },
      llm: { resolveModelInfo: async () => ({ ...(context ? { context } : {}) }) },
      tokenMeter: { measure: () => ({ totalTokens: tokens }) },
    } });
    Object.assign(engine, { config: { modelPolicies: [], thresholdRatio: 0.8, headroomTokens: 100, compactionRetries: 1, maxOverflowRetries: 1 }, acpProviders: ['agy-local-acp'], idleCompactionTokens: 32768, summaryTargets: new WeakMap(), recoveryRetries: new WeakMap() });
    engine.registerAutomaticHooks();
    const previous = { config: { provider: 'agy-local-acp', model: 'exhausted-old-model' } };
    const agent = { session: { requestHeader: () => previous, surface: { replaceGeneration: 0 } } };
    const target = { provider: 'agy-local-acp', model: 'gemini-3.8-flash' };
    return { engine, agent, target, hooks, previous, reduce: () => { tokens = 100; }, run: () => hooks.get('agent/request')!({ agent, signal: new AbortController().signal }, async () => target) };
  }
  it('switches short history without inventing capacity or making a summary call', async () => {
    const f = fixture();
    const spy = vi.spyOn(BasicCompactionEngine.prototype, 'compactIfNeeded');
    try { expect(await f.run()).toEqual(f.target); expect(spy).not.toHaveBeenCalled(); }
    finally { spy.mockRestore(); }
  });
  it('uses the selected model to reduce long history before admitting the switch', async () => {
    const f = fixture(50000);
    const spy = vi.spyOn(BasicCompactionEngine.prototype, 'compactIfNeeded').mockImplementation(async function () {
      expect(f.engine.summaryTargets.get(f.agent)).toEqual(f.target); f.reduce(); return {} as any;
    });
    try { expect(await f.run()).toEqual(f.target); expect(spy).toHaveBeenCalledOnce(); expect(f.engine.summaryTargets.has(f.agent)).toBe(false); }
    finally { spy.mockRestore(); }
  });
  it('rejects a failed summary and leaves the old model selected', async () => {
    const f = fixture(50000);
    const spy = vi.spyOn(BasicCompactionEngine.prototype, 'compactIfNeeded').mockRejectedValue(new Error('quota exhausted'));
    try { await expect(f.run()).rejects.toMatchObject({ code: 'MODEL_SWITCH_COMPACTION_FAILED' }); expect(f.agent.session.requestHeader()).toBe(f.previous); expect(f.engine.summaryTargets.has(f.agent)).toBe(false); }
    finally { spy.mockRestore(); }
  });
  it('still enforces the capacity when the target actually reports one', async () => {
    const f = fixture(900, { contextWindow: 1000 });
    const spy = vi.spyOn(BasicCompactionEngine.prototype, 'compactIfNeeded').mockImplementation(async () => { f.reduce(); return {} as any; });
    try { expect(await f.run()).toEqual(f.target); expect(spy).toHaveBeenCalledOnce(); }
    finally { spy.mockRestore(); }
  });
});
