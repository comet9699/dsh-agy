/** Follow the same per-session model directory as the official model selector. */
export function observeQuotaVisibility(ctx,notify){
 const screen=ctx.sidebarRight?.mounted;
 if(!screen?.subscribe||!screen?.getSnapshot){notify(false);return()=>{};}
 let detach=()=>{};
 const bind=()=>{
  detach();detach=()=>{};
  const id=screen.getSnapshot();
  if(id===undefined){notify(false);return;}
  try{
   const directory=ctx.modelDirectories.directoryFor(id);
   const sync=()=>{const state=directory.store.getSnapshot();const provider=(state.pending??state.current)?.provider;notify(provider==='agy-local-acp'||provider==='antigravity-acp');};
   detach=directory.store.subscribe(sync);sync();
  }catch(error){console.warn('Agy quota selection unavailable:',error.message);notify(false);}
 };
 const off=screen.subscribe(bind);bind();
 return()=>{off();detach();};
}
