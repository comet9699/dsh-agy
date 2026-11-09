import type { ForwardingOptions } from './request-options.js';
import {
  LlmAdapter,
  LlmError,
  ReasoningEffortId,
  type GenerateOptions,
  type StreamChunk,
  type LlmModelInfo,
  type LlmResolvedModelInfo,
} from '@deepseek-ai/dsh-llm';
import type { SubprocessRuntime } from '@deepseek-ai/dsh-subprocess';
import { AcpClient } from './acp/client.js';
import { EventMapper, finishReason } from './acp/events.js';
import { aborted, classify } from './acp/errors.js';
import { modelCatalog, selectValues } from './models.js';
import { buildAcpPrompt, type ImageReader } from './prompt.js';
import type { Config } from './config.js';
import { ToolSessions } from './mcp/sessions.js';

/**
 * DSH 0.2.1-rc.3 requires every model entry to declare reasoning metadata
 * before a request carrying a `reasoningEffort` is accepted; without it the
 * host throws UNSUPPORTED_REASONING_EFFORT for any effort, including `off`.
 *
 * Older servers encode thinking in model ID suffixes. This fallback is replaced
 * by the server's thought_level choices after discovery; local agy receives the
 * separate requested effort through session configuration. See
 * https://github.com/dannndouglas/dsh-antigravity-acp/issues/1
 */
const REASONING_META = {
  efforts: [
    { id: ReasoningEffortId('off'), name: 'Off' },
    { id: ReasoningEffortId('low'), name: 'Low' },
    { id: ReasoningEffortId('medium'), name: 'Medium' },
    { id: ReasoningEffortId('high'), name: 'High' },
    { id: ReasoningEffortId('max'), name: 'Max' },
  ],
};

export class AntigravityAcpAdapter extends LlmAdapter {
  private controlClient: AcpClient;
  private tools: ToolSessions;
  private tail: Promise<void> = Promise.resolve();
  private disposed = false;
  private lifetime = new AbortController();
  private generations = 0;
  private warnedTools = false;
  private catalog: { id: string; name: string }[] = [];
  private catalogCheckedAt = 0;
  private reasoning = REASONING_META;
  private contextWindows = new Map<string, number>();
  constructor(
    readonly config: Config,
    private runtime: SubprocessRuntime,
    private warn: (message: string) => void = () => {},
    private readImage?: ImageReader,
  ) {
    super();
    this.controlClient = new AcpClient(config, runtime, warn);
    this.tools = new ToolSessions(config, runtime, warn, readImage, (model, update) => this.observeCapacity(model, update));
  }
  private observeCapacity(model: string, update: import('@agentclientprotocol/sdk').SessionUpdate): void {
    if (update.sessionUpdate === 'usage_update' && Number.isSafeInteger(update.size) && update.size > 0)
      this.contextWindows.set(model, update.size);
  }
  get client(): AcpClient {
    return this.controlClient;
  }
  providerInfo(provider: string) {
    return { id: provider, name: 'Agy' };
  }

