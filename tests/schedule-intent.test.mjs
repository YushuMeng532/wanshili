import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../assets/schedule-intent.js';
import '../assets/holidays.js';
import '../assets/event-rules.js';

const { refinePlan } = globalThis.WanshiliScheduleIntent;
const today = '2026-11-27';
const draft = (text, overrides = {}, currentDay = today) =>
  refinePlan({ action: 'create', title: '测试事项', type: 'normal', date: '2026-12-26', repeat: 'once', ...overrides },
    { text, today: currentDay });

test('keeps explicit types and recognizes common implicit intents', () => {
  for (const [text, type, date, repeat] of [
    ['这周一是我们的相识纪念日，我要设置一个正计时', 'up', '2026-11-23', 'once'],
    ['这周一是我们的相识纪念日', 'up', '2026-11-23', 'once'],
    ['下周一考试，设倒计时', 'down', '2026-11-30', 'once'],
    ['明天是小林的生日', 'birthday', '2026-11-28', 'yearly'],
    ['下周一考试', 'normal', '2026-11-30', 'once'],
    ['明天建一个叫「生日」的普通日程', 'normal', '2026-11-28', 'once']
  ]) {
    const result = draft(text);
    assert.deepEqual([result.type, result.date, result.repeat], [type, date, repeat], text);
  }
});

test('supports workdays, weekends, daily, multi-day weekly, monthly and yearly plans', () => {
  for (const [text, repeat] of [
    ['在工作日设置一个循环叫上班', 'workdays'], ['周末去锻炼', 'weekends'], ['每天跑步', 'daily'],
    ['每周一和周三开会，共6次', 'weekly'], ['每月31日复盘', 'monthly'], ['每年12月26日做回顾', 'yearly']
  ]) {
    const result = draft(text);
    assert.equal(result.repeat, repeat);
    if (repeat !== 'yearly') assert.equal(result.date, today);
  }
  const result = draft('每周一和周三开会，共6次');
  assert.deepEqual(result.weekdays, [1, 3]);
  assert.equal(result.occurrences, 6);
  assert.equal(draft('每月31日复盘').monthDay, 31);
  const workday = draft('在工作日设置一个循环叫上班', { action: 'clarify', title: null });
  assert.deepEqual([workday.action, workday.title, workday.nextEligible], ['create', '上班', true]);
});

test('asks for genuinely missing or unsupported dates and preserves update operations', () => {
  for (const text of ['这是我们的相识纪念日', '给考试设置一个倒计时', '记一下妈妈生日', '每周开会', '下个月办护照', '每隔2天锻炼', '农历八月十五记生日']) {
    assert.equal(draft(text).action, 'clarify', text);
  }
  const operation = { action: 'move', title: '考试', date: today, targetDate: '2026-11-30' };
  assert.equal(refinePlan(operation, { text: '把考试改到下周一', today }), operation);
});
