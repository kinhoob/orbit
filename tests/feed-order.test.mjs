import test from 'node:test';
import assert from 'node:assert/strict';
import { inReadingOrder } from '../src/domain/feed-order.mjs';
test('background like updates change counts without moving the review being read',()=>{
  assert.deepEqual(inReadingOrder(['a','b'],[{rating_id:'b',like_count:9},{rating_id:'a',like_count:3}]),[{rating_id:'a',like_count:3},{rating_id:'b',like_count:9}]);
});
test('new posts wait for acceptance and removed/private rows never remain displayed',()=>{
  const rows=[{rating_id:'new'},{rating_id:'b'}];
  assert.deepEqual(inReadingOrder(['a','b'],rows),[{rating_id:'b'}]);
  assert.deepEqual(inReadingOrder(['new','b'],rows),rows);
});
