import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AIQuota, handleRequest } from '../ai-worker/worker.mjs';

const origin = 'https://yushumeng532.github.io';
const env = {
  ALLOWED_ORIGIN: origin,
  DEEPSEEK_API_KEY: 'synthetic-test-key',
  AI_IP_LIMIT: { limit: async () => ({ success: true }) },
  AI_QUOTA: { getByName: () => ({ fetch: async () => new Response(null, { status: 204 }) }) }
};
const validPlan = { text: '明天交报告', today: '2026-11-24', timeZone: 'Asia/Shanghai' };
function request(path, body, requestOrigin = origin) {
  return new Request('https://worker.example' + path, {
    method: 'POST', headers: { Origin: requestOrigin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}
const noModel = async () => { assert.fail('Request must stop before reaching DeepSeek'); };
const answer = result => Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(result) } }] });

test('valid plan sends approved fields and returns a safe draft', async () => {
  const response = await handleRequest(request('/api/plan', { ...validPlan, events: ['local only'] }), env, async (url, options) => {
    const payload = JSON.parse(options.body);
    assert.equal(url, 'https://api.deepseek.com/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer synthetic-test-key');
    assert.equal(payload.model, 'deepseek-flash');
    assert.deepEqual(JSON.parse(payload.messages[1].content), validPlan);
    return answer({ action: 'create', type: 'normal', title: '交报告', date: '2026-11-25', repeat: 'once' });
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  const data = await response.json();
  assert.equal(data.date, '2026-11-25');
  assert.equal(data.title, '交报告');
  assert.doesNotMatch(JSON.stringify(data), /synthetic-test-key/);
});

test('limited or unconfigured requests stop before an API call', async () => {
  const limited = { ...env, AI_QUOTA: { getByName: () => ({ fetch: async () => new Response(null, { status: 429 }) }) } };
  assert.equal((await handleRequest(request('/api/plan', validPlan, 'https://example.com'), env, noModel)).status, 403);
  assert.equal((await handleRequest(request('/api/plan', validPlan), { ...env, DEEPSEEK_API_KEY: '' }, noModel)).status, 503);
  assert.equal((await handleRequest(request('/api/plan', validPlan), limited, noModel)).status, 429);
  const perIp = { ...env, AI_IP_LIMIT: { limit: async () => ({ success: false }) } };
  assert.equal((await handleRequest(request('/api/plan', validPlan), perIp, noModel)).status, 429);
  assert.equal((await handleRequest(request('/api/plan', { ...validPlan, text: '例'.repeat(2000) }), env, noModel)).status, 400);
});

test('invalid dates or incomplete recurrence prompt for clarification', async () => {
  for (const data of [
    { action: 'create', title: '闰日', date: '2028-02-29' },
    { action: 'create', title: '例会', date: '2026-11-25', type: 'normal', repeat: 'weekly' }
  ]) {
    const response = await handleRequest(request('/api/plan', validPlan), env, async () => answer(data));
    assert.equal((await response.json()).action, 'clarify');
  }
});

test('habit prompt only receives aggregate figures', async () => {
  const snapshot = { start: '2026-11-01', end: '2026-11-23', total: 7, counts: { normal: 6, birthday: 1, down: 1, up: 0 } };
  const response = await handleRequest(request('/api/habit', { ...snapshot, titles: ['private'] }), env, async (_url, options) => {
    assert.deepEqual(JSON.parse(JSON.parse(options.body).messages[1].content), {
      ...snapshot, counts: { 普通日程: 6, 正计时: 0, 倒数日: 1, 生日: 1 }
    });
    return answer({ summary: '本月有 7 天安排了已授权的日程。' });
  });
  assert.equal((await response.json()).summary, '本月有 7 天安排了已授权的日程。');
  const empty = await handleRequest(request('/api/habit', { ...snapshot, total: 0 }), env, noModel);
  assert.equal(empty.status, 400);
});

test('health check reports readiness without an Origin or a model call', async () => {
  const ok = await handleRequest(new Request('https://worker.example/health'), env, noModel);
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('Access-Control-Allow-Origin'), '*');
  const body = await ok.json();
  assert.equal(body.ready, true);
  assert.deepEqual(body.checks, { key: true, rateLimit: true, quota: true });
  assert.equal(body.model, 'deepseek-flash');
  assert.doesNotMatch(JSON.stringify(body), /synthetic-test-key/);

  const unconfigured = await handleRequest(new Request('https://worker.example/health'), { ...env, DEEPSEEK_API_KEY: '' }, noModel);
  const degraded = await unconfigured.json();
  assert.equal(degraded.ready, false);
  assert.equal(degraded.checks.key, false);
});

test('rejections stay readable from another origin', async () => {
  const forbidden = await handleRequest(request('/api/plan', validPlan, 'https://example.com'), env, noModel);
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.headers.get('Access-Control-Allow-Origin'), '*');
  assert.deepEqual(await forbidden.json(), { error: 'forbidden' });

  const missing = await handleRequest(request('/api/unknown', validPlan), env, noModel);
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: 'not_found' });

  const preflight = await handleRequest(new Request('https://worker.example/api/plan', {
    method: 'OPTIONS', headers: { Origin: 'https://example.com', 'Access-Control-Request-Method': 'POST' }
  }), env, noModel);
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Methods'), 'POST');
});

test('global counter stops at the configured daily cap', () => {
  let entry;
  const storage = {
    transactionSync: action => action(),
    sql: { exec(query, day, used) {
      if (query.startsWith('SELECT')) return { toArray: () => entry ? [entry] : [] };
      if (query.startsWith('INSERT')) entry = { day, used };
    } }
  };
  const quota = new AIQuota({ storage }, { DAILY_LIMIT: '2' });
  const reserve = () => quota.fetch(new Request('https://quota.internal/reserve', { method: 'POST' })).status;
  assert.deepEqual([reserve(), reserve(), reserve()], [204, 204, 429]);
  entry = { day: 'earlier-date', used: 2 };
  assert.equal(reserve(), 204);
});
