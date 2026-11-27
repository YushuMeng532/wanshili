import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createCalendarServer } from './server.mjs';

const publicOrigin = 'https://calendar.example.com';
const pagesOrigin = 'https://yushumeng532.github.io';
const validPlan = { text: '明天交报告', today: '2026-11-25', timeZone: 'Asia/Shanghai' };
const habit = { start: '2026-11-01', end: '2026-11-24', total: 3, counts: { normal: 3, up: 0, down: 0, birthday: 0 } };

async function serve(t, config) {
  const server = createCalendarServer({ publicOrigin, apiKey: 'test-key', quotaFile: ':memory:', ...config });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  return async (path, options) => fetch(`http://127.0.0.1:${server.address().port}` + path, options);
}

function submit(origin, data) {
  return { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
}

test('serves the local calendar with a same-origin AI configuration and protects server files', async t => {
  const root = await mkdtemp(join(tmpdir(), 'wanshili-cn-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, 'app.html'), '<title>万事历</title>');
  const request = await serve(t, { root });
  assert.match(await (await request('/')).text(), /万事历/);
  assert.match(await (await request('/assets/product-ai-config.js?v=1')).text(), /location\.origin/);
  assert.equal((await request('/china-host/server.mjs')).status, 404);
  assert.equal((await request('/health')).status, 200);
});

test('supports same-origin and existing GitHub Pages requests without going through a relay', async t => {
  const calls = [];
  const request = await serve(t, {
    async fetchModel(url, options) {
      calls.push(url);
      const data = JSON.parse(JSON.parse(options.body).messages[1].content);
      const result = data.text
        ? { action: 'create', title: '交报告', date: '2026-11-26', type: 'normal', repeat: 'once' }
        : { summary: '普通日程覆盖 3 天。' };
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(result) } }] });
    }
  });
  const preflight = await request('/api/plan', { method: 'OPTIONS', headers: { Origin: pagesOrigin } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), pagesOrigin);
  for (const origin of [publicOrigin, pagesOrigin]) {
    const response = await request('/api/plan', submit(origin, validPlan));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).date, '2026-11-26');
  }
  const response = await request('/api/habit', submit(publicOrigin, habit));
  assert.equal((await response.json()).summary, '普通日程覆盖 3 天。');
  assert.equal((await request('/api/plan', submit('https://other.example', validPlan))).status, 403);
  assert.equal(calls.length, 3);
  assert.ok(calls.every(endpoint => endpoint === 'https://api.deepseek.com/chat/completions'));
});

test('enforces the daily quota across server instances sharing the same persistent database', async t => {
  const root = await mkdtemp(join(tmpdir(), 'wanshili-quota-'));
  const quotaFile = join(root, 'quota.sqlite');
  let calls = 0;
  const config = { quotaFile, dailyLimit: 1, async fetchModel() {
    calls++;
    return Response.json({ choices: [{ finish_reason: 'stop', message: { content: '{"action":"clarify","message":"请补充日期。"}' } }] });
  } };
  const first = await serve(t, config);
  const second = await serve(t, config);
  t.after(() => rm(root, { recursive: true, force: true }));
  const results = await Promise.all([first('/api/plan', submit(publicOrigin, validPlan)), second('/api/plan', submit(pagesOrigin, validPlan))]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 429]);
  assert.equal(calls, 1);
});
