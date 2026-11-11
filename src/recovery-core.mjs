export const CONTINUE_MESSAGE='上一轮因连接或等待超时中断。请先根据已有对话、工具结果和当前状态核对哪些工作已经完成，再继续原任务中尚未完成的部分。不要直接重复已经成功的写文件、命令、提交或其他外部操作；无法确定是否完成时，先检查再决定。';
export const isAgy=provider=>provider==='agy-local-acp'||provider==='antigravity-acp';
export const recoverable=state=>state?.stage==='failed'&&['ACP_TIMEOUT','ACP_DISCONNECTED'].includes(state.failureCode);
export function flashSelection(directory){
 const current=directory.current;
 for(const group of directory.groups??[])if(group.id===current?.provider){
  const model=group.models.find(m=>/^gemini.*flash/i.test(m.id)||/^gemini.*flash/i.test(m.name));
  if(!model)continue;
  const efforts=model.reasoning?.efforts??[],effort=efforts.some(e=>e.id===current.reasoningEffort)?current.reasoningEffort:efforts.some(e=>e.id==='low')?'low':model.reasoning?.defaultEffort;
  return{provider:group.id,model:model.id,...effort?{reasoningEffort:effort}:{}};
 }
 throw Error('当前 Agy 目录没有可用的 Flash，请从原有模型选择器选择。');
}
/** User-clicked continuation through official session/model APIs; never replays tool calls. */
export function createRecoveryAction(ctx,activity){
 const pending=new Set(),accepted=new Set();
 return async(sessionId,turn,flash=false)=>{
  const key=sessionId+':'+turn;if(pending.has(sessionId)||accepted.has(key))throw Error('该恢复请求已提交或正在提交。');pending.add(sessionId);
  try{
   if(activity.getSelectedId()!==sessionId)throw Error('当前会话已改变，请重新选择。');
   const status=await activity.refresh();if(!recoverable(status)||status.turn!==turn||status.sessionId!==sessionId)throw Error('本轮状态已改变，请查看当前任务。');
   return await ctx.sessions.using(sessionId,{source:'controllerOperation'},async({binding})=>{
    const session=binding.session,check=()=>{const s=session.getSnapshot();if(s.running||s.removed||s.pendingSubmissions.length||s.awaitingFirstTurn)throw Error('当前会话已有任务，请等待完成。');if(activity.getSelectedId()!==sessionId)throw Error('当前会话已改变。');};check();
    const directory=ctx.modelDirectories.directoryFor(sessionId);if(!isAgy(directory.store.getSnapshot().current?.provider))throw Error('请在 Agy 会话中使用此操作。');
    if(flash){const selection=flashSelection(await directory.load());const result=await directory.select(selection);if(!result.ok)throw Error(result.error.message||'模型切换未成功，尚未继续任务。');}
    check();if(!isAgy(directory.store.getSnapshot().current?.provider))throw Error('模型选择已改变，尚未继续任务。');
    const submission=session.beginSubmission({mode:'queue',text:CONTINUE_MESSAGE,attachments:[]});
    accepted.add(key);while(accepted.size>128)accepted.delete(accepted.values().next().value);
    try{const result=await session.prompt([{type:'text',text:CONTINUE_MESSAGE}],'queue',undefined,submission.requestId);if(!result.ok)throw Error(result.error.message||'继续请求未被接受，请先查看会话状态。');return true;}catch(error){submission.abandon();throw Error('继续请求结果尚未确认，请先查看会话状态，避免重复提交。');}
   });
  }finally{pending.delete(sessionId);}
 };
}
