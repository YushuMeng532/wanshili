# 万事历 AI助手云函数

公开试用页通过现有腾讯云 Web 函数 `wanshili` 访问 AI助手。当前函数 URL 见 [前端配置](../assets/product-ai-config.js)。本目录的源代码与 `scf-ai-relay` 的在用实现一致。

| 接口 | 用途 |
| --- | --- |
| `GET /health` | 检查云函数是否可达、配置是否就绪 |
| `POST /api/plan` | 识别日程指令，返回可核对的草稿 |
| `POST /api/reminder` | 从已授权的普通日程名称中返回补记线索 |
| `POST /api/habit` | 兼容仍加载旧版的试用页面 |

## 更新现有函数

将 `server.mjs`、`package.json` 和 `scf_bootstrap` 放在 ZIP 根目录。启动文件使用 LF 行尾并设置执行权限。现有 [部署包](./wanshili-ai-relay.zip) 按此方式打包。

在腾讯云 SCF 打开现有 `wanshili` Web 函数。在「函数代码 → 本地上传 zip 包」上传并部署。沿用当前函数 URL、Node.js 运行环境、9000 端口与环境变量。密钥通过腾讯云环境变量注入。 [腾讯云启动文件说明](https://cloud.tencent.com/document/product/583/56126)

部署后，用试用页发送一条测试日程，再请求一次补记线索。健康检查只确认函数配置。限流和每日计数以当前运行实例为准。

## 本地测试

在此目录运行 `npm test`。它使用模拟上游验证日程解析、补记线索、来源限制和限流。
