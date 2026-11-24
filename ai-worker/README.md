# 万事历 AI 服务

试用网页继续由 GitHub Pages 提供。日程、历史和偏好保存在原网址的浏览器里。Cloudflare Worker 提供两个 AI 接口，访客使用时无需登录。

| 路径 | 发送的内容 | 网页如何处理结果 |
| --- | --- | --- |
| `POST /api/plan` | 已确认的语句、设备日期、时区 | 显示草稿或在本机查找事项。沿用已有表单与确认操作 |
| `POST /api/habit` | 授权日程的分类天数、总天数和日期范围 | 展示按月习惯分析 |

## 发布

1. 登录可用的 Cloudflare 账号并启用 Workers。
2. 在这个目录登录 Wrangler 并部署 Worker。

   ```sh
   npx wrangler@latest login
   npx wrangler@latest deploy
   ```

3. 在 Cloudflare 的 Worker 设置里添加 Secret `DEEPSEEK_API_KEY`。也可运行 `npx wrangler@latest secret put DEEPSEEK_API_KEY` 并在终端的交互提示中输入。密钥只保存在 Cloudflare。 [Cloudflare Secret 文档](https://developers.cloudflare.com/workers/configuration/secrets/)
4. 将 Worker 的 HTTPS 根地址写入 `../assets/product-ai-config.js`，提交后等 GitHub Pages 部署。日程在同一浏览器仍使用原存储。
5. 在新浏览器会话里打开公开链接，输入「明天交报告」。核对真实 API 返回的草稿，保存后刷新检查日程。开启习惯分析，并给一条过去的试用事项授权，再生成总结。

默认每个来源地址在一个 Cloudflare 机房约 5 次/分钟。全站按北京时间每天最多向 DeepSeek 发起 100 次模型请求，包括已发起但失败的请求。每日上限可通过 `DAILY_LIMIT` 调整，设为 `0` 可暂停真实调用。服务使用 `deepseek-flash`，限定输入和输出长度。 [限流文档](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) · [DeepSeek 接口文档](https://api-docs.deepseek.com/api/create-chat-completion/)
