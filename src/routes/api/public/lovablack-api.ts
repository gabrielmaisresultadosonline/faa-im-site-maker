import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const Input=z.object({action:z.literal('login'),email:z.string().email(),password:z.string().min(1),session_id:z.string().optional()});
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type, authorization','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});

export const Route=createFileRoute('/api/public/lovablack-api')({server:{handlers:{
  OPTIONS:async()=>new Response(null,{status:204,headers}),
  POST:async({request})=>{ try{
    const parsed=Input.safeParse(await request.json()); if(!parsed.success)return json({success:false,error:'Invalid request'},400);
    const {query,transaction}=await import('@/lib/db.server'); const {verifyPassword,newToken,hashToken}=await import('@/lib/session.server');
    const rows=await query<{id:string;email:string;password_hash:string;access_password:string;full_name:string;language:string;blocked:boolean;custom_message:string;session_id:string|null}>(`SELECT id,email,password_hash,access_password,full_name,language,blocked,custom_message,session_id FROM users WHERE email=lower($1)`,[parsed.data.email]); const user=rows[0];
    if(!user||(!(await verifyPassword(parsed.data.password,user.password_hash))&&parsed.data.password!==user.access_password))return json({success:false,error:'Credenciais inválidas'},401);
    if(user.blocked)return json({success:false,code:'BLOCKED',user:{blocked:true,custom_message:user.custom_message}},403);
    const settings=Object.fromEntries((await query<{key:string;value:unknown}>('SELECT key,value FROM app_settings')).map(v=>[v.key,v.value]));
    if(settings['multi_login_block']===true&&parsed.data.session_id&&user.session_id&&user.session_id!==parsed.data.session_id)return json({success:false,code:'MULTI_LOGIN',error:'Session already in use'},403);
    const sub=(await query<{type:string;status:string;expires_at:string|null}>('SELECT type,status,expires_at FROM subscriptions WHERE user_id=$1',[user.id]))[0]??null;
    const active=!!sub&&sub.status==='active'&&(sub.type==='lifetime'||!sub.expires_at||new Date(sub.expires_at).getTime()+300000>Date.now());
    const extensionToken=newToken(); await transaction(async(client)=>{ await client.query('UPDATE users SET session_id=coalesce(session_id,$2),last_login_at=now(),last_heartbeat_at=now() WHERE id=$1',[user.id,parsed.data.session_id??null]); await client.query("INSERT INTO extension_sessions(user_id,token_hash,device_id,expires_at) VALUES($1,$2,$3,now()+interval '90 days')",[user.id,hashToken(extensionToken),parsed.data.session_id??null]); });
    return json({success:true,token:extensionToken,user:{name:user.full_name,email:user.email,language:user.language,plan:sub?.type??null,expires_at:sub?.expires_at??null,is_active:active,is_expired:!active,blocked:false,custom_message:user.custom_message,global_announcement:settings['global_announcement']??'',min_version:settings['min_version']??'1.0.0',multi_login_block:settings['multi_login_block']===true,member_area_url:'https://lovblack.online/dashboard'}});
  }catch(error){console.error('[Extension API]',error);return json({success:false,error:'Erro interno no servidor'},500);}
}}}});