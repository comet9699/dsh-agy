import{describe,it,expect,vi}from'vitest';
// The runtime module is JavaScript to keep its host and browser builds independent.
// @ts-expect-error No generated declarations for the private implementation.
import{parseQuota,quotaArgs,QuotaReader}from'../src/quota-core.mjs';
const output=JSON.stringify({command:{data:{email:'private@example.invalid',groups:[{name:'Gemini Models',buckets:[{name:'Weekly',remaining_fraction:0.92,reset_time:'2026-11-05T12:00:00Z'}]}]}}});
describe('agy quota',()=>{
 it('exposes only quota data and never account identity',()=>{const result=parseQuota(output);expect(result.groups[0].buckets[0].remainingFraction).toBe(.92);expect(JSON.stringify(result)).not.toContain('private@');});
 it('does not fabricate zero for missing quota',()=>{expect(parseQuota(output.replace('"remaining_fraction":0.92,','')).groups[0].buckets[0].remainingFraction).toBeNull();expect(()=>parseQuota('{}')).toThrow();});
 it('does not forward ACP-only flags to the CLI',()=>{expect(quotaArgs(['acp','--gemini_dir','C:/账户','--app_data_dir=x','--disable-telemetry'])).toEqual(['--gemini_dir=C:/账户','--app_data_dir=x','--output-format','json','-p=/usage']);});
 it('deduplicates reads and uses cached data',async()=>{const run=vi.fn(async()=>output),reader=new QuotaReader({run,clock:()=>100000,busy:()=>false});const [a,b]=await Promise.all([reader.get(),reader.get()]);expect(a).toEqual(b);await reader.get();expect(run).toHaveBeenCalledTimes(1);await reader.dispose();});
 it('skips active turns and preserves cached values as stale on failures',async()=>{let busy=false,now=100000;const run=vi.fn(async()=>output),reader=new QuotaReader({run,clock:()=>now,busy:()=>busy});await reader.get();busy=true;expect((await reader.get(true)).stale).toBe(true);expect(run).toHaveBeenCalledTimes(1);busy=false;now+=70000;run.mockRejectedValueOnce(Error('sensitive diagnostic'));const result=await reader.get();expect(result.groups[0].buckets[0].remainingFraction).toBe(.92);expect(result.stale).toBe(true);expect(JSON.stringify(result)).not.toContain('sensitive');await reader.dispose();});
 it('aborts only its own quota process and never caches cancelled output',async()=>{const run=vi.fn((signal:AbortSignal)=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('cancelled')))));const reader=new QuotaReader({run,busy:()=>false,clock:()=>100000});const promise=reader.get();reader.interrupt();expect((await promise).status).toBe('unavailable');await reader.dispose();});
});
