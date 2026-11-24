# 万事历

把纪念日、倒数日和生日放进一张日历，查看选中日期的时间进度，并回顾过去日程。

[手机试用](https://yushumeng532.github.io/wanshili/app.html) · [需求与原型工作台](https://yushumeng532.github.io/wanshili/) · [Figma设计](https://www.figma.com/design/8aE2Z9hUhKtxgXjnEuCY7I?node-id=2-2)

手机浏览器直接打开试用。选定日期后可新建事项，也可打开今天的「相识纪念日」示例，试用结束正计时和回看历史。数据保存在当前浏览器。

## 当前版本 V0.6.1

- 试用版支持普通日程、正计时、倒数日和公历生日。普通日程可重复，正计时可手动结束并回看历史。
- 「我的 → 统计」支持本周、本月和指定日期范围，可按类别或具体日程查看天数及日期。
- 日程与设置保存在当前浏览器，支持旧版迁移和本地备份导出。
- 公开试用页接入 DeepSeek，可用中文文字或浏览器支持的听写录入日程，也可生成已授权日程的月度总结。账号和云同步使用预设演示。 [AI 服务部署说明](ai-worker/README.md)

## 文档与原型

| 入口 | 内容 |
| --- | --- |
| [PRD](docs/modules/01-calendar/prd.md) | 用户动作、产品行为与业务规则 |
| [Dev Spec](docs/modules/01-calendar/dev-spec.md) | 数据、计划计算、范围操作和保存 |
| [页面设计](docs/modules/01-calendar/page-design.md) | 布局、状态与动效 |
| [原型与流程](docs/modules/01-calendar/prototype.md) | 画框索引和交互入口 |
| [验证记录](docs/modules/01-calendar/validation.md) | 实测范围、结果与限制 |
| [规则确认结果](docs/implementation-review.md) | 本轮12项规则及处理方式 |
| [竞品研究](docs/research.md) | 产品取舍的研究依据 |

工作台的「网页演示」可查看示例流程，「标注」可通过编号和连线定位文档。普通日程画面可直接打开试用表单。

## 修改与运行

分支修改 → 创建PR → 查看差异 → 合并 → GitHub Pages部署。业务规则变化同步PRD、Spec、页面设计和原型；验证记录只记录实际执行结果。

本地在仓库根目录运行 `python -m http.server 8765`，打开 `http://localhost:8765/` 或 `http://localhost:8765/app.html`。

运行 `node --test` 检查日期、循环、批注链接和 AI 接口。
