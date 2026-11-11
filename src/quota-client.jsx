import React,{useEffect,useRef,useState}from'react';
import{createPortal}from'react-dom';
import{observeQuotaVisibility}from'./quota-visibility.mjs';
import{installRunningBrand}from'./running-brand.mjs';
import{createActivityClient}from'./activity-client.mjs';
import{installRecovery}from'./recovery-client.jsx';
export const inject=['slots','sidebarRight','modelDirectories','sessions','remote','remote.session'];
const css=`.agy-quota-button{border:0;background:transparent;color:inherit;display:flex;align-items:center;gap:7px;padding:8px 10px;border-radius:9px;cursor:pointer;font:inherit;font-size:13px}.agy-quota-button:hover{background:rgba(128,128,128,.1)}.agy-quota-card{position:fixed;left:16px;bottom:64px;width:min(330px,calc(100vw - 32px));max-height:min(650px,75vh);overflow:auto;padding:18px;background:var(--background,#fff);color:var(--foreground,#252932);border:1px solid rgba(128,128,128,.2);border-radius:16px;box-shadow:0 12px 45px rgba(0,0,0,.13);z-index:10000;font-size:13px;font-family:inherit}.agy-quota-card header{display:flex;align-items:center;justify-content:space-between;font-size:15px;font-weight:600}.agy-quota-card button{border:0;border-radius:7px;padding:5px 8px;background:transparent;color:inherit;cursor:pointer}.agy-quota-card button:hover{background:rgba(128,128,128,.1)}.agy-quota-group{margin-top:18px}.agy-quota-row{display:flex;justify-content:space-between;gap:12px;margin:12px 0 6px}.agy-quota-track{height:5px;border-radius:5px;background:rgba(128,128,128,.16);overflow:hidden}.agy-quota-bar{height:100%;border-radius:5px;background:linear-gradient(90deg,#5689ed,#56b5cf)}.agy-quota-note{font-size:11px;opacity:.62;line-height:1.6;margin-top:5px}.agy-quota-icon{font-size:20px;background:linear-gradient(135deg,#4285f4,#a76cdd,#5abec5);background-clip:text;-webkit-text-fill-color:transparent}`;
const title=name=>/weekly/i.test(name)?'每周额度':/five.*hour/i.test(name)?'5 小时额度':name;
const groupTitle=name=>name==='Gemini Models'?'Gemini 通用额度':name==='Claude and GPT models'?'Claude / GPT':name;
const percent=value=>typeof value==='number'?Math.round(value*100)+'%':'未知';
const time=value=>{try{return new Date(value).toLocaleString();}catch{return '未知';}};
function Footer({wide=true,openSettings}){
 const[data,setData]=useState(null),[open,setOpen]=useState(false),[loading,setLoading]=useState(false);const root=useRef(null),popup=useRef(null),active=useRef(null),mounted=useRef(true);
 const refresh=async(force=false)=>{
  if(active.current)return;const controller=new AbortController();active.current=controller;setLoading(true);
  const timer=setTimeout(()=>controller.abort(),25000);
  try{const base=new URL(document.baseURI);base.search='';base.hash='';if(!base.pathname.endsWith('/'))base.pathname+='/';
   const url=new URL('agy-local/quota'+(force?'?refresh=1':''),base);
   const response=await fetch(url,{signal:controller.signal,credentials:'same-origin'});if(!response.ok)throw Error('quota unavailable');
   const next=await response.json();if(!next||!Array.isArray(next.groups))throw Error('invalid quota');if(mounted.current&&active.current===controller)setData(next);
  }catch{if(mounted.current&&active.current===controller)setData(previous=>({...previous,status:previous?.groups?.length?'ok':'unavailable',groups:previous?.groups??[],stale:true,message:'额度暂未更新，请稍后重试。'}));}
  finally{clearTimeout(timer);if(active.current===controller){active.current=null;if(mounted.current)setLoading(false);}}
 };
 useEffect(()=>{mounted.current=true;void refresh();const timer=setInterval(()=>{if(document.visibilityState!=='hidden')void refresh();},120000);return()=>{mounted.current=false;clearInterval(timer);active.current?.abort();active.current=null;};},[]);
 useEffect(()=>{if(!open)return;const close=e=>{if(!root.current?.contains(e.target)&&!popup.current?.contains(e.target))setOpen(false);};const escape=e=>{if(e.key==='Escape')setOpen(false);};document.addEventListener('pointerdown',close);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',escape);};},[open]);
 const primary=data?.groups?.find(g=>g.name==='Gemini Models')?.buckets?.[0];
 return <div ref={root} style={{width:'100%'}}><style>{css}</style><button className="agy-quota-button" style={{width:'100%',textAlign:'left',padding:'10px 12px'}} title="查看 agy 真实剩余额度" aria-label="Agy 额度" aria-expanded={open} onClick={()=>setOpen(!open)}><span className="agy-quota-icon" style={{fontSize:26}}>✦</span>{wide&&<span style={{display:'grid',gap:3}}><span>{data?.status==='ok'?'已连接 Agy':'Agy'}</span><span style={{fontSize:11,opacity:.65}}>Gemini 额度 {primary?percent(primary.remainingFraction):loading?'查询中':'暂不可用'}</span></span>}</button>
  {open&&createPortal(<section ref={popup} className="agy-quota-card" role="dialog" aria-label="Agy 额度详情"><header><span>Agy 额度</span><span><button disabled={loading} onClick={()=>void refresh(true)} aria-label="刷新额度">{loading?'查询中':'刷新'}</button><button onClick={()=>setOpen(false)} aria-label="关闭额度详情">×</button></span></header>
   {data?.groups?.map((group,index)=><div key={index} className="agy-quota-group"><strong>{groupTitle(group.name)}</strong>{group.buckets.map((bucket,i)=><div key={i}><div className="agy-quota-row"><span>{title(bucket.name)}</span><span>{percent(bucket.remainingFraction)} 剩余</span></div>{typeof bucket.remainingFraction==='number'&&<div className="agy-quota-track"><div className="agy-quota-bar" style={{width:Math.round(bucket.remainingFraction*100)+'%'}}/></div>}{bucket.resetTime&&<div className="agy-quota-note">重置于 {time(bucket.resetTime)}</div>}</div>)}</div>)}
   {!data?.groups?.length&&<p>{loading?'正在查询 agy 额度…':data?.message??'尚未取得额度数据'}</p>}
   {data?.stale&&data.groups?.length>0&&<p className="agy-quota-note">{data.message??'显示上次数据'}</p>}
   {data?.fetchedAt&&<div className="agy-quota-note">更新于 {time(data.fetchedAt)}</div>}
   {openSettings&&<button style={{marginTop:12,width:'100%',textAlign:'left'}} onClick={()=>{setOpen(false);openSettings();}}>设置</button>}
  </section>,document.body)}
 </div>;
}
export function apply(ctx){ctx.effect(()=>ctx.slots.inject('settings.launcher',()=>{
 const runningBrand=installRunningBrand(document);
 const activity=createActivityClient(ctx,snapshot=>runningBrand.setProgress(snapshot));
 const recovery=installRecovery(ctx,activity);
 let remove=null;
 const stop=observeQuotaVisibility(ctx,visible=>{
  runningBrand.setActive(visible);
  activity.select(visible?ctx.sidebarRight.mounted.getSnapshot():null);
  if(visible){remove??=ctx.slots.register({name:'settings.launcher',id:'agy-local-account',priority:-100},Footer);}
  else{remove?.();remove=null;}
 });
 return()=>{stop();remove?.();recovery?.();activity.dispose();runningBrand.dispose();};
}));}
