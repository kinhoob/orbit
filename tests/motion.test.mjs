import test from 'node:test';
import assert from 'node:assert/strict';
import { motionSpec } from '../src/design/motion.mjs';

test('reduced motion removes distances, duration and stagger', () => {
  for (const index of [0, 4, 7, 8, 100, -1, NaN]) {
    assert.deepEqual(motionSpec(true, index), { screenDuration: 0, screenDistance: 0, cardDuration: 0, cardDelay: 0 });
  }
});
test('screen entrance is short and small, card stagger has a finite budget', () => {
  assert.deepEqual(motionSpec(false, 0), { screenDuration: 220, screenDistance: 14, cardDuration: 260, cardDelay: 0 });
  assert.equal(motionSpec(false, 7).cardDelay, 168);
  for (const index of [8, 1000, -1, NaN, 0.5]) {
    assert.equal(motionSpec(false, index).cardDuration, 0);
    assert.equal(motionSpec(false, index).cardDelay, 0);
  }
});