  private async acquire(signal?: AbortSignal): Promise<() => void> {
    if (this.disposed) throw new LlmError('Antigravity adapter has been disposed.', 'ACP_DISPOSED');
    if (signal?.aborted) throw aborted();
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    let onAbort: (() => void) | undefined;
    try {
      const abort = new Promise<never>((_, reject) => {
        onAbort = () => reject(aborted());
        signal?.addEventListener('abort', onAbort, { once: true });
        if (signal?.aborted) onAbort();
      });
      await Promise.race([previous, abort]);
      if (this.disposed)
        throw new LlmError('Antigravity adapter has been disposed.', 'ACP_DISPOSED');
      return release;
    } catch (error) {
      void previous.then(release);
      throw error;
    } finally {
      if (onAbort) signal?.removeEventListener('abort', onAbort);
    }
  }
  async listModels(provider: string): Promise<readonly LlmModelInfo[]> {
    const release = await this.acquire(this.lifetime.signal);
    try {
      if ((!this.catalogCheckedAt || Date.now() - this.catalogCheckedAt >= this.config.catalogRefreshMs) && !this.tools.active) {
        this.catalogCheckedAt = Date.now();
        try {
          const session = await this.client.newSession(this.lifetime.signal, false);
          const discovered = modelCatalog(session);
          if (discovered.length) this.catalog = discovered;
          const thought = session.configOptions?.find(c => c.category === 'thought_level');
          if (thought) this.reasoning = { efforts: selectValues(thought).map(c => ({ id: ReasoningEffortId(c.value), name: c.name })) };
          if (
            this.config.toolPolicy === 'bridge' &&
            this.catalog.length &&
            this.client.initializeResult?.agentCapabilities?.mcpCapabilities?.http
          ) {
            const ready = this.controlClient;
            this.controlClient = new AcpClient(this.config, this.runtime, this.warn);
            await this.tools.acceptReadyClient(ready);
          }
        } catch (error) {
          await this.client.reset();
          this.warn(classify(error).message);
        }
      }
      const entries = new Map(
        [...this.catalog, ...this.config.models.map((id) => ({ id, name: id }))].map((m) => [
          m.id,
          m,
        ]),
      );
      if (!entries.size)
        entries.set('server-default', {
          id: 'server-default',
          name: 'Server default (login / discovery pending)',
        });
      return [...entries.values()].map((m) => ({
        ...m,
        provider,
        inputModalities: this.readImage ? ['text', 'image'] : ['text'],
        description: 'Official ACP backend with DSH tools through MCP',
        reasoning: this.reasoning,
      }));
    } finally {
      release();
    }
  }
  async resolveModel(
    provider: string,
    model: string,
    signal?: AbortSignal,
  ): Promise<LlmResolvedModelInfo> {
    if (signal?.aborted) throw aborted();
    return {
      provider,
      id: model,
      name: this.catalog.find((m) => m.id === model)?.name ?? model,
      inputModalities: this.readImage ? ['text', 'image'] : ['text'],
      reasoning: this.reasoning,
      ...(this.contextWindows.has(model) ? { context: { contextWindow: this.contextWindows.get(model)! } } : {}),
    };
  }
  diagnostics() {
    return {
      connected: this.client.connected || this.tools.connected,
      processStarts: this.client.processStarts + this.tools.processStarts,
      authentications: this.client.authentications + this.tools.authentications,
      generations: this.generations + this.tools.generations,
      activeToolSessions: this.tools.active,
      idleToolProcesses: this.tools.idle,
    };
  }
  async *stream(options: ForwardingOptions): AsyncIterable<StreamChunk> {
    options = {
      ...options,
      signal: options.signal
        ? AbortSignal.any([options.signal, this.lifetime.signal])
        : this.lifetime.signal,
    };
    if (this.config.toolPolicy === 'bridge' && (options.tools?.length || this.tools.has(options))) {
      yield* this.tools.stream(options);
      return;
    }
    const prompt = await buildAcpPrompt(options, this.config, this.readImage);
    const release = await this.acquire(options.signal);
    const borrowed = this.tools.borrowReadyClient();
    const client = borrowed ?? this.client;
    const mapper = new EventMapper();
    let sessionId: string | undefined,
      completed = false,
      promptStarted = false;
    const queue: StreamChunk[] = [];
    let wake: (() => void) | undefined;
    let error: unknown;
    let done = false;
    try {
      if (options.tools?.length && !this.warnedTools) {
        this.warnedTools = true;
        this.warn(
          'Antigravity ACP is a text-only route: DSH tool schemas are omitted and tool execution is unavailable (toolPolicy: text-only).',
        );
      }
      const session = client.takeUnusedSession() ?? (await client.newSession(options.signal));
      sessionId = session.sessionId;
      this.catalog = modelCatalog(session);
      await client.selectModel(session, options.model, options.signal, options.reasoningEffort);
      this.generations++;
      const nativeTools = () => {
        error = new LlmError(
          'Antigravity attempted native agent tool activity. This provider supports text only; tools remain unavailable on this route.',
          'ACP_NATIVE_TOOLS_UNSUPPORTED',
        );
        done = true;
        wake?.();
      };
      client.onPermission = nativeTools;
      client.onUpdate = (event) => {
        if (event.sessionId !== sessionId || done) return;
        this.observeCapacity(options.model, event.update);
        if (
          event.update.sessionUpdate === 'tool_call' ||
          event.update.sessionUpdate === 'tool_call_update'
        ) {
          nativeTools();
          return;
        }
        queue.push(...mapper.update(event.update));
        wake?.();
      };
      let stop = '';
      promptStarted = true;
      const pending = client.prompt(sessionId, prompt, options.signal).then(
        (result) => {
          stop = result.stopReason;
          done = true;
          wake?.();
        },
        (failure) => {
          error = failure;
          done = true;
          wake?.();
        },
      );
      while (!done || queue.length) {
        while (queue.length) {
          if (options.signal?.aborted) throw aborted();
          yield queue.shift()!;
        }
        if (!done)
          await new Promise<void>((resolve) => {
            wake = resolve;
          });
      }
      if (error) throw error;
      await pending;
      if (options.signal?.aborted) throw aborted();
      if (!mapper.hasText && stop === 'end_turn')
        throw new LlmError(
          'Official ACP server ended the turn without assistant text.',
          'EMPTY_RESPONSE',
        );
      yield* mapper.end();
      // ACP usage_update reports current context occupancy, not per-call token billing.
      completed = stop === 'end_turn';
      yield { type: 'finish', reason: finishReason(stop) };
    } catch (failure) {
      throw options.signal?.aborted ? aborted() : classify(failure);
    } finally {
      client.onUpdate = undefined;
      client.onPermission = undefined;
      try {
        if (completed && !options.signal?.aborted && borrowed)
          await this.tools.acceptReadyClient(client);
        else if (!completed || options.signal?.aborted)
          await client.cancelAndReset(promptStarted ? sessionId : undefined);
      } finally {
        try {
          if (borrowed && (!completed || options.signal?.aborted))
            await this.tools.discardReadyClient(client);
        } finally {
          release();
        }
      }
    }
  }
  async dispose(): Promise<void> {
    this.disposed = true;
    this.lifetime.abort();
    await Promise.all([this.client.dispose(), this.tools.dispose()]);
  }
}
