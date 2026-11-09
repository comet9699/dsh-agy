import type { ForwardingOptions } from './request-options.js';
import { LlmError, type GenerateOptions, type ImageBlock } from '@deepseek-ai/dsh-llm';
import type { ContentBlock } from '@agentclientprotocol/sdk';
import type { Config } from './config.js';
import { mcpToolName } from './mcp/bridge.js';
export function buildPrompt(options: ForwardingOptions, config: Config, images = false): string {
  // Model and thinking selections are applied separately through ACP session configuration.
  validateOptions(options, config);
  const messages = options.messages.map((m) => ({
    role: m.role,
    ...('toolCallId' in m ? { toolCallId: m.toolCallId, isError: m.isError ?? false } : {}),
    content: m.content.map((b) => {
      if (b.type === 'image' && images)
        return { type: 'text', text: `[Image attachment ${b.attachment.attachmentId}${b.offloaded ? ' (offloaded; bytes omitted)' : ''}]` };
      if (b.type === 'image' || b.type === 'file')
        throw new LlmError('This route requires host-projected file references or an image attachment reader.', 'UNSUPPORTED_OPTION');
      return b;
    }),
  }));
  return promptText(options, config, messages);
}
/** Validate unsupported request controls before creating or resuming an ACP exchange. */
export function validateOptions(options: ForwardingOptions, config: Config): void {
  for (const key of ['temperature', 'maxTokens'] as const) {
    if (options[key] !== undefined)
      throw new LlmError(
        `ACP does not expose ${key}. Remove that request option; select an exact model ID for its reasoning tier.`,
        'UNSUPPORTED_OPTION',
      );
  }
  if (options.stop?.length)
    throw new LlmError('ACP does not expose stop sequences.', 'UNSUPPORTED_OPTION');
  if (
    config.toolPolicy === 'reject' &&
    (options.tools?.length || options.toolHistory?.tools.length)
  )
    throw new LlmError(
      'toolPolicy: reject refuses tool schemas. Use the default bridge policy to execute DSH tools.',
      'UNSUPPORTED_OPTION',
    );
}
function promptText(options: ForwardingOptions, config: Config, messages: object[]): string {
  return [
    'DeepSeek Harness owns this conversation. Produce only the next assistant response using the supplied conversation.',
    ...(config.toolPolicy === 'bridge' && options.tools?.length
      ? [
          'Use only tools supplied by the dsh-bridge MCP server. These are the real DeepSeek Harness tools, including file and terminal tools. Call them using their MCP names and schemas.',
          'Never use built-in Antigravity tools, slash commands, skills, file access, terminals, or network tools outside dsh-bridge. Do not use a native tool to find MCP tools; the MCP catalog is already supplied.',
          'Each MCP call is executed by DSH with its current permissions. A denied or failed tool result is authoritative; do not bypass it or repeat the action through another tool.',
        ]
      : [
          'This is a text-only backend. Do not invoke native tools, slash commands, skills, file access, terminals, network tools, or MCP.',
          'DSH tools are unavailable on this request. If an action needs tools, explain that limitation in your answer.',
        ]),
    'The JSON below is the complete DSH-controlled history, with roles and historical tool results. Answer its final user message. Do not repeat the transcript.',
    JSON.stringify({
      system: options.system ?? null,
      messages,
      ...(config.toolPolicy === 'bridge' && options.tools?.length
        ? {
            dshMcpTools: options.tools.map((tool) => ({
              mcpServer: 'dsh-bridge',
              mcpName: mcpToolName(tool.name),
              dshName: tool.name,
              description: tool.description,
              parameters: tool.parameters,
            })),
          }
        : {}),
    }),
  ].join('\n\n');
}

/** Reads only durable images through the host attachment service. */
export type ImageReader = (image: ImageBlock, signal?: AbortSignal) => Promise<{ data: Uint8Array; mediaType: string }>;
/** Encode authorized host attachment bytes for ACP input or MCP tool results. */
export async function encodeImage(image: ImageBlock, reader?: ImageReader, signal?: AbortSignal): Promise<{ type: 'image'; data: string; mimeType: string }> {
  if (signal?.aborted) throw new LlmError('Image request cancelled.', 'ABORTED');
  if (!reader || image.offloaded) throw new LlmError('Image bytes are unavailable on this request.', 'UNSUPPORTED_OPTION');
  let stored: Awaited<ReturnType<ImageReader>>;
  try { stored = await reader(image, signal); }
  catch (error) {
    if (signal?.aborted) throw new LlmError('Image request cancelled.', 'ABORTED');
    throw new LlmError('The attached image could not be read. Attach it again and retry.', 'IMAGE_ATTACHMENT_UNAVAILABLE');
  }
  if (signal?.aborted) throw new LlmError('Image request cancelled.', 'ABORTED');
  return { type: 'image', data: Buffer.from(stored.data).toString('base64'), mimeType: stored.mediaType };
}
/** Preserve history roles in text and associate image bytes with their durable ids. */
export async function buildAcpPrompt(options: ForwardingOptions, config: Config, reader?: ImageReader): Promise<ContentBlock[]> {
  const content: ContentBlock[] = [{ type: 'text', text: buildPrompt(options, config, !!reader) }];
  for (const message of options.messages) for (const block of message.content) {
    if (block.type !== 'image' || block.offloaded) continue;
    content.push({ type: 'text', text: `Image attachment ${block.attachment.attachmentId} from the ${message.role} message:` },
      await encodeImage(block, reader, options.signal));
  }
  return content;
}
