import test from 'node:test';
import assert from 'node:assert/strict';
import { toggleMuted, isMuted } from '../src/domain/mute.mjs';

test('toggleMuted adiciona e remove sem duplicar', () => {
  assert.deepEqual(toggleMuted([], 'a'), ['a']);
  assert.deepEqual(toggleMuted(['a'], 'a'), []);
  assert.deepEqual(toggleMuted(['a', 'b'], 'c'), ['a', 'b', 'c']);
  assert.deepEqual(toggleMuted(['a', 'b', 'c'], 'b'), ['a', 'c']);
  assert.deepEqual(toggleMuted(['a', 'a'], 'a'), []);
});

test('isMuted reflete a lista', () => {
  assert.equal(isMuted(['x'], 'x'), true);
  assert.equal(isMuted(['x'], 'y'), false);
  assert.equal(isMuted([], 'x'), false);
});
