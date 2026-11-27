// 本地端到端测试：用一个假的 DeepSeek 端点跑通全部边界。
// 运行：node tests/local-test.mjs
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';

const ORIGIN = 'https://yushumeng532.github.io';
const MOCK_PORT = 8799;
const APP_PORT = 8798;

// ---- 假 DeepSeek ----
let mockMode = 'ok';
const mockServer = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));

  if (mockMode === 'length') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ choices: [{ finish_reason: 'length', message: { content: '{"action"' } }] }));
  }
  if (mockMode === 'notjson') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: '这不是 JSON' } }] }));
  }
  if (mockMode === 'upstream500') {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'boom' }));
  }
  const isHabit = !('text' in JSON.parse(body.messages[1].content));
  const content = isHabit
    ? { summary: '本月普通日程覆盖天数最多。' }
    : { action: 'create', title: '交报告', type: 'normal', date: '2026-11-25', repeat: 'once', weekdays: [], occurrences: null, hasTime: false, message: '' };
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(content) } }] }));
});

await new Promise(resolve => mockServer.listen(MOCK_PORT, '127.0.0.1', resolve));

// ---- 被测服务 ----
const app = spawn(process.execPath, [path.resolve('server.mjs')], {
  env: {
    ...process.env,
    PORT: String(APP_PORT),
    DEEPSEEK_API_KEY: 'test-key',
    DEEPSEEK_ENDPOINT: `http://127.0.0.1:${MOCK_PORT}/chat/completions`,
    ALLOWED_ORIGIN: ORIGIN,
    DAILY_LIMIT: '50'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});
app.stdout.on('data', d => process.stdout.write('[server] ' + d));
app.stderr.on('data', d => process.stderr.write('[server:err] ' + d));

await new Promise(resolve => setTimeout(resolve, 900));

const base = `http://127.0.0.1:${APP_PORT}`;
let pass = 0;
let fail = 0;
const check = (name, condition, extra = '') => {
  if (condition) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' | ' + extra : '')); }
};

const call = async (method, route, { origin = ORIGIN, body, headers = {} } = {}) => {
  const h = { ...headers };
  if (origin) h.Origin = origin;
  if (body !== undefined) h['Content-Type'] = 'application/json';
  const response = await fetch(base + route, {
    method, headers: h, body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { status: response.status, data, headers: Object.fromEntries(response.headers) };
};

const validPlan = { text: '明天交报告', today: '2026-11-25', timeZone: 'Asia/Shanghai' };

console.log('\n-- health --');
{
  const r = await call('GET', '/health', { origin: null });
  check('无 Origin 可访问', r.status === 200, JSON.stringify(r.data));
  check('ready 为 true', r.data?.ready === true);
  check('返回 model', r.data?.model === 'deepseek-flash');
  check('ACAO 为 *', r.headers['access-control-allow-origin'] === '*');
}

console.log('\n-- 来源校验 --');
{
  const r = await call('POST', '/api/plan', { origin: 'https://evil.example', body: validPlan });
  check('错误来源 403', r.status === 403);
  check('错误来源无 ACAO', r.headers['access-control-allow-origin'] === undefined);
}
{
  const r = await call('OPTIONS', '/api/plan', { headers: { 'Access-Control-Request-Method': 'POST' } });
  check('预检 204', r.status === 204);
  check('预检返回 Allow-Methods', r.headers['access-control-allow-methods'] === 'POST');
}

console.log('\n-- 参数校验 --');
{
  const r = await call('POST', '/api/plan', { body: {} });
  check('空对象 400 invalid', r.status === 400 && r.data?.error === 'invalid');
}
{
  const r = await call('POST', '/api/unknown', { body: validPlan });
  check('未知路径 404', r.status === 404 && r.data?.error === 'not_found');
}

console.log('\n-- 正常链路 --');
{
  const r = await call('POST', '/api/plan', { body: validPlan });
  check('解析成功 200', r.status === 200, JSON.stringify(r.data));
  check('返回草稿标题', r.data?.title === '交报告');
  check('返回日期', r.data?.date === '2026-11-25');
  check('响应带 ACAO', r.headers['access-control-allow-origin'] === ORIGIN);
}
{
  const r = await call('POST', '/api/habit', {
    body: { start: '2026-11-01', end: '2026-11-23', total: 7, counts: { normal: 6, up: 0, down: 1, birthday: 1 } }
  });
  check('习惯总结 200', r.status === 200, JSON.stringify(r.data));
  check('返回 summary', typeof r.data?.summary === 'string');
}

console.log('\n-- 失败分支不误判 --');
{
  mockMode = 'length';
  const r = await call('POST', '/api/plan', { body: validPlan });
  check('截断返回 truncated', r.status === 502 && r.data?.error === 'truncated', JSON.stringify(r.data));
}
{
  mockMode = 'notjson';
  const r = await call('POST', '/api/plan', { body: validPlan });
  check('非 JSON 返回 invalid_result', r.status === 502 && r.data?.error === 'invalid_result');
}
{
  mockMode = 'upstream500';
  const r = await call('POST', '/api/plan', { body: validPlan });
  check('上游 5xx 返回 unavailable', r.status === 502 && r.data?.error === 'unavailable');
}
mockMode = 'ok';

console.log('\n-- 每 IP 限流（5 次/分钟）--');
{
  let limited = false;
  for (let i = 0; i < 8; i++) {
    const r = await call('POST', '/api/plan', { body: validPlan, headers: { 'X-Forwarded-For': '9.9.9.' + i } });
    if (r.status === 429) limited = true;
  }
  check('不同 IP 不被误伤', !limited);
}
{
  let codes = [];
  for (let i = 0; i < 7; i++) {
    const r = await call('POST', '/api/plan', { body: validPlan, headers: { 'X-Forwarded-For': '8.8.8.8' } });
    codes.push(r.status);
  }
  check('同一 IP 第 6 次被限流', codes.slice(0, 5).every(c => c === 200) && codes[5] === 429, codes.join(','));
}

app.kill();
mockServer.close();
console.log(`\n结果：${pass} passed / ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
