import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { QueryClient } from '@tanstack/react-query';
import * as timelineDomain from '../src/domain/timelines.mjs';

function load(path, dependencies) {
  const source=fs.readFileSync(new URL(path, import.meta.url),'utf8');
  const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
  const exports={};
  new Function('require','exports',outputText)(id=>{
    if(id in dependencies)return dependencies[id];
    throw new Error(`Unexpected import: ${id}`);
  },exports);
  return exports;
}
const {toggleTimelineLike}=load('../src/features/feed/like-mutation.ts',{
  './timelines': {setRatingLike:()=>{throw new Error('Use isolated write');}},
  '../../domain/timelines.mjs':timelineDomain,
});
const row=(id='a',likes=3)=>({rating_id:id,liked_by_me:false,like_count:likes,created_at:'2026-11-19T00:00:00Z'});
const page=reviews=>({reviews,newest:'2026-11-19T00:00:00Z'});
const key=['timeline','descobrir','me'];

test('like updates both timelines, isolates other accounts and permits later server refresh',async()=>{
  const cache=new QueryClient();const a=row();
  cache.setQueryData(key,page([a]));cache.setQueryData(['timeline','amigos','me'],page([a]));
  cache.setQueryData(['timeline','descobrir','other'],page([a]));
  await toggleTimelineLike(cache,'me',a,async(id,user,liked)=>{
    assert.deepEqual([id,user,liked],['a','me',true]);
    assert.equal(cache.getQueryData(key).reviews[0].like_count,4);
    assert.equal(cache.getQueryData(['timeline','amigos','me']).reviews[0].liked_by_me,true);
    assert.equal(cache.getQueryData(['timeline','descobrir','other']).reviews[0].liked_by_me,false);
  });
  cache.setQueryData(key,page([{...a,like_count:12,liked_by_me:true}]));
  assert.equal(cache.getQueryData(key).reviews[0].like_count,12);
  cache.clear();
});

test('failed like rolls back its row without discarding unrelated refreshed data',async()=>{
  const cache=new QueryClient();cache.setQueryData(key,page([row(),row('b')]));
  await assert.rejects(toggleTimelineLike(cache,'me',row(),async()=>{
    cache.setQueryData(key,current=>({...current,reviews:current.reviews.map(r=>r.rating_id==='b'?{...r,like_count:99}:r)}));
    throw new Error('offline');
  }),/offline/);
  assert.equal(cache.getQueryData(key).reviews[0].like_count,3);
  assert.equal(cache.getQueryData(key).reviews[1].like_count,99);
  cache.clear();
});

test('rapid repeat taps do not start concurrent writes',async()=>{
  const cache=new QueryClient();cache.setQueryData(key,page([row()]));
  let release;const waiting=new Promise(resolve=>release=resolve);let writes=0;
  const first=toggleTimelineLike(cache,'me',row(),async()=>{writes++;await waiting;});
  assert.equal(await toggleTimelineLike(cache,'me',row(),async()=>{writes++;}),false);
  release();await first;assert.equal(writes,1);cache.clear();
});

test('logout during failed write does not resurrect cleared account data',async()=>{
  const cache=new QueryClient();cache.setQueryData(key,page([row()]));
  await assert.rejects(toggleTimelineLike(cache,'me',row(),async()=>{cache.clear();throw new Error('denied');}));
  assert.equal(cache.getQueryData(key),undefined);
});

test('discover adapter uses ranked RPC and propagates missing migration errors',async()=>{
  let received;
  const expected=page([row('old-popular',500)]);
  const api=load('../src/features/feed/timelines.ts',{
    '../../lib/supabase':{requireSupabase:()=>({rpc:async(...args)=>{received=args;return {data:expected,error:null};}})},
    '../../domain/timelines.mjs':timelineDomain,
  });
  assert.deepEqual(await api.listDiscoverTimeline('me'),expected);
  assert.deepEqual(received,['discover_timeline',{p_limit:50}]);
  const failed=load('../src/features/feed/timelines.ts',{
    '../../lib/supabase':{requireSupabase:()=>({rpc:async()=>({data:null,error:new Error('migration missing')})})},
    '../../domain/timelines.mjs':timelineDomain,
  });
  await assert.rejects(failed.listDiscoverTimeline('me'),/migration missing/);
});

test('curated resolution matches title, category and year and never inserts',async()=>{
  const calls=[];const chain=new Proxy({}, {get(_target,key){
    if(key==='then')return resolve=>resolve({data:[{id:'actual-uuid'}],error:null});
    return(...args)=>{calls.push([key,...args]);return chain;};
  }});
  const api=load('../src/features/catalog/curated.ts',{'../../lib/supabase':{requireSupabase:()=>({from:()=>chain})}});
  assert.deepEqual(await api.findCuratedMatches({title:'Duna',category:'book',releaseYear:1965}),[{id:'actual-uuid'}]);
  for(const expected of [['eq','title','Duna'],['eq','category','book'],['eq','release_year',1965]])assert.ok(calls.some(c=>JSON.stringify(c)===JSON.stringify(expected)));
  assert.ok(!calls.some(c=>['insert','upsert'].includes(c[0])));
});
