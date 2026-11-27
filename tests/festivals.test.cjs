const assert = require('node:assert/strict');
const { test } = require('node:test');
require('../assets/lunar.js');
require('../assets/festivals.js');
const { forDate } = globalThis.WanshiliFestivals;
const { lunarToSolar } = globalThis.WanshiliLunar;
const names = date => forDate(date).map(festival => festival.name);

test('traditional festivals follow regular lunar months and the actual end of each lunar year', () => {
  assert.deepEqual(names('2022-01-31'), ['除夕']);
  assert.deepEqual(names('2026-02-16'), ['除夕']);
  assert.deepEqual(names('2026-02-17'), ['春节']);
  assert.ok(names(lunarToSolar(2028, 5, 5, false)).includes('端午节'));
  assert.ok(!names(lunarToSolar(2028, 5, 5, true)).includes('端午节'));
  assert.ok(names(lunarToSolar(2026, 8, 15, false)).includes('中秋节'));
});

test('coincident dates show China first and retain each festival', () => {
  assert.deepEqual(names('2024-04-04'), ['清明节']);
  assert.deepEqual(forDate('2026-04-05').map(({ name, category }) => [name, category]),
    [['清明节', 'china'], ['复活节', 'international']]);
  assert.deepEqual(names('2026-01-01'), ['元旦']);
  assert.deepEqual(names('2026-05-01'), ['劳动节']);
  assert.deepEqual(names('2026-06-01'), ['儿童节']);
  assert.deepEqual(names('2026-11-20'), ['世界儿童日']);
});

test('international dates retain the correct weekday and regional label', () => {
  assert.deepEqual(names('2026-05-10'), ['母亲节']);
  assert.deepEqual(names('2026-06-21'), ['父亲节']);
  assert.deepEqual(names('2026-11-26'), ['感恩节（美国）']);
  assert.deepEqual(names('2027-11-25'), ['感恩节（美国）']);
  assert.deepEqual(names('2026-10-31'), ['万圣夜']);
  assert.deepEqual(names('2026-11-01'), ['万圣节']);
  assert.deepEqual(names('2026-12-25'), ['圣诞节']);
  assert.deepEqual(names('2026-02-30'), []);
});
