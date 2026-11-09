import type { ForwardingOptions } from '../src/request-options.js';
import { describe, expect, it, vi } from 'vitest';
import { AttachmentId } from '@deepseek-ai/dsh-attachment';
import { buildAcpPrompt } from '../src/prompt.js';
import { resolveConfig } from '../src/config.js';
import type { GenerateOptions } from '@deepseek-ai/dsh-llm';
const image = { type: 'image' as const, attachment: { attachmentId: AttachmentId(`sha256:${'a'.repeat(64)}`), mediaType: 'image/png' as const, bytes: 3, width: 1, height: 1 } };
const options = (): ForwardingOptions => ({ provider: 'antigravity-acp', model: 'fake-model', messages: [{ role: 'user', content: [image] }] });
describe('ACP image input', () => {
  it('transmits host-owned bytes with a durable reference and media type', async () => {
    const reader = vi.fn(async () => ({ data: Uint8Array.of(1, 2, 3), mediaType: 'image/png' }));
    const content = await buildAcpPrompt(options(), resolveConfig(), reader);
    expect(content).toContainEqual({ type: 'image', data: 'AQID', mimeType: 'image/png' });
    expect(reader).toHaveBeenCalledWith(image, undefined);
    expect(JSON.stringify(content)).toContain(image.attachment.attachmentId);
  });
  it('does not resurrect an offloaded image', async () => {
    const o = options(); o.messages = [{ role: 'user', content: [{ ...image, offloaded: true }] }];
    const reader = vi.fn(async () => ({ data: new Uint8Array(), mediaType: 'image/png' }));
    expect((await buildAcpPrompt(o, resolveConfig(), reader)).some(c => c.type === 'image')).toBe(false);
    expect(reader).not.toHaveBeenCalled();
  });
  it('does not submit an image when storage fails', async () => {
    await expect(buildAcpPrompt(options(), resolveConfig(), async () => { throw new Error('missing immutable image'); }))
      .rejects.toMatchObject({ code: 'IMAGE_ATTACHMENT_UNAVAILABLE' });
  });
  it('rejects images without an attachment reader', async () => {
    await expect(buildAcpPrompt(options(), resolveConfig())).rejects.toMatchObject({ code: 'UNSUPPORTED_OPTION' });
  });
});
