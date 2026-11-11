/** One visible-session poller; no prompt content and no polling for DeepSeek/background tabs. */
export function createActivityClient(ctx,onChange,{fetcher=globalThis.fetch,doc=globalThis.document,interval=1500}={}){
 let selected=null,value=null,timer=null,flight=null,disposed=false,generation=0,lastRunning=false;const listeners=new Set();
 const publish=next=>{if(JSON.stringify(value)===JSON.stringify(next))return;value=next;onChange(next);listeners.forEach(fn=>fn());};
 const running=()=>!!selected&&ctx.sessions.list.getSnapshot().byId[selected]?.running===true;
 const schedule=()=>{clearTimeout(timer);if(!disposed&&selected&&running()&&doc.visibilityState!=='hidden')timer=setTimeout(()=>void refresh(),interval);};
 const refresh=async()=>{
  if(disposed||!selected||doc.visibilityState==='hidden')return null;if(flight)return flight.promise;
  const id=selected,token=generation,controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),5000);
  const promise=(async()=>{try{const base=new URL(doc.baseURI);base.search='';base.hash='';if(!base.pathname.endsWith('/'))base.pathname+='/';const url=new URL('agy-local/activity',base);url.searchParams.set('sessionId',id);const response=await fetcher(url,{credentials:'same-origin',signal:controller.signal});if(!response.ok)throw Error('Status unavailable');const data=(await response.json()).activity;const next=data&&data.sessionId===id?{sessionId:id,turn:data.turn,stage:data.stage,failureCode:data.failureCode}:null;if(!disposed&&generation===token){publish(next);return next;}return null;}catch{if(!disposed&&generation===token)publish(null);return null;}finally{clearTimeout(timeout);if(flight?.controller===controller)flight=null;if(generation===token)schedule();}})();flight={controller,promise};return promise;
 };
 const select=id=>{if(selected===id)return;generation++;selected=id;flight?.controller.abort();flight=null;clearTimeout(timer);publish(null);lastRunning=running();if(selected)void refresh();};
 const sync=()=>{const next=running();if(next!==lastRunning){lastRunning=next;void refresh();}};
 const stop=ctx.sessions.list.subscribe(sync),visible=()=>{if(doc.visibilityState==='hidden'){clearTimeout(timer);flight?.controller.abort();}else if(selected)void refresh();};doc.addEventListener('visibilitychange',visible);
 return{select,refresh,getSelectedId:()=>selected,getSnapshot:()=>value,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},dispose:()=>{disposed=true;generation++;clearTimeout(timer);flight?.controller.abort();stop();doc.removeEventListener('visibilitychange',visible);listeners.clear();}};
}
