import type { Context } from '@deepseek-ai/cordis';
import { AntigravityAcpAdapter } from './adapter.js';
import { Config, resolveConfig } from './config.js';
export const name = 'llm-antigravity-acp';
export const inject = ['llm', 'subprocess'];
export { Config, AntigravityAcpAdapter };
export function apply(ctx: Context, config: Config): void {
  const resolved = resolveConfig(config);
  const attachments = ctx.get('attachments');
  const adapter = new AntigravityAcpAdapter(resolved, ctx.subprocess, (message) =>
    ctx.logger.warn(message),
    attachments ? (image, signal) => attachments.readImageRequest(image.attachment, {
      width: image.attachment.width, height: image.attachment.height, maxBytes: image.attachment.bytes,
    }, signal) : undefined,
  );
  ctx.llm.registerAdapter([resolved.provider], adapter);
  ctx.effect(() => () => adapter.dispose());
}
