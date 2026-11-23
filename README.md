# 万事历

把纪念日、倒数日和生日放进一张日历，查看选中日期的时间进度，并回顾过去日程。

[手机试用](https://yushumeng532.github.io/wanshili/app.html) · [需求与原型工作台](https://yushumeng532.github.io/wanshili/) · [Figma设计](https://www.figma.com/design/8aE2Z9hUhKtxgXjnEuCY7I?node-id=2-2)

手机浏览器直接打开试用。选定日期后可新建事项，也可打开今天的「相识纪念日」示例，试用结束正计时和回看历史。数据保存在当前浏览器。

## 当前版本 V0.5

保留现有蓝、粉、绿界面。支持选择日期、新建事项、循环、详情、修改、删除与月度统计，事项保存在当前浏览器。

- 正计时用于纪念日，只设开始日期，当天为第1天；天数跟随选中日期。
- 倒数日只在归零日标记日历，其他日期在下方显示倒数。
- 过去计划自动视为已发生；统计按日期去重，不再人工确认发生状态。
- 修改、删除支持仅这一次、这次及之后、整个系列，始终保留过去日程。
- 每月日期不足回退月末；仅跳过公历2月29日，其余闰年日期正常。

农历、法定假调休和AI服务未接入。AI仅保存全局与单项开关。开发版本升级会重置本应用旧数据；同一事项跨标签页编辑时阻止冲突并提示关闭一个标签页。

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

工作台默认进入可交互网页原型；切换标注模式可通过编号和连线定位文档。原型使用390 × 844画框等比缩放。网页原型用于流程评审，完整本地保存与统计请打开产品前端。

## 修改与运行

分支修改 → 创建PR → 查看差异 → 合并 → GitHub Pages部署。业务规则变化同步PRD、Spec、页面设计和原型；验证记录只记录实际执行结果。

本地在仓库根目录运行 `python -m http.server 8765`，打开 `http://localhost:8765/` 或 `http://localhost:8765/app.html`。

公共规则验证：`node tests/event-rules.test.cjs`（60项）。
