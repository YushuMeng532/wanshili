// 部署后验收：对一个已上线的端点跑真实检查。
// 用法：node verify-deployed.mjs https://xxx.fcapp.run
const target = (process.argv[2] || '').replace(/\/+$/, '');
if (!/^https?:\/\//.test(target)) {
  console.error('用法: node verify-deployed.mjs https://你的域名');
  process.exit(2);
}

const ORIGIN = 'https://yushumeng532.github.io';
let pass = 0;
let fail = 0;
const check = (name, ok, extra = '') => {
  if (ok) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' | ' + extra : '')); }
};

console.log('目标:', target);
console.log('\n-- 1. 健康检查 --');
try {
  const started = Date.now();
  const response = await fetch(target + '/health', { signal: AbortSignal.timeout(15000) });
  const ms = Date.now() - started;
  const data = await response.json().catch(() => null);
  check('GET /health 返回 200', response.status === 200, 'status=' + response.status);
  check('ready 为 true', data?.ready === true, JSON.stringify(data));
  check('响应足够快（<5s）', ms < 5000, ms + 'ms');
  console.log('     ' + JSON.stringify(data));
} catch (error) {
  check('GET /health 可访问', false, String(error.message));
}

console.log('\n-- 2. 来源校验 --');
try {
  const response = await fetch(target + '/api/plan', {
    method: 'POST',
    headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
    body: '{}',
    signal: AbortSignal.timeout(15000)
  });
  check('错误来源被拒绝', response.status === 403, 'status=' + response.status);
} catch (error) {
  check('错误来源被拒绝', false, String(error.message));
}

console.log('\n-- 3. 真实解析（会消耗一次 DeepSeek 调用）--');
try {
  const response = await fetch(target + '/api/plan', {
    method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: '明天交报告', today: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' }), timeZone: 'Asia/Shanghai' }),
    signal: AbortSignal.timeout(30000)
  });
  const data = await response.json().catch(() => null);
  check('解析返回 200', response.status === 200, 'status=' + response.status + ' ' + JSON.stringify(data));
  check('返回了日程草稿', Boolean(data?.title), JSON.stringify(data));
  check('CORS 头正确', response.headers.get('access-control-allow-origin') === ORIGIN);
  console.log('     ' + JSON.stringify(data));
} catch (error) {
  check('解析请求成功', false, String(error.message));
}

console.log(`\n结果：${pass} passed / ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
