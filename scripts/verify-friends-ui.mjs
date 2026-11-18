// Isolated UI test. All Supabase requests are intercepted. No real account or database is used.
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(process.argv[2] || 'dist-ui-fixture');
const server=http.createServer((q,r)=>{let file=path.join(root,decodeURI(q.url.split('?')[0])); if(!fs.existsSync(file)||fs.statSync(file).isDirectory()) file=path.join(root,'index.html');r.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html':file.endsWith('.png')?'image/png':'application/octet-stream');r.end(fs.readFileSync(file));});
await new Promise(r=>server.listen(8813,'127.0.0.1',r));
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
const page=await browser.newPage();
const me='00000000-0000-4000-8000-000000000001';
const people=['Ana','Bruno','Carla','Daniel'].map((name,i)=>({id:`00000000-0000-4000-8000-00000000000${i+2}`,username:name.toLowerCase()+'_demo',display_name:name+' (Demonstração)',avatar_url:null}));
let friendships=[{id:'f1',requester_id:people[0].id,addressee_id:me,status:'pending'},{id:'f2',requester_id:me,addressee_id:people[1].id,status:'pending'},{id:'f3',requester_id:me,addressee_id:people[2].id,status:'accepted'}];
const writes=[];
await page.evaluateOnNewDocument(({me})=>{const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:me,exp:Math.floor(Date.now()/1000)+86400}))+'.test';localStorage.setItem('sb-orbit-test-auth-token',JSON.stringify({access_token:token,refresh_token:'isolated-fixture',expires_at:Math.floor(Date.now()/1000)+86400,expires_in:86400,token_type:'bearer',user:{id:me,aud:'authenticated',email:'demo@example.invalid'}}));},{me});
await page.setRequestInterception(true);
page.on('request',async req=>{
 if(!req.url().startsWith('https://orbit-test.supabase.co')) return req.continue();
 const u=new URL(req.url()), method=req.method();let result=[];
 if(method==='OPTIONS') return req.respond({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS'}});
 if(u.pathname.endsWith('/profiles')) result=people;
 if(u.pathname.endsWith('/friendships')){
  if(method==='GET') result=friendships;
  else {const id=u.searchParams.get('id')?.replace('eq.','');const body=JSON.parse(req.postData()||'{}');writes.push({method,id,body});
   if(method==='PATCH') {const f=friendships.find(f=>f.id===id);if(f)f.status=body.status;result={id};}
   if(method==='DELETE'){friendships=friendships.filter(f=>f.id!==id);result={id};}
   if(method==='POST'){friendships.push({id:'new',...body,status:'pending'});result=null;}
  }
 }
 return req.respond({status:result===null?201:200,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},body:JSON.stringify(result)});
});
async function click(label){const handle=await page.evaluateHandle(label=>[...document.querySelectorAll('[role="button"]')].find(e=>e.textContent.trim()===label),label);assert.ok(await handle.evaluate(e=>!!e),label);await handle.evaluate(e=>e.scrollIntoView({block:'center'}));await handle.click();await new Promise(r=>setTimeout(r,300));}
async function text(t){await page.waitForFunction(t=>document.body.innerText.includes(t),{timeout:10000},t);}
await page.setViewport({width:1440,height:1100});await page.goto('http://127.0.0.1:8813/friends',{waitUntil:'networkidle0'});await text('Carla (Demonstração)');
await page.screenshot({path:path.resolve('friends-desktop.png'),fullPage:true});
await page.setViewport({width:390,height:844});await page.screenshot({path:path.resolve('friends-mobile.png'),fullPage:true});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=390),true,'no horizontal overflow');
await click('Aceitar');await text('Vocês são amigos agora.');assert.equal(writes.at(-1).method,'PATCH');assert.equal(writes.at(-1).body.status,'accepted');
await click('Cancelar');await text('Solicitação ou amizade removida.');assert.equal(writes.at(-1).method,'DELETE');
// Remove an accepted friendship through first Remover.
await click('Remover');await text('Solicitação ou amizade removida.');assert.equal(writes.at(-1).method,'DELETE');
// Search then send a request using actual input and buttons.
await page.$eval('input', e=>{e.focus();e.select();});await page.keyboard.type('Daniel');
await text('Daniel (Demonstração)');
const add=await page.evaluateHandle(()=>[...document.querySelectorAll('[role="button"]')].filter(e=>e.textContent.trim()==='Adicionar').at(-1));
await add.evaluate(e=>e.scrollIntoView({block:'center'}));await add.click();await text('Solicitação de amizade enviada.');assert.equal(writes.at(-1).method,'POST');assert.equal(writes.at(-1).body.addressee_id,people[3].id);
// A second incoming request verifies decline without identity changes.
friendships.push({id:'f4',requester_id:people[1].id,addressee_id:me,status:'pending'});
await page.reload({waitUntil:'networkidle0'});await text('Solicitações recebidas');await click('Recusar');await text('Solicitação recusada.');assert.equal(writes.at(-1).body.status,'rejected');
console.log(JSON.stringify({ui:'passed',checks:['desktop/mobile','no overflow','accept','cancel','remove','search','send','decline'],writes,remaining:friendships},null,2));
await browser.close();await new Promise(r=>server.close(r));
