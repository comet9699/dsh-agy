import{it,expect}from'vitest';
// @ts-expect-error Private JavaScript module has no public declarations.
import{observeQuotaVisibility}from'../src/quota-visibility.mjs';
function store<T>(value:T){const listeners=new Set<()=>void>();return{getSnapshot:()=>value,subscribe:(fn:()=>void)=>{listeners.add(fn);return()=>listeners.delete(fn);},set:(next:T)=>{value=next;listeners.forEach(fn=>fn());},count:()=>listeners.size};}
it('follows model changes, pending selection, session switches, and disposal',()=>{
 const screen=store<string|undefined>('a');
 const a=store({current:{provider:'agy-local-acp'},pending:null as null|{provider:string}}),b=store({current:{provider:'deepseek-account'},pending:null as null|{provider:string}});
 const ctx={sidebarRight:{mounted:screen},modelDirectories:{directoryFor:(id:string)=>({store:id==='a'?a:b})}};
 const seen:boolean[]=[];const stop=observeQuotaVisibility(ctx,(visible:boolean)=>seen.push(visible));
 expect(seen.at(-1)).toBe(true);
 a.set({current:{provider:'agy-local-acp'},pending:{provider:'deepseek-account'}});expect(seen.at(-1)).toBe(false);
 a.set({current:{provider:'agy-local-acp'},pending:null});expect(seen.at(-1)).toBe(true);
 screen.set('b');expect(seen.at(-1)).toBe(false);expect(a.count()).toBe(0);
 b.set({current:{provider:'agy-local-acp'},pending:null});expect(seen.at(-1)).toBe(true);
 screen.set(undefined);expect(seen.at(-1)).toBe(false);stop();expect(screen.count()).toBe(0);expect(b.count()).toBe(0);
});
it('hides quota while the model is unresolved',()=>{
 const screen=store('empty'),directory=store({current:null,pending:null});const seen:boolean[]=[];
 const stop=observeQuotaVisibility({sidebarRight:{mounted:screen},modelDirectories:{directoryFor:()=>({store:directory})}},(v:boolean)=>seen.push(v));expect(seen).toEqual([false]);stop();
});
it('does not prevent startup when the optional screen carrier is unavailable',()=>{const values:boolean[]=[];const stop=observeQuotaVisibility({},(value:boolean)=>values.push(value));expect(values).toEqual([false]);stop();});
