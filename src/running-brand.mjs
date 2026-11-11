/** Render a vector Agy mark while retaining the official turn clock as the time source. */
export function workingLabel(text){
 let seconds=0,found=false;
 for(const match of text.matchAll(/(\d+)\s*(小时|分钟|分|秒|hours?|minutes?|seconds?|hrs?|mins?|secs?|h|m|s)/giu)){
  const unit=match[2].toLowerCase();seconds+=Number(match[1])*(/小时|^h/.test(unit)?3600:/分|^m/.test(unit)?60:1);found=true;
 }
 if(!found)return 'Working…';
 const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60;
 return 'Working for '+[h?`${h}h`:'',m?`${m}m`:'',s||(!h&&!m)?`${s}s`:''].filter(Boolean).join(' ');
}
export function phaseLabel(state){return({'preparing':'整理上下文','connecting':'连接 Agy','opening-session':'准备会话','selecting-model':'选择模型','waiting-model':'等待模型','responding':'模型处理中','waiting-tool':'等待工具结果'})[state?.stage]??'';}
export function installRunningBrand(doc){
 const style=doc.createElement('style');style.textContent=`[data-agy-running-brand]{display:none}html[data-agy-provider-active] [data-agy-running-original]{display:none!important}html[data-agy-provider-active] [data-agy-running-brand]{display:inline-flex;align-items:center;gap:9px;font-size:14px} [data-agy-running-brand] svg{width:24px;height:24px;flex:none;animation:agy-working-breathe 2.8s ease-in-out infinite;transform-origin:center}@keyframes agy-working-breathe{0%,100%{opacity:.65;transform:scale(.92)}50%{opacity:1;transform:scale(1.06)}}@media(prefers-reduced-motion:reduce){[data-agy-running-brand] svg{animation:none}}`;
 doc.head.append(style);let id=0,progress=null;const rows=new Map(),syncs=new Set();
 const attach=row=>{
  if(rows.has(row))return;
  const original=row.lastElementChild;if(!original||original.hasAttribute('data-agy-running-brand'))return;
  const wrapper=doc.createElement('span');wrapper.setAttribute('data-agy-running-brand','');
  const gradient='agy-working-'+(++id);
  wrapper.innerHTML=`<svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><defs><linearGradient id="${gradient}" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse"><stop stop-color="#26C485"/><stop offset=".38" stop-color="#35A8F5"/><stop offset=".65" stop-color="#7B61FF"/><stop offset=".84" stop-color="#F36BA8"/><stop offset="1" stop-color="#FFAF53"/></linearGradient></defs><path d="M12 2C12.55 7.2 16.8 11.45 22 12C16.8 12.55 12.55 16.8 12 22C11.45 16.8 7.2 12.55 2 12C7.2 11.45 11.45 7.2 12 2Z" fill="url(#${gradient})"/></svg>`;
  const label=doc.createElement('span');wrapper.append(label);original.setAttribute('data-agy-running-original','');row.append(wrapper);
  const sync=()=>{const phase=phaseLabel(progress),value=workingLabel(original.textContent??'')+(phase?' · '+phase:'');if(label.textContent!==value)label.textContent=value;wrapper.title=progress?.stage==='waiting-model'?'正在等待 Agy 返回模型内容；可以使用原有停止按钮中断。':'';};
  const observer=new doc.defaultView.MutationObserver(sync);observer.observe(original,{childList:true,subtree:true,characterData:true});sync();
  syncs.add(sync);rows.set(row,()=>{syncs.delete(sync);observer.disconnect();wrapper.remove();original.removeAttribute('data-agy-running-original');});
 };
 doc.querySelectorAll('[data-chat-running]').forEach(attach);
 const observer=new doc.defaultView.MutationObserver(records=>{
  for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1){if(node.matches('[data-chat-running]'))attach(node);node.querySelectorAll('[data-chat-running]').forEach(attach);}
  for(const[row,remove]of rows)if(!row.isConnected){remove();rows.delete(row);}
 });
 observer.observe(doc.body,{childList:true,subtree:true});
 return {setActive:value=>{doc.documentElement.toggleAttribute('data-agy-provider-active',value);},setProgress:value=>{progress=value;syncs.forEach(sync=>sync());},dispose:()=>{observer.disconnect();rows.forEach(remove=>remove());rows.clear();syncs.clear();style.remove();doc.documentElement.removeAttribute('data-agy-provider-active');}};
}
