const test = require('node:test');
const assert = require('node:assert/strict');

require('../assets/event-rules.js');
const R = globalThis.WanshiliRules;
const today = '2026-11-25';
const first = '2026-11-02';
const past = '2026-11-23';
const next = '2026-11-30';
const range = () => R.datesInRange('2026-11-01', today);
const make = (extras = {}) => ({
  id: 'class', date: first, type: 'normal', calendarType: 'solar', title: '原名称', note: '原备注',
  recurrence: { frequency: 'weekly', weekdays: [1] }, ...extras
});

test('a past ordinary recurrence can be renamed without changing the other dates or settings', () => {
  const event = make({ aiIncluded: false });
  R.rewrite(event, { ...event, date: past, title: '更正名称', note: '新备注', aiIncluded: true, recurrence: { frequency: 'daily' } }, 'one', past, today);
  assert.equal(R.shown(event, past).title, '更正名称');
  assert.equal(R.shown(event, past).note, '新备注');
  assert.equal(R.shown(event, past).date, first);
  assert.equal(R.shown(event, past).recurrence.frequency, 'weekly');
  assert.equal(R.marked(event, next).title, '原名称');
  assert.equal(R.marked(event, '2026-11-17'), null);
  assert.equal(R.marked(event, first).title, '原名称');
  assert.equal(event.aiIncluded, false);
});

test('deleting one historical occurrence updates statistics without removing the series', () => {
  const event = make();
  assert.equal(R.deletionScopes(event, past, today).one, true);
  assert.ok(R.summary([event], range(), today).total.includes(past));
  R.rewrite(event, null, 'one', past, today);
  const saved = JSON.parse(JSON.stringify(event));
  assert.equal(R.shown(saved, past), null);
  assert.equal(R.marked(saved, past), null);
  assert.ok(R.marked(saved, next));
  assert.ok(R.marked(saved, first));
  assert.ok(!R.summary([saved], range(), today).total.includes(past));
});

test('changing a historical date moves only that occurrence and refuses to overwrite another occurrence', () => {
  const event = make();
  assert.throws(() => R.rewrite(event, { ...event, date: first }, 'one', past, today), /已有同系列日程/);
  assert.ok(R.marked(event, past));
  assert.ok(R.marked(event, first));
  const replacement = '2026-11-21';
  R.rewrite(event, { ...event, date: replacement }, 'one', past, today);
  assert.equal(R.marked(event, past), null);
  assert.ok(R.marked(event, replacement));
  assert.ok(R.marked(event, next));
  assert.ok(R.summary([event], range(), today).total.includes(replacement));
  assert.ok(!R.summary([event], range(), today).total.includes(past));
  assert.equal(R.deletionScopes(event, replacement, today).one, true);
});

test('an old occurrence can still be corrected after the future series has been cancelled', () => {
  const event = make();
  R.rewrite(event, null, 'series', past, today);
  assert.deepEqual(R.deletionScopes(event, past, today), { one: true, following: false, series: false, all: true });
  R.rewrite(event, null, 'one', past, today);
  assert.equal(R.marked(event, past), null);
  assert.equal(R.marked(event, next), null);
  assert.ok(R.marked(event, first));
});

test('bulk updates preserve past occurrences and other historical types keep their single-delete rules', () => {
  for (const scope of ['following', 'series']) {
    const event = make();
    R.rewrite(event, { ...event, title: '今后名称' }, scope, past, today);
    assert.equal(R.marked(event, past).title, '原名称');
    assert.equal(R.marked(event, next).title, '今后名称');
  }
  for (const event of [make({ date: past, recurrence: { frequency: 'once' } }), make({ type: 'birthday', date: past, recurrence: { frequency: 'yearly' } }), make({ type: 'down' })]) {
    assert.equal(R.canCorrectPast(event, past, today), false);
  }
});
