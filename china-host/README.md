# 万事历国内访问部署

用同一个 HTTPS 域名提供万事历日历和 AI 接口。Node 服务复用原有 AI 请求校验，直接连接 AI 服务提供方。浏览器无需访问 Vercel 或 Cloudflare Worker。

## 本地运行

从仓库根目录运行，需要 Node.js 24 LTS。

```sh
node china-host/server.mjs
```

打开 `http://127.0.0.1:8787/`。日历可直接使用。需要测试 AI 时，把现有密钥从服务器的密钥管理方式注入 `DEEPSEEK_API_KEY` 后重新启动。该环境变量沿用现有 Worker 的配置名称。

## 在服务器上发布

1. 准备可用的云服务器和 HTTPS 域名。选择中国大陆节点时，按云厂商要求完成域名备案。香港节点可用于早期试用，发布后用中国大陆的实际网络检验可达性。 [阿里云备案说明](https://help.aliyun.com/zh/icp-filing/basic-icp-service/support/for-the-record-process-faq)
2. 将整个仓库部署到服务器。在长期运行的服务进程里配置以下环境变量，并执行 `node china-host/server.mjs`。

   | 变量 | 设置 |
   | --- | --- |
   | `PUBLIC_ORIGIN` | 日历的 HTTPS 根地址，例如 `https://calendar.example.com` |
   | `DEEPSEEK_API_KEY` | 服务器私有密钥，从云平台密钥管理或服务的私有环境注入 |
   | `QUOTA_FILE` | 可写的持久目录下的 SQLite 路径，例如 `/var/lib/wanshili/quota.sqlite` |
   | `DAILY_LIMIT` | 每日调用上限，默认 100，设为 0 暂停 AI 调用 |
   | `TRUST_LOCAL_PROXY` | 使用下方反向代理示例时设为 1 |

3. 在相同机器上用 HTTPS 反向代理接入。以下为 Caddy 配置示例，替换为自己的域名。

   ```caddyfile
   calendar.example.com {
       reverse_proxy 127.0.0.1:8787 {
           header_up X-Wanshili-Client-IP {remote_host}
       }
   }
   ```

4. 在关闭网络代理的中国大陆设备上打开新域名。确认 `/health` 返回 `{"ready":true}`，再在日历中解析「明天交报告」，并验证 AI 习惯总结。健康检查仅校验服务器配置。发布验收以两项实际 AI 请求为准。

## 保留旧网址里的日程

日程存储按浏览器和网址所属域名隔离。新域名有独立的本地存储。已有用户可继续使用旧网址。验证新接口后，把旧站的 `assets/product-ai-config.js` 指向新域名，重新发布 GitHub Pages。旧站继续读取原来的本地日程，新站使用同域接口。旧站页面本身的可达性仍取决于 GitHub Pages。

后端按客户端地址和北京时间每日额度限流。默认部署为单进程，按客户端地址的计数在进程内保存，每日计数保存在 SQLite 中。迁移切流期间，旧 Worker 与新服务各有独立的每日额度，可分别调低。

## 验证

```sh
node --test china-host/server.test.mjs tests/ai-worker.test.mjs
```
