import { afterEach, describe, expect, it, vi } from 'vitest';
import { AcpClient } from '../src/acp/client.js';
import { Context } from '@deepseek-ai/cordis';
import { LocalSubprocessRuntime } from '@deepseek-ai/dsh-subprocess-local';
import { fileURLToPath } from 'node:url';
import { AntigravityAcpAdapter } from '../src/adapter.js';
import { resolveConfig } from '../src/config.js';
import { ReasoningEffortId } from '@deepseek-ai/dsh-llm';
const live: { context: Context; adapter: AntigravityAcpAdapter }[] = [];
function adapter(variant: string, extra = {}) {
  const context = new Context();
  const adapter = new AntigravityAcpAdapter(resolveConfig({ command: process.execPath,
    args: [fileURLToPath(new URL('./fake-acp-server.mjs', import.meta.url)), variant],
    autoInstall: false, timeoutMs: 5000, requestTimeoutMs: 3000, ...extra }), new LocalSubprocessRuntime(context));
  live.push({ context, adapter }); return adapter;
}
afterEach(async () => { for (const item of live.splice(0)) { await item.adapter.dispose(); await item.context.fiber.dispose(); } });
describe('local agy family and effort selection', () => {
  it('learns context capacity from ACP without fabricating billable usage', async () => {
    const a = adapter('capacity', { toolPolicy: 'text-only' });
    expect((await a.resolveModel('antigravity-acp', 'fake-model')).context).toBeUndefined();
    const received = [];
    for await (const chunk of a.stream({ provider: 'antigravity-acp', model: 'fake-model', messages: [] })) received.push(chunk);
    // The fixture later sends an updated 200000-token limit; latest server metadata wins.
    expect((await a.resolveModel('antigravity-acp', 'fake-model')).context).toEqual({ contextWindow: 200000 });
    expect((await a.resolveModel('antigravity-acp', 'other-model')).context).toBeUndefined();
    expect(received.some(c => c.type === 'usage')).toBe(false);
  });
  it('forwards an explicit proxy to agy and keeps the private MCP bridge local', async () => {
    const spawn = vi.spyOn(LocalSubprocessRuntime.prototype, 'spawn');
    try {
      const a = adapter('local-tier', { proxyUrl: 'http://127.0.0.1:10808' });
      await a.listModels('antigravity-acp');
      expect(spawn.mock.calls[0]![0].env).toMatchObject({ HTTP_PROXY: 'http://127.0.0.1:10808', HTTPS_PROXY: 'http://127.0.0.1:10808' });
      expect(spawn.mock.calls[0]![0].env!.NO_PROXY).toContain('127.0.0.1');
    } finally { spawn.mockRestore(); }
  });
  it('advertises only the server thinking levels under family models', async () => {
    const a = adapter('local-tier');
    const models = await a.listModels('antigravity-acp');
    expect(models.map(m => m.id)).toEqual(['gemini-4-argon', 'gemini-3.8-flash']);
    const resolved = await a.resolveModel('antigravity-acp', models[0]!.id);
    expect(resolved.reasoning!.efforts.map(e => e.id)).toEqual(['low', 'medium', 'high']);
  });
  it('refreshes an expired catalog and retains it after a discovery failure', async () => {
    const a = adapter('local-tier', { catalogRefreshMs: 1 });
    const previous = await a.listModels('antigravity-acp');
    await new Promise(resolve => setTimeout(resolve, 5));
    const failed = vi.spyOn(AcpClient.prototype, 'newSession').mockRejectedValueOnce(new Error('discovery offline'));
    try { expect(await a.listModels('antigravity-acp')).toEqual(previous); expect(failed).toHaveBeenCalledTimes(1); }
    finally { failed.mockRestore(); }
  });
  it('uses the separate effort control with a family model id', async () => {
    const a = adapter('local-tier', { toolPolicy: 'text-only' });
    const chunks = [];
    for await (const c of a.stream({ provider: 'antigravity-acp', model: 'gemini-3.8-flash',
      reasoningEffort: ReasoningEffortId('high'), messages: [{ role: 'user', content: [{ type: 'text', text: 'Config' }] }] })) chunks.push(c);
    expect(JSON.parse(chunks.filter(c => c.type === 'text-delta').map(c => c.text).join('')))
      .toEqual({ model: 'gemini-3.8-flash', thought_level: 'high' });
  });
  it.each(['low', 'medium', 'high'])('selects the family and %s thinking option', async effort => {
    const a = adapter('local-tier', { toolPolicy: 'text-only' });
    const chunks = [];
    for await (const chunk of a.stream({ provider: 'antigravity-acp', model: 'gemini-3.8-flash-' + effort,
      messages: [{ role: 'user', content: [{ type: 'text', text: 'Report config.' }] }] })) chunks.push(chunk);
    const result = JSON.parse(chunks.filter(c => c.type === 'text-delta').map(c => c.text).join(''));
    expect(result.model).toBe('gemini-3.8-flash');
    expect(result.thought_level ?? 'medium').toBe(effort);
  });
  it('rejects an unannounced model before sending a prompt', async () => {
    const a = adapter('local-tier', { toolPolicy: 'text-only' });
    const collect = async () => { for await (const _ of a.stream({ provider: 'antigravity-acp', model: 'made-up-high', messages: [] })) { /* drain */ } };
    await expect(collect()).rejects.toMatchObject({ code: 'ACP_INVALID_MODEL' });
  });
});
