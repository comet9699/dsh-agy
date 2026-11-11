import type { Context } from '@deepseek-ai/cordis';
import { AntigravityAcpAdapter } from './adapter.js';
import { Config, resolveConfig } from './config.js';
import { AgyActivity } from './activity.js';
export const name = 'llm-antigravity-acp';
export const inject = ['llm', 'subprocess'];
export { Config, AntigravityAcpAdapter };
export function apply(ctx: Context, config: Config): void {
  const resolved = resolveConfig(config);
  const activity = ctx.get('agyActivity') ?? new AgyActivity(ctx);
  ctx.on('session/event', (session, event) => {
    if (event.type === 'turn/start') activity.startTurn(session.id, event.data.turn);
    if (event.type === 'turn/end' && activity.get(session.id)) activity.progress(session.id, event.data.reason.kind === 'error' ? 'failed' : ['aborted', 'interrupted'].includes(event.data.reason.kind) ? 'cancelled' : 'complete', event.data.reason.kind === 'error' ? event.data.reason.error.code : undefined);
  });
  const attachments = ctx.get('attachments');
  const adapter = new AntigravityAcpAdapter(resolved, ctx.subprocess, (message) =>
    ctx.logger.warn(message),
    attachments ? (image, signal) => attachments.readImageRequest(image.attachment, {
      width: image.attachment.width, height: image.attachment.height, maxBytes: image.attachment.bytes,
    }, signal) : undefined,
    activity.progress,
  );
  ctx.llm.registerAdapter([resolved.provider], adapter);
  ctx.effect(() => () => adapter.dispose());
}
