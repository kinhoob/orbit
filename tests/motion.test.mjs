import test from 'node:test';
import assert from 'node:assert/strict';
import { introSpec, motionSpec } from '../src/design/motion.mjs';

test('entry animation is fully removed with reduced motion', () => {
  assert.deepEqual(introSpec(true), { orbitDuration: 0, wordDelay: 0, wordDuration: 0, minVisible: 0, fadeOut: 0 });
});
test('entry animation is short, finite and covers the wordmark reveal', () => {
  const spec = introSpec(false);
  assert.deepEqual(spec, { orbitDuration: 1600, wordDelay: 220, wordDuration: 420, minVisible: 1800, fadeOut: 320 });
  assert.ok(spec.wordDelay + spec.wordDuration <= spec.minVisible);
});

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
