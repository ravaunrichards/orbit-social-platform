import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

const port = 45000 + Math.floor(Math.random()*10000);
const dataDir = await mkdtemp(path.join(os.tmpdir(),'orbit-test-'));
const child = spawn(process.execPath,['src/server.js'],{cwd:path.resolve('.'),env:{...process.env,PORT:String(port),DATA_DIR:dataDir,SESSION_SECRET:randomBytes(32).toString('hex')},stdio:'ignore'});
const base=`http://127.0.0.1:${port}`;
async function request(route, options={}) { return fetch(base+route,{...options,headers:{...(options.body?{'content-type':'application/json'}:{}),...(options.headers||{})}}); }
async function waitReady(){for(let i=0;i<50;i++){try{const r=await request('/api/health');if(r.ok)return;}catch{}await delay(100);}throw new Error('server failed to start');}
test('API health, registration, protected posts, likes, and communities',async t=>{t.after(async()=>{child.kill('SIGTERM');await rm(dataDir,{recursive:true,force:true});});await waitReady();let r=await request('/api/health');assert.equal(r.status,200);assert.equal((await r.json()).ok,true);
r=await request('/api/posts',{method:'POST',body:JSON.stringify({text:'should fail'})});assert.equal(r.status,401);
r=await request('/api/auth/register',{method:'POST',body:JSON.stringify({name:'Test User',username:'test_user',password:'strong-password-123'})});assert.equal(r.status,201);const authCookie=r.headers.get('set-cookie').split(';')[0];const me=await (await request('/api/me',{headers:{cookie:authCookie}})).json();assert.equal(me.user.username,'test_user');
r=await request('/api/posts',{method:'POST',headers:{cookie:authCookie},body:JSON.stringify({text:'Hello Orbit'})});assert.equal(r.status,201);const {post}=await r.json();r=await request(`/api/posts/${post.id}/like`,{method:'POST',headers:{cookie:authCookie}});assert.equal((await r.json()).likes,1);
r=await request('/api/communities',{method:'POST',headers:{cookie:authCookie},body:JSON.stringify({name:'Book Club',description:'Readers unite'})});assert.equal(r.status,201);assert.equal((await (await request('/api/communities')).json()).communities.length,2);
});
