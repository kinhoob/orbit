import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function subject(response={data:[],error:null}) {
  const calls=[]; const chain=new Proxy({}, {get(_target,key){ if(key==='then')return resolve=>resolve(response);return (...args)=>{calls.push([key,...args]);return chain;}; }});
  const source=fs.readFileSync(new URL('../src/features/account/data.ts',import.meta.url),'utf8');
  const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
  const api={};new Function('require','exports',outputText)(()=>({requireSupabase:()=>({from:(...args)=>{calls.push(['from',...args]);return chain;}})}),api);
  return {api,calls};
}
const has=(calls,expected)=>calls.some(call=>JSON.stringify(call)===JSON.stringify(expected));
test('library filters the owner and status and pages with stable ordering',async()=>{
  const {api,calls}=subject();await api.listLibrary('me','completed',2);
  for(const expected of [['eq','user_id','me'],['eq','status','completed'],['range',48,71],['order','media_item_id']])assert.ok(has(calls,expected));
});
test('status update targets only the signed-in owners item and verifies a changed row',async()=>{
  const {api,calls}=subject({data:{media_item_id:'work'},error:null});await api.updateLibraryStatus('me','work','in_progress');
  for(const expected of [['update',{status:'in_progress'}],['eq','user_id','me'],['eq','media_item_id','work'],['single']])assert.ok(has(calls,expected));
});
test('new collection records its owner and visibility and rejects empty titles',async()=>{
  const {api,calls}=subject({data:{id:'collection'},error:null});
  assert.equal(await api.saveCollection('me',{title:'List',description:'',visibility:'private'}),'collection');
  assert.ok(has(calls,['insert',{title:'List',description:'',visibility:'private',user_id:'me'}]));
  await assert.rejects(api.saveCollection('me',{title:' ',description:'',visibility:'private'}));
});
test('editing and deleting collections constrain the owner and require a returned row',async()=>{
  const {api,calls}=subject({data:{id:'collection'},error:null});await api.saveCollection('me',{title:'Updated',description:'',visibility:'public'},'collection');
  assert.ok(has(calls,['eq','user_id','me']));assert.ok(has(calls,['eq','id','collection']));assert.ok(has(calls,['single']));
  calls.length=0;await api.deleteCollection('me','collection');assert.ok(has(calls,['eq','user_id','me']));assert.ok(has(calls,['single']));
});
test('history is read-only, owner-scoped and paginated',async()=>{
  const {api,calls}=subject();await api.listHistory('me',1);assert.ok(has(calls,['from','discovery_history']));assert.ok(has(calls,['eq','user_id','me']));assert.ok(has(calls,['range',30,59]));assert.ok(!calls.some(c=>['insert','upsert','update'].includes(c[0])));
});
test('denied or stale writes propagate errors instead of pretending success',async()=>{
  const {api}=subject({data:null,error:new Error('denied')});await assert.rejects(api.updateLibraryStatus('me','work','completed'),/denied/);await assert.rejects(api.deleteCollection('me','c'),/denied/);
});
