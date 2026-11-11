import React,{useState,useSyncExternalStore}from'react';
import{createRecoveryAction,isAgy,recoverable}from'./recovery-core.mjs';
export function RecoveryTail({turn,sessionId,activity,recover,useAgyModel}){
 const status=useSyncExternalStore(activity.subscribe,activity.getSnapshot),provider=useAgyModel(s=>(s.pending??s.current)?.provider),[busy,setBusy]=useState(false),[sent,setSent]=useState(false),[error,setError]=useState('');
 if(!isAgy(provider)||!recoverable(status)||status.sessionId!==sessionId||status.turn!==turn.turn||!turn.end||sent)return null;
 const act=async flash=>{if(busy)return;setBusy(true);setError('');try{await recover(sessionId,turn.turn,flash);setSent(true);}catch(e){setError(e.message);}finally{setBusy(false);}};
 return <section aria-label="Agy 任务恢复" style={{fontSize:12,lineHeight:1.6,color:'inherit',padding:'8px 0'}}><div style={{opacity:.75}}>本轮等待已中断，对话仍保留。继续时会先核对已有操作。</div><div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:7}}>{[[false,'继续任务'],[true,'切换 Flash 后继续']].map(([flash,label])=><button key={label} disabled={busy} onClick={()=>void act(flash)} style={{font:'inherit',color:'inherit',background:'transparent',border:'1px solid rgba(128,128,128,.25)',borderRadius:8,padding:'5px 10px',cursor:busy?'wait':'pointer'}}>{busy?'处理中…':label}</button>)}</div>{error&&<div role="alert" style={{marginTop:6,color:'#b54c36'}}>{error}</div>}</section>;
}
export function installRecovery(ctx,activity){const recover=createRecoveryAction(ctx,activity);return ctx.slots.inject('conversation.chat.turnTail',()=>ctx.slots.register({name:'conversation.chat.turnTail',id:'agy-local-recovery',inject:sessionId=>({sessionId,activity,recover,hooks:{agyModel:ctx.modelDirectories.directoryFor(sessionId).store}})},RecoveryTail));}
