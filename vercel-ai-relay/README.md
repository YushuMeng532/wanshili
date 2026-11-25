# 万事历 Vercel AI 转发

浏览器访问 https://wanshili-ai-relay.vercel.app ，服务端转发至现有 Cloudflare Worker。AI 助手 密钥与每日100次全局额度保留在Worker，不写入本目录。

只支持GitHub Pages来源的 /api/plan 和 /api/habit；保留上游状态码与错误，限制正文大小，禁止任意目标转发。Worker原有每地址5次/分钟限制继续有效，Vercel共享出口可能使多访客共享这项限制。

生产项目：wanshili-ai-relay；Node24；部署由Vercel源码接口完成，本目录用于复现和维护，尚未设置Git自动部署。

测试：node --test tests/relay.test.mjs。6项通过。2026-11-25生产实测：/health 200、OPTIONS204、/api/plan200并返回明天的日程草稿。默认部署保护未改动；生产域名经未登录请求确认可用。用户网络最终可达性仍需原设备复测。
