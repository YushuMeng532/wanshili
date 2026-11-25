# 万事历 AI 服务

试用网页继续由 GitHub Pages 提供。日程、历史和偏好保存在原网址的浏览器里。Cloudflare Worker 提供两个 AI 接口，访客使用时无需登录。

| 路径 | 发送的内容 | 网页如何处理结果 |
| --- | --- | --- |
| `POST /api/plan` | 已确认的语句、设备日期、时区 | 显示草稿或在本机查找事项。沿用已有表单与确认操作 |
| `POST /api/habit` | 授权日程的分类天数、总天数和日期范围 | 展示按月习惯分析 |
| `GET /health` | 无 | 自检：返回 `ready` 和 `checks`（密钥、限流、额度绑定是否就位），不调用模型、不消耗额度 |

## 访问地址：不要直接用 `*.workers.dev`

`*.workers.dev` 在中国大陆无法访问（DNS 被污染，TLS 握手按域名被重置），访客会看到「连不上 AI 服务」。Worker 本身可以继续用，但必须给它绑一个能被国内访问的域名：

1. 准备一个域名并托管到 Cloudflare（免费套餐即可，解析在境外，不需要备案）。
2. Workers & Pages → `wanshili-ai` → Settings → Domains & Routes → Add → Custom Domain，填 `api.你的域名.com`。
3. 把 `../assets/product-ai-config.js` 改成 `https://api.你的域名.com`，不要带路径。
4. 手机浏览器打开 `https://api.你的域名.com/health` 自检：看到 `ready: true` 即正常；打不开说明这个域名本身在当前网络不可达。

访客页面的 Origin 仍是 `https://yushumeng532.github.io`，所以 `ALLOWED_ORIGIN` 不用改。来源配错时现在会返回带 CORS 头的 403，页面提示会直接说明是来源白名单问题，不会再伪装成网络故障。

## 发布

1. 登录可用的 Cloudflare 账号并启用 Workers。
2. 在这个目录登录 Wrangler 并部署 Worker。

   ```sh
   npx wrangler@latest login
   npx wrangler@latest deploy
   ```

3. 在 Cloudflare 的 Worker 设置里添加 Secret `DEEPSEEK_API_KEY`。也可运行 `npx wrangler@latest secret put DEEPSEEK_API_KEY` 并在终端的交互提示中输入。密钥只保存在 Cloudflare。 [Cloudflare Secret 文档](https://developers.cloudflare.com/workers/configuration/secrets/)
4. 将 Worker 的 HTTPS 根地址写入 `../assets/product-ai-config.js`（优先用上面的自定义域名，不要用 `*.workers.dev`），提交后等 GitHub Pages 部署。日程在同一浏览器仍使用原存储。
5. 打开 `https://你的端点/health` 确认 `ready` 为 `true`，再在新浏览器会话里打开公开链接，输入「明天交报告」。核对真实 API 返回的草稿，保存后刷新检查日程。开启习惯分析，并给一条过去的试用事项授权，再生成总结。

默认每个来源地址在一个 Cloudflare 机房约 5 次/分钟。全站按北京时间每天最多向 DeepSeek 发起 100 次模型请求，包括已发起但失败的请求。每日上限可通过 `DAILY_LIMIT` 调整，设为 `0` 可暂停真实调用。服务使用 `deepseek-flash`，限定输入和输出长度。 [限流文档](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) · [DeepSeek 接口文档](https://api-docs.deepseek.com/api/create-chat-completion/)
