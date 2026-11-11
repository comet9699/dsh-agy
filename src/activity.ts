import { Service, type Context } from '@deepseek-ai/cordis';
export type ActivityStage = 'preparing' | 'connecting' | 'opening-session' | 'selecting-model' | 'waiting-model' | 'responding' | 'waiting-tool' | 'complete' | 'failed' | 'cancelled';
export type ProgressSink = (sessionId: string | undefined, stage: ActivityStage, failureCode?: string) => void;
export interface ActivitySnapshot { sessionId: string; turn?: number; stage: ActivityStage; startedAt: number; updatedAt: number; failureCode?: string }
/** Ephemeral stage facts only: no messages, prompts, paths, credentials or tool arguments. */
export class AgyActivity extends Service {
  private records = new Map<string, ActivitySnapshot>();
  private turns = new Map<string, number>();
  constructor(ctx: Context) { super(ctx, 'agyActivity'); ctx.effect(() => () => { this.records.clear(); this.turns.clear(); }); }
  startTurn(id: string, turn: number): void {
    if (!Number.isSafeInteger(turn) || turn < 0) return;
    this.turns.delete(id); this.turns.set(id, turn);
    while (this.turns.size > 256) this.turns.delete(this.turns.keys().next().value!);
    this.records.delete(id);
  }
  readonly progress: ProgressSink = (id, stage, failureCode) => {
    if (!id || id.length > 512) return;
    const now = Date.now(), previous = this.records.get(id);
    const startedAt = previous && (stage !== 'preparing' || !['complete', 'failed', 'cancelled'].includes(previous.stage)) ? previous.startedAt : now;
    this.records.delete(id);
    this.records.set(id, { sessionId: id, turn: this.turns.get(id), stage, startedAt, updatedAt: now, ...(failureCode && /^[A-Z_]{1,80}$/.test(failureCode) ? { failureCode } : {}) });
    while (this.records.size > 256) this.records.delete(this.records.keys().next().value!);
  };
  get(id: string): ActivitySnapshot | null {
    const value = this.records.get(id);
    if (!value || Date.now() - value.updatedAt > 3600000) return null;
    return { ...value };
  }
}
declare module '@deepseek-ai/cordis' { interface Context { agyActivity: AgyActivity } }
