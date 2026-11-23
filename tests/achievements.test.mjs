import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ACHIEVEMENTS,
  MAX_EQUIPPED_BADGES,
  achievementById,
  achievementProgress,
  achievementXp,
  toggleEquippedBadge,
} from '../src/domain/achievements.mjs';

test('achievement catalog is unique, ordered per kind and mirrors the migration seed', () => {
  const ids = ACHIEVEMENTS.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
  const byKind = new Map();
  for (const a of ACHIEVEMENTS) {
    assert.ok(a.xp > 0 && a.threshold >= 1 && a.title.length >= 3);
    const list = byKind.get(a.kind) || [];
    for (const prev of list) assert.ok(prev.threshold < a.threshold, `${a.kind} thresholds must ascend`);
    list.push(a);
    byKind.set(a.kind, list);
  }
  const sql = fs.readFileSync(new URL('../supabase/migrations/20261123030000_profile_achievements.sql', import.meta.url), 'utf8');
  for (const a of ACHIEVEMENTS) {
    assert.ok(
      sql.includes(`('${a.id}','${a.title}','${a.description}','${a.icon}','${a.kind}',${a.threshold},${a.xp})`),
      `migration seed must contain ${a.id} with identical definition`,
    );
  }
});

test('the 10-rated-works milestone exists as Marco exemplified', () => {
  const ten = achievementById('ratings_10');
  assert.equal(ten.kind, 'ratings');
  assert.equal(ten.threshold, 10);
  assert.match(ten.description, /10 obras/);
});

test('progress clamps at the goal and unlocks exactly at the threshold', () => {
  assert.deepEqual(achievementProgress(0, 10), { current: 0, threshold: 10, fraction: 0, unlocked: false });
  assert.deepEqual(achievementProgress(7, 10), { current: 7, threshold: 10, fraction: 0.7, unlocked: false });
  assert.deepEqual(achievementProgress(10, 10), { current: 10, threshold: 10, fraction: 1, unlocked: true });
  assert.deepEqual(achievementProgress(23, 10), { current: 10, threshold: 10, fraction: 1, unlocked: true });
});

test('equipping accepts only unlocked achievements, up to the maximum, and toggles off', () => {
  const unlocked = ['ratings_1', 'ratings_5', 'ratings_10'];
  assert.deepEqual(toggleEquippedBadge([], 'ratings_1', unlocked), ['ratings_1']);
  assert.equal(toggleEquippedBadge([], 'ratings_25', unlocked), null); // bloqueada
  assert.equal(toggleEquippedBadge([], 'unknown_badge', unlocked), null);
  const full = ['ratings_1', 'ratings_5', 'ratings_10'];
  assert.equal(full.length, MAX_EQUIPPED_BADGES);
  assert.equal(toggleEquippedBadge(full, 'ratings_1', unlocked).join(','), 'ratings_5,ratings_10');
  assert.equal(toggleEquippedBadge(full, 'ratings_50', ['ratings_50']), null); // cheio
});

test('achievement XP sums only unlocked rewards, so editing a rating cannot multiply it', () => {
  assert.equal(achievementXp(['ratings_1', 'ratings_5']), 25);
  assert.equal(achievementXp([]), 0);
  assert.equal(achievementXp(['unknown_badge']), 0);
  assert.equal(achievementXp(null), 0);
  const total = ACHIEVEMENTS.reduce((sum, a) => sum + a.xp, 0);
  assert.equal(achievementXp(ACHIEVEMENTS.map((a) => a.id)), total);
});
