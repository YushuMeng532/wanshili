const assert = require('node:assert/strict');
const { test } = require('node:test');
require('../assets/lunar.js');
require('../assets/solar-terms.js');
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
  assert.ok(names('2026-06-21').includes('父亲节'));
  assert.deepEqual(names('2026-11-26'), ['感恩节（美国）']);
  assert.deepEqual(names('2027-11-25'), ['感恩节（美国）']);
  assert.deepEqual(names('2026-10-31'), ['万圣夜']);
  assert.deepEqual(names('2026-11-01'), ['万圣节']);
  assert.deepEqual(names('2026-12-25'), ['圣诞节']);
  assert.deepEqual(names('2026-02-30'), []);
});

test('all 24 terms match the 2026 Hong Kong Observatory calendar', () => {
  const { forDay } = globalThis.WanshiliSolarTerms;
  const actual = [];
  for (let month = 1; month <= 12; month += 1) {
    for (let day = 1; day <= 31; day += 1) {
      const term = forDay(2026, month, day);
      if (term) actual.push(`${month}-${day} ${term}`);
    }
  }
  // https://www.hko.gov.hk/en/gts/time/calendar/text/files/T2026e.txt
  assert.deepEqual(actual, [
    '1-5 小寒', '1-20 大寒', '2-4 立春', '2-18 雨水', '3-5 惊蛰', '3-20 春分',
    '4-5 清明', '4-20 谷雨', '5-5 立夏', '5-21 小满', '6-5 芒种', '6-21 夏至',
    '7-7 小暑', '7-23 大暑', '8-7 立秋', '8-23 处暑', '9-7 白露', '9-23 秋分',
    '10-8 寒露', '10-23 霜降', '11-7 立冬', '11-22 小雪', '12-7 大雪', '12-22 冬至'
  ]);
  assert.equal(forDay(2025, 12, 21), '冬至');
  assert.equal(forDay(2026, 12, 21), '');
});

test('terms follow existing festival ordering and are shown once for Qingming', () => {
  assert.deepEqual(names('2026-06-05'), ['世界环境日', '芒种']);
  assert.deepEqual(forDate('2026-12-22'), [{ name: '冬至', shortName: '冬至', category: 'solar-term' }]);
  assert.deepEqual(names('2026-04-05'), ['清明节', '复活节']);
  assert.deepEqual(names('2101-12-22'), []);
});
