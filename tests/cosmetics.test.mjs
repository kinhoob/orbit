import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  BUTTON_THEMES,
  COSMETIC_KINDS,
  COSMETICS,
  LEVELS,
  buttonColorsFor,
  cosmeticById,
  cosmeticLock,
  levelForXp,
} from '../src/domain/cosmetics.mjs';

test('cosmetic catalog mirrors the migration seed exactly', () => {
  const sql = fs.readFileSync(new URL('../supabase/migrations/20261123040000_level_cosmetics.sql', import.meta.url), 'utf8');
  const kinds = new Set(COSMETIC_KINDS.map((k) => k.id));
  const keys = new Set();
  for (const c of COSMETICS) {
    assert.ok(kinds.has(c.kind), `unknown kind ${c.kind}`);
    assert.ok(!keys.has(`${c.kind}:${c.id}`), `duplicate ${c.kind}:${c.id}`);
    keys.add(`${c.kind}:${c.id}`);
    assert.ok(c.min_level >= 1 && c.min_level <= 10);
    assert.ok(
      sql.includes(`('${c.kind}','${c.id}','${c.name}',${c.min_level})`),
      `migration seed must contain ${c.kind}/${c.id} with identical name and level`,
    );
  }
});

test('levels mirror level_definitions and levelForXp picks the right rung', () => {
  assert.equal(LEVELS.length, 10);
  for (let i = 1; i < LEVELS.length; i += 1) assert.ok(LEVELS[i].required_xp > LEVELS[i - 1].required_xp);
  assert.equal(levelForXp(0).level, 1);
  assert.equal(levelForXp(49).level, 1);
  assert.equal(levelForXp(50).level, 2);
  assert.equal(levelForXp(120).level, 3);
  assert.equal(levelForXp(2299).level, 9);
  assert.equal(levelForXp(2300).level, 10);
  assert.equal(levelForXp(99999).level, 10);
  assert.equal(levelForXp('abc').level, 1);
});

test('cosmeticLock blocks above level and rejects unknown ids', () => {
  assert.equal(cosmeticLock('theme', 'neutral', 1), null);
  assert.equal(cosmeticLock('theme', 'royal', 5), 6);
  assert.equal(cosmeticLock('theme', 'royal', 6), null);
  assert.equal(cosmeticLock('button', 'gold', 2), 3);
  assert.equal(cosmeticLock('button', 'gold', 3), null);
  assert.equal(cosmeticLock('animation', 'orbit', 7), 8);
  assert.equal(cosmeticLock('animation', 'orbit', 8), null);
  assert.equal(cosmeticLock('animation', 'laser', 10), 'unknown');
  assert.equal(cosmeticById('theme', 'nope'), null);
});

test('every new palette id exists and button themes keep foreground contrast pairs', () => {
  const tokens = fs.readFileSync(new URL('../src/design/tokens.ts', import.meta.url), 'utf8');
  for (const c of COSMETICS.filter((x) => x.kind === 'theme')) {
    assert.ok(tokens.includes(`${c.id}: {`), `palette ${c.id} missing from tokens`);
  }
  for (const c of COSMETICS.filter((x) => x.kind === 'button')) {
    assert.ok(BUTTON_THEMES[c.id], `button theme ${c.id} missing`);
  }
  assert.deepEqual(buttonColorsFor('nope'), BUTTON_THEMES.ink);
});

test('level achievements exist in the catalog Marco asked for', async () => {
  const { ACHIEVEMENTS, achievementById } = await import('../src/domain/achievements.mjs');
  const levels = ACHIEVEMENTS.filter((a) => a.kind === 'level');
  assert.deepEqual(levels.map((a) => a.threshold), [3, 5, 7, 10]);
  for (const a of levels) assert.ok(a.xp > 0, `${a.id} grants XP`);
  assert.equal(achievementById('level_10').title, 'Nível Lenda');
});
