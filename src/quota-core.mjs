import {execFile} from 'node:child_process';
export function parseQuota(output){
 const start=output.indexOf('{');if(start<0)throw Error('Invalid quota response');
 const parsed=JSON.parse(output.slice(start)),data=parsed.command?.data??parsed;
 if(!Array.isArray(data.groups))throw Error('Missing quota groups');
 const groups=data.groups.filter(g=>g&&typeof g==='object').map(g=>({name:typeof g.name==='string'?g.name:'Models',buckets:(Array.isArray(g.buckets)?g.buckets:[]).filter(b=>b&&typeof b==='object').map(b=>({
  name:typeof b.name==='string'?b.name:'额度',remainingFraction:typeof b.remaining_fraction==='number'&&Number.isFinite(b.remaining_fraction)&&b.remaining_fraction>=0&&b.remaining_fraction<=1?b.remaining_fraction:null,
  resetTime:typeof b.reset_time==='string'&&Number.isFinite(Date.parse(b.reset_time))?b.reset_time:null,
 }))})).filter(g=>g.buckets.length);
 if(!groups.length)throw Error('Empty quota groups');
 return {groups,fetchedAt:Date.now(),status:'ok',stale:false};
}
export function quotaArgs(acpArgs){
 const result=[];
 for(let i=0;i<acpArgs.length;i++){
  const value=acpArgs[i];
  if(/^--(?:gemini[_-]dir|app[_-]data[_-]dir)=/.test(value))result.push(value);
  else if(/^--(?:gemini[_-]dir|app[_-]data[_-]dir)$/.test(value)&&typeof acpArgs[i+1]==='string')result.push(value+'='+acpArgs[++i]);
 }
 return [...result,'--output-format','json','-p=/usage'];
}
export class QuotaReader{
 constructor({command,args,env,busy=()=>false,run,clock=Date.now}){this.options={command,args,env,busy,run,clock};this.cache=null;this.flight=null;this.controller=null;this.lastAttempt=0;this.disposed=false;}
 async get(force=false){
  const {clock,busy}=this.options,now=clock();
  if(this.disposed)return this.fallback('额度服务已关闭。');
  if(busy())return this.fallback('任务进行中，暂时显示上次额度；空闲后刷新。');
  if(this.flight)return this.flight;
  if(this.cache&&(now-this.cache.fetchedAt<60000&&!force||now-this.lastAttempt<10000))return this.cache;
  if(!this.cache&&now-this.lastAttempt<10000)return this.fallback('请稍后再刷新额度。');
  this.lastAttempt=now;this.controller=new AbortController();
  this.flight=this.read(this.controller.signal).then(result=>{this.cache=result;return result;},()=>this.fallback('额度刷新暂未完成，请稍后重试；必要时检查登录和代理。'));
  try{return await this.flight;}finally{this.flight=null;this.controller=null;}
 }
 fallback(message){return this.cache?{...this.cache,stale:true,message}:{status:'unavailable',groups:[],fetchedAt:null,stale:true,message};}
 async read(signal){
  const {command,args,env,run,clock}=this.options;
  const stdout=run?await run(signal):await new Promise((resolve,reject)=>execFile(command,quotaArgs(args),{windowsHide:true,env,timeout:18000,maxBuffer:1024*1024,signal},(error,stdout)=>error?reject(error):resolve(stdout)));
  if(signal.aborted)throw Error('cancelled');
  const snapshot=parseQuota(stdout);snapshot.fetchedAt=clock();return snapshot;
 }
 interrupt(){this.controller?.abort();}
 async dispose(){this.disposed=true;this.interrupt();await this.flight;}
}
