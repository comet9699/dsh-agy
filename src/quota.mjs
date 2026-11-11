import z from '@deepseek-ai/schemastery';
import {QuotaReader}from'./quota-core.mjs';
import {systemProxy}from'./proxy.js';
export const name='agy-quota';
export const inject=['webServer','connection','agents'];
export const Config=z.object({command:z.string().default(''),args:z.array(z.string()).default([]),proxyUrl:z.string().default(''),useSystemProxy:z.boolean().default(true)});
export function apply(ctx,config){
 ctx.effect(()=>ctx.webServer.register({kind:'exact',path:'/agy-local/activity',handler:async(req,res)=>{
  const write=(status,data)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data));};
  const rejection=ctx.connection.requestRejection(req);if(rejection!==undefined){write(rejection,{status:'forbidden'});return;}
  if(req.method!=='GET'){write(405,{status:'method-not-allowed'});return;}
  const id=new URL(req.url??'/', 'http://dsh.internal').searchParams.get('sessionId');
  if(!id||id.length>512){write(400,{status:'invalid-session'});return;}
  write(200,{activity:ctx.get('agyActivity')?.get(id)??null});
 }}));
 const proxy=config.proxyUrl||(config.useSystemProxy!==false?systemProxy():undefined);
 const env={...process.env,...(proxy?{HTTP_PROXY:proxy,HTTPS_PROXY:proxy,NO_PROXY:'127.0.0.1,localhost,::1'}:{})};
 for(const key of Object.keys(env))if(/^ANTIGRAVITY_(AGENT|CONVERSATION_ID|LS_ADDRESS|CSRF_TOKEN|TRAJECTORY_ID|SOURCE_METADATA|CLI_ALIAS)$/.test(key))delete env[key];
 const reader=new QuotaReader({command:config.command,args:config.args,env,busy:()=>ctx.agents.roots().some(a=>a.status==='running')});
 ctx.on('session/event',(_session,event)=>{if(event.type==='turn/start')reader.interrupt();});
 ctx.effect(()=>()=>reader.dispose());
 ctx.effect(()=>ctx.webServer.register({kind:'exact',path:'/agy-local/quota',handler:async(req,res)=>{
  const write=(status,data)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data));};
  const rejection=ctx.connection.requestRejection(req);if(rejection!==undefined){write(rejection,{status:'forbidden'});return;}
  if(req.method!=='GET'){write(405,{status:'method-not-allowed'});return;}
  const force=new URL(req.url??'/', 'http://dsh.internal').searchParams.get('refresh')==='1';
  try{write(200,await reader.get(force));}catch{write(200,{status:'unavailable',groups:[],stale:true,message:'额度暂不可用，请稍后重试。'});}
 }}));
}
