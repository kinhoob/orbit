import test from 'node:test';
import assert from 'node:assert/strict';
import {relationWith} from '../src/domain/friendship.mjs';
const A='a',B='b';
test('friendship lifecycle: none, outgoing, incoming, friends, rejected',()=>{
  assert.equal(relationWith([],A,B).kind,'none');
  const f={id:'1',requester_id:A,addressee_id:B,status:'pending'};
  assert.equal(relationWith([f],A,B).kind,'outgoing');
  assert.equal(relationWith([f],B,A).kind,'incoming');
  assert.equal(relationWith([{...f,status:'accepted'}],B,A).kind,'friends');
  assert.equal(relationWith([{...f,status:'rejected'}],A,B).kind,'rejected');
  assert.equal(relationWith([{...f,addressee_id:'c'}],A,B).kind,'none');
});
