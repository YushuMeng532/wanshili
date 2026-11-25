const test = require('node:test');
const assert = require('node:assert/strict');
require('../assets/holidays.js');
require('../assets/event-rules.js');

const R = globalThis.WanshiliRules;
const today = '2026-11-25';
const make = (type, date, recurrence, extras) => ({
  id: 'test', type, title: '删除验证', date, calendarType: 'solar', recurrence, ...extras
});
const reload = event => JSON.parse(JSON.stringify(event));
const weekly = { frequency: 'weekly', weekdays: [1] };

test('deleting the last recurring countdown removes the preview after reload', () => {
  const event = make('down', '2026-11-23', weekly, { endCondition: 2 });
  const target = '2026-11-30';
  assert.equal(R.actionDate(event, today), target);
  assert.equal(R.shown(event, today).type, 'down');
  R.rewrite(event, null, 'one', today, today);
  const saved = reload(event);
  for (const day of [today, target, '2026-12-01']) {
    assert.equal(R.shown(saved, day), null);
    assert.equal(R.marked(saved, day), null);
  }
  assert.equal(R.occurrence(saved, '2026-11-23').type, 'down');
  assert.deepEqual(R.summary([saved], R.datesInRange('2026-11-23', target), '2026-12-02').total, ['2026-11-23']);
});

test('deleting one countdown target still previews the next surviving target', () => {
  const event = make('down', '2026-11-23', weekly);
  R.rewrite(event, null, 'one', today, today);
  const saved = reload(event);
  assert.equal(R.marked(saved, '2026-11-30'), null);
  assert.equal(R.actionDate(saved, today), '2026-12-07');
  assert.equal(R.label(R.shown(saved, today), today, saved), '还有12天');
});

test('following and series deletion remove countdown previews while preserving completed targets', () => {
  for (const scope of ['following', 'series']) {
    const event = make('down', '2026-11-23', weekly);
    R.rewrite(event, null, scope, '2026-11-28', today);
    const saved = reload(event);
    assert.equal(R.shown(saved, today), null);
    assert.equal(R.marked(saved, '2026-11-30'), null);
    assert.equal(R.marked(saved, '2026-12-07'), null);
    assert.equal(R.marked(saved, '2026-11-23').type, 'down');
    assert.deepEqual(R.deletionScopes(saved, '2026-11-23', today), { one: false, following: false, series: false, all: true });
  }
});

test('single reminders and elapsed countdowns keep their expected behavior', () => {
  const appointment = make('normal', today, { frequency: 'once' });
  assert.equal(R.deletionScopes(appointment, today, today).one, true);
  R.rewrite(appointment, null, 'one', today, today);
  assert.equal(R.marked(reload(appointment), today), null);
  const old = make('normal', '2026-11-24', { frequency: 'once' });
  assert.deepEqual(R.deletionScopes(old, '2026-11-24', today), { one: false, following: false, series: false });
  const oldCountdown = make('down', '2026-11-24', { frequency: 'once' });
  assert.equal(R.label(R.shown(oldCountdown, today), today, oldCountdown), '已过1天');
  assert.deepEqual(R.deletionScopes(oldCountdown, today, today), { one: false });
  const future = make('down', '2026-11-29', { frequency: 'once' });
  assert.deepEqual(R.deletionScopes(future, today, today), { one: true });
  R.rewrite(future, null, 'one', today, today);
  assert.equal(R.shown(reload(future), today), null);
  assert.equal(R.marked(reload(future), '2026-11-29'), null);
});

test('ordinary recurrence and birthday respect all deletion scopes', () => {
  for (const [type, date, recurrence, days] of [
    ['normal', '2026-11-18', { frequency: 'daily' }, ['2026-11-24', today, '2026-11-26', '2026-11-27']],
    ['birthday', '2025-11-25', { frequency: 'yearly' }, ['2025-11-25', today, '2027-11-25', '2028-11-25']]
  ]) {
    const [past, prior, selected, next] = days;
    for (const scope of ['one', 'following', 'series']) {
      const event = make(type, date, recurrence);
      assert.equal(R.deletionScopes(event, selected, today)[scope], true);
      R.rewrite(event, null, scope, selected, today);
      const saved = reload(event);
      assert.ok(R.marked(saved, past));
      assert.equal(Boolean(R.marked(saved, prior)), scope !== 'series');
      assert.equal(R.marked(saved, selected), null);
      assert.equal(Boolean(R.marked(saved, next)), scope === 'one');
    }
  }
});

