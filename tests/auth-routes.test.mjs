import test from 'node:test';
import assert from 'node:assert/strict';
import { authRedirectUrl, acceptAuthCallback } from '../src/features/auth/redirects.mjs';

test('web callback uses current app origin, native uses registered scheme', () => {
  assert.equal(authRedirectUrl({ platform:'web', origin:'http://localhost:8081' }), 'http://localhost:8081/auth/callback');
  assert.equal(authRedirectUrl({ platform:'ios' }), 'orbit://auth/callback');
  assert.equal(authRedirectUrl({ platform:'android', recovery:true }), 'orbit://auth/callback?flow=recovery');
  assert.equal(authRedirectUrl({ platform:'web', origin:'https://app.example.com', recovery:true }), 'https://app.example.com/auth/callback?flow=recovery');
});
test('callback override rejects unsafe or cross-platform routes', () => {
  for (const configured of ['javascript:alert(1)', 'orbit://auth/callback', 'http://example.com/auth/callback', 'https://example.com/', 'https://a:b@example.com/auth/callback', 'https://example.com/auth/callback?next=evil', 'https://example.com/auth/callback#x']) {
    assert.throws(() => authRedirectUrl({platform:'web',configured}));
  }
  assert.throws(() => authRedirectUrl({platform:'ios',configured:'https://example.com/auth/callback'}));
});
function client({invalid=false, wrong=false}={}) {
 const user={id:'me',email:'test@example.com',email_confirmed_at:'2026-11-22'};
 const session={access_token:'test-access',user};
 return {auth:{exchangeCodeForSession:async()=>({data:{session},error:invalid?new Error('expired'):null}),setSession:async()=>({data:{session},error:null}),getUser:async()=>({data:{user:wrong?{...user,id:'other'}:user},error:null})}};
}
test('code recovery keeps its explicit flow marker and verifies the session', async()=>{
 assert.deepEqual(await acceptAuthCallback(client(),'orbit://auth/callback?flow=recovery&code=test'),{recovery:true});
 assert.deepEqual(await acceptAuthCallback(client(),'https://app.example.com/auth/callback?code=test'),{recovery:false});
});
test('implicit recovery links still work; broken and mismatched sessions fail closed',async()=>{
 assert.deepEqual(await acceptAuthCallback(client(),'orbit://auth/callback#access_token=a&refresh_token=b&type=recovery'),{recovery:true});
 await assert.rejects(acceptAuthCallback(client(),'orbit://auth/callback'));
 await assert.rejects(acceptAuthCallback(client(),'orbit://auth/callback?error=expired'));
 await assert.rejects(acceptAuthCallback(client({invalid:true}),'orbit://auth/callback?code=test'));
 await assert.rejects(acceptAuthCallback(client({wrong:true}),'orbit://auth/callback?code=test'));
});

test('Expo Go never falls back to the build scheme and requires an explicit session address', () => {
  assert.throws(() => authRedirectUrl({platform:'ios',expoGo:true}));
  assert.throws(() => authRedirectUrl({platform:'ios',expoGo:true,configured:'orbit://auth/callback'}));
  assert.throws(() => authRedirectUrl({platform:'android',expoGo:true,configured:'exp://*/--/auth/callback'}));
  assert.equal(authRedirectUrl({platform:'ios',expoGo:true,configured:'exp://192.0.2.10:8081/--/auth/callback',recovery:true}), 'exp://192.0.2.10:8081/--/auth/callback?flow=recovery');
});
