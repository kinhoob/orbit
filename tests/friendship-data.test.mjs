import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { relationWith } from '../src/domain/friendship.mjs';

function subject(response = {data:{id:'f1'},error:null}) {
  const calls = [];
  const chain = new Proxy({}, {get(_target, key) {
    if (key === 'then') return (resolve) => resolve(response);
    return (...args) => { calls.push([key, ...args]); return chain; };
  }});
  const source = fs.readFileSync(new URL('../src/features/social/friends.ts', import.meta.url), 'utf8');
  const {outputText} = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
  const exports = {};
  new Function('require','exports',outputText)((id) => id.includes('supabase') ? {requireSupabase:()=>({from:(...args)=>{calls.push(['from',...args]);return chain;}})} : {relationWith}, exports);
  return {api:exports,calls};
}

test('search excludes self and strips PostgREST control characters', async () => {
  const {api,calls}=subject({data:[],error:null});
  await api.searchProfiles('Ana,(x)%_', 'me');
  assert.deepEqual(calls.find(c=>c[0]==='neq'), ['neq','id','me']);
  assert.deepEqual(calls.find(c=>c[0]==='or'), ['or','username.ilike.%Anax%,display_name.ilike.%Anax%']);
  assert.deepEqual(calls.find(c=>c[0]==='limit'), ['limit',20]);
});
test('request inserts only the authenticated requester and target',async()=>{
  const {api,calls}=subject(); await api.sendRequest('me','them');
  assert.deepEqual(calls.find(c=>c[0]==='insert'),['insert',{requester_id:'me',addressee_id:'them'}]);
});
test('recipient response checks recipient, pending status and returned row',async()=>{
  const {api,calls}=subject(); await api.respondToRequest('f1',true,'me');
  for (const expected of [['update',{status:'accepted'}],['eq','id','f1'],['eq','addressee_id','me'],['eq','status','pending'],['select','id'],['single']]) assert.ok(calls.some(c=>JSON.stringify(c)===JSON.stringify(expected)));
});
test('decline changes status, never identity columns',async()=>{
  const {api,calls}=subject(); await api.respondToRequest('f1',false,'me');
  assert.deepEqual(calls.find(c=>c[0]==='update'), ['update',{status:'rejected'}]);
});
test('removal filters participants and requires an affected row',async()=>{
  const {api,calls}=subject(); await api.deleteFriendship('f1','me');
  assert.deepEqual(calls.find(c=>c[0]==='or'),['or','requester_id.eq.me,addressee_id.eq.me']);
  assert.ok(calls.some(c=>c[0]==='single'));
});
test('duplicate, denied and stale operations are not reported as successful',async()=>{
  const denied = {message:'denied',code:'42501'};
  await assert.rejects(subject({data:null,error:denied}).api.respondToRequest('f1',true,'me'));
  await assert.rejects(subject({data:null,error:{code:'PGRST116'}}).api.deleteFriendship('f1','me'));
  await assert.rejects(subject({data:null,error:{code:'23505'}}).api.sendRequest('me','them'), /duplicate/);
});