test('following is unavailable after the last retained plan, but series can still remove an earlier plan', () => {
  const event = make('down', '2026-11-23', weekly, { endCondition: 2 });
  assert.deepEqual(R.deletionScopes(event, '2026-12-01', today), { one: true, following: false, series: true, all: true });
  assert.deepEqual(R.deletionScopes(make('up', '2026-11-01', { frequency: 'none' }), today, today), { series: true });
});

test('an earlier reschedule remains visible once it elapses', () => {
  const event = make('down', '2026-11-23', weekly, { endCondition: 2 });
  R.rewrite(event, { ...event, date: '2026-11-28' }, 'one', '2026-11-30', today);
  assert.ok(R.marked(event, '2026-11-28'));
  assert.equal(R.label(R.shown(event, '2026-12-01'), '2026-12-01', event), '已过3天');
});

test('the recurring deletion scope works with every calendar recurrence option', () => {
  for (const recurrence of [
    { frequency: 'daily' }, weekly, { frequency: 'monthly', monthDay: 30 },
    { frequency: 'yearly' }, { frequency: 'weekends' }, { frequency: 'workdays' }
  ]) {
    const first = '2026-11-01';
    const horizon = '2029-01-01';
    for (const type of ['normal', 'down']) {
      const event = make(type, first, recurrence);
      const plans = [...R.datesInRange(today, horizon)].filter(day => R.marked(event, day));
      const [selected, next] = plans;
      assert.ok(next, recurrence.frequency);
      for (const scope of ['one', 'following', 'series']) {
        const copy = reload(event);
        assert.equal(R.deletionScopes(copy, selected, today)[scope], true);
        R.rewrite(copy, null, scope, selected, today);
        assert.equal(R.marked(reload(copy), selected), null);
        assert.equal(Boolean(R.marked(reload(copy), next)), scope === 'one');
      }
    }
  }
});

test('complete deletion is available for each recurring type, even when only history remains', () => {
  const past = '2026-11-23';
  for (const [type, recurrence] of [['normal', weekly], ['down', weekly], ['birthday', { frequency: 'yearly' }]]) {
    const event = make(type, past, recurrence);
    assert.equal(R.deletionScopes(event, past, today).all, true);
    R.rewrite(event, null, 'series', past, today);
    assert.equal(R.deletionScopes(reload(event), past, today).all, true);
    assert.equal(R.deletionScopes(event, past, today).series, false);
  }
  assert.equal(R.deletionScopes(make('normal', today, { frequency: 'once' }), today, today).all, undefined);
  assert.equal(R.deletionScopes(make('up', past, { frequency: 'none' }), today, today).all, undefined);
});

test('a one-off edit inside a recurring countdown keeps the applicable series scopes', () => {
  const event = make('down', '2026-11-23', weekly);
  const past = '2026-11-23';
  event.exceptions = { [past]: { override: { ...event, recurrence: { frequency: 'once' } }, forceOccurrence: true } };
  assert.deepEqual(R.deletionScopes(event, past, today), { one: false, following: true, series: true, all: true });
  R.rewrite(event, null, 'series', past, today);
  assert.ok(R.marked(event, past));
  assert.equal(R.marked(event, '2026-11-30'), null);
  assert.deepEqual(R.deletionScopes(event, past, today), { one: false, following: false, series: false, all: true });
});

test('deleting a singly edited countdown inside a recurring series only cancels its target', () => {
  const date = '2026-11-30';
  const event = make('down', '2026-11-23', weekly);
  event.exceptions = { [date]: { override: { ...event, date, recurrence: { frequency: 'once' } }, forceOccurrence: true } };
  assert.equal(R.deletionScopes(event, date, today).one, true);
  R.rewrite(event, null, 'one', date, today);
  assert.equal(R.marked(event, date), null);
  assert.ok(R.marked(event, '2026-12-07'));
});
