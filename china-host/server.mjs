import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { Readable } from 'node:stream';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { handleRequest } from '../ai-worker/worker.mjs';

const pagesOrigin = 'https://yushumeng532.github.io';
const calendarRoot = fileURLToPath(new URL('../', import.meta.url));
const shanghaiDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', dateStyle: 'short' });
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

export function createCalendarServer({
  publicOrigin, apiKey, quotaFile, dailyLimit = 100, root = calendarRoot,
  trustLocalProxy = false, fetchModel = fetch
}) {
  const url = new URL(publicOrigin);
  const loopback = ['localhost', '127.0.0.1'].includes(url.hostname);
  if (publicOrigin !== url.origin || (url.protocol !== 'https:' && !(loopback && url.protocol === 'http:'))) {
    throw new Error('PUBLIC_ORIGIN 必须是 HTTPS 根网址，本地测试允许 HTTP。');
  }
  if (!Number.isSafeInteger(dailyLimit) || dailyLimit < 0 || dailyLimit > 1000) {
    throw new Error('DAILY_LIMIT 必须是 0 至 1000 的整数。');
  }

  const database = new DatabaseSync(quotaFile);
  database.exec('PRAGMA busy_timeout = 3000; CREATE TABLE IF NOT EXISTS daily_quota (id INTEGER PRIMARY KEY, day TEXT NOT NULL, used INTEGER NOT NULL)');
  const reserve = database.prepare(`
    INSERT INTO daily_quota (id, day, used) VALUES (1, ?, 1)
    ON CONFLICT(id) DO UPDATE SET day = excluded.day,
      used = CASE WHEN daily_quota.day = excluded.day THEN daily_quota.used + 1 ELSE 1 END
    WHERE daily_quota.day <> excluded.day OR daily_quota.used < ?
  `);
  let minute;
  const callsByIp = new Map();
  const services = {
    DEEPSEEK_API_KEY: apiKey,
    AI_IP_LIMIT: {
      limit({ key }) {
        const now = Math.floor(Date.now() / 60000);
        if (now !== minute) { callsByIp.clear(); minute = now; }
        const count = callsByIp.get(key) ?? 0;
        if (count >= 5) return { success: false };
        callsByIp.set(key, count + 1);
        return { success: true };
      }
    },
    AI_QUOTA: {
      getByName: () => ({
        fetch: () => new Response(null, {
          status: dailyLimit > 0 && reserve.run(shanghaiDay.format(new Date()), dailyLimit).changes === 1 ? 204 : 429
        })
      })
    }
  };

  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (path === '/health' || path.startsWith('/api/')) {
        const origin = req.headers.origin === pagesOrigin ? pagesOrigin : publicOrigin;
        const headers = new Headers(req.headers);
        const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
        const client = trustLocalProxy && local ? req.headers['x-wanshili-client-ip'] : undefined;
        headers.set('CF-Connecting-IP', client || req.socket.remoteAddress || 'unknown');
        const init = { method: req.method, headers };
        if (req.method === 'POST') Object.assign(init, { body: Readable.toWeb(req), duplex: 'half' });
        const response = await handleRequest(new Request(publicOrigin + path, init), {
          ...services, ALLOWED_ORIGIN: origin
        }, fetchModel);
        res.writeHead(response.status, Object.fromEntries(response.headers));
        return res.end(response.body ? Buffer.from(await response.arrayBuffer()) : undefined);
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { Allow: 'GET, HEAD' });
        return res.end();
      }
      if (path === '/assets/product-ai-config.js') {
        res.writeHead(200, { 'Content-Type': types['.js'], 'Cache-Control': 'no-store' });
        return res.end(req.method === 'HEAD' ? undefined : 'window.WANSHILI_AI_ENDPOINT = location.origin;\n');
      }
      const publicPath = path === '/' || path === '/index.html' ? '/app.html' : path;
      const type = types[extname(publicPath)];
      const allowed = publicPath === '/app.html' || /^\/assets\/(?:[\w-]+\/)*[\w.-]+$/.test(publicPath);
      const file = allowed && type ? join(root, publicPath) : null;
      const info = file && await stat(file).catch(() => null);
      if (!info?.isFile()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': info.size, 'Cache-Control': 'no-cache' });
      if (req.method === 'HEAD') return res.end();
      const stream = createReadStream(file);
      stream.on('error', () => res.destroy()).pipe(res);
      res.on('close', () => stream.destroy());
    } catch {
      if (res.headersSent) return res.destroy();
      res.writeHead(500, { 'Cache-Control': 'no-store' });
      res.end();
    }
  });
  server.on('close', () => database.close());
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || '8787');
  const server = createCalendarServer({
    publicOrigin: process.env.PUBLIC_ORIGIN || `http://127.0.0.1:${port}`,
    apiKey: process.env.DEEPSEEK_API_KEY,
    quotaFile: process.env.QUOTA_FILE || './china-host/quota.sqlite',
    dailyLimit: Number(process.env.DAILY_LIMIT ?? '100'),
    trustLocalProxy: process.env.TRUST_LOCAL_PROXY === '1'
  });
  server.listen(port, '127.0.0.1', () => console.log(`Wanshili is listening on 127.0.0.1:${port}`));
}
