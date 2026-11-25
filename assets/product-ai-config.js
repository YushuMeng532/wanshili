// Set to this project's public HTTPS Worker URL after deploying the Worker.
// 不要直接填 *.workers.dev：中国大陆网络无法访问（DNS 被污染、TLS 握手被重置）。
// 先在 Cloudflare 给 Worker 绑定自定义域名，再填到这里；只写到域名根，不要带路径。
window.WANSHILI_AI_ENDPOINT = 'https://wanshili-ai.wanshili-trial-532.workers.dev';
