import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { QueryClient } from '@tanstack/react-query';

const source=fs.readFileSync(new URL('../src/features/catalog/save-mutation.ts',import.meta.url),'utf8');
const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
const api={};new Function('require','exports',outputText)(()=>({requireSupabase:()=>{throw new Error('Network forbidden in test');}}),api);
const key=['media-state','work','me'];

test('saved item feedback is immediate and preserves the current rating',async()=>{
  const cache=new QueryClient();const rating={score:8,review:'draft'};cache.setQueryData(key,{saved:false,rating});
  assert.equal(await api.toggleSavedItem(cache,'me','work',async(user,id,saved)=>{
    assert.deepEqual([user,id,saved],['me','work',true]);assert.equal(cache.getQueryData(key).saved,true);assert.equal(cache.getQueryData(key).rating,rating);
  }),true);cache.clear();
});
test('failed save restores saved state and retains newer rating data',async()=>{
  const cache=new QueryClient();cache.setQueryData(key,{saved:false,rating:{score:8}});
  await assert.rejects(api.toggleSavedItem(cache,'me','work',async()=>{cache.setQueryData(key,{saved:true,rating:{score:9}});throw new Error('offline');}));
  assert.deepEqual(cache.getQueryData(key),{saved:false,rating:{score:9}});cache.clear();
});
test('repeat taps cannot duplicate save requests',async()=>{
  const cache=new QueryClient();cache.setQueryData(key,{saved:false,rating:null});
  let release;const hold=new Promise(resolve=>release=resolve);let requests=0;
  const first=api.toggleSavedItem(cache,'me','work',async()=>{requests++;await hold;});
  assert.equal(await api.toggleSavedItem(cache,'me','work',async()=>{requests++;}),null);
  release();await first;assert.equal(requests,1);cache.clear();
});
test('failed save after logout never recreates personal cached data',async()=>{
  const cache=new QueryClient();cache.setQueryData(key,{saved:false,rating:null});
  await assert.rejects(api.toggleSavedItem(cache,'me','work',async()=>{cache.clear();throw new Error('denied');}));
  assert.equal(cache.getQueryData(key),undefined);
});
