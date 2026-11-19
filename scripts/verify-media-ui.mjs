// Isolated UI test. All Supabase requests are intercepted. No real account or database is used.
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(process.argv[2] || 'dist-ui-fixture');
const server=http.createServer((q,r)=>{let f=path.join(root,decodeURI(q.url.split('?')[0]));if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(root,'index.html');r.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.html')?'text/html':'application/octet-stream');r.end(fs.readFileSync(f));});
await new Promise(r=>server.listen(8814,'127.0.0.1',r));
const b=await puppeteer.launch({executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});const p=await b.newPage();
const me='00000000-0000-4000-8000-000000000001';let mode='ok',saved=false,rating={score:8.5,review:'',visibility:'friends'},writes=[];
await p.evaluateOnNewDocument(me=>{const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:me,exp:Math.floor(Date.now()/1000)+86400}))+'.test';localStorage.setItem('sb-orbit-test-auth-token',JSON.stringify({access_token:token,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+86400,token_type:'bearer',user:{id:me,aud:'authenticated'}}));},me);
await p.setRequestInterception(true);p.on('request',async req=>{if(!req.url().startsWith('https://orbit-test.supabase.co'))return req.url().startsWith('http://127.0.0.1:8814/') ? req.continue() : req.abort();const u=new URL(req.url()),m=req.method();const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS'};if(m==='OPTIONS')return req.respond({status:204,headers});let data=null,status=200;
if(u.pathname.endsWith('media_items')){if(mode==='loading')await new Promise(r=>setTimeout(r,1200));if(mode==='error'){status=500;data={message:'isolated error'};}else if(mode!=='missing')data={id:'demo',title:'Obra de demonstração',description:'Dados isolados para verificar a interface. Nenhuma conexão com dados reais.',category:'film',release_year:2024,cover_url:null};}
if(u.pathname.endsWith('saved_items')){if(m!=='GET'){writes.push({table:'saved_items',method:m});saved=m!=='DELETE';}data=saved?{media_item_id:'demo'}:null;}
if(u.pathname.endsWith('ratings')){if(m!=='GET'){rating=JSON.parse(req.postData());writes.push({table:'ratings',...rating});}data=rating;}
await req.respond({status,headers,contentType:'application/json',body:JSON.stringify(data)});});
async function text(t){try{await p.waitForFunction(t=>document.body.innerText.includes(t),{timeout:15000},t);}catch(e){console.log('WAIT FAILED',t,await p.evaluate(()=>document.body.innerText),JSON.stringify(writes));throw e;}}
async function button(label){const h=await p.evaluateHandle(label=>[...document.querySelectorAll('[role="button"],[role="radio"]')].find(e=>e.textContent.trim()===label),label);assert.ok(await h.evaluate(e=>!!e),label);await h.evaluate(e=>e.scrollIntoView({block:'center'}));await h.click();}
async function score(v){await p.$eval('input[aria-label="Nota de 0 a 10"]',e=>{e.focus();e.select();});await p.keyboard.type(v);assert.equal(await p.$eval('input[aria-label="Nota de 0 a 10"]',e=>e.value),v);}
await p.setViewport({width:390,height:844});await p.goto('http://127.0.0.1:8814/media/demo',{waitUntil:'networkidle0'});await text('Sua avaliação');
await score('99');await button('Salvar avaliação');await text('Informe uma nota de 0 a 10');assert.equal(writes.length,0);
await score('0');await button('Salvar avaliação');await text('Sua avaliação foi salva.');assert.equal(writes.at(-1).score,0);
await button('Privada');await p.waitForFunction(()=>[...document.querySelectorAll('[role=radio]')].some(e=>e.textContent==='Privada'&&e.getAttribute('aria-checked')==='true'));
await score('10');await button('Salvar avaliação');await p.waitForFunction(()=>document.body.innerText.includes('Sua nota: 10/10'));assert.equal(writes.at(-1).score,10);assert.equal(writes.at(-1).visibility,'private');
await button('Salvar na biblioteca');await text('Obra salva na sua biblioteca.');await text('✓ Salvo na biblioteca');await button('✓ Salvo na biblioteca — remover');await text('Obra removida dos salvos.');assert.equal(saved,false);
await p.screenshot({path:path.resolve('detail-validated-mobile.png'),fullPage:true});
mode='missing';await p.reload({waitUntil:'networkidle0'});await text('Esta obra não foi encontrada.');
mode='loading';const nav=p.reload({waitUntil:'domcontentloaded'});await nav;await text('Buscando os detalhes desta obra');await text('Sua avaliação');
mode='error';await p.reload({waitUntil:'domcontentloaded'});await text('Não foi possível abrir esta obra.');mode='ok';await button('Tentar novamente');await text('Sua avaliação');
console.log(JSON.stringify({status:'all passed',checks:['invalid score blocked','score 0','score 10','visibility private and aria-checked','save','unsave','missing','loading','error','retry'],writes},null,2));await b.close();await new Promise(r=>server.close(r));
