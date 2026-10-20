import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 4173);
const DATA_DIR = path.resolve(ROOT, process.env.DATA_DIR || '.data');
const DB_FILE = path.join(DATA_DIR, 'store.json');
const SESSION_SECRET = process.env.SESSION_SECRET || 'local-development-only-change-me';
const MIME = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml' };
const seed = () => ({ users: [], sessions: {}, posts: [], comments: [], messages: [], communities: [{id:'community-creators',name:'Creator Corner',description:'Share your work, ask questions, and collaborate.',members:0}], communityMembers: [], rooms: [], follows: [] });
let store;
await mkdir(DATA_DIR, { recursive: true });
if (existsSync(DB_FILE)) { try { store = JSON.parse(await readFile(DB_FILE, 'utf8')); } catch { store = seed(); } } else store = seed();
const persist = async () => writeFile(DB_FILE, JSON.stringify(store, null, 2), { mode: 0o600 });
const json = (res, status, value) => { res.writeHead(status, {'content-type':MIME['.json'],'cache-control':'no-store','x-content-type-options':'nosniff'}); res.end(JSON.stringify(value)); };
const safeUser = u => ({ id:u.id, name:u.name, username:u.username, bio:u.bio || '', avatar:u.avatar || '', createdAt:u.createdAt });
const parseCookies = s => Object.fromEntries((s || '').split(';').map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf('=');return [x.slice(0,i), decodeURIComponent(x.slice(i+1))]}));
async function body(req) { let raw=''; for await (const chunk of req) { raw += chunk; if (raw.length > 1_000_000) throw Object.assign(new Error('Request too large'),{status:413}); } try { return raw ? JSON.parse(raw) : {}; } catch { throw Object.assign(new Error('Invalid JSON body'),{status:400}); } }
function currentUser(req) { const sid=parseCookies(req.headers.cookie).orbit_session; const uid=sid && store.sessions[sid]; return store.users.find(u=>u.id===uid) || null; }
const requireUser = u => { if (!u) throw Object.assign(new Error('Sign in to continue'),{status:401}); return u; };
const cleanText = (v,max=500) => String(v ?? '').trim().slice(0,max);
function passwordHash(password, salt=randomBytes(16).toString('hex')) { return `${salt}:${scryptSync(password,salt,64).toString('hex')}`; }
function verifyPassword(password, stored) { const [salt, hash] = (stored || '').split(':'); if (!salt || !hash) return false; const actual=scryptSync(password,salt,64); const expected=Buffer.from(hash,'hex'); return actual.length===expected.length && timingSafeEqual(actual,expected); }
async function api(req,res,url) {
 const user=currentUser(req); const method=req.method; const p=url.pathname;
 if (method==='GET' && p==='/api/health') return json(res,200,{ok:true,service:'Orbit API',version:'0.1.0'});
 if (method==='POST' && p==='/api/auth/register') {
  const b=await body(req), name=cleanText(b.name,70), username=cleanText(b.username,24).toLowerCase().replace(/[^a-z0-9_]/g,''), password=String(b.password||'');
  if(name.length<2 || username.length<3 || password.length<10) return json(res,400,{error:'Use a name (2+ characters), username (3+ letters/numbers/underscores), and password (10+ characters).'});
  if(store.users.some(u=>u.username===username)) return json(res,409,{error:'That username is already taken.'});
  const u={id:randomUUID(),name,username,passwordHash:passwordHash(password),bio:'',avatar:'',createdAt:new Date().toISOString()}; store.users.push(u); const sid=randomBytes(32).toString('hex'); store.sessions[sid]=u.id; await persist(); res.setHeader('Set-Cookie',`orbit_session=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${process.env.NODE_ENV==='production'?'; Secure':''}`); return json(res,201,{user:safeUser(u)});
 }
 if (method==='POST' && p==='/api/auth/login') {
  const b=await body(req), username=cleanText(b.username,24).toLowerCase(), u=store.users.find(x=>x.username===username);
  if(!u || !verifyPassword(String(b.password||''),u.passwordHash)) return json(res,401,{error:'Username or password is incorrect.'});
  const sid=randomBytes(32).toString('hex'); store.sessions[sid]=u.id; await persist(); res.setHeader('Set-Cookie',`orbit_session=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${process.env.NODE_ENV==='production'?'; Secure':''}`); return json(res,200,{user:safeUser(u)});
 }
 if (method==='POST' && p==='/api/auth/logout') { const sid=parseCookies(req.headers.cookie).orbit_session; if(sid) delete store.sessions[sid]; await persist(); res.setHeader('Set-Cookie','orbit_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'); return json(res,200,{ok:true}); }
 if (method==='GET' && p==='/api/me') return json(res,200,{user:user?safeUser(user):null});
 if (method==='GET' && p==='/api/feed') { const posts=[...store.posts].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,100).map(x=>({...x,author: safeUser(store.users.find(u=>u.id===x.userId)||{id:'unknown',name:'Former member',username:'unknown'}),likedByMe:!!user&&x.likes.includes(user.id),likes:x.likes.length,comments:store.comments.filter(c=>c.postId===x.id).map(c=>({...c,author:safeUser(store.users.find(u=>u.id===c.userId)||{id:'unknown',name:'Former member',username:'unknown'})}))})); return json(res,200,{posts}); }
 if (method==='POST' && p==='/api/posts') { const u=requireUser(user), b=await body(req), text=cleanText(b.text,2000); if(!text) return json(res,400,{error:'Write something before posting.'}); const post={id:randomUUID(),userId:u.id,text,createdAt:new Date().toISOString(),likes:[]}; store.posts.push(post); await persist(); return json(res,201,{post:{...post,author:safeUser(u),likedByMe:false,likes:0,comments:[]}}); }
 let m=p.match(/^\/api\/posts\/([^/]+)\/like$/); if(method==='POST'&&m){const u=requireUser(user),post=store.posts.find(x=>x.id===m[1]);if(!post)return json(res,404,{error:'Post not found'});post.likes ||= [];const i=post.likes.indexOf(u.id);if(i<0)post.likes.push(u.id);else post.likes.splice(i,1);await persist();return json(res,200,{liked:i<0,likes:post.likes.length});}
 m=p.match(/^\/api\/posts\/([^/]+)\/comments$/); if(method==='POST'&&m){const u=requireUser(user),b=await body(req),text=cleanText(b.text,800);if(!store.posts.some(x=>x.id===m[1]))return json(res,404,{error:'Post not found'});if(!text)return json(res,400,{error:'Comment cannot be empty'});const c={id:randomUUID(),postId:m[1],userId:u.id,text,createdAt:new Date().toISOString()};store.comments.push(c);await persist();return json(res,201,{comment:{...c,author:safeUser(u)}});}
 if(method==='GET'&&p==='/api/communities')return json(res,200,{communities:store.communities.map(c=>({...c,members:store.communityMembers.filter(m=>m.communityId===c.id).length,joined:!!user&&store.communityMembers.some(m=>m.communityId===c.id&&m.userId===user.id)}))});
 if(method==='POST'&&p==='/api/communities'){const u=requireUser(user),b=await body(req),name=cleanText(b.name,80),description=cleanText(b.description,300);if(name.length<3)return json(res,400,{error:'Community name must be at least 3 characters.'});const c={id:randomUUID(),name,description,createdBy:u.id};store.communities.push(c);store.communityMembers.push({communityId:c.id,userId:u.id});await persist();return json(res,201,{community:c});}
 m=p.match(/^\/api\/communities\/([^/]+)\/join$/);if(method==='POST'&&m){const u=requireUser(user),c=store.communities.find(x=>x.id===m[1]);if(!c)return json(res,404,{error:'Community not found'});const i=store.communityMembers.findIndex(x=>x.communityId===c.id&&x.userId===u.id);if(i<0)store.communityMembers.push({communityId:c.id,userId:u.id});else store.communityMembers.splice(i,1);await persist();return json(res,200,{joined:i<0});}
 if(method==='GET'&&p==='/api/messages'){const u=requireUser(user);const messages=store.messages.filter(x=>x.fromId===u.id||x.toId===u.id).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).slice(-200).map(x=>({...x,from:safeUser(store.users.find(a=>a.id===x.fromId)||{id:'x',name:'Unknown',username:'unknown'}),to:safeUser(store.users.find(a=>a.id===x.toId)||{id:'x',name:'Unknown',username:'unknown'})}));return json(res,200,{messages,people:store.users.filter(x=>x.id!==u.id).map(safeUser)});}
 if(method==='POST'&&p==='/api/messages'){const u=requireUser(user),b=await body(req),to=store.users.find(x=>x.username===cleanText(b.to,24).toLowerCase()),text=cleanText(b.text,2000);if(!to)return json(res,404,{error:'Recipient username was not found.'});if(!text)return json(res,400,{error:'Message cannot be empty.'});const msg={id:randomUUID(),fromId:u.id,toId:to.id,text,createdAt:new Date().toISOString()};store.messages.push(msg);await persist();return json(res,201,{message:msg});}
 if(method==='GET'&&p==='/api/live/rooms')return json(res,200,{rooms:store.rooms.filter(x=>x.status==='live').map(x=>({...x,host:safeUser(store.users.find(u=>u.id===x.hostId)||{id:'x',name:'Unknown',username:'unknown'})}))});
 if(method==='POST'&&p==='/api/live/rooms'){const u=requireUser(user),b=await body(req),title=cleanText(b.title,120),mode=['video','audio','screen'].includes(b.mode)?b.mode:'video';if(title.length<2)return json(res,400,{error:'Add a stream title.'});const room={id:randomUUID(),hostId:u.id,title,mode,status:'live',createdAt:new Date().toISOString(),notice:'Room created. Connect a configured media provider to publish real audio/video.'};store.rooms.push(room);await persist();return json(res,201,{room});}
 m=p.match(/^\/api\/live\/rooms\/([^/]+)\/end$/);if(method==='POST'&&m){const u=requireUser(user),r=store.rooms.find(x=>x.id===m[1]);if(!r)return json(res,404,{error:'Room not found'});if(r.hostId!==u.id)return json(res,403,{error:'Only the host can end this room.'});r.status='ended';r.endedAt=new Date().toISOString();await persist();return json(res,200,{ok:true});}
 return json(res,404,{error:'API route not found'});
}
const server=http.createServer(async(req,res)=>{const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);try{if(url.pathname.startsWith('/api/'))return await api(req,res,url);if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end('Method not allowed');}let pathname=decodeURIComponent(url.pathname);if(pathname==='/')pathname='/index.html';const target=path.resolve(ROOT,'public',`.${pathname}`);if(!target.startsWith(path.resolve(ROOT,'public')+path.sep)){res.writeHead(403);return res.end('Forbidden');}let data;try{data=await readFile(target);}catch{return json(res,404,{error:'Not found'});}res.writeHead(200,{'content-type':MIME[path.extname(target)]||'application/octet-stream','x-content-type-options':'nosniff','cache-control':path.extname(target)==='.html'?'no-cache':'public, max-age=300'});if(req.method==='HEAD')return res.end();res.end(data);}catch(e){json(res,e.status||500,{error:e.status?e.message:'Unexpected server error'});}});
server.listen(PORT,'0.0.0.0',()=>console.log(`Orbit is running at http://localhost:${PORT}`));
